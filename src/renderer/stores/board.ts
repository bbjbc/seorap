// 보드 뷰의 필터·선택 상태.
import { create } from 'zustand';

export type TypeFilter = Seorap.ItemType | 'all';

const PAGE = 120;

interface BoardState {
  query: string;
  type: TypeFilter;
  pinnedOnly: boolean;
  tag: string | null;
  selected: ReadonlySet<string>;
  /** 무한 스크롤로 지금까지 그리기로 한 개수. 필터가 바뀌면 처음으로 돌아간다. */
  renderLimit: number;
  /** 복사 애니메이션을 다시 재생할 카드. seq 가 바뀔 때마다 한 번. */
  copyFlash: { id: string; seq: number } | null;

  setQuery: (q: string) => void;
  setType: (t: TypeFilter) => void;
  togglePinnedOnly: () => void;
  /** 같은 태그를 다시 고르면 해제. */
  toggleTag: (tag: string | null) => void;
  selectOnly: (id: string) => void;
  toggleSelect: (id: string) => void;
  selectMany: (ids: Iterable<string>) => void;
  deselect: (ids: Iterable<string>) => void;
  clearSelection: () => void;
  growLimit: () => void;
  flashCopy: (id: string) => void;
}

export const useBoardStore = create<BoardState>()((set) => ({
  query: '',
  type: 'all',
  pinnedOnly: false,
  tag: null,
  selected: new Set(),
  renderLimit: PAGE,
  copyFlash: null,

  setQuery: (query) => set({ query, renderLimit: PAGE }),
  setType: (type) => set({ type, renderLimit: PAGE }),
  togglePinnedOnly: () => set((s) => ({ pinnedOnly: !s.pinnedOnly })),
  toggleTag: (tag) => set((s) => ({ tag: s.tag === tag ? null : tag })),
  selectOnly: (id) => set({ selected: new Set([id]) }),
  toggleSelect: (id) =>
    set((s) => {
      const next = new Set(s.selected);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selected: next };
    }),
  selectMany: (ids) =>
    set((s) => {
      const next = new Set(s.selected);
      for (const id of ids) next.add(id);
      return { selected: next };
    }),
  deselect: (ids) =>
    set((s) => {
      const next = new Set(s.selected);
      for (const id of ids) next.delete(id);
      return { selected: next };
    }),
  clearSelection: () => set({ selected: new Set() }),
  growLimit: () => set((s) => ({ renderLimit: s.renderLimit + PAGE })),
  flashCopy: (id) => set((s) => ({ copyFlash: { id, seq: (s.copyFlash?.seq ?? 0) + 1 } })),
}));
