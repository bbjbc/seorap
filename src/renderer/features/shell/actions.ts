// 모드 전환과 레일의 클립보드 저장 버튼.
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';
import { saveSettings, useSettingsStore } from '../../stores/settings';
import { useUiStore } from '../../stores/ui';
import { boardScrollHandle, highlight } from '../board/actions';
import { leaveNote } from '../notes/actions';
import { flash } from '../overlays/actions';
import { refreshVault } from '../vault/actions';

export function setMode(mode: Seorap.Mode): void {
  const ui = useUiStore.getState();
  if (ui.mode === 'notes' && mode !== 'notes') leaveNote();
  ui.setMode(mode);
  if (mode === 'vault') void refreshVault();
  const s = useSettingsStore.getState().settings;
  if (s && s.lastMode !== mode) void saveSettings({ lastMode: mode });
}

export async function grabClipboard(): Promise<void> {
  const r = await api.captureClipboard();
  if (!r) {
    flash(t('flash.clipboard_empty'));
    return;
  }
  if (r.duplicate) {
    flash(t('flash.already_saved'));
    highlight(r.item.id);
    return;
  }
  flash(t('flash.saved'));
  if (useUiStore.getState().mode === 'board') {
    const scroll = boardScrollHandle.get();
    if (scroll) scroll.scrollTop = 0;
    highlight(r.item.id);
  }
}
