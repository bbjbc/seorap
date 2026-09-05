// 전역 단축키 녹화 칸. 클릭해 포커스를 주고 키 조합을 누르면 저장된다. Backspace/Delete 는 지우기, Esc 는 취소.
import { useState } from 'react';
import { useT } from '../../lib/i18n';
import { acceleratorOf } from './accelerator';

interface Props {
  id: string;
  value: string;
  onChange: (accelerator: string) => void;
}

export const ShortcutInput = ({ id, value, onChange }: Props) => {
  const t = useT();
  const [recording, setRecording] = useState(false);

  return (
    <input
      className={`shortcut${recording ? ' recording' : ''}`}
      id={id}
      readOnly
      value={recording ? '' : value}
      placeholder={recording ? t('settings.sc_record') : t('common.none')}
      onFocus={() => setRecording(true)}
      onBlur={() => setRecording(false)}
      onKeyDown={(e) => {
        e.preventDefault();
        if (e.key === 'Escape') {
          e.currentTarget.blur();
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          onChange('');
          e.currentTarget.blur();
          return;
        }
        const acc = acceleratorOf(e);
        if (!acc) return;
        onChange(acc);
        e.currentTarget.blur();
      }}
    />
  );
};
