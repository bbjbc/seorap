// 보드에 무엇이 보이고 어떤 순서인지. 필터가 겹칠 때가 특히 틀리기 쉽다.
import { describe, expect, it } from 'vitest';
import {
  type BoardFilter,
  boardCounts,
  boardItems,
  isBoardItem,
} from '../../../src/renderer/features/board/selectors';
import { ids, item } from './helpers';

const ALL: BoardFilter = {
  query: '',
  type: 'all',
  pinnedOnly: false,
  tag: null,
};
const filter = (patch: Partial<BoardFilter> = {}): BoardFilter => ({
  ...ALL,
  ...patch,
});

describe('isBoardItem', () => {
  it('keeps clipboard items and drops notes, which belong to the notes view', () => {
    expect(isBoardItem(item({ type: 'text' }))).toBe(true);
    expect(isBoardItem(item({ type: 'text', note: true }))).toBe(false);
  });
});

describe('boardItems', () => {
  it('hides notes even when nothing is filtered', () => {
    const clip = item({ text: 'copied' });
    const memo = item({ text: 'written', note: true });
    expect(ids(boardItems([clip, memo], ALL))).toEqual([clip.id]);
  });

  it('puts pinned items first, then newest first inside each group', () => {
    const old = item({ createdAt: 100 });
    const recent = item({ createdAt: 300 });
    const pinnedOld = item({ createdAt: 200, pinned: true });
    expect(ids(boardItems([old, recent, pinnedOld], ALL))).toEqual([
      pinnedOld.id,
      recent.id,
      old.id,
    ]);
  });

  it('filters by type', () => {
    const img = item({ type: 'image' });
    const link = item({ type: 'link' });
    expect(ids(boardItems([img, link], filter({ type: 'image' })))).toEqual([
      img.id,
    ]);
  });

  it('searches title, body, url, link title and tags together', () => {
    const byTitle = item({ type: 'file', title: 'invoice.pdf' });
    const byText = item({ text: 'the invoice is late' });
    const byUrl = item({ type: 'link', url: 'https://invoice.example.com' });
    const byLinkTitle = item({
      type: 'link',
      url: 'https://x.test',
      linkTitle: 'Invoice 2026',
    });
    const byTag = item({ text: 'unrelated', tags: ['invoice'] });
    const miss = item({ text: 'nothing to see' });
    const found = boardItems(
      [byTitle, byText, byUrl, byLinkTitle, byTag, miss],
      filter({ query: 'invoice' }),
    );
    expect(found).toHaveLength(5);
    expect(ids(found)).not.toContain(miss.id);
  });

  it('ignores case and surrounding spaces in the query', () => {
    const it1 = item({ text: 'Hello World' });
    expect(boardItems([it1], filter({ query: '  hello  ' }))).toHaveLength(1);
  });

  it('treats a whitespace-only query as no query at all', () => {
    const it1 = item({ text: 'anything' });
    expect(boardItems([it1], filter({ query: '   ' }))).toHaveLength(1);
  });

  it('narrows to pinned only, and combines with the other filters', () => {
    const pinnedImg = item({ type: 'image', pinned: true });
    const plainImg = item({ type: 'image' });
    const pinnedLink = item({ type: 'link', pinned: true });
    const both = boardItems(
      [pinnedImg, plainImg, pinnedLink],
      filter({ pinnedOnly: true, type: 'image' }),
    );
    expect(ids(both)).toEqual([pinnedImg.id]);
  });

  it('matches a tag exactly, not as a substring', () => {
    const exact = item({ tags: ['work'] });
    const longer = item({ tags: ['workshop'] });
    expect(ids(boardItems([exact, longer], filter({ tag: 'work' })))).toEqual([
      exact.id,
    ]);
  });
});

describe('boardCounts', () => {
  it('counts per type and totals them, leaving notes out', () => {
    const counts = boardCounts([
      item({ type: 'image' }),
      item({ type: 'image' }),
      item({ type: 'link' }),
      item({ type: 'text', note: true }),
    ]);
    expect(counts).toEqual({ all: 3, image: 2, text: 0, link: 1, file: 0 });
  });

  it('reports zeros rather than missing keys, so chips can render blank', () => {
    expect(boardCounts([])).toEqual({
      all: 0,
      image: 0,
      text: 0,
      link: 0,
      file: 0,
    });
  });
});
