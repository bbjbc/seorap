// 보드에 보일 항목과 종류별 개수. 순수 함수라 컴포넌트와 액션이 같은 결과를 본다.

import type { TypeFilter } from '../../stores/board';
import type { Item } from '../../stores/items';

export interface BoardFilter {
  query: string;
  type: TypeFilter;
  pinnedOnly: boolean;
  tag: string | null;
}

/** 보드는 클립보드 전용이다. 메모(note)는 메모 모드에서만 다룬다. */
export const isBoardItem = (it: Item): boolean => !it.note;

export function boardItems(items: readonly Item[], f: BoardFilter): Item[] {
  const q = f.query.trim().toLowerCase();
  const list = items.filter((it) => {
    if (!isBoardItem(it)) return false;
    if (f.type !== 'all' && it.type !== f.type) return false;
    if (f.pinnedOnly && !it.pinned) return false;
    if (f.tag && !it.tags.includes(f.tag)) return false;
    if (q) {
      const hay = [it.title, it.text, it.url, it.linkTitle, it.tags.join(' ')]
        .join('\n')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  list.sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt,
  );
  return list;
}

export function boardCounts(
  items: readonly Item[],
): Record<TypeFilter, number> {
  const counts: Record<TypeFilter, number> = {
    all: 0,
    image: 0,
    text: 0,
    link: 0,
    file: 0,
  };
  for (const it of items) {
    if (!isBoardItem(it)) continue;
    counts.all++;
    counts[it.type]++;
  }
  return counts;
}
