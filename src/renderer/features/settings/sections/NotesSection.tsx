import { SegControl } from '../../../components/SegControl';
import { useT } from '../../../lib/i18n';
import { saveSettings } from '../../../stores/settings';
import { CheckRow, Row, Section } from '../rows';

const FONT_SIZES = ['13', '15', '17', '20'] as const;
type FontSize = (typeof FONT_SIZES)[number];

export const NotesSection = ({
  settings: s,
}: {
  settings: Seorap.Settings;
}) => {
  const t = useT();
  const labels: Record<FontSize, string> = {
    '13': t('settings.small'),
    '15': t('settings.medium'),
    '17': t('settings.large'),
    '20': t('settings.xlarge'),
  };
  const current = String(s.notes.fontSize);
  return (
    <Section title={t('settings.notes')}>
      <CheckRow
        id="optMono"
        checked={s.notes.mono}
        onChange={(c) => void saveSettings({ notes: { mono: c } })}
        label={t('settings.mono')}
        hint={t('settings.mono_hint')}
      />
      <Row label={t('settings.font_size')}>
        <SegControl<string>
          id="segFont"
          value={current}
          options={FONT_SIZES.map((v) => ({ value: v, label: labels[v] }))}
          onChange={(v) =>
            void saveSettings({ notes: { fontSize: Number(v) || 15 } })
          }
        />
      </Row>
    </Section>
  );
};
