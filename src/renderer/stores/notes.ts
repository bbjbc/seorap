// 메모 뷰 상태: 목록 검색, 열린 메모, 저장 표시, 메모 안 찾기.
import { create } from 'zustand';

export type SaveState = 'idle' | 'saving' | 'saved';

export interface FindState {
  open: boolean;
  query: string;
  /** 일치 시작 위치들 (정렬됨) */
  matches: number[];
  /** 현재 선택된 일치의 인덱스. -1 이면 아직 없음. */
  index: number;
}

interface NotesState {
  query: string;
  noteId: string | null;
  saveState: SaveState;
  find: FindState;

  setQuery: (q: string) => void;
  setNoteId: (id: string | null) => void;
  setSaveState: (s: SaveState) => void;
  setFind: (patch: Partial<FindState>) => void;
}

const FIND_CLOSED: FindState = {
  open: false,
  query: '',
  matches: [],
  index: -1,
};

export const useNotesStore = create<NotesState>()((set) => ({
  query: '',
  noteId: null,
  saveState: 'idle',
  find: FIND_CLOSED,

  setQuery: (query) => set({ query }),
  setNoteId: (noteId) => set({ noteId }),
  setSaveState: (saveState) => set({ saveState }),
  setFind: (patch) => set((s) => ({ find: { ...s.find, ...patch } })),
}));

export const useNoteId = (): string | null => useNotesStore((s) => s.noteId);
