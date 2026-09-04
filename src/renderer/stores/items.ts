// 보드·메모가 공유하는 항목 목록. 메인이 보내는 items:changed 와 로컬 낙관적 수정이 여기로 모인다.
import { create } from 'zustand';

export type Item = Seorap.ClientItem;

interface ItemsState {
  items: Item[];
  setAll: (items: Item[]) => void;
  /** 이미 있으면 무시하고, 없으면 맨 앞에 넣는다 (메인이 add 이벤트로 보내는 순서가 최신순). */
  add: (item: Item) => void;
  /** 같은 id 를 통째로 교체한다. 없으면 무시. */
  replace: (item: Item) => void;
  /** 로컬 필드만 고친다 (편집 중 텍스트, 순서 등). 저장은 호출한 쪽 책임. */
  patch: (id: string, patch: Partial<Item>) => void;
  remove: (ids: readonly string[]) => void;
  /** 실행 취소로 되살린 항목을 다시 넣고 최신순으로 정렬한다. */
  restore: (items: Item[]) => void;
}

export const useItemsStore = create<ItemsState>()((set) => ({
  items: [],
  setAll: (items) => set({ items }),
  add: (item) =>
    set((s) => (s.items.some((i) => i.id === item.id) ? s : { items: [item, ...s.items] })),
  replace: (item) => set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),
  patch: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
  remove: (ids) => {
    const gone = new Set(ids);
    set((s) => ({ items: s.items.filter((i) => !gone.has(i.id)) }));
  },
  restore: (back) =>
    set((s) => ({ items: [...back, ...s.items].sort((a, b) => b.createdAt - a.createdAt) })),
}));

export const findItem = (id: string | null | undefined): Item | undefined =>
  id ? useItemsStore.getState().items.find((i) => i.id === id) : undefined;
