// 설정 병합과 파일 저장. 임시 폴더에 실제로 쓰고 읽는다.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULTS, deepMerge, Settings } from '../../../src/main/settings';

let dir: string;
let file: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seorap-settings-'));
  file = path.join(dir, 'settings.json');
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('deepMerge', () => {
  it('merges nested objects instead of replacing them', () => {
    const out = deepMerge(DEFAULTS, { vault: { genLength: 32 } });
    expect(out.vault.genLength).toBe(32);
    expect(out.vault.autoLockMinutes).toBe(DEFAULTS.vault.autoLockMinutes);
  });
  it('replaces arrays and primitives wholesale', () => {
    interface T {
      list: number[];
      n: number;
    }
    const out = deepMerge<T>({ list: [1, 2, 3], n: 1 }, { list: [9], n: 2 });
    expect(out).toEqual({ list: [9], n: 2 });
  });
  it('does not mutate its inputs', () => {
    const base = structuredClone(DEFAULTS);
    deepMerge(base, { autoCollect: !base.autoCollect });
    expect(base).toEqual(DEFAULTS);
  });
});

describe('Settings', () => {
  it('starts from defaults when there is no file', () => {
    const s = new Settings(file);
    expect(s.data).toEqual(DEFAULTS);
    expect(fs.existsSync(file)).toBe(false);
  });
  it('falls back to defaults when the file is corrupt rather than crashing', () => {
    fs.writeFileSync(file, '{ not json');
    expect(new Settings(file).data).toEqual(DEFAULTS);
  });
  it('fills in keys a newer version added, keeping what the user set', () => {
    fs.writeFileSync(
      file,
      JSON.stringify({ autoCollect: true, vault: { autoLockMinutes: 1 } }),
    );
    const s = new Settings(file);
    expect(s.data.autoCollect).toBe(true);
    expect(s.data.vault.autoLockMinutes).toBe(1);
    expect(s.data.vault.genLength).toBe(DEFAULTS.vault.genLength); // 이 세션에서 추가된 키
  });
  it('set() persists the merged result and leaves no temp file behind', () => {
    const s = new Settings(file);
    const after = s.set({ notes: { fontSize: 17 } });
    expect(after.notes.fontSize).toBe(17);
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual(after);
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
  });
  it('get() returns a copy, so callers cannot mutate live settings', () => {
    const s = new Settings(file);
    s.get().autoCollect = true;
    expect(s.data.autoCollect).toBe(false);
  });
});
