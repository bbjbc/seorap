// 새 버전 알림. 메인이 확인해 알려 주고, 렌더러는 레일 버튼과 설정의 받기 버튼에 표시한다.
import { api } from '../../lib/api';
import { useUiStore } from '../../stores/ui';

export function showUpdate(info: Seorap.UpdateInfo): void {
  useUiStore.getState().setUpdate(info);
}

export function openUpdate(): void {
  const u = useUiStore.getState().update;
  if (u) void api.openExternal(u.url);
}

export async function checkUpdateNow(): Promise<Seorap.UpdateCheckResult> {
  const r = await api.checkUpdate();
  if (r.status === 'update') showUpdate(r.info);
  return r;
}
