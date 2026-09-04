// 셸 수준 UI 상태: 모드, 모달, 플래시, 실행 취소, 배너, 새 버전.
import { create } from 'zustand';
import type { Item } from './items';

export interface PromptField {
  type?: 'text' | 'password';
  placeholder?: string;
  value?: string;
}

export interface PromptOptions {
  title: string;
  desc?: string;
  fields?: PromptField[];
  okText?: string;
  /** 오류 문구를 돌려주면 닫히지 않는다. null 이면 통과. */
  validate?: (values: string[]) => Promise<string | null> | string | null;
}

export interface PromptRequest {
  /** 요청마다 증가. 모달 본문을 새로 마운트하는 key. */
  seq: number;
  opts: PromptOptions;
  resolve: (values: string[] | null) => void;
}

export interface PendingDelete {
  ids: string[];
  removed: Item[];
}

export type ModalKind = 'prompt' | 'detail' | 'switcher' | 'settings';

interface UiState {
  mode: Seorap.Mode;
  /** 부팅 시퀀스(설정 → 항목 → 모드 → 금고 상태)가 끝났는지. E2E 가 기다린다. */
  booted: boolean;

  detailId: string | null;
  settingsOpen: boolean;
  switcherOpen: boolean;
  switcherQuery: string;
  prompt: PromptRequest | null;

  flash: { text: string; seq: number } | null;
  pendingDelete: PendingDelete | null;
  nudgeVisible: boolean;
  nudgeShownThisSession: boolean;
  update: Seorap.UpdateInfo | null;
  /** 파일을 끌어오는 동안 덮개에 보일 문구. null 이면 숨김. */
  dropText: string | null;

  setMode: (mode: Seorap.Mode) => void;
  setBooted: () => void;
  openDetail: (id: string) => void;
  closeDetail: () => void;
  setSettingsOpen: (open: boolean) => void;
  setSwitcherOpen: (open: boolean) => void;
  setSwitcherQuery: (q: string) => void;
  setPrompt: (p: PromptRequest | null) => void;
  showFlash: (text: string) => void;
  setPendingDelete: (p: PendingDelete | null) => void;
  setNudge: (visible: boolean) => void;
  setUpdate: (info: Seorap.UpdateInfo | null) => void;
  setDropText: (text: string | null) => void;
}

export const useUiStore = create<UiState>()((set) => ({
  mode: 'board',
  booted: false,
  detailId: null,
  settingsOpen: false,
  switcherOpen: false,
  switcherQuery: '',
  prompt: null,
  flash: null,
  pendingDelete: null,
  nudgeVisible: false,
  nudgeShownThisSession: false,
  update: null,
  dropText: null,

  setMode: (mode) => set({ mode }),
  setBooted: () => set({ booted: true }),
  openDetail: (id) => set({ detailId: id }),
  closeDetail: () => set({ detailId: null }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSwitcherOpen: (switcherOpen) =>
    set(switcherOpen ? { switcherOpen, switcherQuery: '' } : { switcherOpen }),
  setSwitcherQuery: (switcherQuery) => set({ switcherQuery }),
  setPrompt: (prompt) => set({ prompt }),
  showFlash: (text) =>
    set((s) => ({ flash: { text, seq: (s.flash?.seq ?? 0) + 1 } })),
  setPendingDelete: (pendingDelete) => set({ pendingDelete }),
  setNudge: (visible) =>
    set((s) => ({
      nudgeVisible: visible,
      nudgeShownThisSession: s.nudgeShownThisSession || visible,
    })),
  setUpdate: (update) => set({ update }),
  setDropText: (dropText) => set({ dropText }),
}));

/** 열린 모달 중 맨 위. Esc 는 이것부터 닫는다. */
export function topModal(s: UiState = useUiStore.getState()): ModalKind | null {
  if (s.prompt) return 'prompt';
  if (s.detailId) return 'detail';
  if (s.switcherOpen) return 'switcher';
  if (s.settingsOpen) return 'settings';
  return null;
}

export const useMode = (): Seorap.Mode => useUiStore((s) => s.mode);
