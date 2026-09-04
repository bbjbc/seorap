// 메인 프로세스용 문자열 조회. 사전은 src/shared/locales.ts 하나를 렌더러와 같이 쓴다.
import {
  type Lang,
  type LocaleKey,
  lookup,
  resolveLang,
} from '../shared/locales';

let current: Lang = 'ko';

export function setLanguage(
  setting: Seorap.Language,
  systemLocale: string,
): Lang {
  current = resolveLang(setting, systemLocale);
  return current;
}

export function currentLanguage(): Lang {
  return current;
}

export function t(
  key: LocaleKey,
  vars?: Record<string, string | number>,
): string {
  return lookup(current, key, vars);
}
