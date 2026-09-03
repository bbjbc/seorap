// 메인 · preload · 렌더러가 공유하는 계약.
// 전역 ambient 선언이라 import 없이 어디서든 Seorap.* 로 쓴다.
// (렌더러는 번들러 없이 <script>로 로드되므로 모듈 import를 쓸 수 없다.)

declare namespace Seorap {
  // ---------- 유틸 ----------
  type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

  // ---------- 항목 ----------
  type ItemType = 'image' | 'text' | 'link' | 'file';

  interface Item {
    id: string;
    type: ItemType;
    createdAt: number;
    updatedAt?: number;
    pinned: boolean;
    tags: string[];
    title: string;
    source: string;
    file?: string;
    thumb?: string;
    hash?: string;
    size?: number;
    width?: number;
    height?: number;
    ext?: string;
    text?: string;
    truncated?: boolean;
    url?: string;
    linkTitle?: string;
    note?: boolean;
    /** 메모 리스트 '직접 정렬' 순서. 작을수록 위. 없는 항목은 맨 위에 최신순으로. */
    order?: number;
  }

  /** 렌더러로 보낼 때 붙는 파생 필드 */
  interface ClientItem extends Item {
    thumbUrl: string | null;
    fileUrl: string | null;
  }

  interface ItemPatch {
    pinned?: boolean;
    tags?: string[];
    title?: string;
    linkTitle?: string;
    note?: boolean;
    text?: string;
  }

  interface AddResult {
    duplicate: boolean;
    item: ClientItem;
    note?: string;
  }

  interface AddFailure {
    error: string;
    path?: string;
  }

  type AddOutcome = AddResult | AddFailure;

  interface DroppedBlob {
    name: string;
    mime: string;
    data: ArrayBuffer;
  }

  type ItemsChangedEvent =
    | { type: 'add'; item: ClientItem }
    | { type: 'update'; item: ClientItem }
    | { type: 'remove'; ids: string[] }
    | { type: 'reload' };

  type UiActionName = 'settings' | 'newNote' | 'openNote' | 'detail' | 'tags' | 'rename' | 'delete';

  interface UiAction {
    action: UiActionName;
    ids?: string[];
  }

  interface Flash {
    text: string;
  }

  // ---------- 설정 ----------
  type CardSize = 'small' | 'medium' | 'large';
  type ClickAction = 'copy' | 'detail';
  type Mode = 'board' | 'notes' | 'vault';
  type ShortcutKey = 'toggle' | 'quickSave' | 'newNote';
  type NoteSort = 'recent' | 'manual';
  /** UI 언어. 'system' 은 OS 언어를 따른다 (한국어가 아니면 영어). */
  type Language = 'system' | 'ko' | 'en';

  interface Settings {
    language: Language;
    shortcuts: Record<ShortcutKey, string>;
    autoCollect: boolean;
    autoStart: boolean;
    toast: boolean;
    board: { cardSize: CardSize; clickAction: ClickAction };
    notes: { mono: boolean; fontSize: number; showClipboardText: boolean; sort: NoteSort };
    vault: { autoLockMinutes: number; clipboardClearSeconds: number; contentProtection: boolean; lockOnHide: boolean };
    cleanup: { enabled: boolean; days: number };
    /** 새 버전 자동 확인 (GitHub Releases 조회, 6시간마다). 끄면 설정에서 수동 확인만. */
    updates: { check: boolean; lastCheckedAt: number };
    /** 첫 실행 시각. 스타 요청 배너 타이밍에 쓴다. */
    installedAt: number | null;
    /** GitHub 스타 요청 배너 상태 */
    starNudge: { done: boolean; snoozeUntil: number };
    dataDir: string | null;
    windowBounds: { x: number; y: number; width: number; height: number } | null;
    lastMode: Mode;
  }

  type SettingsPatch = DeepPartial<Settings>;

  interface SettingsBundle {
    settings: Settings;
    shortcutErrors: Partial<Record<ShortcutKey, string>>;
    isPackaged: boolean;
    version: string;
    /** OS 언어 (app.getLocale). language 가 'system' 일 때 렌더러가 참고한다. */
    systemLocale: string;
  }

  interface SettingsApplyResult {
    settings: Settings;
    shortcutErrors: Partial<Record<ShortcutKey, string>>;
  }

  interface Stats {
    count: number;
    bytes: number;
    thumbBytes: number;
    byType: Record<ItemType, number>;
    dir: string;
    pinned: number;
  }

  interface PickDirResult {
    ok: boolean;
    dir?: string;
    error?: string;
  }

