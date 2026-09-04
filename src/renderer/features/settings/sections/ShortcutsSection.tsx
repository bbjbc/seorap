import { useT } from '../../../lib/i18n';
import { saveSettings, useSettingsStore } from '../../../stores/settings';
import { Section } from '../rows';
import { ShortcutInput } from '../ShortcutInput';

const SHORTCUTS = [
  { key: 'toggle', id: 'scToggle', label: 'settings.sc_toggle' },
  { key: 'quickSave', id: 'scQuick', label: 'settings.sc_quick' },
  { key: 'newNote', id: 'scNote', label: 'settings.sc_note' },
] as const;

export const ShortcutsSection = ({ settings: s }: { settings: Seorap.Settings }) => {
  const t = useT();
  const errors = useSettingsStore((st) => st.shortcutErrors);
  return (
    <Section title={t('settings.shortcuts')} hint={t('settings.shortcuts_hint')}>
      {SHORTCUTS.map((sc) => (
        <div className="row" key={sc.key}>
          <label>{t(sc.label)}</label>
          <ShortcutInput id={sc.id} value={s.shortcuts[sc.key]} onChange={(acc) => void saveSettings({ shortcuts: { [sc.key]: acc } })} />
          <button type="button" className="btn ghost small" data-clear={sc.id} onClick={() => void saveSettings({ shortcuts: { [sc.key]: '' } })}>
            {t('settings.sc_clear')}
          </button>
        </div>
      ))}
      <p className="hint err" id="scError">
        {Object.values(errors).join(' ')}
      </p>
    </Section>
  );
};
