import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  ipcMain,
  shell,
  dialog,
  protocol,
  net,
  screen,
  powerMonitor,
  type MenuItemConstructorOptions,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { Store, type ChangeEvent } from './store';
import { Settings } from './settings';
import { Vault, VaultError, checkStrength, generatePassword } from './vault';
import * as cb from './clipboard';
import { checkForUpdate } from './update';
import { t, setLanguage } from './i18n';

const ASSETS = path.join(__dirname, '..', '..', 'assets');
const ICON_ICO = path.join(ASSETS, 'icon.ico');
const ICON_PNG = path.join(ASSETS, 'icon.png');
const START_HIDDEN = process.argv.includes('--hidden');

/** 개발용 디버그 스크립트가 받는 컨텍스트 (scripts/*.ts 참고) */
export interface DebugContext {
  app: typeof app;
  win: BrowserWindow;
  store: Store;
  vault: Vault;
  showToast: (p: Seorap.ToastPayload) => void;
  toastWin: BrowserWindow;
}
type DebugScript = (ctx: DebugContext) => Promise<void>;

// 개발/테스트용: 사용자 설정 폴더를 분리할 수 있다.
const userDataOverride = process.env['SEORAP_USER_DATA'];
if (userDataOverride) app.setPath('userData', userDataOverride);

let settings: Settings;
let store: Store;
let vault: Vault;
let watcher: cb.ClipboardWatcher;
let tray: Tray | null = null;
let win: BrowserWindow | null = null;
let toastWin: BrowserWindow | null = null;
let toastTimer: NodeJS.Timeout | null = null;
let autoLockTimer: NodeJS.Timeout | null = null;
let clipboardClearTimer: NodeJS.Timeout | null = null;
let quitting = false;
let shortcutErrors: Partial<Record<Seorap.ShortcutKey, string>> = {};
let latestUpdate: Seorap.UpdateInfo | null = null;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// ---------- 단일 인스턴스 ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'scrap', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// 이름이 Scrapbox 였던 시절의 설정·데이터 폴더가 있으면 한 번만 옮겨온다.
function migrateLegacyUserData(): void {
  if (userDataOverride) return;
  const oldDir = path.join(app.getPath('appData'), 'scrapbox');
  const newDir = app.getPath('userData');
  if (!fs.existsSync(path.join(oldDir, 'settings.json')) || fs.existsSync(path.join(newDir, 'settings.json'))) return;
  try {
    fs.mkdirSync(newDir, { recursive: true });
    for (const name of ['settings.json', 'data']) {
      const src = path.join(oldDir, name);
      if (fs.existsSync(src)) fs.renameSync(src, path.join(newDir, name));
    }
  } catch (err) {
    console.error('legacy migration failed', err);
  }
}

void app.whenReady().then(() => {
  migrateLegacyUserData();
  settings = new Settings(path.join(app.getPath('userData'), 'settings.json'));
  setLanguage(settings.data.language, app.getLocale());
  if (!settings.data.installedAt) settings.set({ installedAt: Date.now() });
  const dataDir = process.env['SEORAP_DATA_DIR'] ?? settings.data.dataDir ?? path.join(app.getPath('userData'), 'data');
  store = new Store(dataDir);
  store.onChange(broadcastChange);
  vault = new Vault(path.join(store.dir, 'vault.json'));
  vault.onLock(onVaultLocked);

  registerProtocol();
  const mainWin = createWindow();
  toastWin = createToast();
  createTray();
  registerShortcuts();
  applyAutoStart();

  watcher = new cb.ClipboardWatcher(() => void quickSave('auto'));
  if (settings.data.autoCollect) void watcher.start();

  powerMonitor.on('lock-screen', () => vault.lock('screen-lock'));
  powerMonitor.on('suspend', () => vault.lock('suspend'));

  void runCleanup();
  setInterval(() => void runCleanup(), 60 * 60 * 1000);

  // 새 버전 확인: 시작 직후 한 번, 이후 6시간마다. 개발 모드에서는 자동 확인하지 않는다.
  if (app.isPackaged) {
    setTimeout(() => void autoCheckUpdate(), 8000);
    setInterval(() => void autoCheckUpdate(), 6 * 60 * 60 * 1000);
  }

  if (!START_HIDDEN) showWindow();

  const debugScript = process.env['SEORAP_DEBUG_SCRIPT'];
  if (debugScript) {
    mainWin.webContents.on('console-message', (e) => {
      console.log(`[renderer:${e.level}] ${e.message} (${path.basename(e.sourceId)}:${e.lineNumber})`);
    });
    mainWin.webContents.once('did-finish-load', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod: unknown = require(debugScript);
      const fn = isRecord(mod) && typeof mod['default'] === 'function' ? mod['default'] : mod;
      if (typeof fn !== 'function') {
        console.error('debug script must export a function');
        app.exit(1);
        return;
      }
      const run = fn as DebugScript;
      const toast = toastWin;
      if (!toast) return;
      run({ app, win: mainWin, store, vault, showToast, toastWin: toast }).catch((err: unknown) => {
        console.error(err);
        app.exit(1);
      });
    });
  }
});