  // ---------- 업데이트 ----------
  interface UpdateInfo {
    version: string;
    url: string;
    publishedAt: number;
  }

  type UpdateCheckResult =
    | { status: 'update'; info: UpdateInfo }
    | { status: 'latest' }
    | { status: 'error'; error: string };

  // ---------- 금고 ----------
  interface VaultStatus {
    exists: boolean;
    unlocked: boolean;
    count: number;
    waitMs: number;
  }

  interface VaultFields {
    name?: string;
    username?: string;
    password?: string;
    url?: string;
    notes?: string;
    pinned?: boolean;
  }

  /** 목록·상세에 내보내는 형태. 비밀번호는 절대 포함하지 않는다. */
  interface VaultEntryPublic {
    id: string;
    name: string;
    username: string;
    url: string;
    notes: string;
    hasPassword: boolean;
    pinned: boolean;
    createdAt: number;
    updatedAt: number;
  }

  type VaultResult<T> = { ok: true; result: T } | { ok: false; error: string; waitMs?: number };

  interface Strength {
    ok: boolean;
    score: number;
    reason?: string;
  }

  interface VaultLocked {
    reason: string;
  }

  // ---------- IPC 계약 (채널 → 인자, 결과) ----------
  interface Ipc {
    'items:list': { args: []; result: ClientItem[] };
    'items:fullText': { args: [id: string]; result: string };
    'items:addNote': { args: []; result: AddResult | null };
    'items:addText': { args: [text: string, opts?: { note?: boolean }]; result: AddResult | null };
    'items:addFiles': { args: [paths: string[]]; result: AddOutcome[] };
    'items:addBuffers': { args: [blobs: DroppedBlob[]]; result: AddOutcome[] };
    'items:addUrl': { args: [url: string]; result: AddResult | null };
    'items:captureClipboard': { args: []; result: AddResult | null };
    'items:update': { args: [id: string, patch: ItemPatch]; result: ClientItem | null };
    'items:delete': { args: [ids: string[]]; result: number };
    'items:reorder': { args: [ids: string[]]; result: void };
    'items:copy': { args: [id: string]; result: boolean };
    'items:open': { args: [id: string]; result: void };
    'items:showInFolder': { args: [id: string]; result: void };
    'items:contextMenu': { args: [ids: string[]]; result: void };

    'vault:status': { args: []; result: VaultStatus };
    'vault:setup': { args: [password: string]; result: VaultResult<VaultStatus> };
    'vault:unlock': { args: [password: string]; result: VaultResult<VaultStatus> };
    'vault:lock': { args: []; result: VaultStatus };
    'vault:touch': { args: []; result: VaultStatus };
    'vault:list': { args: []; result: VaultResult<VaultEntryPublic[]> };
    'vault:secret': { args: [id: string]; result: VaultResult<string> };
    'vault:add': { args: [fields: VaultFields]; result: VaultResult<VaultEntryPublic> };
    'vault:update': { args: [id: string, patch: VaultFields]; result: VaultResult<VaultEntryPublic | null> };
    'vault:remove': { args: [id: string]; result: VaultResult<number> };
    'vault:copy': { args: [id: string, field: 'password' | 'username']; result: VaultResult<boolean> };
    'vault:changePassword': { args: [oldPw: string, newPw: string]; result: VaultResult<VaultStatus> };
    'vault:generate': { args: [length: number, symbols: boolean]; result: string };
    'vault:strength': { args: [password: string]; result: Strength };
    'vault:export': { args: [password: string]; result: VaultResult<string> };

    'settings:get': { args: []; result: SettingsBundle };
    'settings:set': { args: [patch: SettingsPatch]; result: SettingsApplyResult };
    'settings:stats': { args: []; result: Stats };
    'settings:openDataDir': { args: []; result: void };
    'settings:runCleanup': { args: [days?: number]; result: number };
    'settings:pickDataDir': { args: []; result: PickDirResult };

    'update:check': { args: []; result: UpdateCheckResult };
    'update:status': { args: []; result: UpdateInfo | null };

    'window:hide': { args: []; result: void };
    'shell:openExternal': { args: [url: string]; result: void };
  }

  type IpcChannel = keyof Ipc;

  /** 메인 → 렌더러 단방향 이벤트 */
  interface Events {
    'items:changed': ItemsChangedEvent;
    'ui:action': UiAction;
    'ui:flash': Flash;
    'window:shown': undefined;
    'settings:changed': Settings;
    'vault:locked': VaultLocked;
    'update:available': UpdateInfo;
  }

  type Unsubscribe = () => void;

