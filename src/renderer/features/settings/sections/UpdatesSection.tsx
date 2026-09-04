import { useState } from 'react';
import { fmtTime } from '../../../lib/format';
import { useLang, useT } from '../../../lib/i18n';
import { saveSettings } from '../../../stores/settings';
import { useUiStore } from '../../../stores/ui';
import { checkUpdateNow, openUpdate } from '../../update/actions';
import { ButtonRow, CheckRow, Section } from '../rows';

type CheckState = { kind: 'idle' } | { kind: 'checking' } | { kind: 'latest' } | { kind: 'error'; error: string };

export const UpdatesSection = ({ settings: s }: { settings: Seorap.Settings }) => {
  const t = useT();
  const lang = useLang();
  const update = useUiStore((u) => u.update);
  const [check, setCheck] = useState<CheckState>({ kind: 'idle' });

  const status = update
    ? t('settings.update_available', { v: update.version })
    : check.kind === 'checking'
      ? t('settings.update_checking')
      : check.kind === 'latest'
        ? t('settings.update_latest')
        : check.kind === 'error'
          ? t('settings.update_failed', { e: check.error })
          : s.updates.lastCheckedAt
            ? t('settings.update_last', { t: fmtTime(s.updates.lastCheckedAt, lang) })
            : '';

  const run = async (): Promise<void> => {
    setCheck({ kind: 'checking' });
    const r = await checkUpdateNow();
    if (r.status === 'update') setCheck({ kind: 'idle' });
    else if (r.status === 'latest') setCheck({ kind: 'latest' });
    else setCheck({ kind: 'error', error: r.error });
  };

  return (
    <Section title={t('settings.updates')}>
      <CheckRow id="optUpdateCheck" checked={s.updates.check} onChange={(c) => void saveSettings({ updates: { check: c } })} label={t('settings.update_check')} hint={t('settings.update_check_hint')} />
      <ButtonRow>
        <button type="button" className="btn ghost small" id="btnCheckUpdate" disabled={check.kind === 'checking'} onClick={() => void run()}>
          {t('settings.update_now')}
        </button>
        <button type="button" className="btn primary small" id="btnGetUpdate" hidden={!update} onClick={openUpdate}>
          {update ? t('settings.update_get_v', { v: update.version }) : ''}
        </button>
        <span className="muted" id="updateStatus">
          {status}
        </span>
      </ButtonRow>
    </Section>
  );
};
