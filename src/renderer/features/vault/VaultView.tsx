// 금고: 잠금 화면 또는 목록 + 폼. 사용자 입력이 있으면 자동 잠금 타이머를 미룬다.
import { useT } from '../../lib/i18n';
import { useMode } from '../../stores/ui';
import { useVaultUnlocked } from '../../stores/vault';
import { touchVault } from './actions';
import { LockScreen } from './LockScreen';
import { VaultOpen } from './VaultOpen';

export const VaultView = () => {
  const t = useT();
  const mode = useMode();
  const unlocked = useVaultUnlocked();
  const touch = (): void => {
    if (unlocked) touchVault();
  };
  return (
    <section
      className="view"
      id="viewVault"
      hidden={mode !== 'vault'}
      onPointerDown={touch}
      onKeyDown={touch}
    >
      <header className="viewbar drag">
        <div className="pane-title">{t('vault.title')}</div>
      </header>
      <LockScreen visible={!unlocked} active={mode === 'vault'} />
      <VaultOpen visible={unlocked} active={mode === 'vault'} />
    </section>
  );
};
