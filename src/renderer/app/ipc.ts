// 메인 → 렌더러 이벤트 구독. 한 번만 설치하고, 스토어와 액션으로 흘려보낸다.
import { api } from '../lib/api';
import { useBoardStore } from '../stores/board';
import { findItem, useItemsStore } from '../stores/items';
import { useNotesStore } from '../stores/notes';
import { useSettingsStore } from '../stores/settings';
import { useUiStore } from '../stores/ui';
import { openDetail, softDelete } from '../features/items/actions';
import { evaluateStarNudge } from '../features/nudge/actions';
import { newNote, openNote } from '../features/notes/actions';
import { editorHandle } from '../features/notes/handles';
import { flash } from '../features/overlays/actions';
import { promptRename, promptTags } from '../features/prompt/item-prompts';
import { openSettings } from '../features/settings/actions';
import { setMode } from '../features/shell/actions';
import { showUpdate } from '../features/update/actions';
import { onVaultLocked, refreshVault } from '../features/vault/actions';

export async function loadAllItems(): Promise<void> {
  useItemsStore.getState().setAll(await api.listItems());
  evaluateStarNudge();
}

function onItemsChanged(evt: Seorap.ItemsChangedEvent): void {
  const items = useItemsStore.getState();
  switch (evt.type) {
    case 'reload':
      void loadAllItems();
      return;
    case 'add':
      items.add(evt.item);
      evaluateStarNudge();
      return;
    case 'update': {
      const prev = findItem(evt.item.id);
      if (!prev) return;
      // 편집 중인 메모의 본문은 메인이 보낸 것으로 덮지 않는다. 타이핑 중 저장 응답이 돌아오며 글자가 되돌아가는 것을 막는다.
      const keepText = useNotesStore.getState().noteId === evt.item.id && document.activeElement === editorHandle.get();
      items.replace(keepText ? { ...evt.item, text: prev.text, truncated: prev.truncated } : evt.item);
      return;
    }
    case 'remove': {
      items.remove(evt.ids);
      useBoardStore.getState().deselect(evt.ids);
      const notes = useNotesStore.getState();
      if (notes.noteId && evt.ids.includes(notes.noteId)) notes.setNoteId(null);
      const ui = useUiStore.getState();
      if (ui.detailId && evt.ids.includes(ui.detailId)) ui.closeDetail();
      return;
    }
  }
}

function onUiAction(msg: Seorap.UiAction): void {
  const ids = msg.ids ?? [];
  const first = ids[0];
  switch (msg.action) {
    case 'settings':
      void openSettings();
      break;
    case 'newNote':
      setMode('notes');
      void newNote();
      break;
    case 'openNote':
      setMode('notes');
      if (first) openNote(first);
      break;
    case 'detail':
      if (first) openDetail(first);
      break;
    case 'tags':
      void promptTags(ids);
      break;
    case 'rename':
      if (first) void promptRename(first);
      break;
    case 'delete':
      softDelete(ids);
      break;
  }
}

function onWindowShown(): void {
  const { mode } = useUiStore.getState();
  if (mode === 'notes' && useNotesStore.getState().noteId) editorHandle.get()?.focus();
  if (mode === 'vault') void refreshVault();
}

export function subscribeIpc(): () => void {
  const offs: Seorap.Unsubscribe[] = [
    api.onItemsChanged(onItemsChanged),
    api.onUiAction(onUiAction),
    api.onFlash((m) => flash(m.text)),
    api.onWindowShown(onWindowShown),
    api.onSettingsChanged((s) => useSettingsStore.getState().apply(s)),
    api.vault.onLocked(({ reason }) => onVaultLocked(reason)),
    api.onUpdateAvailable(showUpdate),
  ];
  return () => offs.forEach((off) => off());
}
