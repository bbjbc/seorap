// 시각·크기·URL 표시용 순수 함수. 언어에 따라 달라지는 것은 lang 을 받는다.
import { lookup, type Lang } from '../../shared/locales';

export const monthName = (d: Date, lang: Lang, style: 'short' | 'long' = 'short'): string =>
  new Intl.DateTimeFormat(lang === 'ko' ? 'ko-KR' : 'en-US', { month: style }).format(d);

/** 상대 시각. "방금", "3분 전", 오늘이면 "2시간 전", 어제, 올해면 "9월 4일", 그 외 YYYY.MM.DD */
export function fmtTime(ts: number | undefined, lang: Lang): string {
  if (!ts) return '';
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60e3) return lookup(lang, 'common.just_now');
  if (diff < 3600e3) return lookup(lang, 'time.min_ago', { n: Math.floor(diff / 60e3) });
  if (diff < 86400e3 && d.getDate() === new Date().getDate()) return lookup(lang, 'time.hour_ago', { n: Math.floor(diff / 3600e3) });
  if (d.toDateString() === new Date(now - 86400e3).toDateString()) return lookup(lang, 'common.yesterday');
  if (d.getFullYear() === new Date().getFullYear()) {
    return lookup(lang, 'time.month_day', { m: d.getMonth() + 1, d: d.getDate(), mon: monthName(d, lang) });
  }
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
}

export function fmtFull(ts: number | undefined): string {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fmtSize(b: number | undefined): string {
  if (b === undefined) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(0)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024 ** 3).toFixed(2)} GB`;
}

export function hostOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export const firstLineOf = (text: string): string => (text.trim().split('\n')[0] ?? '').trim();

/** 메모 목록의 날짜 그룹 이름 */
export function groupOf(ts: number, lang: Lang): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return lookup(lang, 'common.today');
  if (d.toDateString() === new Date(now.getTime() - 86400e3).toDateString()) return lookup(lang, 'common.yesterday');
  if (now.getTime() - ts < 7 * 86400e3) return lookup(lang, 'time.this_week');
  if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return lookup(lang, 'time.this_month');
  return lookup(lang, 'time.year_month', { y: d.getFullYear(), m: d.getMonth() + 1, mon: monthName(d, lang, 'long') });
}

const pad2 = (n: number): string => String(n).padStart(2, '0');
