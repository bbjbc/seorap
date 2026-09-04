// 사전 문자열 안의 <b> <kbd> <br> 만 요소로 바꾼다. 그 외 문자는 전부 글자 그대로 그린다 (innerHTML 없음).
import type { ReactNode } from 'react';

const TOKEN_RE = /(<\/?(?:b|kbd)>|<br\s*\/?>)/;

interface Props {
  text: string;
}

export const RichText = ({ text }: Props) => {
  const out: ReactNode[] = [];
  const stack: { tag: 'b' | 'kbd'; children: ReactNode[] }[] = [];
  let key = 0;
  const push = (node: ReactNode): void => {
    (stack[stack.length - 1]?.children ?? out).push(node);
  };
  for (const part of text.split(TOKEN_RE)) {
    if (!part) continue;
    if (/^<br\s*\/?>$/.test(part)) push(<br key={key++} />);
    else if (part === '<b>' || part === '<kbd>')
      stack.push({ tag: part === '<b>' ? 'b' : 'kbd', children: [] });
    else if (part === '</b>' || part === '</kbd>') {
      const top = stack.pop();
      if (!top) continue;
      push(
        top.tag === 'b' ? (
          <b key={key++}>{top.children}</b>
        ) : (
          <kbd key={key++}>{top.children}</kbd>
        ),
      );
    } else push(part);
  }
  // 닫히지 않은 태그가 있으면 내용만 살린다.
  while (stack.length) {
    const top = stack.pop();
    if (top) push(top.children);
  }
  return <>{out}</>;
};
