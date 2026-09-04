import { useT } from '../../../lib/i18n';
import { saveSettings, useSettingsStore } from '../../../stores/settings';
import { openIssues, openRepo } from '../../nudge/actions';

export const AboutSection = () => {
  const t = useT();
  const version = useSettingsStore((s) => s.version);
  return (
    <>
      <section className="about">
        <span id="aboutVersion">{`${t('app.name_full')} ${version}`}</span>
        <span>{t('settings.about_keys')}</span>
      </section>
      <section className="about-links">
        <button
          type="button"
          className="btn ghost small"
          id="btnStar"
          onClick={() => {
            openRepo();
            void saveSettings({ starNudge: { done: true } });
          }}
        >
          {t('settings.star')}
        </button>
        <button
          type="button"
          className="btn ghost small"
          id="btnIssue"
          onClick={openIssues}
        >
          {t('settings.issue')}
        </button>
      </section>
    </>
  );
};