app.on('window-all-closed', () => {
  /* 트레이 상주: 창이 닫혀도 종료하지 않는다 */
});
app.on('before-quit', () => {
  quitting = true;
  vault.lock('quit');
  store.flush();
  watcher.stop();
  globalShortcut.unregisterAll();
});

// ---------- 창 ----------
function createWindow(): BrowserWindow {
  const bounds = settings.data.windowBounds;
  const w = new BrowserWindow({
    width: bounds?.width ?? 1120,
    height: bounds?.height ?? 740,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 720,
    minHeight: 480,
    show: false,
    backgroundColor: '#111114',
    title: t('app.name'),
    icon: fs.existsSync(ICON_ICO) ? ICON_ICO : undefined,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#111114', symbolColor: '#c9c9cf', height: 44 },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: false, // 창이 가려져도 자동 저장 타이머가 밀리지 않게
    },
  });
  win = w;
  void w.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  w.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    saveBounds();
    w.hide();
  });
  w.on('hide', () => {
    if (settings.data.vault.lockOnHide) vault.lock('hide');
  });
  w.on('resize', debounce(saveBounds, 500));
  w.on('move', debounce(saveBounds, 500));
  w.webContents.on('will-navigate', (e) => e.preventDefault());
  w.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  return w;
}

function saveBounds(): void {
  if (!win || win.isDestroyed() || win.isMinimized() || !win.isVisible()) return;
  settings.set({ windowBounds: win.getBounds() });
}

function showWindow(): void {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  send('window:shown', undefined);
}

function toggleWindow(): void {
  if (!win) return;
  if (win.isVisible() && win.isFocused()) win.hide();
  else showWindow();
}

function send<E extends keyof Seorap.Events>(channel: E, payload: Seorap.Events[E]): void {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function sendUi(action: Seorap.UiActionName, ids?: string[]): void {
  send('ui:action', ids ? { action, ids } : { action });
}

// ---------- 토스트 ----------
function createToast(): BrowserWindow {
  const t = new BrowserWindow({
    width: 340,
    height: 84,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    show: false,
    hasShadow: false,
    webPreferences: { preload: path.join(__dirname, '..', 'toast', 'preload.js'), contextIsolation: true },
  });
  t.setAlwaysOnTop(true, 'screen-saver');
  t.setIgnoreMouseEvents(true);
  void t.loadFile(path.join(__dirname, '..', 'toast', 'toast.html'));
  return t;
}

function showToast(payload: Seorap.ToastPayload): void {
  const t = toastWin;
  if (!t || t.isDestroyed()) return;
  if (!settings.data.toast && payload.kind !== 'warn') return;
  const wa = screen.getPrimaryDisplay().workArea;
  const [w, h] = t.getSize();
  t.setPosition(wa.x + wa.width - (w ?? 340) - 16, wa.y + wa.height - (h ?? 84) - 16);
  t.webContents.send('toast', payload);
  t.showInactive();
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.webContents.send('toast:hide');
    setTimeout(() => {
      if (!t.isDestroyed()) t.hide();
    }, 220);
  }, payload.duration ?? 2200);
}

// ---------- 트레이 ----------
function createTray(): void {
  const iconPath = fs.existsSync(ICON_ICO) ? ICON_ICO : ICON_PNG;
  const img = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(img);
  tray.setToolTip(t('app.name'));
  tray.on('click', () => toggleWindow());
  refreshTrayMenu();
}

