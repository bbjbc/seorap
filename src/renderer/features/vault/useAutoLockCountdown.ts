// 자동 잠금까지 남은 시간 표시. 1초마다 갱신하고, 금고 화면이 보일 때만 돈다.
import { useTick } from '../../lib/hooks';
import { useT } from '../../lib/i18n';
import { useSettings } from '../../stores/settings';
import { useVaultStore } from '../../stores/vault';

export function useAutoLockCountdown(enabled: boolean): string {
  const t = useT();
  const minutes = useSettings()?.vault.autoLockMinutes ?? 0;
  const lastTouch = useVaultStore((s) => s.lastTouch);
  useTick(1000, enabled);
  if (!enabled) return '';
  if (!minutes) return t('vault.autolock_off');
  const left = Math.max(0, minutes * 60000 - (Date.now() - lastTouch));
  if (left <= 0) return '';
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return t('vault.locks_in', { t: `${m}:${String(s).padStart(2, '0')}` });
}
