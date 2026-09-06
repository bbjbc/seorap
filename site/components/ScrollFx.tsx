'use client';

import { useEffect } from 'react';

/** 스크롤해서 들어올 때 나타나는 요소들. 실제 연출은 globals.css 의 [data-reveal] 이 한다. */
const SELECTOR = '.js-step, .js-card, .js-line, .js-check, .js-reveal';

/**
 * 화면에 들어왔는지만 알려주는 역할. 나타나는 모양은 전부 CSS 다.
 *
 * 대상은 전부 첫 화면 아래에 있어서, 여기서 숨겼다가 보여줘도 깜빡이지 않는다.
 * 그래서 <html> 에 플래그를 붙이는 인라인 스크립트가 필요없다.
 * 스크립트가 없거나 동작 줄이기 설정이면 아무것도 안 하고, 내용은 그냥 다 보인다.
 */
export function ScrollFx() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll<HTMLElement>(SELECTOR);
    for (const el of targets) el.dataset.reveal = 'off';

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.reveal = 'on';
          io.unobserve(entry.target); // 한 번만 나타난다.
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );

    for (const el of targets) io.observe(el);
    return () => io.disconnect();
  }, []);

  return null;
}
