// 전역 단축키 녹화. 저장하면 안 되는 조합을 걸러 내는 것이 요점이다.
// 수식키 없는 한 글자를 통과시키면 사용자가 다른 앱에서 'A' 를 못 쓰게 된다.
import { describe, expect, it } from 'vitest';
import {
  acceleratorOf,
  type KeyChord,
} from '../../../src/renderer/features/settings/accelerator';

const chord = (key: string, mods: Partial<KeyChord> = {}): KeyChord => ({
  key,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods,
});

describe('acceleratorOf', () => {
  it('builds a combination in a fixed modifier order', () => {
    expect(acceleratorOf(chord('v', { ctrlKey: true, altKey: true }))).toBe(
      'Ctrl+Alt+V',
    );
    expect(acceleratorOf(chord('v', { altKey: true, ctrlKey: true }))).toBe(
      'Ctrl+Alt+V',
    );
    expect(
      acceleratorOf(
        chord('n', {
          ctrlKey: true,
          altKey: true,
          shiftKey: true,
          metaKey: true,
        }),
      ),
    ).toBe('Ctrl+Alt+Shift+Super+N');
  });

  it('upper-cases a single letter so the saved string is stable', () => {
    expect(acceleratorOf(chord('a', { ctrlKey: true }))).toBe('Ctrl+A');
    expect(acceleratorOf(chord('A', { ctrlKey: true }))).toBe('Ctrl+A');
  });

  it('names the space bar rather than emitting a blank', () => {
    expect(acceleratorOf(chord(' ', { ctrlKey: true }))).toBe('Ctrl+Space');
  });

  it('refuses a key with no modifier, which would steal it from every other app', () => {
    expect(acceleratorOf(chord('a'))).toBeNull();
    expect(acceleratorOf(chord('Enter'))).toBeNull();
    expect(acceleratorOf(chord(' '))).toBeNull();
  });

  it('allows function keys on their own', () => {
    expect(acceleratorOf(chord('F5'))).toBe('F5');
    expect(acceleratorOf(chord('F12', { shiftKey: true }))).toBe('Shift+F12');
  });

  it('refuses a modifier pressed by itself, which arrives while typing a combination', () => {
    for (const k of ['Control', 'Alt', 'Shift', 'Meta', 'OS']) {
      expect(acceleratorOf(chord(k, { ctrlKey: true }))).toBeNull();
    }
  });

  it('accepts the named keys it knows and rejects the rest', () => {
    expect(acceleratorOf(chord('Home', { ctrlKey: true }))).toBe('Ctrl+Home');
    expect(acceleratorOf(chord('PageUp', { altKey: true }))).toBe('Alt+PageUp');
    expect(acceleratorOf(chord('ArrowUp', { ctrlKey: true }))).toBeNull();
    expect(acceleratorOf(chord('CapsLock', { ctrlKey: true }))).toBeNull();
  });

  it('takes digits and punctuation, which are single characters too', () => {
    expect(acceleratorOf(chord('1', { ctrlKey: true }))).toBe('Ctrl+1');
    expect(acceleratorOf(chord(',', { ctrlKey: true }))).toBe('Ctrl+,');
  });
});
