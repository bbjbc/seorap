import { useT } from '../../../lib/i18n';
import { saveSettings } from '../../../stores/settings';
import { Row, Section } from '../rows';

export const GeneralSection = ({ settings: s }: { settings: Seorap.Settings }) => {
  const t = useT();
  return (
    <Section title={t('settings.general')}>
      <Row label={t('settings.language')}>
        <select id="optLanguage" value={s.language} onChange={(e) => void saveSettings({ language: e.target.value === 'ko' || e.target.value === 'en' ? e.target.value : 'system' })}>
          <option value="system">{t('settings.language_system')}</option>
          <option value="ko">한국어</option>
          <option value="en">English</option>
        </select>
      </Row>
    </Section>
  );
};
