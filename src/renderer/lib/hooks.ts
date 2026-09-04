import { useEffect, useState } from 'react';

/** ms 마다 1씩 오르는 값. 상대 시각("3분 전")처럼 시간이 흐르면 바뀌는 표시를 다시 그리는 데 쓴다. */
export function useTick(ms: number, enabled = true): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setTick((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
  return tick;
}

/** value 가 ms 동안 바뀌지 않으면 그 값을 돌려준다. 검색 입력처럼 타이핑마다 필터하고 싶지 않을 때. */
export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
