// 금고 뷰 상태. 비밀번호(secret)는 선택한 항목의 것만, 폼 초안(draft) 안에 잠시 들고 있다.
import { create } from 'zustand';

export type VaultDraft = Required<Pick<Seorap.VaultFields, 'name' | 'url' | 'username' | 'password' | 'notes'>>;

interface VaultState {
  status: Seorap.VaultStatus | null;
  entries: Seorap.VaultEntryPublic[];
  id: string | null;
  draft: VaultDraft | null;
  passVisible: boolean;
  saveState: 'idle' | 'saving' | 'saved';
  /** 마지막 사용 시각. 자동 잠금 카운트다운의 기준. */
  lastTouch: number;

  setStatus: (s: Seorap.VaultStatus) => void;
  setEntries: (e: Seorap.VaultEntryPublic[]) => void;
  replaceEntry: (e: Seorap.VaultEntryPublic) => void;
  setId: (id: string | null) => void;
  setDraft: (d: VaultDraft | null) => void;
  patchDraft: (p: Partial<VaultDraft>) => void;
  setPassVisible: (v: boolean) => void;
  setSaveState: (s: 'idle' | 'saving' | 'saved') => void;
  touch: () => void;
  /** 잠기면 목록·선택·초안을 모두 비운다. */
  clearForLock: () => void;
}

export const EMPTY_DRAFT: VaultDraft = { name: '', url: '', username: '', password: '', notes: '' };

export const useVaultStore = create<VaultState>()((set) => ({
  status: null,
  entries: [],
  id: null,
  draft: null,
  passVisible: false,
  saveState: 'idle',
  lastTouch: 0,

  setStatus: (status) => set({ status }),
  setEntries: (entries) => set({ entries }),
  replaceEntry: (e) => set((s) => ({ entries: s.entries.map((x) => (x.id === e.id ? e : x)) })),
  setId: (id) => set({ id }),
  setDraft: (draft) => set({ draft, passVisible: false }),
  patchDraft: (p) => set((s) => (s.draft ? { draft: { ...s.draft, ...p } } : s)),
  setPassVisible: (passVisible) => set({ passVisible }),
  setSaveState: (saveState) => set({ saveState }),
  touch: () => set({ lastTouch: Date.now() }),
  clearForLock: () => set({ entries: [], id: null, draft: null, passVisible: false, saveState: 'idle' }),
}));

export const useVaultUnlocked = (): boolean => useVaultStore((s) => s.status?.unlocked ?? false);
