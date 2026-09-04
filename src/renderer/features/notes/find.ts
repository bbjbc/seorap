// 메모 안 찾기 (Ctrl+F). 브라우저처럼 대소문자 구분 없이 앉은 자리부터 다음 일치를 찾아 선택한다.
// 일치 목록·인덱스는 스토어에, 선택 범위는 textarea 에 직접 적용한다 (선택은 DOM 만이 안다).
// 현재 일치 위에 덧그리는 강조는 FindHighlight 컴포넌트가 스토어를 보고 그린다.
import { flushSync } from 'react-dom';
import { findItem } from '../../stores/items';
import { useNotesStore } from '../../stores/notes';
import { editorHandle, findInputHandle } from './handles';

function editorText(): string {
  const ta = editorHandle.get();
  if (ta) return ta.value;
  return findItem(useNotesStore.getState().noteId)?.text ?? '';
}

export function computeMatches(text: string, query: string): number[] {
  const q = query.toLowerCase();
  const out: number[] = [];
  if (!q) return out;
  const hay = text.toLowerCase();
  for (let i = hay.indexOf(q); i !== -1; i = hay.indexOf(q, i + q.length))
    out.push(i);
  return out;
}

export function openFind(): void {
  const notes = useNotesStore.getState();
  if (!notes.noteId) return;
  const ta = editorHandle.get();
  let query = notes.find.query;
  const sel = ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : '';
  if (sel && !sel.includes('\n') && sel.length <= 100) query = sel;
  // 찾기 막대가 그려진 다음에 포커스를 줘야 하므로 동기로 반영한다.
  flushSync(() =>
    notes.setFind({
      open: true,
      query,
      index: -1,
      matches: computeMatches(editorText(), query),
    }),
  );
  const input = findInputHandle.get();
  input?.focus();
  input?.select();
  if (query) findStep(1);
}

export function closeFind(): void {
  const notes = useNotesStore.getState();
  if (!notes.find.open) return;
  flushSync(() => notes.setFind({ open: false, matches: [], index: -1 }));
  if (notes.noteId) editorHandle.get()?.focus({ preventScroll: true });
}

export function setFindQuery(query: string): void {
  useNotesStore.getState().setFind({ query, index: -1 });
  findStep(1);
}

/** 다음(1) / 이전(-1) 일치로. 처음이면 커서 뒤의 첫 일치부터, 이후엔 순환. */
export function findStep(dir: 1 | -1): void {
  const notes = useNotesStore.getState();
  const { query, index } = notes.find;
  const matches = computeMatches(editorText(), query);
  if (!matches.length) {
    notes.setFind({ matches, index: -1 });
    return;
  }
  let next: number;
  if (index < 0 || index >= matches.length) {
    const from = editorHandle.get()?.selectionStart ?? 0;
    const first = matches.findIndex((m) => m >= from);
    next =
      dir === 1
        ? first === -1
          ? 0
          : first
        : first <= 0
          ? matches.length - 1
          : first - 1;
  } else next = (index + dir + matches.length) % matches.length;
  revealMatch(matches, next, query.length);
}

/** 선택을 옮기고 그 위치가 보이도록 스크롤한다. 포커스는 찾기 입력칸에 남긴다. */
function revealMatch(matches: number[], i: number, len: number): void {
  const start = matches[i];
  const ta = editorHandle.get();
  if (start === undefined || !ta) return;
  // textarea 는 포커스를 받을 때 선택 영역을 화면에 드러내므로, 잠깐 포커스를 넘긴 뒤 되찾아 온다.
  ta.focus({ preventScroll: true });
  ta.setSelectionRange(start, start + len);
  scrollEditorToSelection(ta, start);
  findInputHandle.get()?.focus({ preventScroll: true });
  useNotesStore.getState().setFind({ matches, index: i });
}

function scrollEditorToSelection(ta: HTMLTextAreaElement, pos: number): void {
  // 선택 위치까지의 줄 수로 대략적인 y 를 구해 가운데쯤 오도록 스크롤한다.
  const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 24;
  const line = ta.value.slice(0, pos).split('\n').length - 1;
  const y = line * lineHeight;
  const view = ta.clientHeight;
  if (y < ta.scrollTop + lineHeight || y > ta.scrollTop + view - lineHeight * 2)
    ta.scrollTop = Math.max(0, y - view / 2);
}

/** 편집기 내용이 바뀌면 일치 목록을 다시 세고 현재 위치는 잃는다. */
export function onEditorTextChanged(): void {
  const notes = useNotesStore.getState();
  if (!notes.find.open) return;
  notes.setFind({
    index: -1,
    matches: computeMatches(editorText(), notes.find.query),
  });
}

/** 다른 메모로 넘어가면 같은 검색어로 다시 센다. */
export const onNoteSwitched = onEditorTextChanged;

export interface FindInNoteResult {
  open: boolean;
  count: number;
  index: number;
  selStart: number;
  selEnd: number;
}

/** 개발용 훅: 검색어를 넣고 첫 일치로 이동한 뒤 결과를 돌려준다. */
export function findInNote(query: string): FindInNoteResult {
  openFind();
  useNotesStore.getState().setFind({ query, index: -1 });
  findStep(1);
  const f = useNotesStore.getState().find;
  const ta = editorHandle.get();
  return {
    open: f.open,
    count: f.matches.length,
    index: f.index,
    selStart: ta?.selectionStart ?? 0,
    selEnd: ta?.selectionEnd ?? 0,
  };
}
