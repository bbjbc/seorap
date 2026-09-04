import { SegControl } from '../../../components/SegControl';
import { useT } from '../../../lib/i18n';
import { saveSettings } from '../../../stores/settings';
import { Row, Section } from '../rows';

export const BoardSection = ({ settings: s }: { settings: Seorap.Settings }) => {
  const t = useT();
  return (
    <Section title={t('settings.board')}>
      <Row label={t('settings.card_size')}>
        <SegControl<Seorap.CardSize>
          id="segCardSize"
          value={s.board.cardSize}
          options={[
            { value: 'small', label: t('settings.small') },
            { value: 'medium', label: t('settings.medium') },
            { value: 'large', label: t('settings.large') },
          ]}
          onChange={(v) => void saveSettings({ board: { cardSize: v } })}
        />
      </Row>
      <Row label={t('settings.card_click')}>
        <SegControl<Seorap.ClickAction>
          id="segClick"
          value={s.board.clickAction}
          options={[
            { value: 'copy', label: t('settings.click_copy') },
            { value: 'detail', label: t('settings.click_detail') },
          ]}
          onChange={(v) => void saveSettings({ board: { clickAction: v } })}
        />
      </Row>
    </Section>
  );
};