function refreshTrayMenu(): void {
  if (!tray) return;
  const s = settings.data;
  const items: MenuItemConstructorOptions[] = [
    { label: t('tray.open'), click: () => showWindow() },
    { label: t('tray.quick_save', { key: s.shortcuts.quickSave || t('tray.no_shortcut') }), click: () => void quickSave('shortcut') },
    { label: t('tray.new_note', { key: s.shortcuts.newNote || t('tray.no_shortcut') }), click: () => newNoteFromShortcut() },
    { type: 'separator' },
    {
      label: t('tray.auto_collect'),
      type: 'checkbox',
      checked: s.autoCollect,
      click: (mi) => applySettings({ autoCollect: mi.checked }),
    },
    { label: t('tray.lock_vault'), enabled: vault.unlocked, click: () => vault.lock('manual') },
    { type: 'separator' },
    ...(latestUpdate
      ? [{ label: t('tray.update', { v: latestUpdate.version }), click: () => void shell.openExternal(latestUpdate?.url ?? '') } as MenuItemConstructorOptions]
      : []),
    {
      label: t('tray.settings'),
      click: () => {
        showWindow();
        sendUi('settings');
      },
    },
    { label: t('tray.open_dir'), click: () => void shell.openPath(store.dir) },
    { type: 'separator' },
    { label: t('tray.quit'), click: () => app.quit() },
  ];
  tray.setContextMenu(Menu.buildFromTemplate(items));
}

// ---------- 전역 단축키 ----------
function registerShortcuts(): Partial<Record<Seorap.ShortcutKey, string>> {
  globalShortcut.unregisterAll();
  shortcutErrors = {};
  const map: Record<Seorap.ShortcutKey, () => void> = {
    toggle: () => toggleWindow(),
    quickSave: () => void quickSave('shortcut'),
    newNote: () => newNoteFromShortcut(),
  };
  for (const key of Object.keys(map) as Seorap.ShortcutKey[]) {
    const acc = settings.data.shortcuts[key];
    if (!acc) continue;
    let ok = false;
    try {
      ok = globalShortcut.register(acc, map[key]);
    } catch {
      ok = false;
    }
    if (!ok) shortcutErrors[key] = t('main.shortcut_failed', { acc });
  }
  return shortcutErrors;
}

function newNoteFromShortcut(): void {
  showWindow();
  sendUi('newNote');
}

function applyAutoStart(): void {
  if (!app.isPackaged) return; // 개발 모드에서는 electron.exe 가 등록되므로 건너뛴다
  app.setLoginItemSettings({ openAtLogin: settings.data.autoStart, path: process.execPath, args: ['--hidden'] });
}

function applySettings(patch: Seorap.SettingsPatch): Seorap.SettingsApplyResult {
  const before = settings.get();
  const after = settings.set(patch);
  if (JSON.stringify(before.shortcuts) !== JSON.stringify(after.shortcuts)) registerShortcuts();
  if (before.autoCollect !== after.autoCollect) {
    if (after.autoCollect) void watcher.start();
    else watcher.stop();
  }
  if (before.autoStart !== after.autoStart) applyAutoStart();
  if (before.language !== after.language) {
    setLanguage(after.language, app.getLocale());
    registerShortcuts(); // 등록 실패 문구를 새 언어로
    tray?.setToolTip(t('app.name'));
    win?.setTitle(t('app.name'));
  }
  if (JSON.stringify(before.vault) !== JSON.stringify(after.vault)) {
    applyContentProtection();
    if (vault.unlocked) resetAutoLock();
  }
  refreshTrayMenu();
  send('settings:changed', after);
  return { settings: after, shortcutErrors };
}

// ---------- 새 버전 확인 ----------
async function runUpdateCheck(): Promise<Seorap.UpdateCheckResult> {
  try {
    const info = await checkForUpdate(app.getVersion());
    settings.set({ updates: { lastCheckedAt: Date.now() } });
    if (!info) return { status: 'latest' };
    const isNew = latestUpdate?.version !== info.version;
    latestUpdate = info;
    if (isNew) {
      refreshTrayMenu();
      send('update:available', info);
    }
    return { status: 'update', info };
  } catch (err) {
    return { status: 'error', error: errMsg(err) };
  }
}

