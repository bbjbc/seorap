// 저장 공간: 통계, 오래된 항목 정리, 저장 폴더.
import { useState } from 'react';
import { api } from '../../../lib/api';
import { fmtSize } from '../../../lib/format';
import { useT } from '../../../lib/i18n';
import { useItemsStore } from '../../../stores/items';
import { saveSettings } from '../../../stores/settings';
import { cleanupNow, moveDataDir, staleCount } from '../actions';
import { ButtonRow, CheckRow, Row, Section } from '../rows';

const DEFAULT_DAYS = 30;
const clampDays = (n: number): number =>
  Math.max(1, Math.min(3650, n || DEFAULT_DAYS));

interface Props {
  settings: Seorap.Settings;
  stats: Seorap.Stats | null;
  /** 정리·폴더 이동 뒤 통계를 다시 읽어 달라는 신호 */
  onStatsStale: () => void;
}

export const StorageSection = ({ settings: s, stats, onStatsStale }: Props) => {
  const t = useT();
  const items = useItemsStore((st) => st.items);
  // 일수 칸은 타이핑 중 값을 그대로 보여 주고, 벗어날 때 정리해 저장한다.
  const [daysText, setDaysText] = useState(String(s.cleanup.days));
  const [seenDays, setSeenDays] = useState(s.cleanup.days);
  if (seenDays !== s.cleanup.days) {
    setSeenDays(s.cleanup.days);
    setDaysText(String(s.cleanup.days));
  }
  const [dirError, setDirError] = useState('');
  const days = Number(daysText) || 0;
  const effectiveDays = days || DEFAULT_DAYS;

  const commitDays = (): void => {
    const d = clampDays(Number(daysText));
    setDaysText(String(d));
    if (d !== s.cleanup.days) void saveSettings({ cleanup: { days: d } });
  };

  return (
    <Section title={t('settings.storage')}>
      <div className="stats" id="stats">
        {stats && (
          <>
            <Stat
              value={stats.count.toLocaleString()}
              label={t('settings.stat_items', { n: stats.pinned })}
            />
            <Stat
              value={fmtSize(stats.bytes)}
              label={t('settings.stat_bytes')}
            />
            <Stat
              value={fmtSize(stats.thumbBytes)}
              label={t('settings.stat_thumbs')}
            />
            <Stat
              value={String(stats.byType.image)}
              label={t('settings.stat_types', {
                t: stats.byType.text,
                l: stats.byType.link,
                f: stats.byType.file,
              })}
            />
          </>
        )}
      </div>
      <CheckRow
        id="optCleanup"
        checked={s.cleanup.enabled}
        onChange={(c) => void saveSettings({ cleanup: { enabled: c } })}
        label={t('settings.cleanup')}
        hint={
          <>
            <span>{t('settings.cleanup_hint_a')}</span>{' '}
            <input
              type="number"
              id="optCleanupDays"
              min={1}
              max={3650}
              className="inline-num"
              value={daysText}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setDaysText(e.target.value)}
              onBlur={commitDays}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
            />
            <span>{t('settings.cleanup_hint_b')}</span>
          </>
        }
      />
      <ButtonRow>
        <button
          type="button"
          className="btn ghost small"
          id="btnCleanupNow"
          onClick={() => {
            void cleanupNow(effectiveDays).then((did) => {
              if (did) onStatsStale();
            });
          }}
        >
          {t('settings.cleanup_now', { days: effectiveDays })}
        </button>
        <span className="muted" id="cleanupPreview">
          {days > 0
            ? t('settings.cleanup_preview', { n: staleCount(items, days) })
            : ''}
        </span>
      </ButtonRow>
      <Row label={t('settings.data_dir')}>
        <code id="dataDir" className="path">
          {stats?.dir ?? ''}
        </code>
      </Row>
      <ButtonRow>
        <button
          type="button"
          className="btn ghost small"
          id="btnOpenDir"
          onClick={() => void api.openDataDir()}
        >
          {t('settings.open_dir')}
        </button>
        <button
          type="button"
          className="btn ghost small"
          id="btnMoveDir"
          onClick={() => {
            setDirError('');
            void moveDataDir().then((r) => {
              setDirError(r.error ?? '');
              if (r.moved) onStatsStale();
            });
          }}
        >
          {t('settings.move_dir')}
        </button>
      </ButtonRow>
      <p className="hint err" id="dirError">
        {dirError}
      </p>
    </Section>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="stat">
    <b>{value}</b>
    <span>{label}</span>
  </div>
);
