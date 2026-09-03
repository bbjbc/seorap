// 메인 프로세스용 문자열 조회. 사전은 src/shared/locales.ts 하나를 렌더러와 같이 쓴다.
import '../shared/locales';

const g = globalThis as unknown as {
  SEORAP_LOCALES: Record<SeorapLang, Record<SeorapLocaleKey, string>>;
  seorapResolveLang: (setting: string | undefined, systemLocale: string) => SeorapLang;
  seorapFormat: (template: string, vars?: Record<string, string | number>) => string;
};

let current: SeorapLang = 'ko';

export function setLanguage(setting: Seorap.Language, systemLocale: string): SeorapLang {
  current = g.seorapResolveLang(setting, systemLocale);
  return current;
}

export function currentLanguage(): SeorapLang {
  return current;
}

export function t(key: SeorapLocaleKey, vars?: Record<string, string | number>): string {
  const s = g.SEORAP_LOCALES[current][key] ?? g.SEORAP_LOCALES.ko[key] ?? key;
  return g.seorapFormat(s, vars);
}
