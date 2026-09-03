// 금고: 마스터 비밀번호 → scrypt → AES-256-GCM.
// 키와 마스터 비밀번호는 디스크에 절대 쓰지 않는다. 잠기면 메모리의 키를 0으로 덮는다.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { t } from './i18n';

const KDF = { N: 2 ** 16, r: 8, p: 1, keyLen: 32, maxmem: 256 * 1024 * 1024 } as const;
// 기존 금고 파일과의 호환을 위해 검증 문자열은 바꾸지 않는다.
const VERIFIER = 'scrapbox-vault-v1';

interface Blob64 {
  iv: string;
  tag: string;
  data: string;
}

interface EncryptedEntry {
  id: string;
  blob: Blob64;
}

interface VaultFile {
  version: 1;
  createdAt: number;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string };
  check: Blob64;
  entries: EncryptedEntry[];
}

/** 복호화된 항목 (내부 전용) */
interface EntryPlain {
  name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export class VaultError extends Error {
  constructor(
    message: string,
    readonly waitMs = 0,
  ) {
    super(message);
    this.name = 'VaultError';
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isBlob64(v: unknown): v is Blob64 {
  return isRecord(v) && typeof v['iv'] === 'string' && typeof v['tag'] === 'string' && typeof v['data'] === 'string';
}

function parseVaultFile(raw: unknown): VaultFile | null {
  if (!isRecord(raw) || raw['version'] !== 1) return null;
  const kdf = raw['kdf'];
  if (!isRecord(kdf) || typeof kdf['salt'] !== 'string') return null;
  if (!isBlob64(raw['check'])) return null;
  const entriesRaw = raw['entries'];
  if (!Array.isArray(entriesRaw)) return null;
  const entries: EncryptedEntry[] = [];
  for (const e of entriesRaw as unknown[]) {
    if (isRecord(e) && typeof e['id'] === 'string' && isBlob64(e['blob'])) entries.push({ id: e['id'], blob: e['blob'] });
  }
  return {
    version: 1,
    createdAt: typeof raw['createdAt'] === 'number' ? raw['createdAt'] : Date.now(),
    kdf: {
      name: 'scrypt',
      N: typeof kdf['N'] === 'number' ? kdf['N'] : KDF.N,
      r: typeof kdf['r'] === 'number' ? kdf['r'] : KDF.r,
      p: typeof kdf['p'] === 'number' ? kdf['p'] : KDF.p,
      salt: kdf['salt'],
    },
    check: raw['check'],
    entries,
  };
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function sanitize(f: Partial<EntryPlain> & Seorap.VaultFields): EntryPlain {
  const now = Date.now();
  return {
    name: str(f.name, 200),
    username: str(f.username, 500),
    password: str(f.password, 2000),
    url: str(f.url, 2000),
    notes: str(f.notes, 20000),
    pinned: !!f.pinned,
    createdAt: typeof f.createdAt === 'number' ? f.createdAt : now,
    updatedAt: typeof f.updatedAt === 'number' ? f.updatedAt : now,
  };
}

function parseEntry(json: string): EntryPlain {
  const raw: unknown = JSON.parse(json);
  if (!isRecord(raw)) throw new VaultError(t('vault.err_corrupt'));
  return sanitize({
    name: str(raw['name'], 200),
    username: str(raw['username'], 500),
    password: str(raw['password'], 2000),
    url: str(raw['url'], 2000),
    notes: str(raw['notes'], 20000),
    pinned: !!raw['pinned'],
    createdAt: typeof raw['createdAt'] === 'number' ? raw['createdAt'] : undefined,
    updatedAt: typeof raw['updatedAt'] === 'number' ? raw['updatedAt'] : undefined,
  });
}

function toPublic(id: string, e: EntryPlain): Seorap.VaultEntryPublic {
  return {
    id,
    name: e.name,
    username: e.username,
    url: e.url,
    notes: e.notes,
    hasPassword: e.password.length > 0,
    pinned: e.pinned,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function checkStrength(pw: unknown): Seorap.Strength {
  if (typeof pw !== 'string') return { ok: false, score: 0, reason: t('vault.err_enter_pw') };
  const len = pw.length;
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length;
  if (len >= 16) return { ok: true, score: 4 };
  if (len >= 12 && classes >= 3) return { ok: true, score: 3 };
  if (len >= 10 && classes >= 3) return { ok: true, score: 2 };
  return {
    ok: false,
    score: len >= 8 ? 1 : 0,
    reason: t('vault.err_weak_rule'),
  };
}

export function generatePassword(len = 20, symbols = true): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const sym = '!@#$%^&*-_=+?';
  const sets = symbols ? [lower, upper, digits, sym] : [lower, upper, digits];
  const all = sets.join('');
  const pick = (s: string): string => s.charAt(crypto.randomInt(s.length));
  const out: string[] = sets.map(pick);
  while (out.length < len) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out.join('');
}

export class Vault {
  private key: Buffer | null = null;
  private data: VaultFile | null;
  private failedAttempts = 0;
  private nextAllowedAt = 0;
  private readonly listeners = new Set<(reason: string) => void>();

  constructor(public file: string) {
    this.data = this.load();
  }

  // ---------- 파일 ----------
  private load(): VaultFile | null {
    try {
      const parsed = parseVaultFile(JSON.parse(fs.readFileSync(this.file, 'utf8')));
      if (parsed) return parsed;
      this.backupCorrupt();
    } catch (err) {
      if (!(isRecord(err) && err['code'] === 'ENOENT')) this.backupCorrupt();
    }
    return null;
  }

  private backupCorrupt(): void {
    try {
      fs.copyFileSync(this.file, `${this.file}.corrupt-${Date.now()}`);
    } catch {
      /* 없으면 그만 */
    }
  }

  private save(): void {
    if (!this.data) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data));
    fs.renameSync(tmp, this.file);
  }

  setFile(file: string): void {
    this.file = file;
    this.data = this.load();
  }

  onLock(fn: (reason: string) => void): void {
    this.listeners.add(fn);
  }

  // ---------- 상태 ----------
  get exists(): boolean {
    return this.data !== null;
  }

  get unlocked(): boolean {
    return this.key !== null;
  }

  status(): Seorap.VaultStatus {
    return {
      exists: this.exists,
      unlocked: this.unlocked,
      count: this.data ? this.data.entries.length : 0,
      waitMs: Math.max(0, this.nextAllowedAt - Date.now()),
    };
  }

  // ---------- 암호화 기본 ----------
  private deriveKey(password: string, saltB64: string): Buffer {
    const salt = Buffer.from(saltB64, 'base64');
    return crypto.scryptSync(Buffer.from(password.normalize('NFKC'), 'utf8'), salt, KDF.keyLen, {
      N: KDF.N,
      r: KDF.r,
      p: KDF.p,
      maxmem: KDF.maxmem,
    });
  }

  private encrypt(plain: string, key: Buffer): Blob64 {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
    return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
  }

  private decrypt(blob: Blob64, key: Buffer): string {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(blob.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(blob.tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(blob.data, 'base64')), decipher.final()]).toString('utf8');
  }

  private verifies(key: Buffer): boolean {
    if (!this.data) return false;
    try {
      return this.decrypt(this.data.check, key) === VERIFIER;
    } catch {
      return false;
    }
  }

  private requireKey(): Buffer {
    if (!this.key) throw new VaultError(t('vault.err_locked'));
    return this.key;
  }

  private requireData(): VaultFile {
    if (!this.data) throw new VaultError(t('vault.err_missing'));
    return this.data;
  }

  // ---------- 생성 / 열기 / 잠금 ----------
  setup(password: string): Seorap.VaultStatus {
    if (this.exists) throw new VaultError(t('vault.err_exists'));
    const strength = checkStrength(password);
    if (!strength.ok) throw new VaultError(strength.reason ?? t('vault.err_weak'));
    const salt = crypto.randomBytes(16).toString('base64');
    const key = this.deriveKey(password, salt);
    this.data = {
      version: 1,
      createdAt: Date.now(),
      kdf: { name: 'scrypt', N: KDF.N, r: KDF.r, p: KDF.p, salt },
      check: this.encrypt(VERIFIER, key),
      entries: [],
    };
    this.save();
    this.key = key;
    return this.status();
  }

  unlock(password: string): Seorap.VaultStatus {
    const data = this.requireData();
    const now = Date.now();
    if (now < this.nextAllowedAt) {
      const wait = this.nextAllowedAt - now;
      throw new VaultError(t('vault.err_wait', { s: Math.ceil(wait / 1000) }), wait);
    }
    const key = this.deriveKey(password, data.kdf.salt);
    if (!this.verifies(key)) {
      key.fill(0);
      this.failedAttempts += 1;
      const delay = Math.min(30000, 500 * 2 ** Math.min(this.failedAttempts, 6));
      this.nextAllowedAt = Date.now() + delay;
      throw new VaultError(t('vault.err_wrong'), delay);
    }
    this.failedAttempts = 0;
    this.nextAllowedAt = 0;
    this.key = key;
    return this.status();
  }

  lock(reason = 'manual'): Seorap.VaultStatus {
    if (this.key) {
      this.key.fill(0);
      this.key = null;
      for (const fn of this.listeners) fn(reason);
    }
    return this.status();
  }

  // ---------- 항목 ----------
  private decode(e: EncryptedEntry, key: Buffer): EntryPlain {
    return parseEntry(this.decrypt(e.blob, key));
  }

  /** 목록에는 비밀번호를 내보내지 않는다. 필요할 때 getSecret 로 하나씩만 꺼낸다. */
  list(): Seorap.VaultEntryPublic[] {
    const key = this.requireKey();
    return this.requireData().entries.map((e) => toPublic(e.id, this.decode(e, key)));
  }

  getSecret(id: string): string | null {
    const key = this.requireKey();
    const e = this.requireData().entries.find((x) => x.id === id);
    return e ? this.decode(e, key).password : null;
  }

  add(fields: Seorap.VaultFields): Seorap.VaultEntryPublic {
    const key = this.requireKey();
    const data = this.requireData();
    const now = Date.now();
    const entry = sanitize({ ...fields, createdAt: now, updatedAt: now });
    const id = now.toString(36) + crypto.randomBytes(3).toString('hex');
    data.entries.unshift({ id, blob: this.encrypt(JSON.stringify(entry), key) });
    this.save();
    return toPublic(id, entry);
  }

  update(id: string, patch: Seorap.VaultFields): Seorap.VaultEntryPublic | null {
    const key = this.requireKey();
    const data = this.requireData();
    const idx = data.entries.findIndex((x) => x.id === id);
    const cur = data.entries[idx];
    if (!cur) return null;
    const next = sanitize({ ...this.decode(cur, key), ...patch, updatedAt: Date.now() });
    data.entries[idx] = { id, blob: this.encrypt(JSON.stringify(next), key) };
    this.save();
    return toPublic(id, next);
  }

  remove(id: string): number {
    this.requireKey();
    const data = this.requireData();
    const before = data.entries.length;
    data.entries = data.entries.filter((x) => x.id !== id);
    this.save();
    return before - data.entries.length;
  }

  changePassword(oldPw: string, newPw: string): Seorap.VaultStatus {
    const key = this.requireKey();
    const data = this.requireData();
    const oldKey = this.deriveKey(oldPw, data.kdf.salt);
    const ok = this.verifies(oldKey);
    oldKey.fill(0);
    if (!ok) throw new VaultError(t('vault.err_wrong_current'));
    const strength = checkStrength(newPw);
    if (!strength.ok) throw new VaultError(strength.reason ?? t('vault.err_weak'));

    const plains = data.entries.map((e) => ({ id: e.id, plain: this.decrypt(e.blob, key) }));
    const salt = crypto.randomBytes(16).toString('base64');
    const newKey = this.deriveKey(newPw, salt);
    data.kdf = { name: 'scrypt', N: KDF.N, r: KDF.r, p: KDF.p, salt };
    data.check = this.encrypt(VERIFIER, newKey);
    data.entries = plains.map((p) => ({ id: p.id, blob: this.encrypt(p.plain, newKey) }));
    this.save();
    key.fill(0);
    this.key = newKey;
    return this.status();
  }

  /** 평문 내보내기: 사용자가 마스터 비밀번호를 다시 입력했을 때만. */
  exportPlain(password: string): (EntryPlain & { id: string })[] {
    const key = this.requireKey();
    const data = this.requireData();
    const check = this.deriveKey(password, data.kdf.salt);
    const ok = this.verifies(check);
    check.fill(0);
    if (!ok) throw new VaultError(t('vault.err_wrong'));
    return data.entries.map((e) => ({ id: e.id, ...this.decode(e, key) }));
  }
}
