// 개발용 기능 점검: 클립보드 저장, 복사, 메모 자동 저장, 금고, 정리, 프로토콜.
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { clipboard, ClipboardItem, nativeImage, net, type NativeImage } from 'electron';
import type { DebugContext } from '../src/main/main';
import { isNewer, parseRelease } from '../src/main/update';

const ROOT = path.join(__dirname, '..', '..');

const writeImage = (img: NativeImage): Promise<void> =>
  clipboard.write([new ClipboardItem({ 'image/png': new Blob([new Uint8Array(img.toPNG())], { type: 'image/png' }) })]);

async function readImage(): Promise<NativeImage> {
  for (const it of await clipboard.read()) {
    if (it.types.includes('image/png')) {
      const v: unknown = await it.getType('image/png');
      if (v instanceof Blob) return nativeImage.createFromBuffer(Buffer.from(await v.arrayBuffer()));
    }
  }
  return nativeImage.createEmpty();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** 렌더러의 AddResult 응답을 느슨하게 검증한다. */
function asAdd(v: unknown): Seorap.AddResult {
  assert(isRecord(v) && isRecord(v['item']), 'AddResult expected, got ' + JSON.stringify(v));
  return v as unknown as Seorap.AddResult;
}

export default async function run({ app, win, store, vault }: DebugContext): Promise<void> {
  const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
  const js = (code: string): Promise<unknown> => win.webContents.executeJavaScript(code, true);
  const log = (...a: unknown[]): void => console.log('[test]', ...a);
  const failures: string[] = [];
  const check = async (name: string, fn: () => void | Promise<void>): Promise<void> => {
    try {
      await fn();
      log('PASS', name);
    } catch (err) {
      failures.push(name);
      log('FAIL', name, '-', err instanceof Error ? err.message : String(err));
    }
  };
  await sleep(800);

  await check('clipboard text → item', async () => {
    await clipboard.writeText(`클립보드 테스트 문장 ${Date.now()}`);
    const r = asAdd(await js('scrap.captureClipboard()'));
    assert(r.item.type === 'text' && !r.duplicate);
    const again = asAdd(await js('scrap.captureClipboard()'));
    assert(again.duplicate, 'duplicate detection');
  });

  await check('clipboard image → item + thumb', async () => {
    const img = nativeImage.createFromPath(path.join(ROOT, 'assets', 'icon.png')).resize({ width: 900, height: 600 });
    await writeImage(img);
    const r = asAdd(await js('scrap.captureClipboard()'));
    assert(r.item.type === 'image', 'type');
    assert(r.item.width === 900 && r.item.height === 600, 'size');
    const thumbPath = store.absThumb(store.get(r.item.id));
    assert(thumbPath && fs.existsSync(thumbPath), 'thumb file');
    const thumb = nativeImage.createFromPath(thumbPath);
    assert.strictEqual(thumb.getSize().width, 400, 'thumb width 400');
  });

  await check('clipboard url → link', async () => {
    await clipboard.writeText('https://example.com/');
    const r = asAdd(await js('scrap.captureClipboard()'));
    assert(r.item.type === 'link' && r.item.url === 'https://example.com/');
  });

  await check('clipboard file → item, and back', async () => {
    await clipboard.write([new ClipboardItem({ 'text/uri-list': pathToFileURL(path.join(ROOT, 'package.json')).toString() })]);
    const r = asAdd(await js('scrap.captureClipboard()'));
    assert(r.item.type === 'file' && r.item.title === 'package.json', JSON.stringify(r));
    await js(`scrap.copyItem(${JSON.stringify(r.item.id)})`);
    const items = await clipboard.read();
    assert(items[0]?.types.includes('text/uri-list'), 'file copied back as uri-list');
  });

  await check('copy item back to clipboard', async () => {
    const txt = store.items.find((i) => i.type === 'text' && (i.text ?? '').startsWith('클립보드 테스트'));
    assert(txt, 'text item exists');
    await js(`scrap.copyItem(${JSON.stringify(txt.id)})`);
    assert.strictEqual(await clipboard.readText(), txt.text);
    const img = store.items.find((i) => i.type === 'image');
    assert(img, 'image item exists');
    await js(`scrap.copyItem(${JSON.stringify(img.id)})`);
    assert(!(await readImage()).isEmpty(), 'image on clipboard');
  });

  await check('note autosave through editor', async () => {
    await js(`__seorap.setMode('notes')`);
    await js(`__seorap.newNote()`);
    await sleep(300);
    await js(`__seorap.typeIntoEditor('자동 저장 테스트\\n둘째 줄')`);
    await sleep(900);
    const id = await js('__seorap.noteId()');
    assert(typeof id === 'string');
    const it = store.get(id);
    assert(it?.text === '자동 저장 테스트\n둘째 줄', `text saved: ${JSON.stringify(it?.text)}`);
    assert.strictEqual(it.title, '자동 저장 테스트');
    const p = store.absPath(it);
    assert(p && fs.readFileSync(p, 'utf8') === '자동 저장 테스트\n둘째 줄');
    assert(it.note === true);
  });

  await check('notes never show up on the board', async () => {
    const id = await js('__seorap.noteId()');
    assert(typeof id === 'string');
    await js(`__seorap.setMode('board')`);
    await sleep(300);
    const onBoard = await js(`document.querySelectorAll('#grid .card[data-id="${id}"]').length`);
    assert.strictEqual(onBoard, 0, 'note card must not render on board');
    const clip = store.items.find((i) => i.type === 'text' && !i.note);
    assert(clip, 'a clipboard text item exists');
    const clipOnBoard = await js(`document.querySelectorAll('#grid .card[data-id="${clip.id}"]').length`);
    assert.strictEqual(clipOnBoard, 1, 'clipboard text still renders on board');
    await js(`__seorap.setMode('notes')`);
    await sleep(200);
  });

  await check('Ctrl+F finds inside the open note, not the list', async () => {
    await js(`__seorap.typeIntoEditor('사과 바나나 사과\\n포도 사과')`);
    await sleep(200);
    const r = (await js(`__seorap.findInNote('사과')`)) as { open: boolean; count: number; index: number; selStart: number; selEnd: number };
    assert(r.open, 'find bar open');
    assert.strictEqual(r.count, 3, 'three matches');
    assert.strictEqual(r.index, 0);
    assert.deepStrictEqual([r.selStart, r.selEnd], [0, 2], 'first match selected');
    // 리스트 검색칸은 건드리지 않는다
    assert.strictEqual(await js(`document.activeElement.id`), 'findInput');
    await js(`__seorap.closeFind()`);
    assert.strictEqual(await js(`document.getElementById('findBar').hidden`), true);
    await js(`__seorap.typeIntoEditor('자동 저장 테스트\\n둘째 줄')`);
    await sleep(700);
  });

  await check('note list drag reorder switches to manual sort and persists order', async () => {
    const a = (await store.addText('정렬 A', { source: 'manual', note: true }))?.item;
    const b = (await store.addText('정렬 B', { source: 'manual', note: true }))?.item;
    const c = (await store.addText('정렬 C', { source: 'manual', note: true }))?.item;
    assert(a && b && c);
    await sleep(400);
    const before = (await js('__seorap.noteListIds()')) as string[];
    assert.deepStrictEqual(before.slice(0, 3), [c.id, b.id, a.id], 'recent first');
    await js(`__seorap.moveNote(${JSON.stringify(a.id)}, ${JSON.stringify(c.id)})`); // A 를 C 앞으로
    await sleep(500);
    const after = (await js('__seorap.noteListIds()')) as string[];
    assert.deepStrictEqual(after.slice(0, 3), [a.id, c.id, b.id], `manual order applied: ${after.join(',')}`);
    const s = (await js('scrap.getSettings().then(r => r.settings.notes.sort)')) as string;
    assert.strictEqual(s, 'manual');
    assert.strictEqual(store.get(a.id)?.order, 0);
    assert.strictEqual(store.get(c.id)?.order, 1);
    assert.strictEqual(store.get(b.id)?.order, 2);
    assert.strictEqual(await js(`document.querySelectorAll('#noteList .group').length`), 0, 'no group headers in manual mode');
    await js(`scrap.setSettings({ notes: { sort: 'recent' } })`);
    await sleep(300);
    await store.remove([a.id, b.id, c.id]);
    await sleep(300);
  });

  await check('empty note is discarded on leave', async () => {
    await js(`__seorap.newNote()`);
    await sleep(300);
    const id = await js('__seorap.noteId()');
    assert(typeof id === 'string' && store.get(id), 'created');
    await js(`__seorap.setMode('board')`);
    await sleep(300);
    assert(!store.get(id), 'deleted after leaving');
  });

  await check('vault setup / lock / unlock / wrong password delay', async () => {
    if (!vault.exists) vault.setup('Correct-Horse-Battery-2026!');
    else vault.unlock('Correct-Horse-Battery-2026!');
    const e = vault.add({ name: '테스트', username: 'u', password: 'p@ss' });
    assert(!('password' in e), 'password not returned by add');
    assert.strictEqual(vault.getSecret(e.id), 'p@ss');
    const raw = fs.readFileSync(vault.file, 'utf8');
    assert(!raw.includes('p@ss') && !raw.includes('테스트'), 'plaintext must not be on disk');
    vault.lock('test');
    assert(!vault.unlocked);
    assert.throws(() => vault.list(), /잠겨/);
    assert.throws(() => vault.unlock('wrong-password-123'), /맞지 않아요/);
    assert.throws(() => vault.unlock('Correct-Horse-Battery-2026!'), /잠시 후/);
    await sleep(1100);
    vault.unlock('Correct-Horse-Battery-2026!');
    assert(vault.list().some((x) => x.name === '테스트'));
    vault.changePassword('Correct-Horse-Battery-2026!', 'Another-Strong-Passphrase-99');
    vault.lock('test');
    vault.unlock('Another-Strong-Passphrase-99');
    assert.strictEqual(vault.getSecret(e.id), 'p@ss');
    vault.remove(e.id);
  });

  // 회귀 방지: 금고가 열린 상태에서 빈 안내 패널이 창 전체를 덮어 클릭을 삼키던 버그 (v0.1.0)
  await check('vault open state does not block clicks on the rail', async () => {
    await js(`__seorap.setMode('vault')`);
    await js(`__seorap.refreshVault()`);
    await sleep(500);
    const hit = await js(
      `(() => { const el = document.elementFromPoint(33, 140); return (el && el.closest('.rail-btn') && el.closest('.rail-btn').dataset.mode) || (el && el.id) || (el && el.className) || 'none'; })()`,
    );
    assert.strictEqual(hit, 'notes', `rail button expected under (33,140), got ${String(hit)}`);
    const paneHit = await js(`(() => { const el = document.elementFromPoint(700, 400); return el ? el.className : 'none'; })()`);
    assert(!String(paneHit).includes('editor-empty'), 'empty-state panel must not receive pointer events');
    await js(`__seorap.setMode('board')`);
  });

  await check('vault copy clears clipboard later', async () => {
    const e = vault.add({ name: 'clip', password: 'secret-value-1' });
    await js(`scrap.setSettings({ vault: { clipboardClearSeconds: 5 } })`);
    const r = await js(`scrap.vault.copy(${JSON.stringify(e.id)}, 'password')`);
    assert(isRecord(r) && r['ok'] === true && r['result'] === true, 'copy ok');
    assert.strictEqual(await clipboard.readText(), 'secret-value-1');
    await sleep(5600);
    assert.notStrictEqual(await clipboard.readText(), 'secret-value-1', 'should be cleared');
    vault.remove(e.id);
  });

  await check('cleanup removes only old unpinned', async () => {
    const old = await store.addText(`오래된 항목 ${Date.now()}`, { source: 'test' });
    const oldPinned = await store.addText(`오래된 고정 ${Date.now()}`, { source: 'test' });
    assert(old && oldPinned);
    old.item.createdAt = Date.now() - 40 * 86400e3;
    oldPinned.item.createdAt = Date.now() - 40 * 86400e3;
    oldPinned.item.pinned = true;
    const n = await store.cleanup(30);
    assert.strictEqual(n, 1);
    assert(!store.get(old.item.id) && store.get(oldPinned.item.id));
    await store.remove([oldPinned.item.id]);
  });

  await check('protocol serves thumb, refuses vault.json & traversal', async () => {
    const img = store.items.find((i) => i.type === 'image' && i.thumb);
    assert(img?.thumb, 'image with thumb');
    const status = async (u: string): Promise<number | 'err'> => {
      try {
        return (await net.fetch(u)).status;
      } catch {
        return 'err';
      }
    };
    assert.strictEqual(await status('scrap://' + img.thumb), 200);
    assert.notStrictEqual(await status('scrap://vault.json'), 200);
    assert.notStrictEqual(await status('scrap://items/..%2F..%2Fsettings.json'), 200);
    assert.notStrictEqual(await status('scrap://items/../vault.json'), 200);
  });

  await check('auto-collect watcher picks up new clipboard text', async () => {
    await js(`scrap.setSettings({ autoCollect: true })`);
    await sleep(1200);
    const marker = `자동 수집 ${Date.now()}`;
    await clipboard.writeText(marker);
    await sleep(2500);
    assert(store.items.some((i) => i.text === marker), 'collected');
    await js(`scrap.setSettings({ autoCollect: false })`);
  });

  await check('star nudge appears once after 7 days and respects dismissal', async () => {
    await js(`scrap.setSettings({ installedAt: Date.now() - 8 * 86400e3, starNudge: { done: false, snoozeUntil: 0 } })`);
    await js(`__seorap.setMode('board')`);
    await sleep(200);
    await js(`__seorap.evaluateStarNudge()`);
    assert.strictEqual(await js('__seorap.starNudgeVisible()'), true, 'nudge should show');
    await js(`document.getElementById('nudgeNever').click()`);
    await sleep(300);
    assert.strictEqual(await js('__seorap.starNudgeVisible()'), false, 'nudge hidden after dismiss');
    const r = await js('scrap.getSettings().then(r => r.settings.starNudge.done)');
    assert.strictEqual(r, true, 'dismissal persisted');
  });

  await check('update check: version compare, release parsing, rail button', async () => {
    assert(isNewer('0.2.0', '0.1.4') && isNewer('v1.0.0', '0.9.9') && isNewer('0.1.10', '0.1.9'));
    assert(!isNewer('0.1.4', '0.1.4') && !isNewer('0.1.3', '0.1.4') && !isNewer('garbage', '0.1.4'));
    assert(isNewer('0.2.0', '0.2.0-beta.1') && !isNewer('0.2.0-beta.1', '0.2.0'));
    const rel = parseRelease({ tag_name: 'v0.2.0', html_url: 'https://github.com/bbjbc/seorap/releases/tag/v0.2.0', published_at: '2026-09-04T00:00:00Z' });
    assert(rel?.version === '0.2.0' && rel.url.endsWith('/v0.2.0') && rel.publishedAt > 0);
    assert.strictEqual(parseRelease({ tag_name: 'nightly' }), null);
    assert.strictEqual(await js('__seorap.updateVisible()'), false);
    await js(`__seorap.showUpdate({ version: '9.9.9', url: 'https://example.com', publishedAt: 0 })`);
    assert.strictEqual(await js('__seorap.updateVisible()'), true);
    assert.strictEqual(await js(`document.getElementById('railUpdateLabel').textContent`), 'v9.9.9');
  });

  await check('stats', () => {
    const s = store.stats();
    assert(s.count === store.items.length && s.bytes > 0);
  });

  log(failures.length ? `FAILED: ${failures.join(', ')}` : 'ALL PASSED');
  app.exit(failures.length ? 1 : 0);
}
