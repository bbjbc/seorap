import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { RichText } from '../../components/RichText';
import { fmtTime, hostOf } from '../../lib/format';
import { useLang, useT } from '../../lib/i18n';
import { useVaultStore } from '../../stores/vault';
import { selectSecret } from './actions';

export const VaultList = ({ query }: { query: string }) => {
  const t = useT();
  const lang = useLang();
  const { entries, id } = useVaultStore(useShallow((s) => ({ entries: s.entries, id: s.id })));
  const q = query.trim().toLowerCase();
  const list = useMemo(
    () =>
      entries
        .filter((x) => !q || [x.name, x.username, x.url].join('\n').toLowerCase().includes(q))
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name, 'ko') || b.updatedAt - a.updatedAt),
    [entries, q],
  );

  return (
    <div className="notelist" id="vaultList">
      {!list.length ? (
        <div className="none">
          <RichText text={q ? t('notes.no_result') : t('vault.empty_list')} />
        </div>
      ) : (
        list.map((x) => (
          <div key={x.id} className={`note-item${x.id === id ? ' active' : ''}`} data-id={x.id} onClick={() => void selectSecret(x.id)}>
            <div className={`n-title${x.name ? '' : ' untitled'}`}>
              <span>{x.name || t('common.untitled')}</span>
            </div>
            <div className="n-sub">
              <span className="n-snip">{x.username || hostOf(x.url)}</span>
              <span className="n-time">{fmtTime(x.updatedAt, lang)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
