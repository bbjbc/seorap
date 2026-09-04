// 항목 하나에 대한 공통 동작: 고정, 태그, 복사, 삭제(실행 취소 포함), 열기. 보드·메모·상세 모달이 함께 쓴다.
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';
import { findItem, useItemsStore, type Item } from '../../stores/items';
import { useBoardStore } from '../../stores/board';
import { useNotesStore } from '../../stores/notes';
import { useUiStore } from '../../stores/ui';
import { flash } from '../overlays/actions';
import { openNote } from '../notes/actions';
import { setMode } from '../shell/actions';

export async function togglePin(ids: readonly string[]): Promise<void> {
  const items = ids.map(findItem).filter((i): i is Item => i !== undefined);
  const all = items.every((i) => i.pinned);
  for (const it of items) await api.updateItem(it.id, { pinned: !all });
}

export async function addTag(id: string | null, raw: string): Promise<void> {
  const it = findItem(id);
  const tag = raw.trim().replace(/^#/, '').slice(0, 30);
  if (!it || !tag || it.tags.includes(tag)) return;
  await api.updateItem(it.id, { tags: [...it.tags, tag] });
}

export async function removeTag(id: string | null, tag: string): Promise<void> {
  const it = findItem(id);
  if (!it) return;
  await api.updateItem(it.id, { tags: it.tags.filter((x) => x !== tag) });
}

/** 클립보드로 복사. 실패하면 안내만 하고 false. */
export async function copyItem(id: string): Promise<boolean> {
  const ok = await api.copyItem(id);
  if (!ok) flash(t('flash.copy_failed'));
  return ok;
}

/** 글은 메모 편집기로, 나머지는 상세 모달로. */
export function openAny(id: string): void {
  const it = findItem(id);
  if (!it) return;
  if (it.type === 'text') {
    setMode('notes');
    openNote(id);
  } else useUiStore.getState().openDetail(id);
}

export const openDetail = openAny;

// ---------- 삭제 (6초 안에 실행 취소 가능) ----------
let undoTimer: number | null = null;

export function softDelete(rawIds: readonly string[]): void {
  const items = useItemsStore.getState();
  const ids = rawIds.filter((id) => items.items.some((i) => i.id === id));
  if (!ids.length) return;
  if (useUiStore.getState().pendingDelete) commitDelete();
  const removed = items.items.filter((i) => ids.includes(i.id));
  items.remove(ids);
  useBoardStore.getState().deselect(ids);
  const notes = useNotesStore.getState();
  if (notes.noteId && ids.includes(notes.noteId)) notes.setNoteId(null);
  useUiStore.getState().setPendingDelete({ ids, removed });
  if (undoTimer !== null) clearTimeout(undoTimer);
  undoTimer = window.setTimeout(commitDelete, 6000);
}

export function commitDelete(): void {
  const ui = useUiStore.getState();
  const pending = ui.pendingDelete;
  if (!pending) return;
  if (undoTimer !== null) clearTimeout(undoTimer);
  undoTimer = null;
  ui.setPendingDelete(null);
  void api.deleteItems(pending.ids);
}

export function undoDelete(): void {
  const ui = useUiStore.getState();
  const pending = ui.pendingDelete;
  if (!pending) return;
  if (undoTimer !== null) clearTimeout(undoTimer);
  undoTimer = null;
  useItemsStore.getState().restore(pending.removed);
  ui.setPendingDelete(null);
}
