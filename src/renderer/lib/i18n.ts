// 렌더러 문자열 조회. 현재 언어는 settings 스토어가 들고 있다 (설정 + OS 언어에서 결정).
import { useCallback } from 'react';
import { type Lang, type LocaleKey, lookup } from '../../shared/locales';
import { useSettingsStore } from '../stores/settings';

export type Translate = (
  key: LocaleKey,
  vars?: Record<string, string | number>,
) => string;

export const useLang = (): Lang => useSettingsStore((s) => s.lang);

/** 컴포넌트용. 언어가 바뀌면 새 함수를 돌려줘 의존한 곳이 다시 그려진다. */
export const useT = (): Translate => {
  const lang = useLang();
  return useCallback<Translate>((key, vars) => lookup(lang, key, vars), [lang]);
};

/** 액션·이벤트 핸들러 등 훅을 쓸 수 없는 곳용. 호출 시점의 언어를 쓴다. */
export const t: Translate = (key, vars) =>
  lookup(useSettingsStore.getState().lang, key, vars);
