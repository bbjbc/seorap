// 설정 모달. 값 하나를 바꾸면 곧바로 메인에 저장되고, 돌아온 설정으로 다시 그려진다.
import { useCallback, useEffect, useState } from 'react';
import { IconClose } from '../../components/icons';
import { Modal } from '../../components/Modal';
import { api } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useSettingsStore } from '../../stores/settings';
import { useUiStore } from '../../stores/ui';
import { closeSettings } from './actions';
import { AboutSection } from './sections/AboutSection';
import { BoardSection } from './sections/BoardSection';
import { CollectSection } from './sections/CollectSection';
import { GeneralSection } from './sections/GeneralSection';
import { NotesSection } from './sections/NotesSection';
import { ShortcutsSection } from './sections/ShortcutsSection';
import { StorageSection } from './sections/StorageSection';
import { UpdatesSection } from './sections/UpdatesSection';
import { VaultSection } from './sections/VaultSection';

export const SettingsModal = () => {
  const t = useT();
  const open = useUiStore((s) => s.settingsOpen);
  const settings = useSettingsStore((s) => s.settings);
  const [stats, setStats] = useState<Seorap.Stats | null>(null);
  const refreshStats = useCallback(
    (): void => void api.getStats().then(setStats),
    [],
  );

  useEffect(() => {
    if (open) refreshStats();
  }, [open, refreshStats]);

  return (
    <Modal
      id="settings"
      open={open}
      onClose={closeSettings}
      cardClassName="settings-card"
    >
      <div className="detail-head">
        <h2>{t('settings.title')}</h2>
        <button
          type="button"
          className="icon-btn"
          title={t('common.close')}
          onClick={closeSettings}
        >
          <IconClose />
        </button>
      </div>
      {settings && (
        <div className="settings-body">
          <GeneralSection settings={settings} />
          <ShortcutsSection settings={settings} />
          <CollectSection settings={settings} />
          <BoardSection settings={settings} />
          <NotesSection settings={settings} />
          <VaultSection settings={settings} />
          <StorageSection
            settings={settings}
            stats={stats}
            onStatsStale={refreshStats}
          />
          <UpdatesSection settings={settings} />
          <AboutSection />
        </div>
      )}
    </Modal>
  );
};
