// 컴포넌트가 마운트한 DOM 요소를 액션(훅 밖)에서 쓰기 위한 작은 등록소.
// 예: 전역 단축키가 검색칸에 포커스를 주거나, 찾기 액션이 textarea 의 선택 범위를 옮길 때.
// 전체 문서를 querySelector 로 뒤지지 않고, 소유 컴포넌트가 ref 로 등록한 요소만 쓴다.
import type { RefCallback } from 'react';

export interface Handle<T> {
  /** 현재 등록된 요소. 마운트 전·언마운트 후에는 null. */
  get: () => T | null;
  /** `ref={handle.attach}` 로 붙인다. 함수 참조가 고정돼 렌더마다 재등록되지 않는다. */
  attach: RefCallback<T>;
}

export function createHandle<T>(): Handle<T> {
  let current: T | null = null;
  return {
    get: () => current,
    attach: (el) => {
      current = el;
    },
  };
}
