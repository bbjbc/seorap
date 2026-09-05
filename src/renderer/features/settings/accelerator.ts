// 눌린 키 조합을 Electron accelerator 문자열로 바꾼다.
// 컴포넌트 밖 순수 함수로 둔 이유: 화면 없이 시험할 수 있어야 하고, 조건이 잔가지가 많다.

const MODIFIER_KEYS = new Set(['Control', 'Alt', 'Shift', 'Meta', 'OS']);
/** 수식키와 함께라면 단축키가 될 수 있는, 한 글자가 아닌 키들 */
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

/** KeyboardEvent 에서 실제로 읽는 것만. React.KeyboardEvent 와 DOM KeyboardEvent 둘 다 들어맞는다. */
export interface KeyChord {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/**
 * 저장할 수 있는 조합이면 'Ctrl+Alt+V' 같은 문자열, 아니면 null.
 * 수식키만 눌린 경우, 수식키 없는 한 글자, 다룰 수 없는 키는 모두 null 이다.
 * F1~F12 는 혼자서도 단축키가 된다.
 */
export function acceleratorOf(e: KeyChord): string | null {
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