async function autoCheckUpdate(): Promise<void> {
  if (!settings.data.updates.check) return;
  await runUpdateCheck();
}

// ---------- 클립보드 저장 ----------
async function quickSave(source: string): Promise<Seorap.Item | null> {
  try {
    const res = await captureClipboard(source);
    if (!res) {
      if (source !== 'auto') showToast({ kind: 'warn', text: t('flash.clipboard_empty') });
      return null;
    }
    if (res.duplicate) {
      if (source !== 'auto') showToast({ kind: 'info', text: t('flash.already_saved'), thumb: thumbDataUrl(res.item) });
      return res.item;
    }
    showToast({ kind: 'ok', text: t('toast.saved', { what: describe(res.item) }), thumb: thumbDataUrl(res.item) });
    return res.item;
  } catch (err) {
    console.error(err);
    showToast({ kind: 'warn', text: t('toast.save_failed', { e: errMsg(err) }) });
    return null;
  }
}

async function captureClipboard(source: string): Promise<{ duplicate: boolean; item: Seorap.Item } | null> {
  const c = await cb.readClipboard();
  const files = c.files.filter((p) => {
    try {
      return fs.statSync(p).isFile();
    } catch {
      return false;
    }
  });
  if (files.length) {
    let last: { duplicate: boolean; item: Seorap.Item } | null = null;
    for (const p of files) last = await store.addFile(p, { source });
    return last;
  }
  if (c.image) return store.addImage(c.image, { source });
  if (c.text.trim()) {
    const res = await store.addText(c.text, { source });
    if (res?.item.type === 'link' && !res.duplicate) void fetchLinkTitle(res.item);
    return res;
  }
  return null;
}

function describe(item: Seorap.Item): string {
  switch (item.type) {
    case 'image':
      return item.width ? t('toast.image_wh', { w: item.width, h: item.height ?? '?' }) : t('toast.image');
    case 'link':
      return t('toast.link');
    case 'file':
      return item.title || t('toast.file');
    case 'text':
      return t('toast.text', { t: (item.text ?? '').trim().slice(0, 24).replace(/\n/g, ' ') });
  }
}

function thumbDataUrl(item: Seorap.Item): string | null {
  const p = store.absThumb(item);
  if (!p || !fs.existsSync(p)) return null;
  try {
    return nativeImage.createFromPath(p).resize({ height: 56 }).toDataURL();
  } catch {
    return null;
  }
}

// ---------- 링크 제목 (best effort) ----------
async function fetchLinkTitle(item: Seorap.Item): Promise<void> {
  if (!item.url) return;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await net.fetch(item.url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Seorap/1.0', accept: 'text/html,*/*' },
    });
    clearTimeout(t);
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('text/html')) return;
    const html = (await res.text()).slice(0, 300000);
    const og =
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(html);
    const t2 = /<title[^>]*>([^<]+)<\/title>/i.exec(html);
    const title = decodeEntities(og?.[1] ?? t2?.[1] ?? '').trim();
    if (title) store.update(item.id, { linkTitle: title.slice(0, 200) });
  } catch {
    /* URL 만 보여줘도 충분하다 */
  }
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|#39|apos|nbsp);/gi, (m: string, e: string) => {
    const named = ENTITIES[e.toLowerCase()];
    if (named) return named;
    const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) ? String.fromCodePoint(n) : m;
  });
}

// ---------- 항목 → 클립보드 ----------
async function copyItem(id: string): Promise<boolean> {
  const item = store.get(id);
  const fp = store.absPath(item);
  if (!item || !fp) return false;
  watcher.ignore(2500);
  try {
    if (item.type === 'text' || item.type === 'link') {
      await cb.writeText(store.readFullText(item));
      return true;
    }
    if (item.type === 'image') {
      const img = nativeImage.createFromPath(fp);
      if (!img.isEmpty()) {
        await cb.writeImage(img);
        return true;
      }
    }
    // 일반 파일(및 gif/webp 등 디코드 안 되는 이미지)은 탐색기에 붙일 수 있게 파일 자체를 올린다.
    await cb.writeFiles([fp]);
    return true;
  } catch (err) {
    console.error('copyItem failed', err);
    return false;
  }
}

