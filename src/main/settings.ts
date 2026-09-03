import fs from 'fs';
import path from 'path';

export const DEFAULTS: Seorap.Settings = {
  language: 'system',
  shortcuts: {
    toggle: 'Ctrl+Alt+Space',
    quickSave: 'Ctrl+Alt+V',
    newNote: 'Ctrl+Alt+N',
  },
  autoCollect: false,
  autoStart: false,
  toast: true,
  board: {
    cardSize: 'medium',
    clickAction: 'copy',
  },
  notes: {
    mono: false,
    fontSize: 15,
    showClipboardText: false,
    sort: 'recent',
  },
  vault: {
    autoLockMinutes: 5,
    clipboardClearSeconds: 30,
    contentProtection: true,
    lockOnHide: true,
  },
  cleanup: { enabled: false, days: 30 },
  updates: { check: true, lastCheckedAt: 0 },
  installedAt: null,
  starNudge: { done: false, snoozeUntil: 0 },
  dataDir: null,
  windowBounds: null,
  lastMode: 'board',
};

type Plain = Record<string, unknown>;

function isPlainObject(v: unknown): v is Plain {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** target 위에 src 를 재귀적으로 덮어쓴다. 배열과 원시값은 통째로 교체. */
function mergeInto(target: Plain, src: Plain): void {
  for (const [k, v] of Object.entries(src)) {
    const cur = target[k];
    if (isPlainObject(v) && isPlainObject(cur)) {
      mergeInto(cur, v);
    } else {
      target[k] = v;
    }
  }
}

export function deepMerge<T extends object>(target: T, src: Seorap.DeepPartial<T>): T {
  // 구조적으로 안전한 복제 후 병합. T 의 형태는 DEFAULTS 가 보증한다.
  const out = structuredClone(target) as unknown as Plain;
  mergeInto(out, src);
  return out as unknown as T;
}

export class Settings {
  data: Seorap.Settings;

  constructor(readonly file: string) {
    this.data = this.load();
  }

  private load(): Seorap.Settings {
    try {
      const raw: unknown = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      if (isPlainObject(raw)) return deepMerge(DEFAULTS, raw);
    } catch {
      /* 첫 실행이거나 손상된 파일: 기본값 */
    }
    return structuredClone(DEFAULTS);
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2));
    fs.renameSync(tmp, this.file);
  }

  get(): Seorap.Settings {
    return structuredClone(this.data);
  }

  set(patch: Seorap.SettingsPatch): Seorap.Settings {
    this.data = deepMerge(this.data, patch);
    this.save();
    return this.get();
  }
}
