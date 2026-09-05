// 화면에 찍히는 시각·크기·주소 문자열. 경계에서 어느 쪽으로 갈리는지가 전부다.
// 상대 시각은 "지금"에 따라 답이 달라지므로 시계를 고정한다. 그러지 않으면 CI 가 돌아가는
// 시각에 따라 통과했다 실패했다 한다 (실제로 새벽에 돌리면 "1시간 전"을 만들 수 없다).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  firstLineOf,
  fmtFull,
  fmtSize,
  fmtTime,
  groupOf,
  hostOf,
} from '../../../src/renderer/lib/format';

const MIN = 60e3;
const HOUR = 3600e3;
const DAY = 86400e3;

/** 2026년 5월 15일 금요일 14:30. 하루 안에서 앞뒤로 넉넉히 움직일 수 있는 시각. */
const NOW = new Date(2026, 4, 15, 14, 30, 0);
const now = (): number => NOW.getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('fmtTime', () => {
  it('calls anything under a minute "just now"', () => {
    expect(fmtTime(now(), 'en')).toBe('just now');
    expect(fmtTime(now() - 59e3, 'en')).toBe('just now');
  });

  it('switches to minutes exactly at one minute, and rounds down', () => {
    expect(fmtTime(now() - MIN, 'en')).toBe('1 min ago');
    expect(fmtTime(now() - 119e3, 'en')).toBe('1 min ago');
    expect(fmtTime(now() - 2 * MIN, 'en')).toBe('2 min ago');
  });

  it('switches to hours at one hour while the date is still today', () => {
    expect(fmtTime(now() - HOUR, 'en')).toBe('1 h ago');
    expect(fmtTime(now() - 5 * HOUR, 'en')).toBe('5 h ago');
  });

  it('says yesterday for the previous calendar day', () => {
    expect(fmtTime(now() - DAY, 'en')).toBe('Yesterday');
  });

  it('uses hours only within today, so early morning falls through to a date', () => {
    // 오늘 00:30 은 14시간 전이지만 날짜가 같아 "시간 전"이다.
    expect(fmtTime(new Date(2026, 4, 15, 0, 30).getTime(), 'en')).toBe(
      '14 h ago',
    );
    // 어제 23:30 은 15시간 전이지만 날짜가 다르므로 "어제"다.
    expect(fmtTime(new Date(2026, 4, 14, 23, 30).getTime(), 'en')).toBe(
      'Yesterday',
    );
  });

  it('drops the year inside this year and keeps it for older dates', () => {
    expect(fmtTime(new Date(2026, 2, 3, 12).getTime(), 'en')).toBe('Mar 3');
    expect(fmtTime(new Date(2019, 4, 3, 12).getTime(), 'en')).toBe(
      '2019.05.03',
    );
  });

  it('renders nothing for a missing timestamp instead of "Invalid Date"', () => {
    expect(fmtTime(undefined, 'en')).toBe('');
    expect(fmtTime(0, 'en')).toBe('');
  });

  it('follows the language for the words around the number', () => {
    expect(fmtTime(now(), 'ko')).toBe('방금');
    expect(fmtTime(now() - 5 * MIN, 'ko')).toBe('5분 전');
    expect(fmtTime(new Date(2026, 2, 3, 12).getTime(), 'ko')).toBe('3월 3일');
  });
});

describe('fmtFull', () => {
  it('pads every field to two digits', () => {
    expect(fmtFull(new Date(2026, 0, 2, 3, 4).getTime())).toBe(
      '2026.01.02 03:04',
    );
  });
  it('is empty when there is no timestamp', () => {
    expect(fmtFull(undefined)).toBe('');
  });
});

describe('fmtSize', () => {
  it('switches unit at each 1024 boundary', () => {
    expect(fmtSize(0)).toBe('0 B');
    expect(fmtSize(1023)).toBe('1023 B');
    expect(fmtSize(1024)).toBe('1 KB');
    expect(fmtSize(1024 ** 2 - 1)).toBe('1024 KB');
    expect(fmtSize(1024 ** 2)).toBe('1.0 MB');
    expect(fmtSize(1024 ** 3)).toBe('1.00 GB');
  });
  it('gives more decimals as the unit grows, so small files stay readable', () => {
    expect(fmtSize(1536)).toBe('2 KB');
    expect(fmtSize(1536 * 1024)).toBe('1.5 MB');
  });
  it('is empty for a missing size rather than "undefined"', () => {
    expect(fmtSize(undefined)).toBe('');
  });
});

describe('hostOf', () => {
  it('strips the www prefix so cards stay narrow', () => {
    expect(hostOf('https://www.example.com/a/b?c=d')).toBe('example.com');
    expect(hostOf('https://sub.example.com/')).toBe('sub.example.com');
  });
  it('returns empty for junk instead of throwing, since it runs while rendering', () => {
    expect(hostOf('not a url')).toBe('');
    expect(hostOf(undefined)).toBe('');
    expect(hostOf('')).toBe('');
  });
});

describe('firstLineOf', () => {
  it('takes the first line as the title, trimmed', () => {
    expect(firstLineOf('  title  \nbody')).toBe('title');
    expect(firstLineOf('only')).toBe('only');
  });
  it('skips leading blank lines rather than reporting an empty title', () => {
    expect(firstLineOf('\n\nbody')).toBe('body');
  });
  it('is empty only when there is nothing but whitespace', () => {
    expect(firstLineOf('')).toBe('');
    expect(firstLineOf('   \n  ')).toBe('');
  });
});

describe('groupOf', () => {
  it('names today, yesterday and this week apart', () => {
    expect(groupOf(now(), 'en')).toBe('Today');
    expect(groupOf(now() - DAY, 'en')).toBe('Yesterday');
    expect(groupOf(now() - 3 * DAY, 'en')).toBe('This week');
  });
  it('groups the rest of the current month together', () => {
    expect(groupOf(new Date(2026, 4, 2, 12).getTime(), 'en')).toBe(
      'This month',
    );
  });
  it('falls back to a year and month label for anything older', () => {
    expect(groupOf(new Date(2019, 4, 3).getTime(), 'en')).toBe('May 2019');
  });
});
