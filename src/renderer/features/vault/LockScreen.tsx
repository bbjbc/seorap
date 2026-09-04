// 잠금 화면. 금고가 없으면 "만들기"(비밀번호 두 번 + 복구 불가 동의), 있으면 "열기".
import { useEffect, useState } from 'react';
import { IconVault } from '../../components/icons';
import { RichText } from '../../components/RichText';
import { useT } from '../../lib/i18n';
import { useVaultStore } from '../../stores/vault';
import { passwordStrength, submitLock } from './actions';

const FOCUS_DELAY_MS = 30;

interface Props {
  visible: boolean;
  /** 금고 모드가 화면에 있을 때만 비밀번호칸에 포커스를 준다. */
  active: boolean;
}

export const LockScreen = ({ visible, active }: Props) => {
  const t = useT();
  const status = useVaultStore((s) => s.status);
  const setup = !(status?.exists ?? false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(0);
  const [pwEl, setPwEl] = useState<HTMLInputElement | null>(null);

  // 상태가 바뀌면(잠김·만들어짐) 칸을 비우고 다시 시작한다.
  const [seenStatus, setSeenStatus] = useState(status);
  if (seenStatus !== status) {
    setSeenStatus(status);
    setPw('');
    setPw2('');
    setAck(false);
    setErr('');
    setScore(0);
  }

  useEffect(() => {
    if (!visible || !active || !pwEl) return;
    const id = window.setTimeout(() => pwEl.focus(), FOCUS_DELAY_MS);
    return () => clearTimeout(id);
  }, [visible, active, pwEl, status]);

  const onPwChange = (v: string): void => {
    setPw(v);
    if (!setup) return;
    if (!v) {
      setScore(0);
      return;
    }
    void passwordStrength(v).then((s) => setScore(s.ok ? s.score : Math.max(1, s.score)));
  };

  const onSubmit = async (): Promise<void> => {
    if (!pw) return;
    setBusy(true);
    setErr('');
    const error = await submitLock(pw, pw2, ack);
    setBusy(false);
    if (error) {
      setErr(error);
      pwEl?.select();
    }
  };

  return (
    <div className="vault-locked" id="vaultLocked" hidden={!visible}>
      <div className="lock-card">
        <div className="lock-icon">
          <IconVault />
        </div>
        <h2 id="lockTitle">{setup ? t('vault.setup_title') : t('vault.locked_title')}</h2>
        <p className="muted" id="lockDesc">
          {setup ? t('vault.setup_desc') : t('vault.locked_desc')}
        </p>
        <form
          id="lockForm"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit();
          }}
        >
          <input type="password" id="lockPw" ref={setPwEl} value={pw} placeholder={t('vault.master_ph')} autoComplete="new-password" onChange={(e) => onPwChange(e.target.value)} />
          <input type="password" id="lockPw2" value={pw2} placeholder={t('vault.master_again_ph')} autoComplete="new-password" hidden={!setup} onChange={(e) => setPw2(e.target.value)} />
          <div className="strength" id="strength" hidden={!setup} data-score={String(score)}>
            <i />
            <i />
            <i />
            <i />
          </div>
          <label className="mini-check warn" id="lockAck" hidden={!setup}>
            <input type="checkbox" id="lockAckBox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>
              <RichText text={t('vault.ack')} />
            </span>
          </label>
          <button className="btn primary wide" id="lockBtn" type="submit" disabled={busy}>
            {setup ? t('vault.setup_title') : t('vault.unlock')}
          </button>
        </form>
        <p className="hint err" id="lockErr">
          {err}
        </p>
        <details className="lock-info">
          <summary>{t('vault.how_summary')}</summary>
          <ul>
            <li>{t('vault.how_1')}</li>
            <li>{t('vault.how_2')}</li>
            <li>{t('vault.how_3')}</li>
            <li>{t('vault.how_4')}</li>
            <li>{t('vault.how_5')}</li>
          </ul>
        </details>
      </div>
    </div>
  );
};
