// 선택한 항목의 폼. 입력하면 600ms 뒤 저장된다 (저장 버튼 없음).
import { useShallow } from 'zustand/react/shallow';
import {
  IconCopy,
  IconExternal,
  IconEye,
  IconRefresh,
} from '../../components/icons';
import { fmtFull, fmtTime } from '../../lib/format';
import { useLang, useT } from '../../lib/i18n';
import { EMPTY_DRAFT, useVaultStore } from '../../stores/vault';
import {
  copySelected,
  deleteSelected,
  editDraft,
  generateIntoDraft,
  openDraftUrl,
  togglePassVisible,
  vaultNameHandle,
} from './actions';
import { GenOptions } from './GenOptions';

const attachName = vaultNameHandle.attach;

export const VaultForm = () => {
  const t = useT();
  const lang = useLang();
  const { draft, id, entries, passVisible, saveState } = useVaultStore(
    useShallow((s) => ({
      draft: s.draft,
      id: s.id,
      entries: s.entries,
      passVisible: s.passVisible,
      saveState: s.saveState,
    })),
  );
  const entry = entries.find((x) => x.id === id);
  const d = draft ?? EMPTY_DRAFT;

  return (
    <div className="vault-form" id="vaultForm" hidden={!draft}>
      <div className="field">
        <label htmlFor="vName">{t('vault.f_name')}</label>
        <input
          id="vName"
          ref={attachName}
          value={d.name}
          placeholder={t('vault.f_name_ph')}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => editDraft({ name: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="vUrl">{t('vault.f_url')}</label>
        <div className="with-actions">
          <input
            id="vUrl"
            value={d.url}
            placeholder="https://"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => editDraft({ url: e.target.value })}
          />
          <button
            type="button"
            className="icon-btn"
            id="vOpenUrl"
            title={t('common.open')}
            onClick={openDraftUrl}
          >
            <IconExternal />
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="vUser">{t('vault.f_user')}</label>
        <div className="with-actions">
          <input
            id="vUser"
            value={d.username}
            placeholder={t('vault.f_user_ph')}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => editDraft({ username: e.target.value })}
          />
          <button
            type="button"
            className="icon-btn"
            id="vCopyUser"
            title={t('common.copy')}
            onClick={() => void copySelected('username')}
          >
            <IconCopy />
          </button>
        </div>
      </div>
      <div className="field">
        <label htmlFor="vPass">{t('vault.f_pass')}</label>
        <div className="with-actions">
          <input
            id="vPass"
            className={passVisible ? 'shown' : ''}
            type={passVisible ? 'text' : 'password'}
            value={d.password}
            placeholder={t('vault.f_pass')}
            spellCheck={false}
            autoComplete="new-password"
            onChange={(e) => editDraft({ password: e.target.value })}
          />
          <button
            type="button"
            className={`icon-btn${passVisible ? ' active' : ''}`}
            id="vEye"
            title={t('vault.show')}
            onClick={togglePassVisible}
          >
            <IconEye />
          </button>
          <button
            type="button"
            className="icon-btn"
            id="vGen"
            title={t('vault.generate')}
            onClick={() => void generateIntoDraft()}
          >
            <IconRefresh />
          </button>
          <button
            type="button"
            className="btn primary small"
            id="vCopyPass"
            onClick={() => void copySelected('password')}
          >
            {t('common.copy')}
          </button>
        </div>
        <GenOptions />
      </div>
      <div className="field grow">
        <label htmlFor="vNotes">{t('vault.f_notes')}</label>
        <textarea
          id="vNotes"
          value={d.notes}
          placeholder={t('vault.f_notes_ph')}
          spellCheck={false}
          onChange={(e) => editDraft({ notes: e.target.value })}
        />
      </div>
      <div className="detail-foot">
        <span className="muted" id="vMeta">
          {entry
            ? t('vault.meta', {
                c: fmtFull(entry.createdAt),
                u: fmtTime(entry.updatedAt, lang),
              })
            : ''}
        </span>
        <span
          className={`save-state${saveState === 'saving' ? ' saving' : ''}`}
          id="vSaveState"
        >
          {saveState === 'saving'
            ? t('notes.saving')
            : saveState === 'saved'
              ? t('notes.saved_now')
              : ''}
        </span>
        <div className="spacer" />
        <button
          type="button"
          className="btn ghost danger"
          id="vDelete"
          onClick={() => void deleteSelected()}
        >
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
};
