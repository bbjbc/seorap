import { useT } from '../../../lib/i18n';
import { saveSettings, useSettingsStore } from '../../../stores/settings';
import { CheckRow, Section } from '../rows';

export const CollectSection = ({
  settings: s,
}: {
  settings: Seorap.Settings;
}) => {
  const t = useT();
  const isPackaged = useSettingsStore((st) => st.isPackaged);
  return (
    <Section title={t('settings.collect')}>
      <CheckRow
        id="optAutoCollect"
        checked={s.autoCollect}
        onChange={(c) => void saveSettings({ autoCollect: c })}
        label={t('settings.auto_collect')}
        hint={t('settings.auto_collect_hint')}
      />
      <CheckRow
        id="optToast"
        checked={s.toast}
        onChange={(c) => void saveSettings({ toast: c })}
        label={t('settings.toast')}
        hint={t('settings.toast_hint')}
      />
      <CheckRow
        id="optAutoStart"
        checked={s.autoStart}
        disabled={!isPackaged}
        onChange={(c) => void saveSettings({ autoStart: c })}
        label={t('settings.autostart')}
        hint={
          <span id="autoStartHint">
            {isPackaged
              ? t('settings.autostart_hint')
              : t('settings.autostart_dev')}
          </span>
        }
      />
    </Section>
  );
};
