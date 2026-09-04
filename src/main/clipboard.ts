// Electron 44+ 의 비동기 클립보드 API(clipboard.read/write, ClipboardItem)를 감싼다.
import { clipboard, ClipboardItem, nativeImage, type NativeImage } from 'electron';
import { fileURLToPath, pathToFileURL } from 'url';
import crypto from 'crypto';

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'] as const;

export interface ClipboardContent {
  files: string[];
  image: NativeImage | null;
  imageBuffer: Buffer | null;
  imageType: string | null;
  text: string;
  types: string[];
}

/** getType 은 Blob 또는 북마크 객체를 돌려준다. Blob 만 취한다. */
async function blobOf(item: ClipboardItem, type: string): Promise<Blob | null> {
  const v: unknown = await item.getType(type);
  return v instanceof Blob ? v : null;
}

async function textOf(item: ClipboardItem, type: string): Promise<string> {
  const b = await blobOf(item, type);
  return b ? b.text() : '';
}

/** 현재 클립보드 내용을 한 번 읽어 정리한다. */
export async function readClipboard(): Promise<ClipboardContent> {
  const items = await clipboard.read();
  const out: ClipboardContent = { files: [], image: null, imageBuffer: null, imageType: null, text: '', types: [] };
  for (const it of items) {
    out.types.push(...it.types);
    if (it.types.includes('text/uri-list')) {
      const list = await textOf(it, 'text/uri-list');
      for (const line of list.split(/\r?\n/)) {
        const l = line.trim();
        if (!l || l.startsWith('#') || !l.startsWith('file:')) continue;
        try {
          out.files.push(fileURLToPath(l));
        } catch {
          /* 잘못된 URI 는 건너뛴다 */
        }
      }
    }
    if (!out.imageBuffer) {
      const t = IMAGE_TYPES.find((x) => it.types.includes(x));
      if (t) {
        const blob = await blobOf(it, t);
        if (blob) {
          out.imageBuffer = Buffer.from(await blob.arrayBuffer());
          out.imageType = t;
        }
      }
    }
    if (!out.text && it.types.includes('text/plain')) {
      out.text = await textOf(it, 'text/plain');
    }
  }
  if (out.imageBuffer) {
    const img = nativeImage.createFromBuffer(out.imageBuffer);
    if (!img.isEmpty()) out.image = img;
  }
  return out;
}

export async function writeText(text: string): Promise<void> {
  await clipboard.writeText(text);
}

export async function writeImage(img: NativeImage): Promise<void> {
  // Buffer 는 SharedArrayBuffer 기반일 수 있어 BlobPart 로 바로 못 넘긴다. 복사해서 넘긴다.
  const png = new Uint8Array(img.toPNG());
  await clipboard.write([new ClipboardItem({ 'image/png': new Blob([png], { type: 'image/png' }) })]);
}

/** file:// URI 목록을 쓰면 Windows 에서는 CF_HDROP 으로 올라가 탐색기에 붙일 수 있다. */
export async function writeFiles(paths: string[]): Promise<void> {
  const list = paths.map((p) => pathToFileURL(p).toString()).join('\r\n');
  await clipboard.write([new ClipboardItem({ 'text/uri-list': list })]);
}

export async function readText(): Promise<string> {
  try {
    return await clipboard.readText();
  } catch {
    return '';
  }
}

export function clear(): void {
  try {
    clipboard.clear();
  } catch {
    /* 다른 프로세스가 잠근 경우 */
  }
}

function shortHash(data: string | Buffer): string {
  return crypto.createHash('sha1').update(data).digest('hex').slice(0, 16);
}

/** 변경 감지용 시그니처. 이미지는 전체를 복사하지 않고 크기 + 앞뒤 일부만 해시한다. */
export async function signature(): Promise<string> {
  const items = await clipboard.read();
  for (const it of items) {
    if (it.types.includes('text/uri-list')) {
      const list = await textOf(it, 'text/uri-list');
      if (/^file:/m.test(list)) return `f:${list.length}:${shortHash(list)}`;
    }
    const t = IMAGE_TYPES.find((x) => it.types.includes(x));
    if (t) {
      const blob = await blobOf(it, t);
      if (blob) {
        const n = blob.size;
        const head = Buffer.from(await blob.slice(0, Math.min(n, 8192)).arrayBuffer());
        const tail = Buffer.from(await blob.slice(Math.max(0, n - 8192), n).arrayBuffer());
        return `i:${n}:${shortHash(Buffer.concat([head, tail]))}`;
      }
    }
    if (it.types.includes('text/plain')) {
      const text = await textOf(it, 'text/plain');
      if (text.trim()) return `t:${text.length}:${shortHash(text)}`;
    }
  }
  return '';
}

/**
 * 앱이 스스로 클립보드에 쓴 직후 감시를 멈추는 시간.
 * 첫 tick 에서 새 내용을 기준점으로 잡으면 그 뒤로는 어차피 다시 수집하지 않으므로,
 * tick 간격(800ms)을 넉넉히 덮을 만큼만 있으면 된다. 이보다 길면 그 사이 사용자가
 * 다른 앱에서 복사한 것을 삼키고 기준점으로 흡수해 버린다 (비밀번호 복사 후 32초 사각지대).
 */
export const SELF_WRITE_IGNORE_MS = 2500;

/** Windows 에는 클립보드 변경 이벤트가 없어 폴링으로 감지한다. */
export class ClipboardWatcher {
  private timer: NodeJS.Timeout | null = null;
  private lastSig: string | null = null;
  private ignoreUntil = 0;
  private busy = false;

  constructor(
    private readonly onChange: () => void,
    private readonly intervalMs = 800,
  ) {}

  async start(): Promise<void> {
    if (this.timer) return;
    try {
      this.lastSig = await signature();
    } catch {
      this.lastSig = '';
    }
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get running(): boolean {
    return this.timer !== null;
  }

  /** 앱 자신이 클립보드에 쓴 직후에는 수집하지 않는다. */
  ignore(ms = SELF_WRITE_IGNORE_MS): void {
    this.ignoreUntil = Date.now() + ms;
    this.lastSig = null; // 다음 tick 에서 현재 내용을 기준점으로 다시 잡는다.
  }

  private async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const sig = await signature();
      if (sig === this.lastSig) return;
      const wasNull = this.lastSig === null;
      this.lastSig = sig;
      if (wasNull || Date.now() < this.ignoreUntil || !sig) return;
      this.onChange();
    } catch {
      /* 클립보드가 다른 프로세스에 잠겨 있을 수 있다 */
    } finally {
      this.busy = false;
    }
  }
}
