// 항목 저장소. 실제 임시 폴더에 파일을 쓰고 읽는다.
// 이미지 경로만 Electron 의 nativeImage 가 필요해서 비워 둔다. 나머지는 전부 진짜 동작이다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  // addBuffer 는 먼저 이미지인지 물어본다. 항상 아니라고 답해 파일 경로로 흐르게 한다.
  nativeImage: { createFromBuffer: () => ({ isEmpty: () => true }) },
}));

const { Store } = await import('../../../src/main/store');
const { setLanguage } = await import('../../../src/main/i18n');

let dir: string;
let store: InstanceType<typeof Store>;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seorap-store-'));
  store = new Store(dir);
  setLanguage('en', 'en-US');
});
afterEach(() => {
  store.flush();
  fs.rmSync(dir, { recursive: true, force: true });
});

const daysAgo = (n: number): number => Date.now() - n * 86400e3;

describe('addText', () => {
  it('writes the body to its own file and keeps it in the index', async () => {
    const r = await store.addText('hello\nworld');
    expect(r?.duplicate).toBe(false);
    const item = r?.item;
    expect(item?.type).toBe('text');
    expect(item?.text).toBe('hello\nworld');
    expect(fs.readFileSync(path.join(dir, item?.file ?? ''), 'utf8')).toBe(
      'hello\nworld',
    );
  });

  it('takes the first line as the title', async () => {
    const r = await store.addText('  Shopping list  \nmilk\neggs');
    expect(r?.item.title).toBe('Shopping list');
  });

  it('normalises Windows line endings, so a paste from Notepad matches a paste from elsewhere', async () => {
    const a = await store.addText('one\r\ntwo');
    const b = await store.addText('one\ntwo');
    expect(a?.item.text).toBe('one\ntwo');
    expect(b?.duplicate).toBe(true);
    expect(b?.item.id).toBe(a?.item.id);
  });

  it('recognises a bare url as a link and remembers the address', async () => {
    const r = await store.addText('https://example.com/a?b=c');
    expect(r?.item.type).toBe('link');
    expect(r?.item.url).toBe('https://example.com/a?b=c');
    expect(r?.item.title).toBe('');
  });

  it('keeps a url with words around it as plain text', async () => {
    const r = await store.addText('see https://example.com for details');
    expect(r?.item.type).toBe('text');
  });

  it('returns the original instead of storing the same text twice', async () => {
    const first = await store.addText('same');
    const again = await store.addText('same');
    expect(again?.duplicate).toBe(true);
    expect(again?.item.id).toBe(first?.item.id);
    expect(store.list()).toHaveLength(1);
  });

  it('ignores empty or whitespace-only text rather than making a blank item', async () => {
    expect(await store.addText('')).toBeNull();
    expect(await store.addText('   \n\t ')).toBeNull();
    expect(store.list()).toHaveLength(0);
  });

  it('marks a note as a note, but never a link', async () => {
    const memo = await store.addText('a memo', { note: true });
    const link = await store.addText('https://example.com', { note: true });
    expect(memo?.item.note).toBe(true);
    expect(link?.item.note).toBe(false);
  });

  it('puts the newest item first', async () => {
    const a = await store.addText('first');
    const b = await store.addText('second');
    expect(store.list().map((i) => i.id)).toEqual([b?.item.id, a?.item.id]);
  });
});

describe('long text', () => {
  const LIMIT = 50000;

  it('keeps only a slice in the index but the whole thing on disk', async () => {
    const long = 'x'.repeat(LIMIT + 100);
    const r = await store.addText(long);
    const item = r?.item;
    expect(item?.truncated).toBe(true);
    expect(item?.text).toHaveLength(LIMIT);
    expect(store.readFullText(item ?? null)).toHaveLength(LIMIT + 100);
  });

  it('reads short text straight from the index without touching disk', async () => {
    const r = await store.addText('short');
    expect(r?.item.truncated).toBe(false);
    expect(store.readFullText(r?.item ?? null)).toBe('short');
  });

  it('returns empty for a missing item instead of throwing', () => {
    expect(store.readFullText(null)).toBe('');
  });
});

