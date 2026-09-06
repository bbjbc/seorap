'use client';

import { useEffect, useRef, useState } from 'react';

type Props = { text: string; label: string; doneLabel: string };

export function CopyButton({ text, label, doneLabel }: Props) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // 클립보드를 막아둔 브라우저에서는 조용히 넘어간다.
    }
    setDone(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 1600);
  }

  return (
    <button
      type="button"
      className={done ? 'copy is-done' : 'copy'}
      onClick={copy}
    >
      {done ? doneLabel : label}
    </button>
  );
}
