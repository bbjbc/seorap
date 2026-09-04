// 설정 스토어. 메인이 정본이고 여기는 그 사본이다. 바꾸려면 saveSettings() 로 메인에 보내고 결과를 받아 넣는다.
import { create } from 'zustand';
import { resolveLang, type Lang } from '../../shared/locales';
import { api } from '../lib/api';

type ShortcutErrors = Partial<Record<Seorap.ShortcutKey, string>>;

interface SettingsState {
  /** 부팅 전에는 null. 컴포넌트는 대부분 useSettings() 로 기본값 병합 없이 그대로 읽는다. */
  settings: Seorap.Settings | null;
  lang: Lang;
  version: string;
  isPackaged: boolean;
  shortcutErrors: ShortcutErrors;
  load: (bundle: Seorap.SettingsBundle) => void;
  apply: (settings: Seorap.Settings, shortcutErrors?: ShortcutErrors) => void;
}

const langOf = (s: Seorap.Settings): Lang => resolveLang(s.language, navigator.language);

export const useSettingsStore = create<SettingsState>()((set) => ({
  settings: null,
  lang: resolveLang(undefined, navigator.language),
  version: '',
  isPackaged: false,
  shortcutErrors: {},
  load: (b) =>
    set({ settings: b.settings, lang: langOf(b.settings), version: b.version, isPackaged: b.isPackaged, shortcutErrors: b.shortcutErrors }),
  apply: (settings, shortcutErrors) =>
    set((s) => ({ settings, lang: langOf(settings), shortcutErrors: shortcutErrors ?? s.shortcutErrors })),
}));

/** 설정 일부를 메인에 저장하고 돌아온 전체 설정으로 스토어를 맞춘다. */
export async function saveSettings(patch: Seorap.SettingsPatch): Promise<Seorap.Settings> {
  const r = await api.setSettings(patch);
  useSettingsStore.getState().apply(r.settings, r.shortcutErrors);
  return r.settings;
}

/** 메인에서 설정 묶음을 다시 읽어 온다 (설정 모달을 열 때). */
export async function reloadSettings(): Promise<Seorap.SettingsBundle> {
  const b = await api.getSettings();
  useSettingsStore.getState().load(b);
  return b;
}

export const useSettings = (): Seorap.Settings | null => useSettingsStore((s) => s.settings);
