// 현재 일치 위치 표시. textarea 는 포커스를 잃으면 선택을 그리지 않으므로, 같은 글꼴·여백의 거울 div 에
// 같은 글을 넣고 일치 구간을 span 으로 감싸 좌표를 재서 따로 덧그린다.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useNotesStore } from '../../stores/notes';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  text: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export const FindHighlight = ({ text, textareaRef }: Props) => {
  const find = useNotesStore((s) => s.find);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [scrollTick, setScrollTick] = useState(0);

  const start = find.open ? find.matches[find.index] : undefined;
  const end = start === undefined ? undefined : start + find.query.length;

  // 편집기가 스크롤되면 위치를 다시 잰다.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || start === undefined) return;
    const onScroll = (): void => setScrollTick((n) => n + 1);
    ta.addEventListener('scroll', onScroll);
    return () => ta.removeEventListener('scroll', onScroll);
  }, [textareaRef, start]);

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    const m = mirrorRef.current;
    if (start === undefined || !ta || !m) {
      setRect(null);
      return;
    }
    m.style.width = `${ta.clientWidth}px`;
    const r = m.querySelector('span')?.getClientRects()[0];
    if (!r) {
      setRect(null);
      return;
    }
    const base = m.getBoundingClientRect();
    const top = r.top - base.top - ta.scrollTop;
    if (top < -r.height || top > ta.clientHeight) {
      setRect(null);
      return;
    }
    setRect({ top, left: r.left - base.left, width: Math.max(2, r.width), height: r.height });
  }, [textareaRef, text, start, end, scrollTick]);

  return (
    <>
      <div
        className="find-hl"
        id="findHl"
        hidden={!rect}
        style={rect ? { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` } : undefined}
      />
      <div className="editor-mirror" id="editorMirror" ref={mirrorRef} aria-hidden="true">
        {start !== undefined && end !== undefined && (
          <>
            {text.slice(0, start)}
            <span>{text.slice(start, end)}</span>
          </>
        )}
      </div>
    </>
  );
};