// ---------- 금고 ----------
function resetAutoLock(): void {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  autoLockTimer = null;
  const min = settings.data.vault.autoLockMinutes;
  if (vault.unlocked && min > 0) autoLockTimer = setTimeout(() => vault.lock('timeout'), min * 60 * 1000);
}

function onVaultLocked(reason: string): void {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  autoLockTimer = null;
  applyContentProtection();
  refreshTrayMenu();
  send('vault:locked', { reason });
}

function applyContentProtection(): void {
  if (!win || win.isDestroyed()) return;
  win.setContentProtection(vault.unlocked && settings.data.vault.contentProtection);
}

function vaultCall<T>(fn: () => T): Seorap.VaultResult<T> {
  try {
    const result = fn();
    resetAutoLock();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: errMsg(err), waitMs: err instanceof VaultError ? err.waitMs : 0 };
  }
}

async function copySecret(id: string, field: 'password' | 'username'): Promise<boolean> {
  const entry = vault.list().find((e) => e.id === id);
  if (!entry) return false;
  const value = field === 'password' ? (vault.getSecret(id) ?? '') : entry.username;
  if (!value) return false;
  const sec = Math.max(5, settings.data.vault.clipboardClearSeconds || 30);
  watcher.ignore(sec * 1000 + 2000);
  await cb.writeText(value);
  if (clipboardClearTimer) clearTimeout(clipboardClearTimer);
  clipboardClearTimer = setTimeout(() => {
    void (async () => {
      if ((await cb.readText()) === value) cb.clear();
    })();
  }, sec * 1000);
  if (field === 'password') showToast({ kind: 'info', text: t('toast.password_copied', { sec }) });
  return true;
}

