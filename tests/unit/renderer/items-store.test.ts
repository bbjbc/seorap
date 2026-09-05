// 항목 스토어. 메인이 보내는 변경과 렌더러의 낙관적 수정이 모두 여기로 모이므로,
// 같은 항목이 두 번 들어오거나 없는 항목을 건드릴 때 무너지지 않아야 한다.
import { beforeEach, describe, expect, it } from 'vitest';
import { findItem, useItemsStore } from '../../../src/renderer/stores/items';
import { ids, item } from './helpers';

beforeEach(() => {
  useItemsStore.setState({ items: [] });
});

const store = () => useItemsStore.getState();

describe('add', () => {
  it('puts a new item at the front, where the newest belongs', () => {
    const a = item();
    const b = item();
    store().setAll([a]);
    store().add(b);
    expect(ids(store().items)).toEqual([b.id, a.id]);
  });

  it('ignores an item it already has, because the reply and the broadcast both arrive', () => {
    const a = item({ text: 'first' });
    store().setAll([a]);
    store().add({ ...a, text: 'second' });
    expect(store().items).toHaveLength(1);
    expect(store().items[0]?.text).toBe('first');
  });
});

describe('replace', () => {
  it('swaps the item in place, keeping its position', () => {
    const a = item();
    const b = item();
    store().setAll([a, b]);
    store().replace({ ...b, title: 'renamed' });
    expect(ids(store().items)).toEqual([a.id, b.id]);
    expect(store().items[1]?.title).toBe('renamed');
  });

  it('does nothing for an item that is gone, rather than resurrecting it', () => {
    store().setAll([item()]);
    store().replace(item({ id: 'missing' }));
    expect(store().items).toHaveLength(1);
    expect(findItem('missing')).toBeUndefined();
  });
});

describe('patch', () => {
  it('changes only the given fields', () => {
    const a = item({ title: 'keep', text: 'old' });
    store().setAll([a]);
    store().patch(a.id, { text: 'new' });
    expect(store().items[0]).toMatchObject({ title: 'keep', text: 'new' });
  });

  it('leaves other items untouched', () => {
    const a = item();
    const b = item();
    store().setAll([a, b]);
    store().patch(a.id, { pinned: true });
    expect(findItem(b.id)?.pinned).toBe(false);
  });
});

describe('remove', () => {
  it('drops every listed id in one pass', () => {
    const a = item();
    const b = item();
    const c = item();
    store().setAll([a, b, c]);
    store().remove([a.id, c.id]);
    expect(ids(store().items)).toEqual([b.id]);
  });

  it('shrugs at ids it does not have', () => {
    const a = item();
    store().setAll([a]);
    store().remove(['nope']);
    expect(store().items).toHaveLength(1);
  });
});

describe('restore', () => {
  it('puts undone deletions back in creation order, newest first', () => {
    const kept = item({ createdAt: 200 });
    const undone = item({ createdAt: 300 });
    const older = item({ createdAt: 100 });
    store().setAll([kept]);
    store().restore([undone, older]);
    expect(ids(store().items)).toEqual([undone.id, kept.id, older.id]);
  });
});

describe('findItem', () => {
  it('reads through to the live store', () => {
    const a = item();
    store().setAll([a]);
    expect(findItem(a.id)?.id).toBe(a.id);
  });

  it('is undefined for null or a stale id, so callers can bail out', () => {
    expect(findItem(null)).toBeUndefined();
    expect(findItem(undefined)).toBeUndefined();
    expect(findItem('gone')).toBeUndefined();
  });
});
