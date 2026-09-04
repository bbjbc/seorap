// 개발용 기능 점검: 클립보드 저장, 복사, 메모 자동 저장, 금고, 정리, 프로토콜.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  ClipboardItem,
  clipboard,
  type NativeImage,
  nativeImage,
  net,
} from 'electron';
import { t } from '../src/main/i18n';
import type { DebugContext } from '../src/main/main';
import { isNewer, parseRelease } from '../src/main/update';
import { VaultError } from '../src/main/vault';
import type { LocaleKey } from '../src/shared/locales';

const ROOT = path.join(__dirname, '..', '..');

const writeImage = (img: NativeImage): Promise<void> =>
  clipboard.write([
    new ClipboardItem({
      'image/png': new Blob([new Uint8Array(img.toPNG())], {
        type: 'image/png',
      }),
    }),
  ]);

async function readImage(): Promise<NativeImage> {
  for (const it of await clipboard.read()) {
    if (it.types.includes('image/png')) {
      const v: unknown = await it.getType('image/png');
      if (v instanceof Blob)
        return nativeImage.createFromBuffer(Buffer.from(await v.arrayBuffer()));
    }
  }
  return nativeImage.createEmpty();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** 렌더러의 AddResult 응답을 느슨하게 검증한다. */
function asAdd(v: unknown): Seorap.AddResult {
  assert(
    isRecord(v) && isRecord(v['item']),
    `AddResult expected, got ${JSON.stringify(v)}`,
  );
  return v as unknown as Seorap.AddResult;
}

export default async function run({
  app,
  win,
  store,
  vault,
}: DebugContext): Promise<void> {
  const sleep = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));
  const js = (code: string): Promise<unknown> =>
    win.webContents.executeJavaScript(code, true);
  const log = (...a: unknown[]): void => console.log('[test]', ...a);
  const failures: string[] = [];

  /**
   * cond 가 참을 돌려줄 때까지 폴링한다. 고정 sleep 은 빠른 머신에서는 낭비이고 느린
   * 머신에서는 부족해서 테스트가 흔들렸다. 실패하면 마지막으로 본 값을 메시지에 담는다.
   */
  const waitFor = async <T>(
    label: string,
    cond: () => T | Promise<T>,
    timeout = 8000,
  ): Promise<T> => {
    const deadline = Date.now() + timeout;
    let last: unknown = '(not evaluated)';
    for (;;) {
      try {
        const v = await cond();
        if (v) return v;
        last = v;
      } catch (err) {
        last = err instanceof Error ? err.message : String(err);
      }
      if (Date.now() >= deadline)
        throw new Error(
          `timed out waiting for ${label} — last: ${JSON.stringify(last)}`,
        );
      await sleep(40);
    }
  };

  /** get() 이 want 와 같아질 때까지 기다린다. 다르면 마지막 값을 보여 준다. */
  const waitEqual = async <T>(
    label: string,
    get: () => T | Promise<T>,
    want: T,
  ): Promise<void> => {
    const json = JSON.stringify(want);
    await waitFor(
      `${label} to equal ${json}`,
      async () => JSON.stringify(await get()) === json,
    );
  };

  const check = async (
    name: string,
    fn: () => void | Promise<void>,
  ): Promise<void> => {
    try {
      // 앞 테스트가 열어 둔 모달을 닫는다. 남아 있으면 elementFromPoint 가 백드롭을
      // 집고, 스타 배너는 모달이 열린 동안 뜨지 않아 엉뚱한 테스트가 실패한다.
      await js('__seorap.resetUi()');
      await fn();
      log('PASS', name);
    } catch (err) {
      failures.push(name);
      log('FAIL', name, '-', err instanceof Error ? err.message : String(err));
    }
  };

  // 렌더러 부팅이 끝나기를 기다린다. 부팅 마지막의 setMode(lastMode) 가 테스트 도중에
  // 끼어들면 모드가 되돌아가고, 그러면 목록 렌더가 멈춰 여러 테스트가 한꺼번에 깨졌다.
  await waitFor(
    'renderer boot',
    () => js('!!(window.__seorap && __seorap.booted && __seorap.booted())'),
    20000,
  );

  await check('clipboard text → item', async () => {
    await clipboard.writeText(`클립보드 테스트 문장 ${Date.now()}`);
    const r = asAdd(await js('scrap.captureClipboard()'));
    assert(r.item.type === 'text' && !r.duplicate);
    const again = asAdd(await js('scrap.captureClipboard()'));
    assert(again.duplicate, 'duplicate detection');
  });

  await check('clipboard image → item + thumb', async () => {
    const img = nativeImage
      .createFromPath(path.join(ROOT, 'assets', 'icon.png'))
      .resize({ width: 900, height: 600 });
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
    await clipboard.write([
      new ClipboardItem({
        'text/uri-list': pathToFileURL(
          path.join(ROOT, 'package.json'),
        ).toString(),
      }),
    ]);
    const r = asAdd(await js('scrap.captureClipboard()'));
    assert(
      r.item.type === 'file' && r.item.title === 'package.json',
      JSON.stringify(r),
    );
    await js(`scrap.copyItem(${JSON.stringify(r.item.id)})`);
    const items = await clipboard.read();
    assert(
      items[0]?.types.includes('text/uri-list'),
      'file copied back as uri-list',
    );
  });

  await check('copy item back to clipboard', async () => {
    const txt = store.items.find(
      (i) => i.type === 'text' && (i.text ?? '').startsWith('클립보드 테스트'),
    );
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
    const newId = String(
      await waitFor('note created', () => js('__seorap.noteId()')),
    );
    await js(`__seorap.typeIntoEditor('자동 저장 테스트\\n둘째 줄')`);
    await waitFor(
      'autosave to land',
      () => store.get(newId)?.title === '자동 저장 테스트',
    );
    const id = await js('__seorap.noteId()');
    assert(typeof id === 'string');
    const it = store.get(id);
    assert(
      it?.text === '자동 저장 테스트\n둘째 줄',
      `text saved: ${JSON.stringify(it?.text)}`,
    );
    assert.strictEqual(it.title, '자동 저장 테스트');
    const p = store.absPath(it);
    assert(p && fs.readFileSync(p, 'utf8') === '자동 저장 테스트\n둘째 줄');
    assert(it.note === true);
  });

  await check('notes never show up on the board', async () => {
    const id = await js('__seorap.noteId()');
    assert(typeof id === 'string');
    await js(`__seorap.setMode('board')`);
    await waitFor('board rendered', () =>
      js("document.querySelectorAll('#grid .card').length > 0"),
    );
    const onBoard = await js(
      `document.querySelectorAll('#grid .card[data-id="${id}"]').length`,
    );
    assert.strictEqual(onBoard, 0, 'note card must not render on board');
    const clip = store.items.find((i) => i.type === 'text' && !i.note);
    assert(clip, 'a clipboard text item exists');
    const clipOnBoard = await js(
      `document.querySelectorAll('#grid .card[data-id="${clip.id}"]').length`,
    );
    assert.strictEqual(clipOnBoard, 1, 'clipboard text still renders on board');
    await js(`__seorap.setMode('notes')`);
    await waitFor('note list rendered', () =>
      js("document.querySelectorAll('#noteList .note-item').length > 0"),
    );
  });

  await check('Ctrl+F finds inside the open note, not the list', async () => {
    await js(`__seorap.typeIntoEditor('사과 바나나 사과\\n포도 사과')`);
    await waitFor('editor filled', () =>
      js("document.getElementById('editor').value.includes('사과')"),
    );
    const r = (await js(`__seorap.findInNote('사과')`)) as {
      open: boolean;
      count: number;
      index: number;
      selStart: number;
      selEnd: number;
    };
    assert(r.open, 'find bar open');
    assert.strictEqual(r.count, 3, 'three matches');
    assert.strictEqual(r.index, 0);
    assert.deepStrictEqual(
      [r.selStart, r.selEnd],
      [0, 2],
      'first match selected',
    );
    // 리스트 검색칸은 건드리지 않는다
    assert.strictEqual(await js(`document.activeElement.id`), 'findInput');
    await js(`__seorap.closeFind()`);
    assert.strictEqual(
      await js(`document.getElementById('findBar').hidden`),
      true,
    );
    await js(`__seorap.typeIntoEditor('자동 저장 테스트\\n둘째 줄')`);
    const openId = String(await js('__seorap.noteId()'));
    await waitFor(
      'note text restored',
      () => store.get(openId)?.title === '자동 저장 테스트',
    );
  });

  await check(
    'note list drag reorder switches to manual sort and persists order',
    async () => {
      const a = (
        await store.addText('정렬 A', { source: 'manual', note: true })
      )?.item;
      const b = (
        await store.addText('정렬 B', { source: 'manual', note: true })
      )?.item;
      const c = (
        await store.addText('정렬 C', { source: 'manual', note: true })
      )?.item;
      assert(a && b && c);
      // 목록에 세 메모가 최신순으로 그려질 때까지 기다린다 (고정 sleep 은 느린 머신에서 부족했다)
      await waitEqual(
        'recent first',
        async () =>
          ((await js('__seorap.noteListIds()')) as string[]).slice(0, 3),
        [c.id, b.id, a.id],
      );
      await js(
        `__seorap.moveNote(${JSON.stringify(a.id)}, ${JSON.stringify(c.id)})`,
      ); // A 를 C 앞으로
      await waitEqual(
        'manual order applied',
        async () =>
          ((await js('__seorap.noteListIds()')) as string[]).slice(0, 3),
        [a.id, c.id, b.id],
      );
      const s = (await js(
        'scrap.getSettings().then(r => r.settings.notes.sort)',
      )) as string;
      assert.strictEqual(s, 'manual');
      assert.strictEqual(store.get(a.id)?.order, 0);
      assert.strictEqual(store.get(c.id)?.order, 1);
      assert.strictEqual(store.get(b.id)?.order, 2);
      assert.strictEqual(
        await js(`document.querySelectorAll('#noteList .group').length`),
        0,
        'no group headers in manual mode',
      );
      await js(`scrap.setSettings({ notes: { sort: 'recent' } })`);
      await waitFor('sort back to recent', () =>
        js("scrap.getSettings().then(r => r.settings.notes.sort === 'recent')"),
      );
      await store.remove([a.id, b.id, c.id]);
      await waitFor(
        'notes removed',
        () => !store.get(a.id) && !store.get(b.id) && !store.get(c.id),
      );
    },
  );

  await check('empty note is discarded on leave', async () => {
    await js(`__seorap.newNote()`);
    const id = await waitFor('note created', () => js('__seorap.noteId()'));
    assert(typeof id === 'string' && store.get(id), 'created');
    await js(`__seorap.setMode('board')`);
    await waitFor('empty note discarded', () => !store.get(id));
    assert(!store.get(id), 'deleted after leaving');
  });

  await check(
    'vault setup / lock / unlock / wrong password delay',
    async () => {
      if (!vault.exists) vault.setup('Correct-Horse-Battery-2026!');
      else vault.unlock('Correct-Horse-Battery-2026!');
      const e = vault.add({ name: '테스트', username: 'u', password: 'p@ss' });
      assert(!('password' in e), 'password not returned by add');
      assert.strictEqual(vault.getSecret(e.id), 'p@ss');
      const raw = fs.readFileSync(vault.file, 'utf8');
      assert(
        !raw.includes('p@ss') && !raw.includes('테스트'),
        'plaintext must not be on disk',
      );
      vault.lock('test');
      assert(!vault.unlocked);
      // 문구는 현재 언어로 나온다. 한국어를 박아 두면 로케일이 en-US 인 CI 러너에서 깨진다.
      const isVaultError = (want: LocaleKey) => (err: unknown) =>
        err instanceof VaultError && err.message === t(want);
      assert.throws(() => vault.list(), isVaultError('vault.err_locked'));
      assert.throws(
        () => vault.unlock('wrong-password-123'),
        isVaultError('vault.err_wrong'),
      );
      assert.throws(
        () => vault.unlock('Correct-Horse-Battery-2026!'),
        (err: unknown) => err instanceof VaultError && err.waitMs > 0,
      );
      await sleep(1100);
      vault.unlock('Correct-Horse-Battery-2026!');
      assert(vault.list().some((x) => x.name === '테스트'));
      vault.changePassword(
        'Correct-Horse-Battery-2026!',
        'Another-Strong-Passphrase-99',
      );
      vault.lock('test');
      vault.unlock('Another-Strong-Passphrase-99');
      assert.strictEqual(vault.getSecret(e.id), 'p@ss');
      vault.remove(e.id);
    },
  );

  // 회귀 방지: 금고가 열린 상태에서 빈 안내 패널이 창 전체를 덮어 클릭을 삼키던 버그 (v0.1.0)
  await check(
    'vault open state does not block clicks on the rail',
    async () => {
      await js(`__seorap.setMode('vault')`);
      await js(`__seorap.refreshVault()`);
      await waitFor('vault view visible', () =>
        js(
          "document.getElementById('app').dataset.mode === 'vault' && !document.getElementById('viewVault').hidden",
        ),
      );
      // 좌표는 버튼 자기 사각형에서 구한다. 예전에는 (33,140) 을 박아 두어 레일 레이아웃이
      // 바뀌거나 모달이 떠 있으면 엉뚱한 것을 집고 실패했다.
      const hit = await js(
        `(() => {
        const btn = document.querySelector('.rail-btn[data-mode="notes"]');
        if (!btn) return 'no-button';
        const r = btn.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const own = el && el.closest('.rail-btn');
        return (own && own.dataset.mode) || (el && el.id) || (el && el.className) || 'none';
      })()`,
      );
      assert.strictEqual(
        hit,
        'notes',
        `notes rail button must be on top of its own center, got ${String(hit)}`,
      );
      const paneHit = await js(
        `(() => { const el = document.elementFromPoint(700, 400); return el ? el.className : 'none'; })()`,
      );
      assert(
        !String(paneHit).includes('editor-empty'),
        'empty-state panel must not receive pointer events',
      );
      await js(`__seorap.setMode('board')`);
    },
  );

  await check('vault copy clears clipboard later', async () => {
    const e = vault.add({ name: 'clip', password: 'secret-value-1' });
    await js(`scrap.setSettings({ vault: { clipboardClearSeconds: 5 } })`);
    const r = await js(`scrap.vault.copy(${JSON.stringify(e.id)}, 'password')`);
    assert(isRecord(r) && r['ok'] === true && r['result'] === true, 'copy ok');
    assert.strictEqual(await clipboard.readText(), 'secret-value-1');
    await waitFor(
      'clipboard cleared',
      async () => (await clipboard.readText()) !== 'secret-value-1',
      12000,
    );
    assert.notStrictEqual(
      await clipboard.readText(),
      'secret-value-1',
      'should be cleared',
    );
    vault.remove(e.id);
    await js(`scrap.setSettings({ vault: { clipboardClearSeconds: 30 } })`);
  });

  await check('cleanup removes only old unpinned', async () => {
    const old = await store.addText(`오래된 항목 ${Date.now()}`, {
      source: 'test',
    });
    const oldPinned = await store.addText(`오래된 고정 ${Date.now()}`, {
      source: 'test',
    });
    assert(old && oldPinned);
    old.item.createdAt = Date.now() - 40 * 86400e3;
    oldPinned.item.createdAt = Date.now() - 40 * 86400e3;
    oldPinned.item.pinned = true;
    const n = await store.cleanup(30);
    assert.strictEqual(n, 1);
    assert(!store.get(old.item.id) && store.get(oldPinned.item.id));
    await store.remove([oldPinned.item.id]);
  });

  await check(
    'protocol serves thumb, refuses vault.json & traversal',
    async () => {
      const img = store.items.find((i) => i.type === 'image' && i.thumb);
      assert(img?.thumb, 'image with thumb');
      const status = async (u: string): Promise<number | 'err'> => {
        try {
          return (await net.fetch(u)).status;
        } catch {
          return 'err';
        }
      };
      assert.strictEqual(await status(`scrap://${img.thumb}`), 200);
      assert.notStrictEqual(await status('scrap://vault.json'), 200);
      assert.notStrictEqual(
        await status('scrap://items/..%2F..%2Fsettings.json'),
        200,
      );
      assert.notStrictEqual(await status('scrap://items/../vault.json'), 200);
    },
  );

  await check('auto-collect watcher picks up new clipboard text', async () => {
    await js(`scrap.setSettings({ autoCollect: true })`);
    await sleep(1200);
    // 앞선 비밀번호 복사가 watcher.ignore 창을 남겼을 수 있다. 그 창 안에서 바뀐 내용은
    // 수집되지 않고 기준점으로 흡수되므로, 매번 다른 내용을 써서 창이 지나가면 잡히게 한다.
    const marker = `자동 수집 ${Date.now()}`;
    let attempt = 0;
    await waitFor(
      'clipboard text collected',
      async () => {
        await clipboard.writeText(`${marker} #${attempt++}`);
        await sleep(900);
        return store.items.some((i) => (i.text ?? '').startsWith(marker));
      },
      15000,
    );
    await js(`scrap.setSettings({ autoCollect: false })`);
  });

  await check(
    'star nudge appears once after 7 days and respects dismissal',
    async () => {
      await js(
        `scrap.setSettings({ installedAt: Date.now() - 8 * 86400e3, starNudge: { done: false, snoozeUntil: 0 } })`,
      );
      await js(`__seorap.setMode('board')`);
      await waitFor('installedAt applied', () =>
        js('__seorap.starNudgeState().installedAt < Date.now() - 7 * 86400e3'),
      );
      await js(`__seorap.evaluateStarNudge()`);
      assert.strictEqual(
        await js('__seorap.starNudgeVisible()'),
        true,
        'nudge should show',
      );
      await js(`document.getElementById('nudgeNever').click()`);
      await waitFor('nudge hidden', () =>
        js('__seorap.starNudgeVisible() === false'),
      );
      assert.strictEqual(
        await js('__seorap.starNudgeVisible()'),
        false,
        'nudge hidden after dismiss',
      );
      const r = await js(
        'scrap.getSettings().then(r => r.settings.starNudge.done)',
      );
      assert.strictEqual(r, true, 'dismissal persisted');
    },
  );

  await check(
    'update check: version compare, release parsing, rail button',
    async () => {
      assert(
        isNewer('0.2.0', '0.1.4') &&
          isNewer('v1.0.0', '0.9.9') &&
          isNewer('0.1.10', '0.1.9'),
      );
      assert(
        !isNewer('0.1.4', '0.1.4') &&
          !isNewer('0.1.3', '0.1.4') &&
          !isNewer('garbage', '0.1.4'),
      );
      assert(
        isNewer('0.2.0', '0.2.0-beta.1') && !isNewer('0.2.0-beta.1', '0.2.0'),
      );
      const rel = parseRelease({
        tag_name: 'v0.2.0',
        html_url: 'https://github.com/bbjbc/seorap/releases/tag/v0.2.0',
        published_at: '2026-09-04T00:00:00Z',
      });
      assert(
        rel?.version === '0.2.0' &&
          rel.url.endsWith('/v0.2.0') &&
          rel.publishedAt > 0,
      );
      assert.strictEqual(parseRelease({ tag_name: 'nightly' }), null);
      assert.strictEqual(await js('__seorap.updateVisible()'), false);
      await js(
        `__seorap.showUpdate({ version: '9.9.9', url: 'https://example.com', publishedAt: 0 })`,
      );
      assert.strictEqual(await js('__seorap.updateVisible()'), true);
      assert.strictEqual(
        await js(`document.getElementById('railUpdateLabel').textContent`),
        'v9.9.9',
      );
    },
  );

  await check(
    'language switch re-renders static and dynamic strings',
    async () => {
      await js(`scrap.setSettings({ language: 'en' })`);
      await waitFor('en applied', () =>
        js("document.documentElement.lang === 'en'"),
      );
      assert.strictEqual(await js(`document.documentElement.lang`), 'en');
      assert.strictEqual(
        await js(`document.getElementById('search').placeholder`),
        'Search (Ctrl+F)',
      );
      assert.strictEqual(
        await js(
          `document.querySelector('.rail-btn[data-mode="board"] span').textContent`,
        ),
        'Board',
      );
      assert.strictEqual(
        await js(
          `document.querySelector('.chip[data-type="image"] span').textContent`,
        ),
        'Image',
      );
      assert.strictEqual(await js(`document.title`), 'Seorap');
      assert.strictEqual(
        await js(`document.getElementById('noteTitle').textContent`),
        'Notes',
      );
      // 메인 프로세스 문자열도 같은 사전을 쓴다
      await assert.rejects(
        store.moveTo(path.join(store.dir, 'inner')),
        /inside the current one/,
      );
      await js(`scrap.setSettings({ language: 'ko' })`);
      await waitFor('ko applied', () =>
        js("document.documentElement.lang === 'ko'"),
      );
      assert.strictEqual(
        await js(`document.getElementById('search').placeholder`),
        '검색 (Ctrl+F)',
      );
      assert.strictEqual(
        await js(
          `document.querySelector('.rail-btn[data-mode="board"] span').textContent`,
        ),
        '보드',
      );
      await assert.rejects(
        store.moveTo(path.join(store.dir, 'inner')),
        /현재 폴더 안쪽/,
      );
    },
  );

  await check('stats', () => {
    const s = store.stats();
    assert(s.count === store.items.length && s.bytes > 0);
  });

  log(failures.length ? `FAILED: ${failures.join(', ')}` : 'ALL PASSED');
  app.exit(failures.length ? 1 : 0);
}
