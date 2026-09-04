// 전역 키보드·붙이기·창 생명주기 처리. 모달이 열려 있으면 Esc 만 받는다.
import { api } from '../lib/api';
import { blurActive, isTyping } from '../lib/dom';
import { useBoardStore } from '../stores/board';
import { useNotesStore } from '../stores/notes';
import { topModal, useUiStore } from '../stores/ui';
import { boardSearchHandle, copyCard, selectAllVisible } from '../features/board/actions';
import { commitDelete, openAny, softDelete } from '../features/items/actions';
import { flushNoteSave, leaveNote, newNote } from '../features/notes/actions';
import { closeFind, findStep, openFind } from '../features/notes/find';
import { editorHandle, noteSearchHandle } from '../features/notes/handles';
import { cancelPrompt } from '../features/prompt/actions';
import { openSettings } from '../features/settings/actions';
import { grabClipboard, setMode } from '../features/shell/actions';
import { flushVaultSave, vaultSearchHandle } from '../features/vault/actions';

function closeTopModal(): void {
  const ui = useUiStore.getState();
  switch (topModal(ui)) {
    case 'prompt':
      cancelPrompt();
      break;
    case 'detail':
      ui.closeDetail();
      break;
    case 'switcher':
      ui.setSwitcherOpen(false);
      break;
    case 'settings':
      ui.setSettingsOpen(false);
      break;
    case null:
      break;
  }
}

function onKeyDown(e: KeyboardEvent): void {
  const ui = useUiStore.getState();
  const notes = useNotesStore.getState();
  const open = topModal(ui);

  if (e.key === 'Escape') {
    if (open) {
      closeTopModal();
      return;
    }
    if (isTyping() && document.activeElement !== editorHandle.get()) {
      blurActive();
      return;
    }
    if (notes.find.open) {
      closeFind();
      return;
    }
    void api.hideWindow();
    return;
  }
  if (open) return;

  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key === 'k') {
    e.preventDefault();
    ui.setSwitcherOpen(true);
    return;
  }
  if (mod && (e.key === '1' || e.key === '2' || e.key === '3')) {
    e.preventDefault();
    setMode(e.key === '1' ? 'board' : e.key === '2' ? 'notes' : 'vault');
    return;
  }
  if (mod && e.key === 'n' && ui.mode === 'notes') {
    e.preventDefault();
    void newNote();
    return;
  }
  if (mod && (e.key === 'f' || e.key === 'F')) {
    e.preventDefault();
    if (ui.mode === 'board') boardSearchHandle.get()?.focus();
    else if (ui.mode === 'notes') {
      // 메모가 열려 있으면 그 메모 안에서 찾고, 리스트 검색은 Shift 를 더한다.
      if (notes.noteId && !e.shiftKey) openFind();
      else noteSearchHandle.get()?.focus();
    } else vaultSearchHandle.get()?.focus();
    return;
  }
  if ((e.key === 'F3' || (mod && e.key === 'g')) && ui.mode === 'notes' && notes.find.open) {
    e.preventDefault();
    findStep(e.shiftKey ? -1 : 1);
    return;
  }
  if (mod && e.key === ',') {
    e.preventDefault();
    void openSettings();
    return;
  }
  if (ui.mode !== 'board' || isTyping()) return;

  const board = useBoardStore.getState();
  if (mod && e.key === 'v') {
    e.preventDefault();
    void grabClipboard();
    return;
  }
  if (mod && e.key === 'a') {
    e.preventDefault();
    selectAllVisible();
    return;
  }
  const only = board.selected.size === 1 ? [...board.selected][0] : undefined;
  if (mod && e.key === 'c' && only) {
    e.preventDefault();
    void copyCard(only);
    return;
  }
  if (e.key === 'Delete' && board.selected.size) {
    e.preventDefault();
    softDelete([...board.selected]);
    return;
  }
  if (e.key === 'Enter' && only) {
    e.preventDefault();
    openAny(only);
  }
}

function onPaste(e: ClipboardEvent): void {
  if (isTyping() || topModal() || useUiStore.getState().mode !== 'board') return;
  e.preventDefault();
  void grabClipboard();
}

function onBeforeUnload(): void {
  leaveNote();
  commitDelete();
}

/** 창이 숨겨지면 대기 중인 저장을 바로 반영한다. */
function onVisibilityChange(): void {
  if (!document.hidden) return;
  flushNoteSave();
  void flushVaultSave();
}

export function installGlobalHandlers(): () => void {
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('paste', onPaste);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('paste', onPaste);
    window.removeEventListener('beforeunload', onBeforeUnload);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };
}
