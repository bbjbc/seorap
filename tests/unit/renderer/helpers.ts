// 렌더러 테스트용 항목 만들기. 셀렉터가 실제로 보는 필드만 인자로 받고 나머지는 기본값으로 채운다.
import type { Item } from '../../../src/renderer/stores/items';

let seq = 0;

export function item(patch: Partial<Item> = {}): Item {
  seq += 1;
  return {
    id: `i${seq}`,
    type: 'text',
    createdAt: 1_000_000,
    pinned: false,
    tags: [],
    title: '',
    source: 'test',
    thumbUrl: null,
    fileUrl: null,
    ...patch,
  };
}

/** 메모 하나. note 플래그와 본문만 신경 쓰면 되는 경우가 대부분이다. */
export const note = (text: string, patch: Partial<Item> = {}): Item =>
  item({ type: 'text', note: true, text, ...patch });

export const ids = (list: readonly Item[]): string[] => list.map((i) => i.id);
