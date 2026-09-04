// 금고: 비밀번호 규칙·생성기, 그리고 파일에 실제로 쓰는 암호화 왕복.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { setLanguage, t } from '../../src/main/i18n';
import { Vault, VaultError, checkStrength, generatePassword, GEN_MIN_LENGTH, GEN_MAX_LENGTH } from '../../src/main/vault';

const MASTER = 'Correct-Horse-Battery-2026!';

describe('checkStrength', () => {
  it('accepts 16+ characters of anything', () => {
    expect(checkStrength('aaaaaaaaaaaaaaaa')).toEqual({ ok: true, score: 4 });
  });
  it('accepts 12+ with three character classes, 10+ scores lower', () => {
    expect(checkStrength('Abcdefghij12')).toEqual({ ok: true, score: 3 });
    expect(checkStrength('Abcdefgh12')).toEqual({ ok: true, score: 2 });
  });
  it('rejects short or single-class passwords with a reason', () => {
    expect(checkStrength('abcdefghijk').ok).toBe(false);
    expect(checkStrength('short').score).toBe(0);
    expect(checkStrength('abcdefgh').score).toBe(1);
    expect(checkStrength(42)).toMatchObject({ ok: false, score: 0 });
  });
});

describe('generatePassword', () => {
  it('honours the requested length within bounds', () => {
    expect(generatePassword(20).length).toBe(20);
    expect(generatePassword(GEN_MIN_LENGTH).length).toBe(GEN_MIN_LENGTH);
    expect(generatePassword(GEN_MAX_LENGTH).length).toBe(GEN_MAX_LENGTH);
  });
  it('clamps out-of-range and garbage lengths instead of hanging or returning nothing', () => {
    expect(generatePassword(1).length).toBe(GEN_MIN_LENGTH);
    expect(generatePassword(10_000).length).toBe(GEN_MAX_LENGTH);
    expect(generatePassword(Number.NaN).length).toBe(20);
    expect(generatePassword(Number.POSITIVE_INFINITY).length).toBe(20);
    expect(generatePassword(12.7).length).toBe(12);
  });
  it('always includes every character class it was asked for', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword(GEN_MIN_LENGTH, true);
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[^a-zA-Z0-9]/);
    }
  });
  it('leaves symbols out when asked', () => {
    for (let i = 0; i < 50; i++) expect(generatePassword(24, false)).toMatch(/^[a-zA-Z0-9]+$/);
  });
  it('avoids look-alike characters', () => {
    const all = Array.from({ length: 30 }, () => generatePassword(64)).join('');
    expect(all).not.toMatch(/[lI1O0]/);
  });
});

describe('Vault', () => {
  let dir: string;
  let vault: Vault;
  beforeEach(() => {
    setLanguage('ko', 'ko-KR');
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seorap-vault-'));
    vault = new Vault(path.join(dir, 'vault.json'));
  });
  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('starts empty and locked', () => {
    expect(vault.exists).toBe(false);
    expect(vault.unlocked).toBe(false);
    expect(() => vault.list()).toThrow(VaultError);
  });

  it('refuses a weak master password at setup', () => {
    expect(() => vault.setup('short')).toThrow(VaultError);
    expect(vault.exists).toBe(false);
  });

  it('round-trips an entry through encryption and never writes the secret in clear', () => {
    vault.setup(MASTER);
    const e = vault.add({ name: 'github', username: 'me', password: 'p@ss-word' });
    expect(vault.getSecret(e.id)).toBe('p@ss-word');
    expect(vault.list()[0]).toMatchObject({ name: 'github', hasPassword: true });
    expect(vault.list()[0]).not.toHaveProperty('password');
    const raw = fs.readFileSync(vault.file, 'utf8');
    expect(raw).not.toContain('p@ss-word');
    expect(raw).not.toContain(MASTER);
  });

  it('reopens from disk with the right password and rejects the wrong one', () => {
    vault.setup(MASTER);
    vault.add({ name: 'x', password: 's3cret' });
    vault.lock('test');
    const again = new Vault(vault.file);
    expect(again.exists).toBe(true);
    expect(again.status().count).toBe(1); // 항목 수는 잠긴 채로도 보인다
    expect(() => again.unlock('wrong-password-123')).toThrow(t('vault.err_wrong'));
    // 실패 직후엔 대기 시간이 걸린다
    expect(() => again.unlock(MASTER)).toThrow(VaultError);
    expect(again.status().waitMs).toBeGreaterThan(0);
  });

  // scrypt(N=2^16) 한 번이 수백 ms 라 시도 횟수만큼 느리다. 상한(30초)에 닿는 것까지만 본다.
  it('backs off exponentially on repeated failures, capped at 30 seconds', { timeout: 30_000 }, () => {
    vault.setup(MASTER);
    vault.lock('test');
    vi.useFakeTimers();
    const delays: number[] = [];
    for (let i = 0; i < 7; i++) {
      try {
        vault.unlock('wrong-password-123');
      } catch (err) {
        expect(err).toBeInstanceOf(VaultError);
        delays.push((err as VaultError).waitMs);
        vi.advanceTimersByTime((err as VaultError).waitMs);
      }
    }
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });

  it('wipes the key on lock and notifies listeners once', () => {
    vault.setup(MASTER);
    const reasons: string[] = [];
    vault.onLock((r) => reasons.push(r));
    vault.lock('hide');
    vault.lock('hide'); // 이미 잠겨 있으면 다시 알리지 않는다
    expect(reasons).toEqual(['hide']);
    expect(() => vault.list()).toThrow(t('vault.err_locked'));
  });

  it('changePassword re-encrypts every entry and invalidates the old password', () => {
    vault.setup(MASTER);
    const e = vault.add({ name: 'x', password: 'keep-me' });
    vault.changePassword(MASTER, 'Another-Strong-Passphrase-99');
    vault.lock('test');
    expect(() => vault.unlock(MASTER)).toThrow(VaultError);
    vi.useFakeTimers();
    vi.advanceTimersByTime(60_000);
    vault.unlock('Another-Strong-Passphrase-99');
    expect(vault.getSecret(e.id)).toBe('keep-me');
  });

  it('rejects changePassword with the wrong current password or a weak new one', () => {
    vault.setup(MASTER);
    expect(() => vault.changePassword('nope-nope-nope-1', 'Another-Strong-Passphrase-99')).toThrow(t('vault.err_wrong_current'));
    expect(() => vault.changePassword(MASTER, 'weak')).toThrow(VaultError);
    expect(vault.unlocked).toBe(true);
  });
});
