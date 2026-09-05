// 메모 안 찾기의 일치 계산. 겹치는 문자열에서 몇 개를 세느냐가 브라우저 동작과 같아야 한다.
import { describe, expect, it } from 'vitest';
import { computeMatches } from '../../../src/renderer/features/notes/find';

describe('computeMatches', () => {
  it('returns the start offset of every match', () => {
    expect(computeMatches('a b a', 'a')).toEqual([0, 4]);
  });

  it('ignores case in both the text and the query', () => {
    expect(computeMatches('Apple APPLE apple', 'aPpLe')).toEqual([0, 6, 12]);
  });

  it('does not overlap matches, the way find in a browser does not', () => {
    // 'aaaa' 에서 'aa' 는 0 과 2 두 곳이다. 겹쳐 세면 3개가 되어 버린다.
    expect(computeMatches('aaaa', 'aa')).toEqual([0, 2]);
    expect(computeMatches('aaa', 'aa')).toEqual([0]);
  });

  it('finds matches that span a line break position', () => {
    expect(computeMatches('one\ntwo', 'e\nt')).toEqual([2]);
  });

  it('returns nothing for an empty query, so the bar shows no count', () => {
    expect(computeMatches('anything', '')).toEqual([]);
  });

  it('returns nothing when the text is empty', () => {
    expect(computeMatches('', 'x')).toEqual([]);
  });

  it('handles a query longer than the text', () => {
    expect(computeMatches('ab', 'abcdef')).toEqual([]);
  });

  it('counts Korean text the same way', () => {
    expect(computeMatches('사과 바나나 사과', '사과')).toEqual([0, 7]);
  });
});