// ---------- 커스텀 프로토콜 ----------
function registerProtocol(): void {
  protocol.handle('scrap', (req) => {
    const u = new URL(req.url);
    const rel = decodeURIComponent(u.hostname + u.pathname);
    const abs = path.resolve(store.dir, rel);
    if (!abs.startsWith(store.dir + path.sep) || !fs.existsSync(abs) || path.basename(abs) === 'vault.json') {
      return new Response('not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(abs).toString());
  });
}

function serialize(item: Seorap.Item): Seorap.ClientItem {
  return {
    ...item,
    thumbUrl: item.thumb ? 'scrap://' + item.thumb : null,
    fileUrl: item.file ? 'scrap://' + item.file : null,
  };
}

function wrap(res: { duplicate: boolean; item: Seorap.Item } | null): Seorap.AddResult | null {
  return res ? { duplicate: res.duplicate, item: serialize(res.item) } : null;
}

function broadcastChange(evt: ChangeEvent): void {
  switch (evt.type) {
    case 'add':
      send('items:changed', { type: 'add', item: serialize(evt.item) });
      break;
    case 'update':
      send('items:changed', { type: 'update', item: serialize(evt.item) });
      break;
    case 'remove':
      send('items:changed', { type: 'remove', ids: evt.ids });
      break;
  }
}

async function runCleanup(force = false, days?: number): Promise<number> {
  const c = settings.data.cleanup;
  const d = days ?? c.days;
  if (!force && !c.enabled) return 0;
  if (!(d > 0)) return 0;
  return store.cleanup(d);
}

// ---------- 컨텍스트 메뉴 ----------
function showContextMenu(ids: string[]): void {
  const items = ids.map((id) => store.get(id)).filter((i): i is Seorap.Item => i !== null);
  if (!items.length || !win) return;
  const one = items.length === 1 ? items[0] : undefined;
  const sendAction = (action: Seorap.UiActionName): void => sendUi(action, ids);
  const allPinned = items.every((i) => i.pinned);
  const tpl: MenuItemConstructorOptions[] = [];
  if (one) {
    tpl.push({
      label: t('menu.copy'),
      click: () => void copyItem(one.id).then(() => send('ui:flash', { text: t('flash.copied') })),
    });
    if (one.type === 'text') tpl.push({ label: one.note ? t('menu.open_in_notes') : t('menu.send_to_notes'), click: () => sendAction('openNote') });
    else tpl.push({ label: t('menu.detail'), click: () => sendAction('detail') });
    tpl.push({ label: one.type === 'link' ? t('menu.open_browser') : t('menu.open_app'), click: () => openItem(one.id) });
    tpl.push({
      label: t('menu.show_in_folder'),
      click: () => {
        const p = store.absPath(one);
        if (p) shell.showItemInFolder(p);
      },
    });
    tpl.push({ type: 'separator' });
  }
  tpl.push({
    label: allPinned ? t('common.unpin') : t('common.pin'),
    click: () => items.forEach((i) => store.update(i.id, { pinned: !allPinned })),
  });
  tpl.push({ label: t('menu.tags'), click: () => sendAction('tags') });
  if (one && (one.type === 'image' || one.type === 'file')) tpl.push({ label: t('menu.rename'), click: () => sendAction('rename') });
  tpl.push({ type: 'separator' });
  tpl.push({ label: items.length > 1 ? t('menu.delete_n', { n: items.length }) : t('common.delete'), click: () => sendAction('delete') });
  Menu.buildFromTemplate(tpl).popup({ window: win });
}

function openItem(id: string): void {
  const item = store.get(id);
  if (!item) return;
  if (item.type === 'link' && item.url) void shell.openExternal(item.url);
  else {
    const p = store.absPath(item);
    if (p) void shell.openPath(p);
  }
}

// ---------- IPC (타입 계약: src/shared/types.d.ts 의 Seorap.Ipc) ----------
function handle<C extends Seorap.IpcChannel>(
  channel: C,
  fn: (...args: Seorap.Ipc[C]['args']) => Seorap.Ipc[C]['result'] | Promise<Seorap.Ipc[C]['result']>,
): void {
  ipcMain.handle(channel, (_e, ...args: unknown[]) => fn(...(args as Seorap.Ipc[C]['args'])));
}

handle('items:list', () => store.list().map(serialize));
handle('items:fullText', (id) => store.readFullText(store.get(id)));
handle('items:addNote', async () => wrap(await store.addNote()));
handle('items:addText', async (text, opts) => {
  const res = await store.addText(text, { source: 'manual', note: opts?.note !== false });
  if (res?.item.type === 'link' && !res.duplicate) void fetchLinkTitle(res.item);
  return wrap(res);
});
handle('items:addFiles', async (paths) => {
  const out: Seorap.AddOutcome[] = [];
  for (const p of paths) {
    try {
      const r = wrap(await store.addFile(p, { source: 'drop' }));
      if (r) out.push(r);
    } catch (err) {
      out.push({ error: errMsg(err), path: p });
    }
  }
  return out;
});
handle('items:addBuffers', async (blobs) => {
  const out: Seorap.AddOutcome[] = [];
  for (const b of blobs) {
    try {
      const r = wrap(await store.addBuffer(Buffer.from(b.data), b.name, { mime: b.mime, source: 'drop' }));
      if (r) out.push(r);
    } catch (err) {
      out.push({ error: errMsg(err) });
    }
  }
  return out;
});
handle('items:addUrl', async (url) => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await net.fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'Mozilla/5.0 Seorap/1.0' } });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const mime = res.headers.get('content-type') ?? '';
    if (mime.startsWith('text/html')) {
      const r = await store.addText(url, { source: 'drop' });
      if (r && !r.duplicate) void fetchLinkTitle(r.item);
      return wrap(r);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    let name = '';
    try {
      name = decodeURIComponent(path.basename(new URL(url).pathname));
    } catch {
      /* ignore */
    }
    return wrap(await store.addBuffer(buf, name, { mime, source: 'drop' }));
  } catch {
    const r = await store.addText(url, { source: 'drop' });
    if (r && !r.duplicate) void fetchLinkTitle(r.item);
    const out = wrap(r);
    if (out) out.note = t('main.saved_as_link');
    return out;
  }
});
handle('items:captureClipboard', async () => wrap(await captureClipboard('paste')));
handle('items:update', (id, patch) => {
  const it = store.update(id, patch);
  return it ? serialize(it) : null;
});
handle('items:delete', (ids) => store.remove(ids));
handle('items:reorder', (ids) => store.reorder(ids));
handle('items:copy', (id) => copyItem(id));
handle('items:open', (id) => openItem(id));
handle('items:showInFolder', (id) => {
  const p = store.absPath(store.get(id));
  if (p) shell.showItemInFolder(p);
});
handle('items:contextMenu', (ids) => showContextMenu(ids));

