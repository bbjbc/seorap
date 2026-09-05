// 메모 목록의 내용과 순서, 그리고 날짜 머리글. 직접 정렬에서 순서가 없는 메모를 어떻게 두는지가 핵심이다.
import { describe, expect, it } from 'vitest';
import {
  type NoteFilter,
  noteItems,
  noteRows,
} from '../../../src/renderer/features/notes/selectors';
import { ids, item, note } from './helpers';

const BASE: NoteFilter = {
  query: '',
  noteId: null,
  showClipboardText: false,
  sort: 'recent',
};
const filter = (patch: Partial<NoteFilter> = {}): NoteFilter => ({
  ...BASE,
  ...patch,
});

describe('noteItems', () => {
  it('shows notes and hides clipboard text by default', () => {
    const memo = note('written');
    const clip = item({ type: 'text', text: 'copied' });
    expect(ids(noteItems([memo, clip], BASE))).toEqual([memo.id]);
  });

  it('includes clipboard text once the option is on', () => {
    const memo = note('written');
    const clip = item({ type: 'text', text: 'copied' });
    expect(
      noteItems([memo, clip], filter({ showClipboardText: true })),
    ).toHaveLength(2);
  });

  it('keeps the open note in the list even if it is clipboard text', () => {
    const clip = item({ type: 'text', text: 'copied' });
    expect(ids(noteItems([clip], filter({ noteId: clip.id })))).toEqual([
      clip.id,
    ]);
  });

  it('leaves out anything that is not text, whatever the settings', () => {
    const img = item({ type: 'image' });
    expect(noteItems([img], filter({ showClipboardText: true }))).toHaveLength(
      0,
    );
  });

  it('orders by last edit, not creation, and puts pinned notes on top', () => {
    const a = note('a', { createdAt: 100, updatedAt: 400 });
    const b = note('b', { createdAt: 300, updatedAt: 500 });
    const pinned = note('p', { createdAt: 50, updatedAt: 100, pinned: true });
    expect(ids(noteItems([a, b, pinned], BASE))).toEqual([
      pinned.id,
      b.id,
      a.id,
    ]);
  });

  it('falls back to creation time when a note was never edited', () => {
    const older = note('older', { createdAt: 100 });
    const newer = note('newer', { createdAt: 200 });
    expect(ids(noteItems([older, newer], BASE))).toEqual([newer.id, older.id]);
  });

  it('follows the manual order when the user sorted by hand', () => {
    const a = note('a', { order: 2, updatedAt: 900 });
    const b = note('b', { order: 0, updatedAt: 100 });
    const c = note('c', { order: 1, updatedAt: 500 });
    expect(ids(noteItems([a, b, c], filter({ sort: 'manual' })))).toEqual([
      b.id,
      c.id,
      a.id,
    ]);
  });

  it('floats notes with no order to the top, newest first, so a new note is reachable', () => {
    const placed = note('placed', { order: 0, updatedAt: 100 });
    const fresh = note('fresh', { updatedAt: 900 });
    const fresher = note('fresher', { updatedAt: 950 });
    expect(
      ids(noteItems([placed, fresh, fresher], filter({ sort: 'manual' }))),
    ).toEqual([fresher.id, fresh.id, placed.id]);
  });

  it('ignores pinning in manual mode, since the user set the order', () => {
    const first = note('first', { order: 0 });
    const pinnedLast = note('pinned', { order: 1, pinned: true });
    expect(
      ids(noteItems([first, pinnedLast], filter({ sort: 'manual' }))),
    ).toEqual([first.id, pinnedLast.id]);
  });

  it('searches the body, case-insensitively', () => {
    const hit = note('Shopping list');
    const miss = note('meeting notes');
    expect(ids(noteItems([hit, miss], filter({ query: 'SHOPPING' })))).toEqual([
      hit.id,
    ]);
  });
});

describe('noteRows', () => {
  it('inserts a header whenever the day group changes', () => {
    const now = Date.now();
    const today = note('today', { updatedAt: now });
    const old = note('old', { updatedAt: new Date(2019, 0, 1).getTime() });
    const rows = noteRows([today, old], false, 'en');
    expect(rows.map((r) => r.kind)).toEqual(['group', 'note', 'group', 'note']);
  });

  it('does not repeat a header for consecutive notes in the same group', () => {
    const now = Date.now();
    const rows = noteRows(
      [note('a', { updatedAt: now }), note('b', { updatedAt: now })],
      false,
      'en',
    );
    expect(rows.filter((r) => r.kind === 'group')).toHaveLength(1);
  });

  it('gives pinned notes their own group above the dates', () => {
    const rows = noteRows(
      [note('p', { pinned: true, updatedAt: Date.now() })],
      false,
      'en',
    );
    expect(rows[0]).toEqual({ kind: 'group', label: 'Pinned' });
  });

  it('drops every header in manual mode, where the order is the users', () => {
    const rows = noteRows([note('a'), note('b')], true, 'en');
    expect(rows.every((r) => r.kind === 'note')).toBe(true);
    expect(rows).toHaveLength(2);
  });
});
