// 금고 동작. 목록·상태는 메인이 정본이고, 폼 초안만 렌더러가 잠시 들고 있다가 600ms 뒤 저장한다.
import { api } from '../../lib/api';
import { createHandle } from '../../lib/handles';
import { t } from '../../lib/i18n';
import { useSettingsStore } from '../../stores/settings';
import { useUiStore } from '../../stores/ui';
import { useVaultStore, type VaultDraft } from '../../stores/vault';
import { flash } from '../overlays/actions';
import { confirmDialog } from '../prompt/actions';
import { clampGenLength } from './constants';

const AUTOSAVE_MS = 600;
const TOUCH_THROTTLE_MS = 20000;

/** 금고 검색칸 (Ctrl+F) */
export const vaultSearchHandle = createHandle<HTMLInputElement>();
/** 새 항목을 만들면 이름칸에 포커스 */
export const vaultNameHandle = createHandle<HTMLInputElement>();

export async function refreshVault(): Promise<void> {
  const status = await api.vault.status();
  useVaultStore.getState().setStatus(status);
  if (status.unlocked) await loadVaultList();
}

export async function loadVaultList(): Promise<void> {
  const r = await api.vault.list();
  if (!r.ok) {
    await refreshVault();
    return;
  }
  const vault = useVaultStore.getState();
  vault.setEntries(r.result);
  if (vault.id && !r.result.some((x) => x.id === vault.id)) {
    vault.setId(null);
    vault.setDraft(null);
  }
}

export async function selectSecret(id: string): Promise<void> {
  await flushVaultSave();
  const vault = useVaultStore.getState();
  vault.setId(id);
  const x = vault.entries.find((y) => y.id === id);
  if (!x) {
    vault.setDraft(null);
    return;
  }
  const s = await api.vault.secret(x.id);
  useVaultStore.getState().setDraft({ name: x.name, url: x.url, username: x.username, notes: x.notes, password: s.ok ? s.result : '' });
  useVaultStore.getState().setSaveState('idle');
  touchVault();
}

/** 폼 입력. 초안을 바로 바꾸고 저장은 모아서 한다. */
export function editDraft(patch: Partial<VaultDraft>): void {
  useVaultStore.getState().patchDraft(patch);
  scheduleVaultSave();
}

let saveTimer: number | null = null;

function scheduleVaultSave(): void {
  const vault = useVaultStore.getState();
  if (!vault.id) return;
  vault.setSaveState('saving');
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => void flushVaultSave(), AUTOSAVE_MS);
  touchVault();
}

export async function flushVaultSave(): Promise<void> {
  if (saveTimer === null) return;
  clearTimeout(saveTimer);
  saveTimer = null;
  const vault = useVaultStore.getState();
  const id = vault.id;
  const d = vault.draft;
  if (!id || !d) return;
  const r = await api.vault.update(id, { name: d.name, url: d.url.trim(), username: d.username, password: d.password, notes: d.notes });
  const after = useVaultStore.getState();
  if (r.ok) {
    if (r.result) after.replaceEntry(r.result);
    if (after.id === id) after.setSaveState('saved');
  } else {
    flash(r.error);
    await refreshVault();
  }
}

function cancelVaultSave(): void {
  if (saveTimer !== null) clearTimeout(saveTimer);
  saveTimer = null;
}

export async function newEntry(): Promise<void> {
  const r = await api.vault.add({ name: '' });
  if (!r.ok) {
    flash(r.error);
    return;
  }
  await loadVaultList();
  await selectSecret(r.result.id);
  vaultNameHandle.get()?.focus();
}

export async function deleteSelected(): Promise<void> {
  const vault = useVaultStore.getState();
  const x = vault.entries.find((y) => y.id === vault.id);
  if (!x) return;
  const ok = await confirmDialog(t('vault.delete_title', { name: x.name || t('common.untitled') }), t('vault.delete_desc'));
  if (!ok) return;
  cancelVaultSave();
  await api.vault.remove(x.id);
  useVaultStore.getState().setId(null);
  useVaultStore.getState().setDraft(null);
  await loadVaultList();
}

export async function copySelected(field: 'password' | 'username'): Promise<void> {
  await flushVaultSave();
  const id = useVaultStore.getState().id;
  if (!id) return;
  const r = await api.vault.copy(id, field);
  const ok = r.ok && r.result;
  if (field === 'password') {
    if (!ok) flash(t('flash.no_password'));
    else touchVault();
  } else flash(ok ? t('flash.user_copied') : t('flash.no_user'));
}

export function openDraftUrl(): void {
  const u = useVaultStore.getState().draft?.url.trim() ?? '';
  if (/^https?:/i.test(u)) void api.openExternal(u);
}

/** 설정의 생성 옵션 (길이 · 기호) */
export function genOptions(): { length: number; symbols: boolean } {
  const v = useSettingsStore.getState().settings?.vault;
  return { length: clampGenLength(v?.genLength ?? NaN), symbols: v?.genSymbols ?? true };
}

export async function generateIntoDraft(): Promise<void> {
  const g = genOptions();
  const pw = await api.vault.generate(g.length, g.symbols);
  const vault = useVaultStore.getState();
  vault.patchDraft({ password: pw });
  vault.setPassVisible(true);
  scheduleVaultSave();
}

export function togglePassVisible(): void {
  const vault = useVaultStore.getState();
  vault.setPassVisible(!vault.passVisible);
  touchVault();
}

let touchSentAt = 0;
/** 사용 흔적을 남겨 자동 잠금 타이머를 미룬다. 메인에는 20초에 한 번만 알린다. */
export function touchVault(): void {
  useVaultStore.getState().touch();
  if (Date.now() - touchSentAt > TOUCH_THROTTLE_MS) {
    touchSentAt = Date.now();
    void api.vault.touch();
  }
}

/** 잠금 화면 제출. 금고가 없으면 만들고, 있으면 연다. 실패하면 사용자에게 보일 문구를 돌려준다. */
export async function submitLock(pw: string, pw2: string, acknowledged: boolean): Promise<string | null> {
  const vault = useVaultStore.getState();
  try {
    let r: Seorap.VaultResult<Seorap.VaultStatus>;
    if (!(vault.status?.exists ?? false)) {
      if (pw !== pw2) throw new Error(t('vault.mismatch'));
      if (!acknowledged) throw new Error(t('vault.ack_required'));
      r = await api.vault.setup(pw);
    } else r = await api.vault.unlock(pw);
    if (!r.ok) throw new Error(r.error);
    useVaultStore.getState().touch();
    await refreshVault();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export function lockNow(): void {
  void api.vault.lock();
}

/** 메인이 vault:locked 를 보냈을 때 */
export function onVaultLocked(reason: string): void {
  cancelVaultSave();
  useVaultStore.getState().clearForLock();
  if (useUiStore.getState().mode === 'vault') {
    void refreshVault();
    if (reason === 'timeout') flash(t('flash.vault_autolocked'));
  } else {
    void api.vault.status().then((s) => useVaultStore.getState().setStatus(s));
  }
}

/** 새 비밀번호의 강도 (설정 화면에서 잠금 화면 만들 때) */
export const passwordStrength = (pw: string): Promise<Seorap.Strength> => api.vault.strength(pw);
