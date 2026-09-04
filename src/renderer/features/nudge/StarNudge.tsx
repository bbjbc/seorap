import { useT } from '../../lib/i18n';
import { useUiStore } from '../../stores/ui';
import { closeNudge, openRepo } from './actions';

const SNOOZE_MS = 14 * 86400e3;

export const StarNudge = () => {
  const t = useT();
  const visible = useUiStore((s) => s.nudgeVisible);
  return (
    <div id="starNudge" className="nudge" hidden={!visible}>
      <span className="nudge-star">⭐</span>
      <span className="nudge-text">{t('nudge.text')}</span>
      <button
        type="button"
        className="btn primary small"
        id="nudgeStar"
        onClick={() => {
          openRepo();
          closeNudge({ done: true });
        }}
      >
        {t('nudge.star')}
      </button>
      <button type="button" className="btn ghost small" id="nudgeLater" onClick={() => closeNudge({ snoozeUntil: Date.now() + SNOOZE_MS })}>
        {t('nudge.later')}
      </button>
      <button type="button" className="xbtn" id="nudgeNever" title={t('nudge.never')} onClick={() => closeNudge({ done: true })}>
        ×
      </button>
    </div>
  );
};
