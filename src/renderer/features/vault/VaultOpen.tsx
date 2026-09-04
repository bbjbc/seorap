// 열린 금고: 왼쪽 목록, 오른쪽 폼.
import { useState } from 'react';
import { EmptyArt } from '../../components/EmptyArt';
import { IconPlus } from '../../components/icons';
import { RichText } from '../../components/RichText';
import { SearchBox } from '../../components/SearchBox';
import { useT } from '../../lib/i18n';
import { useVaultStore } from '../../stores/vault';
import { lockNow, newEntry, vaultSearchHandle } from './actions';
import { useAutoLockCountdown } from './useAutoLockCountdown';
import { VaultForm } from './VaultForm';
import { VaultList } from './VaultList';

interface Props {
  visible: boolean;
  active: boolean;
}

export const VaultOpen = ({ visible, active }: Props) => {
  const t = useT();
  const [query, setQuery] = useState('');
  const hasDraft = useVaultStore((s) => s.draft !== null);
  const countdown = useAutoLockCountdown(active && visible);

  return (
    <div className="vault-open split" id="vaultOpen" hidden={!visible}>
      <aside className="side">
        <div className="side-head">
          <SearchBox
            id="vaultSearch"
            value={query}
            placeholder={t('vault.search_ph')}
            onChange={setQuery}
            inputRef={vaultSearchHandle.attach}
          />
          <button
            type="button"
            className="icon-btn"
            id="btnNewSecret"
            title={t('vault.new_title')}
            onClick={() => void newEntry()}
          >
            <IconPlus />
          </button>
        </div>
        <VaultList query={query} />
        <footer className="side-foot">
          <button
            type="button"
            className="btn ghost small"
            id="btnLock"
            onClick={lockNow}
          >
            {t('vault.lock_now')}
          </button>
          <span className="muted" id="lockCountdown">
            {countdown}
          </span>
        </footer>
      </aside>
      <div className="pane">
        <VaultForm />
        <div className="editor-empty" id="vaultEmpty" hidden={hasDraft}>
          <EmptyArt small />
          <h2>{t('vault.empty_title')}</h2>
          <p>
            <RichText text={t('vault.empty_desc')} />
          </p>
        </div>
      </div>
    </div>
  );
};
