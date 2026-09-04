// 비밀번호 생성 옵션 (길이 슬라이더 · 기호 포함). 값은 설정에 저장된다.
import { useState } from 'react';
import { useT } from '../../lib/i18n';
import { saveSettings, useSettings } from '../../stores/settings';
import { clampGenLength, GEN_MAX, GEN_MIN } from './constants';

export const GenOptions = () => {
  const t = useT();
  const vault = useSettings()?.vault;
  const saved = clampGenLength(vault?.genLength ?? NaN);
  // 슬라이더를 끄는 동안은 로컬 값을 보여 주고, 놓으면 저장한다.
  const [len, setLen] = useState(saved);
  const [seen, setSeen] = useState(saved);
  if (seen !== saved) {
    // 설정이 밖에서 바뀌면(다른 곳에서 저장) 슬라이더도 따라간다.
    setSeen(saved);
    setLen(saved);
  }

  return (
    <div className="gen-opts">
      <span className="gen-label">{t('vault.gen_len')}</span>
      <input
        type="range"
        id="vGenLen"
        min={GEN_MIN}
        max={GEN_MAX}
        step={1}
        value={len}
        onChange={(e) => setLen(Number(e.target.value))}
        onPointerUp={() => void saveSettings({ vault: { genLength: clampGenLength(len) } })}
        onKeyUp={() => void saveSettings({ vault: { genLength: clampGenLength(len) } })}
      />
      <output id="vGenLenOut" htmlFor="vGenLen">
        {len}
      </output>
      <label className="gen-sym">
        <input type="checkbox" id="vGenSymbols" checked={vault?.genSymbols ?? true} onChange={(e) => void saveSettings({ vault: { genSymbols: e.target.checked } })} />
        <span>{t('vault.gen_symbols')}</span>
      </label>
    </div>
  );
};
