// 전역 단축키 녹화 칸. 클릭해 포커스를 주고 키 조합을 누르면 저장된다. Backspace/Delete 는 지우기, Esc 는 취소.
import { useState } from 'react';
import { useT } from '../../lib/i18n';

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS']);
const SPECIAL_KEYS = new Set([
  'Space',
  'Tab',
  'Enter',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
]);

/** 눌린 키 조합을 Electron accelerator 문자열로. 저장할 수 없는 조합이면 null. */
export function acceleratorOf(e: React.KeyboardEvent): string | null {
  if (MODIFIER_KEYS.has(e.key)) return null;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');
  const k =
    e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toUpperCase() : e.key;
  const isFn = /^F\d{1,2}$/.test(k);
  if (!(isFn || SPECIAL_KEYS.has(k) || k.length === 1)) return null;
  if (!mods.length && !isFn) return null;
  return [...mods, k].join('+');
}

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