describe('addNote', () => {
  it('creates an empty note that is ready to type into', async () => {
    const r = await store.addNote();
    expect(r.item.note).toBe(true);
    expect(r.item.text).toBe('');
    expect(fs.existsSync(path.join(dir, r.item.file ?? ''))).toBe(true);
  });

  it('makes a separate note every time, since empty text cannot be deduplicated', async () => {
    const a = await store.addNote();
    const b = await store.addNote();
    expect(a.item.id).not.toBe(b.item.id);
    expect(store.list()).toHaveLength(2);
  });
});

describe('update', () => {
  it('rewrites the file and the title when the body changes', async () => {
    const r = await store.addText('old title\nbody');
    const updated = store.update(r?.item.id ?? '', { text: 'new title\nbody' });
    expect(updated?.title).toBe('new title');
    expect(fs.readFileSync(path.join(dir, updated?.file ?? ''), 'utf8')).toBe(
      'new title\nbody',
    );
  });

  it('caps tags so a runaway list cannot bloat the index', async () => {
    const many = Array.from({ length: 80 }, (_, i) => `t${i}`);
    const r = await store.addText('x');
    const updated = store.update(r?.item.id ?? '', { tags: many });
    expect(updated?.tags).toHaveLength(50);
  });

  it('drops tag entries that are not strings, since they come from IPC', async () => {
    const r = await store.addText('y');
    const updated = store.update(r?.item.id ?? '', {
      tags: ['ok', 7, null] as unknown as string[],
    });
    expect(updated?.tags).toEqual(['ok']);
  });

  it('leaves an unknown id alone and reports it', () => {
    expect(store.update('missing', { pinned: true })).toBeNull();
  });

  it('does not write text onto an item that has no body', async () => {
    const r = await store.addNote();
    const before = store.get(r.item.id)?.type;
    store.update(r.item.id, { pinned: true });
    expect(store.get(r.item.id)?.pinned).toBe(true);
    expect(store.get(r.item.id)?.type).toBe(before);
  });
});

describe('reorder', () => {
  it('numbers the given ids in order and ignores ones it does not have', async () => {
    const a = await store.addText('a');
    const b = await store.addText('b');
    store.reorder([b?.item.id ?? '', 'ghost', a?.item.id ?? '']);
    expect(store.get(b?.item.id ?? '')?.order).toBe(0);
    expect(store.get(a?.item.id ?? '')?.order).toBe(2);
  });
});

describe('remove', () => {
  it('deletes the item and its file from disk', async () => {
    const r = await store.addText('bye');
    const file = path.join(dir, r?.item.file ?? '');
    expect(await store.remove([r?.item.id ?? ''])).toBe(1);
    expect(store.get(r?.item.id ?? '')).toBeNull();
    expect(fs.existsSync(file)).toBe(false);
  });

  it('counts only what it actually had', async () => {
    const r = await store.addText('one');
    expect(await store.remove([r?.item.id ?? '', 'ghost'])).toBe(1);
  });
});

describe('cleanup', () => {
  it('removes items older than the cutoff and keeps pinned ones', async () => {
    const old = await store.addText('old');
    const oldPinned = await store.addText('old pinned');
    const fresh = await store.addText('fresh');
    const oldItem = store.get(old?.item.id ?? '');
    const pinnedItem = store.get(oldPinned?.item.id ?? '');
    if (oldItem) oldItem.createdAt = daysAgo(40);
    if (pinnedItem) {
      pinnedItem.createdAt = daysAgo(40);
      pinnedItem.pinned = true;
    }

    expect(await store.cleanup(30)).toBe(1);
    expect(store.get(old?.item.id ?? '')).toBeNull();
    expect(store.get(oldPinned?.item.id ?? '')).not.toBeNull();
    expect(store.get(fresh?.item.id ?? '')).not.toBeNull();
  });

  it('never removes notes, however old they are', async () => {
    const note = await store.addNote();
    const item = store.get(note.item.id);
    if (item) {
      item.createdAt = daysAgo(400);
      item.text = 'a note I still want';
    }

    expect(await store.cleanup(30)).toBe(0);
    expect(store.get(note.item.id)).not.toBeNull();
  });

  it('does nothing when everything is recent', async () => {
    await store.addText('recent');
    expect(await store.cleanup(30)).toBe(0);
    expect(store.list()).toHaveLength(1);
  });

  it('treats the cutoff as strictly older, so an item at the edge survives', async () => {
    const r = await store.addText('edge');
    const item = store.get(r?.item.id ?? '');
    if (item) item.createdAt = daysAgo(29);
    expect(await store.cleanup(30)).toBe(0);
  });
});

