// 왼쪽 레일: 모드 전환, 새 버전, 클립보드 저장, 설정.
import iconUrl from '../../../../assets/icon.png';
import {
  IconBoard,
  IconClipboard,
  IconDownload,
  IconNotes,
  IconSettings,
  IconVault,
} from '../../components/icons';
import { useT } from '../../lib/i18n';
import { useMode, useUiStore } from '../../stores/ui';
import { useVaultUnlocked } from '../../stores/vault';
import { openSettings } from '../settings/actions';
import { openUpdate } from '../update/actions';
import { grabClipboard, setMode } from './actions';

const MODES = [
  {
    mode: 'board',
    Icon: IconBoard,
    label: 'rail.board',
    title: 'rail.board_title',
  },
  {
    mode: 'notes',
    Icon: IconNotes,
    label: 'rail.notes',
    title: 'rail.notes_title',
  },
  {
    mode: 'vault',
    Icon: IconVault,
    label: 'rail.vault',
    title: 'rail.vault_title',
  },
] as const;

export const Rail = () => {
  const t = useT();
  const mode = useMode();
  const unlocked = useVaultUnlocked();
  const update = useUiStore((s) => s.update);

  return (
    <nav className="rail drag">
      <div className="rail-logo">
        <img src={iconUrl} alt="" />
      </div>
      {MODES.map((m) => (
        <button
          key={m.mode}
          type="button"
          className={`rail-btn nodrag${mode === m.mode ? ' active' : ''}`}
          data-mode={m.mode}
          title={t(m.title)}
          onClick={() => setMode(m.mode)}
        >
          <m.Icon />
          <span>{t(m.label)}</span>
          {m.mode === 'vault' && (
            <i className="rail-dot" id="vaultDot" hidden={!unlocked} />
          )}
        </button>
      ))}
      <div className="rail-spacer" />
      <button
        type="button"
        className="rail-btn nodrag update"
        id="railUpdate"
        hidden={!update}
        title={update ? t('rail.update_title', { v: update.version }) : ''}
        onClick={openUpdate}
      >
        <IconDownload />
        <span id="railUpdateLabel">
          {update ? `v${update.version}` : t('rail.update')}
        </span>
        <i className="rail-dot accent" />
      </button>
      <button
        type="button"
        className="rail-btn nodrag"
        id="railGrab"
        title={t('rail.clipboard_title')}
        onClick={() => void grabClipboard()}
      >
        <IconClipboard />
        <span>{t('rail.clipboard')}</span>
      </button>
      <button
        type="button"
        className="rail-btn nodrag"
        id="railSettings"
        title={t('rail.settings')}
        onClick={() => void openSettings()}
      >
        <IconSettings />
        <span>{t('rail.settings')}</span>
      </button>
    </nav>
  );
};