ipcMain.on('items:startDrag', (e, raw: unknown) => {
  const ids = Array.isArray(raw) ? (raw as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  const items = ids.map((id) => store.get(id)).filter((i): i is Seorap.Item => i !== null);
  const files = items.map((i) => store.absPath(i)).filter((p): p is string => p !== null);
  const first = files[0];
  if (!first) return;
  let icon = nativeImage.createEmpty();
  const t = store.absThumb(items[0] ?? null);
  if (t && fs.existsSync(t)) icon = nativeImage.createFromPath(t).resize({ width: 96 });
  if (icon.isEmpty() && fs.existsSync(ICON_PNG)) icon = nativeImage.createFromPath(ICON_PNG).resize({ width: 64 });
  e.sender.startDrag(files.length === 1 ? { file: first, icon } : { file: first, files, icon });
});

// 금고
handle('vault:status', () => vault.status());
handle('vault:setup', (pw) => {
  const r = vaultCall(() => vault.setup(pw));
  if (r.ok) {
    applyContentProtection();
    refreshTrayMenu();
  }
  return r;
});
handle('vault:unlock', (pw) => {
  const r = vaultCall(() => vault.unlock(pw));
  if (r.ok) {
    applyContentProtection();
    refreshTrayMenu();
  }
  return r;
});
handle('vault:lock', () => vault.lock('manual'));
handle('vault:touch', () => {
  if (vault.unlocked) resetAutoLock();
  return vault.status();
});
handle('vault:list', () => vaultCall(() => vault.list()));
handle('vault:secret', (id) => vaultCall(() => vault.getSecret(id) ?? ''));
handle('vault:add', (fields) => vaultCall(() => vault.add(fields)));
handle('vault:update', (id, patch) => vaultCall(() => vault.update(id, patch)));
handle('vault:remove', (id) => vaultCall(() => vault.remove(id)));
handle('vault:copy', async (id, field) => {
  try {
    const result = await copySecret(id, field);
    resetAutoLock();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
});
handle('vault:changePassword', (oldPw, newPw) => vaultCall(() => vault.changePassword(oldPw, newPw)));
handle('vault:generate', (len, symbols) => generatePassword(len, symbols));
handle('vault:strength', (pw) => checkStrength(pw));
handle('vault:export', async (pw) => {
  const r = vaultCall(() => vault.exportPlain(pw));
  if (!r.ok) return r;
  if (!win) return { ok: false, error: t('main.no_window') };
  const save = await dialog.showSaveDialog(win, {
    title: t('dialog.export_title'),
    defaultPath: path.join(app.getPath('documents'), 'seorap-vault-export.json'),
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (save.canceled || !save.filePath) return { ok: false, error: t('main.canceled') };
  fs.writeFileSync(save.filePath, JSON.stringify(r.result, null, 2), 'utf8');
  return { ok: true, result: save.filePath };
});

// 설정
handle('settings:get', () => ({
  settings: settings.get(),
  shortcutErrors,
  isPackaged: app.isPackaged,
  version: app.getVersion(),
  systemLocale: app.getLocale(),
}));
handle('settings:set', (patch) => applySettings(patch));
handle('settings:stats', () => store.stats());
handle('settings:openDataDir', async () => {
  await shell.openPath(store.dir);
});
handle('settings:runCleanup', (days) => runCleanup(true, days));
handle('settings:pickDataDir', async () => {
  if (!win) return { ok: false };
  const r = await dialog.showOpenDialog(win, {
    title: t('dialog.pick_dir_title'),
    properties: ['openDirectory', 'createDirectory'],
  });
  const picked = r.filePaths[0];
  if (r.canceled || !picked) return { ok: false };
  try {
    vault.lock('move');
    await store.moveTo(picked);
    vault.setFile(path.join(store.dir, 'vault.json'));
    settings.set({ dataDir: store.dir });
    send('items:changed', { type: 'reload' });
    return { ok: true, dir: store.dir };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
});
handle('update:check', () => runUpdateCheck());
handle('update:status', () => latestUpdate);
handle('window:hide', () => {
  win?.hide();
});
handle('shell:openExternal', async (url) => {
  if (/^https?:/i.test(url)) await shell.openExternal(url);
});

function debounce(fn: () => void, ms: number): () => void {
  let t: NodeJS.Timeout | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}
