// 설정 모달의 버튼 동작. 값 하나 바꾸는 건 컴포넌트가 saveSettings() 로 직접 한다.
import { api } from '../../lib/api';
import { t } from '../../lib/i18n';
import { useItemsStore, type Item } from '../../stores/items';
import { reloadSettings } from '../../stores/settings';
import { useUiStore } from '../../stores/ui';
import { flash } from '../overlays/actions';
import { promptDialog, confirmDialog } from '../prompt/actions';

export async function openSettings(): Promise<void> {
  await reloadSettings();
  useUiStore.getState().setSettingsOpen(true);
}

export function closeSettings(): void {
  useUiStore.getState().setSettingsOpen(false);
}

/** days 일보다 오래된, 고정하지 않은 항목 수 */
export function staleCount(items: readonly Item[], days: number): number {
  const cutoff = Date.now() - days * 86400e3;
  return days > 0 ? items.filter((i) => !i.pinned && i.createdAt < cutoff).length : 0;
}

/** 확인 뒤 정리를 실행한다. 실제로 지웠으면 true (통계를 다시 읽을 때). */
export async function cleanupNow(days: number): Promise<boolean> {
  const n = staleCount(useItemsStore.getState().items, days);
  if (!n) {
    flash(t('flash.no_stale', { days }));
    return false;
  }
  const ok = await confirmDialog(t('settings.cleanup_confirm_title', { n }), t('settings.cleanup_confirm_desc', { n, days }));
  if (!ok) return false;
  const removed = await api.runCleanup(days);
  flash(t('flash.cleaned', { n: removed }));
  return true;
}

/** 저장 폴더를 옮긴다. 오류 문구를 돌려주고, 옮겼으면 null. */
export async function moveDataDir(): Promise<{ moved: boolean; error: string | null }> {
  const r = await api.pickDataDir();
  if (r.ok) flash(t('flash.dir_moved'));
  return { moved: r.ok, error: r.error ?? null };
}

export async function changeMasterPassword(): Promise<void> {
  const st = await api.vault.status();
  if (!st.exists) {
    flash(t('flash.vault_create_first'));
    return;
  }
  if (!st.unlocked) {
    flash(t('flash.vault_unlock_first'));
    return;
  }
  const r = await promptDialog({
    title: t('settings.master_title'),
    desc: t('settings.master_desc'),
    fields: [
      { type: 'password', placeholder: t('settings.master_cur') },
      { type: 'password', placeholder: t('settings.master_new') },
      { type: 'password', placeholder: t('settings.master_new2') },
    ],
    okText: t('settings.master_ok'),
    validate: async ([o, n, n2]) => {
      if (!o || !n) return t('settings.master_fill');
      if (n !== n2) return t('settings.master_mismatch');
      const s = await api.vault.strength(n);
      if (!s.ok) return s.reason ?? t('settings.weak_password');
      const res = await api.vault.changePassword(o, n);
      return res.ok ? null : res.error;
    },
  });
  if (r) flash(t('flash.master_changed'));
}

export async function exportVault(): Promise<void> {
  const st = await api.vault.status();
  if (!st.unlocked) {
    flash(t('flash.vault_unlock_first'));
    return;
  }
  const r = await promptDialog({
    title: t('settings.export_title'),
    desc: t('settings.export_desc'),
    fields: [{ type: 'password', placeholder: t('settings.export_confirm_ph') }],
    okText: t('settings.export_ok'),
    validate: async ([pw]) => {
      const res = await api.vault.export(pw ?? '');
      return res.ok ? null : res.error;
    },
  });
  if (r) flash(t('flash.exported'));
}
