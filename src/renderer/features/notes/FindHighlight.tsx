// 현재 일치 위치 표시. textarea 는 포커스를 잃으면 선택을 그리지 않으므로, 같은 글꼴·여백의 거울 div 에
// 같은 글을 넣고 일치 구간을 span 으로 감싸 좌표를 재서 따로 덧그린다.
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useNotesStore } from '../../stores/notes';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const sameRect = (a: Rect | null, b: Rect | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.top === b.top &&
    a.left === b.left &&
    a.width === b.width &&
    a.height === b.height);

interface Props {
  text: string;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}

export const FindHighlight = ({ text, textareaRef }: Props) => {
  const find = useNotesStore((s) => s.find);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  const start = find.open ? find.matches[find.index] : undefined;
  const end = start === undefined ? undefined : start + find.query.length;

  /** 거울 안의 span 위치를 편집기 좌표로 옮겨 잰다. DOM 만 읽으므로 렌더마다 불러도 안전하다. */
  const measure = useCallback((): void => {
    const ta = textareaRef.current;
    const m = mirrorRef.current;
    const span = m?.querySelector('span');
    let next: Rect | null = null;
    if (ta && m && span) {
      m.style.width = `${ta.clientWidth}px`;
      const r = span.getClientRects()[0];
      if (r) {
        const base = m.getBoundingClientRect();
        const top = r.top - base.top - ta.scrollTop;
        if (top >= -r.height && top <= ta.clientHeight)
          next = {
            top,
            left: r.left - base.left,
            width: Math.max(2, r.width),
            height: r.height,
          };
      }
    }
    setRect((prev) => (sameRect(prev, next) ? prev : next));
  }, [textareaRef]);

  // 거울 내용(글·일치 위치)이 바뀌어 다시 그려질 때마다 잰다.
  useLayoutEffect(measure);

  // 편집기가 스크롤되면 다시 잰다.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || start === undefined) return;
    ta.addEventListener('scroll', measure);
    return () => ta.removeEventListener('scroll', measure);
  }, [textareaRef, start, measure]);

  return (
    <>
      <div
        className="find-hl"
        id="findHl"
        hidden={!rect}
        style={
          rect
            ? {
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
              }
            : undefined
        }
      />
      <div
        className="editor-mirror"
        id="editorMirror"
        ref={mirrorRef}
        aria-hidden="true"
      >
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
