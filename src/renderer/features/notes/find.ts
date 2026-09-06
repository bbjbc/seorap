// 메모 안 찾기 (Ctrl+F). 브라우저처럼 대소문자 구분 없이 앉은 자리부터 다음 일치를 찾아 선택한다.
// 편집기가 두 가지라 뒤쪽 구현도 둘이다.
//   - 순수 텍스트: textarea 의 문자열 위치를 직접 세고, 강조는 FindHighlight 가 덧그린다.
//   - 위지위그: Tiptap 의 FindAndReplace 확장에 맡기고 결과만 스토어로 옮겨 온다.
// 어느 쪽이든 스토어의 find.matches 길이와 index 가 찾기 막대의 "3 / 12" 를 만든다.
import type { Editor } from '@tiptap/react';
import { flushSync } from 'react-dom';
import { findItem } from '../../stores/items';
import { useNotesStore } from '../../stores/notes';
import { editorHandle, findInputHandle, mdEditorHandle } from './handles';

/** 지금 화면에 있는 위지위그 편집기. 순수 텍스트 모드면 null. */
function md(): Editor | null {
  const ed = mdEditorHandle.get();
  return ed && !ed.isDestroyed ? ed : null;
}

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

/** 확장이 들고 있는 결과를 스토어로 옮긴다. 위치는 ProseMirror 좌표라 개수·순서에만 쓴다. */
function syncFromMd(ed: Editor): void {
  const st = ed.storage.findAndReplace;
  useNotesStore.getState().setFind({
    matches: st.results.map((r) => r.from),
    index: st.currentIndex ?? -1,
  });
}

/** 지금 선택된 글. 찾기를 열 때 검색어 기본값으로 쓴다. */
function selectedText(): string {
  const ed = md();
  if (ed) {
    const { from, to } = ed.state.selection;
    return from === to ? '' : ed.state.doc.textBetween(from, to, ' ');
  }
  const ta = editorHandle.get();
  return ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : '';
}

export function openFind(): void {
  const notes = useNotesStore.getState();
  if (!notes.noteId) return;
  let query = notes.find.query;
  const sel = selectedText();
  if (sel && !sel.includes('\n') && sel.length <= 100) query = sel;
  const ed = md();
  // 찾기 막대가 그려진 다음에 포커스를 줘야 하므로 동기로 반영한다.
  flushSync(() =>
    notes.setFind({
      open: true,
      query,
      index: -1,
      matches: ed ? [] : computeMatches(editorText(), query),
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
  md()?.commands.clearSearch();
  flushSync(() => notes.setFind({ open: false, matches: [], index: -1 }));
  if (!notes.noteId) return;
  const ed = md();
  if (ed) ed.commands.focus();
  else editorHandle.get()?.focus({ preventScroll: true });
}

export function setFindQuery(query: string): void {
  useNotesStore.getState().setFind({ query, index: -1 });
  findStep(1);
}

/** 다음(1) / 이전(-1) 일치로. 처음이면 커서 뒤의 첫 일치부터, 이후엔 순환. */
export function findStep(dir: 1 | -1): void {
  const notes = useNotesStore.getState();
  const { query, index } = notes.find;
  const ed = md();
  if (ed) {
    // searchDebounceMs 를 0 으로 켜 두어 검색어를 넣으면 결과가 바로 선다.
    ed.commands.setSearchTerm(query);
    if (query) {
      // 아직 아무 일치에도 앉지 않았으면 첫(또는 마지막) 일치로 간다. 이미 앉아 있고
      // 우리 쪽 index 도 살아 있을 때만 다음으로 넘긴다. 그러지 않으면 찾기를 여는
      // 것만으로 한 칸씩 밀린다.
      const cur = ed.storage.findAndReplace.currentIndex;
      if (cur === null || index >= 0) {
        if (dir === 1) ed.commands.goToNextResult();
        else ed.commands.goToPreviousResult();
      }
    }
    syncFromMd(ed);
    // 결과로 이동하면 포커스가 본문으로 넘어간다. 계속 타이핑할 수 있게 되돌린다.
    findInputHandle.get()?.focus({ preventScroll: true });
    return;
  }

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
  const ed = md();
  if (ed) {
    ed.commands.setSearchTerm(notes.find.query);
    syncFromMd(ed);
    notes.setFind({ index: -1 });
    return;
  }
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
  /** 순수 텍스트 모드는 문자열 위치, 위지위그는 ProseMirror 위치. */
  selStart: number;
  selEnd: number;
}

/** 개발용 훅: 검색어를 넣고 첫 일치로 이동한 뒤 결과를 돌려준다. */
export function findInNote(query: string): FindInNoteResult {
  openFind();
  useNotesStore.getState().setFind({ query, index: -1 });
  findStep(1);
  const f = useNotesStore.getState().find;
  const ed = md();
  const sel = ed?.state.selection;
  const ta = editorHandle.get();
  return {
    open: f.open,
    count: f.matches.length,
    index: f.index,
    selStart: sel?.from ?? ta?.selectionStart ?? 0,
    selEnd: sel?.to ?? ta?.selectionEnd ?? 0,
  };
}