describe('stats', () => {
  it('counts items per type and adds up their sizes', async () => {
    await store.addText('hello');
    await store.addText('https://example.com');
    const s = store.stats();
    expect(s.count).toBe(2);
    expect(s.byType.text).toBe(1);
    expect(s.byType.link).toBe(1);
    expect(s.byType.image).toBe(0);
    expect(s.bytes).toBe('hello'.length + 'https://example.com'.length);
  });

  it('reports the folder and how many are pinned', async () => {
    const r = await store.addText('x');
    store.update(r?.item.id ?? '', { pinned: true });
    const s = store.stats();
    expect(s.dir).toBe(dir);
    expect(s.pinned).toBe(1);
  });

  it('is all zeros on an empty store', () => {
    const s = store.stats();
    expect(s.count).toBe(0);
    expect(s.bytes).toBe(0);
    expect(s.pinned).toBe(0);
  });
});

describe('index file', () => {
  it('reloads what was saved, so a restart keeps everything', async () => {
    await store.addText('kept');
    store.flush();
    const reopened = new Store(dir);
    expect(reopened.list()).toHaveLength(1);
    expect(reopened.list()[0]?.text).toBe('kept');
  });

  it('starts empty rather than crashing when the index is corrupt', async () => {
    await store.addText('x');
    store.flush();
    fs.writeFileSync(path.join(dir, 'index.json'), '{ not json');
    expect(new Store(dir).list()).toHaveLength(0);
  });

  it('drops entries that are missing an id or type instead of trusting the file', () => {
    fs.writeFileSync(
      path.join(dir, 'index.json'),
      JSON.stringify({
        version: 1,
        items: [
          { id: 'ok', type: 'text' },
          { id: 'no-type' },
          { type: 'text' },
        ],
      }),
    );
    const reopened = new Store(dir);
    expect(reopened.list().map((i) => i.id)).toEqual(['ok']);
  });
});

describe('moveTo', () => {
  it('refuses to move into a folder inside the current one, which would copy into itself', async () => {
    await expect(store.moveTo(path.join(dir, 'inner'))).rejects.toThrow(
      /inside the current one/,
    );
  });

  it('refuses a folder that already holds something', async () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'seorap-target-'));
    fs.writeFileSync(path.join(target, 'mine.txt'), 'x');
    await expect(store.moveTo(target)).rejects.toThrow(/empty folder/);
    fs.rmSync(target, { recursive: true, force: true });
  });

  it('says so in the language that is set', async () => {
    setLanguage('ko', 'ko-KR');
    await expect(store.moveTo(path.join(dir, 'inner'))).rejects.toThrow(
      /현재 폴더 안쪽/,
    );
  });

  it('carries the items across and leaves the old folder behind', async () => {
    const r = await store.addText('travels');
    store.flush();
    const target = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'seorap-move-')),
      'data',
    );
    const oldDir = dir;
    // afterEach 가 새 폴더를 치우도록 먼저 알려 둔다. 옮기고 나면 store.dir 이 여기다.
    dir = target;
    await store.moveTo(target);
    expect(store.dir).toBe(path.resolve(target));
    expect(fs.existsSync(path.join(target, r?.item.file ?? ''))).toBe(true);
    expect(store.list()).toHaveLength(1);
    expect(fs.existsSync(oldDir)).toBe(false);
  });
});

describe('onChange', () => {
  it('tells listeners what happened, and stops after unsubscribing', async () => {
    const seen: string[] = [];
    const off = store.onChange((e) => seen.push(e.type));
    const r = await store.addText('watched');
    store.update(r?.item.id ?? '', { pinned: true });
    await store.remove([r?.item.id ?? '']);
    expect(seen).toEqual(['add', 'update', 'remove']);
    off();
    await store.addText('unwatched');
    expect(seen).toHaveLength(3);
  });
});
