// 언어 해석과 문자열 조회. 사전은 src/shared/locales.ts 를 그대로 쓴다.
import { describe, it, expect, beforeEach } from 'vitest';
import { setLanguage, currentLanguage, t } from '../../src/main/i18n';
import { LOCALES, type LocaleKey } from '../../src/shared/locales';

beforeEach(() => {
  setLanguage('ko', 'ko-KR');
});

describe('setLanguage', () => {
  it('honours an explicit choice regardless of the OS locale', () => {
    expect(setLanguage('en', 'ko-KR')).toBe('en');
    expect(setLanguage('ko', 'en-US')).toBe('ko');
  });
  it('follows the OS locale for "system", and anything non-Korean becomes English', () => {
    expect(setLanguage('system', 'ko')).toBe('ko');
    expect(setLanguage('system', 'KO-kr')).toBe('ko');
    expect(setLanguage('system', 'en-US')).toBe('en');
    expect(setLanguage('system', 'ja-JP')).toBe('en');
  });
  it('is what currentLanguage() reports afterwards', () => {
    setLanguage('en', 'ko-KR');
    expect(currentLanguage()).toBe('en');
  });
});

describe('t', () => {
  it('returns the string for the active language', () => {
    expect(t('app.name')).toBe('서랍');
    setLanguage('en', 'ko-KR');
    expect(t('app.name')).toBe('Seorap');
  });
  it('fills {placeholders} and leaves unknown ones visible', () => {
    expect(t('vault.err_wait', { s: 7 })).toContain('7');
    expect(t('vault.err_wait')).toContain('{s}');
  });
  it('falls back to the key itself so a missing string is noticeable, not blank', () => {
    expect(t('no.such.key' as LocaleKey)).toBe('no.such.key');
  });
  it('has every Korean key in English too (the type guarantees it, this guards the runtime table)', () => {
    const ko = Object.keys(LOCALES.ko);
    const en = new Set(Object.keys(LOCALES.en));
    expect(ko.filter((k) => !en.has(k))).toEqual([]);
  });
});
