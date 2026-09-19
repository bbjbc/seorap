// 메모 열기·만들기·자동 저장·정렬. 편집기 텍스트의 정본은 items 스토어의 item.text 다.
import { api } from '../../lib/api';
import { firstLineOf } from '../../lib/format';
import { t } from '../../lib/i18n';
import { findItem, useItemsStore } from '../../stores/items';
import { useNotesStore } from '../../stores/notes';
import { saveSettings, useSettingsStore } from '../../stores/settings';
import { softDelete } from '../items/actions';
import { confirmDialog } from '../prompt/actions';
import { onEditorTextChanged, onNoteSwitched } from './find';
import { mdEditorHandle } from './handles';
import { noteItems } from './selectors';

const AUTOSAVE_MS = 500;
let saveTimer: number | null = null;

export const noteSortMode = (): Seorap.NoteSort =>
  useSettingsStore.getState().settings?.notes.sort ?? 'recent';

/** 지금 목록에 보이는 메모 (그려진 순서) */
export function visibleNotes(): ReturnType<typeof noteItems> {
  const s = useSettingsStore.getState().settings;
  const n = useNotesStore.getState();
  return noteItems(useItemsStore.getState().items, {
    query: n.query,
    noteId: n.noteId,
    showClipboardText: s?.notes.showClipboardText ?? false,
    sort: s?.notes.sort ?? 'recent',
  });
}

export function openNote(id: string): void {
  const notes = useNotesStore.getState();
  if (notes.noteId && notes.noteId !== id) leaveNote();
  const it = findItem(id);
  if (!it) {
    notes.setNoteId(null);
    return;
  }
  notes.setNoteId(id);
  notes.setSaveState('idle');
  const items = useItemsStore.getState();
  if (!it.note) {
    // 클립보드 글을 편집기에서 열면 그때부터 메모다.
    items.patch(id, { note: true });
    void api.updateItem(id, { note: true });
  }
  if (it.truncated) {
    void api
      .fullText(id)
      .then((text) =>
        useItemsStore.getState().patch(id, { text, truncated: false }),
      );
  }
  onNoteSwitched();
}

/** 새 메모를 만드는 중인가. 연타로 요청이 겹치는 것을 막는다. */
let creating = false;

export async function newNote(): Promise<void> {
  // 빈 메모는 어차피 하나만 남으므로, 겹친 클릭은 합치는 게 맞다. 그대로 두면
  // 메모가 만들어졌다 지워지기를 반복하며 목록이 깜빡인다.
  if (creating) return;
  creating = true;
  try {
    // 새 메모를 먼저 받아 온 뒤에 연다. 이전 메모를 먼저 정리하면 응답을
    // 기다리는 동안 '열린 메모 없음' 상태가 화면에 그대로 보인다.
    // 이전 메모 정리는 openNote 가 leaveNote 로 처리한다.
    const r = await api.addNote();
    if (!r) return;
    useItemsStore.getState().add(r.item);
    openNote(r.item.id);
  } finally {
    creating = false;
  }
}

/** 편집기를 떠날 때: 대기 중인 저장을 즉시 반영하고, 빈 메모는 조용히 지운다. */
export function leaveNote(): void {
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
    saveTimer = null;
    void saveNoteNow();
  }
  const notes = useNotesStore.getState();
  const it = findItem(notes.noteId);
  if (it?.note && !(it.text ?? '').trim() && !it.tags.length) {
    useItemsStore.getState().remove([it.id]);
    notes.setNoteId(null);
    void api.deleteItems([it.id]);
  }
}

/** 편집기 입력. 로컬 텍스트를 바로 바꾸고 저장은 잠시 뒤에 모아서 한다. */
export function editNoteText(text: string): void {
  const notes = useNotesStore.getState();
  const id = notes.noteId;
  if (!id || !findItem(id)) return;
  useItemsStore.getState().patch(id, { text, updatedAt: Date.now() });
  notes.setSaveState('saving');
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void saveNoteNow(), AUTOSAVE_MS);
  onEditorTextChanged();
}

export async function saveNoteNow(): Promise<void> {
  saveTimer = null;
  const id = useNotesStore.getState().noteId;
  const it = findItem(id);
  if (!id || !it) return;
  const saved = await api.updateItem(id, { text: it.text ?? '', note: true });
  if (saved && useNotesStore.getState().noteId === id)
    useNotesStore.getState().setSaveState('saved');
}

