// 개발용 훅. E2E(scripts/dev-functional.ts)와 캡처(scripts/debug-shots.ts)가 executeJavaScript 로 부른다.
// 계약은 src/shared/types.d.ts 의 Seorap.DebugHooks.

import { openDetail } from '../features/items/actions';
import {
  editNoteText,
  moveNote,
  newNote,
  openNote,
} from '../features/notes/actions';
import { closeFind, findInNote } from '../features/notes/find';
import { evaluateStarNudge } from '../features/nudge/actions';
import { cancelPrompt } from '../features/prompt/actions';
import { openSettings } from '../features/settings/actions';
import { setMode } from '../features/shell/actions';
import { showUpdate } from '../features/update/actions';
import { refreshVault, selectSecret } from '../features/vault/actions';
import { useItemsStore } from '../stores/items';
import { useNotesStore } from '../stores/notes';
import { useSettingsStore } from '../stores/settings';
import { topModal, useUiStore } from '../stores/ui';
import { useVaultStore } from '../stores/vault';

/** 모달만 닫는다. 모드는 테스트가 서로 이어받는 값이라 건드리지 않는다. */
function closeAllModals(): void {
  const ui = useUiStore.getState();
  cancelPrompt();
  ui.closeDetail();
  ui.setSettingsOpen(false);
  ui.setSwitcherOpen(false);
}

export function installDebugHooks(): void {
  window.__seorap = {
    setMode,
    openNote,
    newNote,
    openDetail,
    openSettings,
    openSwitcher: () => useUiStore.getState().setSwitcherOpen(true),
    searchSwitcher: (q) => useUiStore.getState().setSwitcherQuery(q),
    closeAllModals,
    refreshVault,
    selectSecret,
    vaultEntryIds: () => useVaultStore.getState().entries.map((x) => x.id),
    items: () => useItemsStore.getState().items,
    noteId: () => useNotesStore.getState().noteId,
    typeIntoEditor: editNoteText,
    starNudgeVisible: () => useUiStore.getState().nudgeVisible,
    starNudgeState: () => {
      const ui = useUiStore.getState();
      const s = useSettingsStore.getState().settings;
      return {
        visible: ui.nudgeVisible,
        shownThisSession: ui.nudgeShownThisSession,
        mode: ui.mode,
        modal: topModal(ui),
        items: useItemsStore.getState().items.length,
        installedAt: s?.installedAt ?? null,
        done: s?.starNudge.done ?? null,
        snoozeUntil: s?.starNudge.snoozeUntil ?? null,
      };
    },
    evaluateStarNudge,
    findInNote,
    closeFind,
    // 화면에 그려진 순서 그대로. 선택자 결과가 아니라 DOM 을 읽어 "보이는 것"을 검증한다.
    noteListIds: () =>
      Array.from(document.querySelectorAll('#noteList .note-item')).map(
        (d) => d.getAttribute('data-id') ?? '',
      ),
    moveNote: (id, beforeId) => moveNote(id, beforeId, false),
    showUpdate,
    updateVisible: () => useUiStore.getState().update !== null,
    booted: () => useUiStore.getState().booted,
    resetUi: closeAllModals,
  };
}
