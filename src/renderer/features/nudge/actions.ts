// GitHub 스타 요청 배너. 네트워크·계정 없음. 조건: 항목 50개 이상 또는 설치 7일 경과, 세션에 한 번만.
import { api } from '../../lib/api';
import { useItemsStore } from '../../stores/items';
import { saveSettings, useSettingsStore } from '../../stores/settings';
import { topModal, useUiStore } from '../../stores/ui';

export const REPO_URL = 'https://github.com/bbjbc/seorap';

export function evaluateStarNudge(): void {
  const s = useSettingsStore.getState().settings;
  const ui = useUiStore.getState();
  if (!s || ui.nudgeShownThisSession) return;
  if (s.starNudge.done || Date.now() < s.starNudge.snoozeUntil) return;
  const enoughItems = useItemsStore.getState().items.length >= 50;
  const oldEnough =
    s.installedAt !== null && Date.now() - s.installedAt > 7 * 86400e3;
  if (!enoughItems && !oldEnough) return;
  if (ui.mode !== 'board' || topModal(ui)) return;
  ui.setNudge(true);
}

export function closeNudge(patch: Partial<Seorap.Settings['starNudge']>): void {
  useUiStore.getState().setNudge(false);
  void saveSettings({ starNudge: patch });
}

/** 저장소를 브라우저로 연다. 배너 상태 갱신은 호출한 쪽이 한다 (배너는 closeNudge, 설정은 saveSettings). */
export function openRepo(): void {
  void api.openExternal(REPO_URL);
}

export function openIssues(): void {
  void api.openExternal(`${REPO_URL}/issues/new`);
}