/**
 * 본문을 통째로 갈아 끼운다 (개발용 훅). 위지위그가 떠 있으면 편집기 쪽을 먼저 바꾸고,
 * 거기서 다시 뽑은 마크다운을 정본으로 삼는다. 그래야 두 모드의 결과가 같아진다.
 */
export function setEditorText(text: string): void {
  const ed = mdEditorHandle.get();
  if (ed && !ed.isDestroyed) {
    ed.commands.setContent(text, { contentType: 'markdown' });
    editNoteText(ed.getMarkdown());
    return;
  }
  editNoteText(text);
}

/** 지금 편집기에 보이는 본문. 어느 모드인지 몰라도 읽을 수 있다. */
export function editorText(): string {
  const ed = mdEditorHandle.get();
  if (ed && !ed.isDestroyed) return ed.getMarkdown();
  return findItem(useNotesStore.getState().noteId)?.text ?? '';
}

/**
 * 이 메모를 위지위그로 볼지 순수 텍스트로 볼지 바꾼다. 저장되는 본문(마크다운)은
 * 그대로고 해석 방식만 달라진다. 바꾸기 전에 편집 중이던 내용을 먼저 확정한다.
 */
export async function setNoteMode(id: string, md: boolean): Promise<void> {
  flushNoteSave();
  useItemsStore.getState().patch(id, { md });
  await api.updateItem(id, { md });
}

/** 창이 숨겨질 때 등, 기다리지 않고 지금 저장한다. */
export function flushNoteSave(): void {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  void saveNoteNow();
}

/** id 를 target 앞(또는 뒤)으로 옮기고 전체 순서를 저장한다. 최신순이었다면 지금 보이는 순서를 출발점으로 직접 정렬로 전환. */
export async function moveNote(
  id: string,
  target: string | null,
  after: boolean,
): Promise<void> {
  const ids = visibleNotes().map((it) => it.id);
  const from = ids.indexOf(id);
  if (from === -1) return;
  ids.splice(from, 1);
  let to = target ? ids.indexOf(target) : -1;
  if (to === -1) to = ids.length;
  else if (after) to += 1;
  ids.splice(to, 0, id);
  applyOrder(ids);
  if (noteSortMode() !== 'manual')
    await saveSettings({ notes: { sort: 'manual' } });
  await api.reorderItems(ids);
}

/** 최신순 ↔ 직접 정렬. 직접 정렬로 갈 때는 지금 보이는 순서를 그대로 고정한다. */
export function toggleNoteSort(): void {
  if (noteSortMode() === 'manual') {
    void saveSettings({ notes: { sort: 'recent' } });
    return;
  }
  const ids = visibleNotes().map((it) => it.id);
  applyOrder(ids);
  void api.reorderItems(ids);
  void saveSettings({ notes: { sort: 'manual' } });
}

export const noteSidebarOpen = (): boolean =>
  useSettingsStore.getState().settings?.notes.sidebar ?? true;

export function toggleNoteSidebar(): void {
  void saveSettings({ notes: { sidebar: !noteSidebarOpen() } });
}

/** 목록을 써야 하는 동작(목록 검색 등) 전에 접혀 있으면 펼친다. */
export function showNoteSidebar(): void {
  if (!noteSidebarOpen()) void saveSettings({ notes: { sidebar: true } });
}

function applyOrder(ids: readonly string[]): void {
  const order = new Map(ids.map((x, i) => [x, i] as const));
  const items = useItemsStore.getState();
  items.setAll(
    items.items.map((it) =>
      order.has(it.id) ? { ...it, order: order.get(it.id) } : it,
    ),
  );
}

/** 편집기의 삭제 버튼. 실수로 지우는 일이 없게 한 번 묻는다. */
export async function confirmDeleteNote(id: string): Promise<void> {
  const it = findItem(id);
  if (!it) return;
  const name = firstLineOf(it.text ?? '') || t('common.new_note');
  const ok = await confirmDialog(
    t('notes.delete_title', { name }),
    t('notes.delete_desc'),
  );
  if (ok) softDelete([id]);
}
