import { useT } from '../../../lib/i18n';
import { saveSettings } from '../../../stores/settings';
import { changeMasterPassword, exportVault } from '../actions';
import { ButtonRow, CheckRow, Row, Section } from '../rows';

export const VaultSection = ({ settings: s }: { settings: Seorap.Settings }) => {
  const t = useT();
  const v = s.vault;
  return (
    <Section title={t('settings.vault')}>
      <Row label={t('settings.autolock')}>
        <select id="optAutoLock" value={String(v.autoLockMinutes)} onChange={(e) => void saveSettings({ vault: { autoLockMinutes: Number(e.target.value) } })}>
          <option value="1">{t('settings.autolock_1')}</option>
          <option value="5">{t('settings.autolock_5')}</option>
          <option value="15">{t('settings.autolock_15')}</option>
          <option value="30">{t('settings.autolock_30')}</option>
          <option value="0">{t('settings.autolock_0')}</option>
        </select>
      </Row>
      <Row label={t('settings.clip_clear')}>
        <select id="optClipClear" value={String(v.clipboardClearSeconds)} onChange={(e) => void saveSettings({ vault: { clipboardClearSeconds: Number(e.target.value) } })}>
          <option value="15">{t('settings.after_15s')}</option>
          <option value="30">{t('settings.after_30s')}</option>
          <option value="60">{t('settings.after_60s')}</option>
          <option value="120">{t('settings.after_2m')}</option>
        </select>
      </Row>
      <CheckRow id="optLockOnHide" checked={v.lockOnHide} onChange={(c) => void saveSettings({ vault: { lockOnHide: c } })} label={t('settings.lock_on_hide')} />
      <CheckRow
        id="optContentProtection"
        checked={v.contentProtection}
        onChange={(c) => void saveSettings({ vault: { contentProtection: c } })}
        label={t('settings.content_protection')}
        hint={t('settings.content_protection_hint')}
      />
      <ButtonRow>
        <button type="button" className="btn ghost small" id="btnChangeMaster" onClick={() => void changeMasterPassword()}>
          {t('settings.change_master')}
        </button>
        <button type="button" className="btn ghost small" id="btnExportVault" onClick={() => void exportVault()}>
          {t('settings.export_vault')}
        </button>
      </ButtonRow>
    </Section>
  );
};
