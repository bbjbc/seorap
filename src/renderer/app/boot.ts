// 부팅 시퀀스: 설정 → 항목 → 마지막 모드 → 금고 상태 → booted. E2E 는 __seorap.booted() 를 기다린다.

import { evaluateStarNudge } from '../features/nudge/actions';
import { setMode } from '../features/shell/actions';
import { showUpdate } from '../features/update/actions';
import { api } from '../lib/api';
import { useSettingsStore } from '../stores/settings';
import { useUiStore } from '../stores/ui';
import { useVaultStore } from '../stores/vault';
import { loadAllItems } from './ipc';

export async function boot(): Promise<void> {
  const bundle = await api.getSettings();
  useSettingsStore.getState().load(bundle);
  await loadAllItems();
  setMode(bundle.settings.lastMode);
  useVaultStore.getState().setStatus(await api.vault.status());
  const update = await api.updateStatus();
  if (update) showUpdate(update);
  useUiStore.getState().setBooted();
  evaluateStarNudge();
}