  // ---------- preload 가 렌더러에 노출하는 API ----------
  interface VaultApi {
    status(): Promise<VaultStatus>;
    setup(password: string): Promise<VaultResult<VaultStatus>>;
    unlock(password: string): Promise<VaultResult<VaultStatus>>;
    lock(): Promise<VaultStatus>;
    touch(): Promise<VaultStatus>;
    list(): Promise<VaultResult<VaultEntryPublic[]>>;
    secret(id: string): Promise<VaultResult<string>>;
    add(fields: VaultFields): Promise<VaultResult<VaultEntryPublic>>;
    update(id: string, patch: VaultFields): Promise<VaultResult<VaultEntryPublic | null>>;
    remove(id: string): Promise<VaultResult<number>>;
    copy(id: string, field: 'password' | 'username'): Promise<VaultResult<boolean>>;
    changePassword(oldPw: string, newPw: string): Promise<VaultResult<VaultStatus>>;
    generate(length: number, symbols: boolean): Promise<string>;
    strength(password: string): Promise<Strength>;
    export(password: string): Promise<VaultResult<string>>;
    onLocked(cb: (e: VaultLocked) => void): Unsubscribe;
  }

  interface Api {
    listItems(): Promise<ClientItem[]>;
    fullText(id: string): Promise<string>;
    addNote(): Promise<AddResult | null>;
    addText(text: string, opts?: { note?: boolean }): Promise<AddResult | null>;
    addFiles(paths: string[]): Promise<AddOutcome[]>;
    addBuffers(blobs: DroppedBlob[]): Promise<AddOutcome[]>;
    addUrl(url: string): Promise<AddResult | null>;
    captureClipboard(): Promise<AddResult | null>;
    updateItem(id: string, patch: ItemPatch): Promise<ClientItem | null>;
    deleteItems(ids: string[]): Promise<number>;
    reorderItems(ids: string[]): Promise<void>;
    copyItem(id: string): Promise<boolean>;
    openItem(id: string): Promise<void>;
    showInFolder(id: string): Promise<void>;
    contextMenu(ids: string[]): Promise<void>;
    startDrag(ids: string[]): void;
    getPathForFile(file: File): string;

    vault: VaultApi;

    getSettings(): Promise<SettingsBundle>;
    setSettings(patch: SettingsPatch): Promise<SettingsApplyResult>;
    getStats(): Promise<Stats>;
    openDataDir(): Promise<void>;
    pickDataDir(): Promise<PickDirResult>;
    runCleanup(days?: number): Promise<number>;

    hideWindow(): Promise<void>;
    openExternal(url: string): Promise<void>;

    checkUpdate(): Promise<UpdateCheckResult>;
    updateStatus(): Promise<UpdateInfo | null>;
    onUpdateAvailable(cb: (info: UpdateInfo) => void): Unsubscribe;

    onItemsChanged(cb: (e: ItemsChangedEvent) => void): Unsubscribe;
    onUiAction(cb: (e: UiAction) => void): Unsubscribe;
    onFlash(cb: (e: Flash) => void): Unsubscribe;
    onWindowShown(cb: () => void): Unsubscribe;
    onSettingsChanged(cb: (s: Settings) => void): Unsubscribe;
  }

  // ---------- 토스트 창 ----------
  interface ToastPayload {
    kind?: 'ok' | 'info' | 'warn';
    text: string;
    thumb?: string | null;
    duration?: number;
  }

  interface ToastApi {
    onShow(cb: (p: ToastPayload) => void): void;
    onHide(cb: () => void): void;
  }

  // ---------- 개발용 훅 (scripts/*.ts 가 executeJavaScript 로 호출) ----------
  interface DebugHooks {
    setMode(mode: Mode): void;
    openNote(id: string): void;
    newNote(): Promise<void>;
    openDetail(id: string): void;
    openSettings(): Promise<void>;
    openSwitcher(): void;
    searchSwitcher(q: string): void;
    closeAllModals(): void;
    refreshVault(): Promise<void>;
    selectSecret(id: string): Promise<void>;
    vaultEntryIds(): string[];
    items(): ClientItem[];
    noteId(): string | null;
    typeIntoEditor(text: string): void;
    starNudgeVisible(): boolean;
    evaluateStarNudge(): void;
    findInNote(q: string): { open: boolean; count: number; index: number; selStart: number; selEnd: number };
    closeFind(): void;
    noteListIds(): string[];
    moveNote(id: string, beforeId: string | null): Promise<void>;
    showUpdate(info: UpdateInfo): void;
    updateVisible(): boolean;
  }
}

interface Window {
  scrap: Seorap.Api;
  toast: Seorap.ToastApi;
  __seorap: Seorap.DebugHooks;
}
