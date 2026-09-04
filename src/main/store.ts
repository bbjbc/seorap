import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { type NativeImage, nativeImage } from 'electron';
import { t } from './i18n';

export const IMAGE_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.svg',
  '.avif',
  '.tiff',
  '.tif',
]);
const THUMB_MAX = 400;
const TEXT_INLINE_LIMIT = 50000;
const URL_RE = /^https?:\/\/[^\s]+$/i;

export interface StoreResult {
  duplicate: boolean;
  item: Seorap.Item;
}

export type ChangeEvent =
  | { type: 'add'; item: Seorap.Item }
  | { type: 'update'; item: Seorap.Item }
  | { type: 'remove'; ids: string[] };

interface AddExtra {
  source?: string;
  title?: string;
  note?: boolean;
  mime?: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

const ITEM_TYPES: readonly Seorap.ItemType[] = [
  'image',
  'text',
  'link',
  'file',
];

function isItemType(v: unknown): v is Seorap.ItemType {
  return typeof v === 'string' && (ITEM_TYPES as readonly string[]).includes(v);
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function optNum(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** index.json 의 항목 하나를 검증해 Item 으로 만든다. 형식이 틀리면 null. */
function toItem(raw: unknown): Seorap.Item | null {
  if (!isRecord(raw)) return null;
  const id = raw['id'];
  const type = raw['type'];
  if (typeof id !== 'string' || !isItemType(type)) return null;
  const tagsRaw = raw['tags'];
  const tags = Array.isArray(tagsRaw)
    ? (tagsRaw as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  const item: Seorap.Item = {
    id,
    type,
    createdAt: optNum(raw['createdAt']) ?? Date.now(),
    pinned: raw['pinned'] === true,
    tags,
    title: optStr(raw['title']) ?? '',
    source: optStr(raw['source']) ?? 'unknown',
  };
  const set = <K extends keyof Seorap.Item>(
    k: K,
    v: Seorap.Item[K] | undefined,
  ): void => {
    if (v !== undefined) item[k] = v;
  };
  set('updatedAt', optNum(raw['updatedAt']));
  set('file', optStr(raw['file']));
  set('thumb', optStr(raw['thumb']));
  set('hash', optStr(raw['hash']));
  set('size', optNum(raw['size']));
  set('width', optNum(raw['width']));
  set('height', optNum(raw['height']));
  set('ext', optStr(raw['ext']));
  set('text', optStr(raw['text']));
  set('url', optStr(raw['url']));
  set('linkTitle', optStr(raw['linkTitle']));
  if (typeof raw['truncated'] === 'boolean') item.truncated = raw['truncated'];
  if (typeof raw['note'] === 'boolean') item.note = raw['note'];
  set('order', optNum(raw['order']));
  return item;
}

function sha1(buf: Buffer): string {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function hasAlpha(img: NativeImage): boolean {
  try {
    const bmp = img.toBitmap();
    const step = 4 * 7;
    for (let i = 3; i < bmp.length; i += step) {
      const a = bmp[i];
      if (a !== undefined && a < 255) return true;
    }
  } catch {
    /* 비트맵을 못 읽으면 불투명으로 간주 */
  }
  return false;
}

const MIME_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/svg+xml': '.svg',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
};

function guessExt(mime = ''): string {
  const key = mime.split(';')[0] ?? '';
  return MIME_EXT[key] ?? '.bin';
}

function firstLine(text: string): string {
  return (text.trim().split('\n')[0] ?? '').trim();
}

export class Store {
  dir!: string;
  itemsDir!: string;
  thumbsDir!: string;
  indexPath!: string;
  items: Seorap.Item[] = [];
  private saveTimer: NodeJS.Timeout | null = null;
  private readonly listeners = new Set<(e: ChangeEvent) => void>();

  constructor(dir: string) {
    this.setDir(dir);
  }

  // ---------- 저장 위치 / 인덱스 ----------
  setDir(dir: string): void {
    this.dir = path.resolve(dir);
    this.itemsDir = path.join(this.dir, 'items');
    this.thumbsDir = path.join(this.dir, 'thumbs');
    this.indexPath = path.join(this.dir, 'index.json');
    fs.mkdirSync(this.itemsDir, { recursive: true });
    fs.mkdirSync(this.thumbsDir, { recursive: true });
    this.items = this.loadIndex();
  }

  private loadIndex(): Seorap.Item[] {
    let raw: string;
    try {
      raw = fs.readFileSync(this.indexPath, 'utf8');
    } catch {
      return []; // 첫 실행
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed) && Array.isArray(parsed['items'])) {
        return (parsed['items'] as unknown[])
          .map(toItem)
          .filter((it): it is Seorap.Item => it !== null);
      }
    } catch {
      /* 아래에서 백업 */
    }
    // 손상된 인덱스는 덮어쓰지 않고 백업해 둔다.
    try {
      fs.copyFileSync(
        this.indexPath,
        `${this.indexPath}.corrupt-${Date.now()}`,
      );
    } catch {
      /* ignore */
    }
    return [];
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveNow();
    }, 300);
  }

  private saveNow(): void {
    const tmp = `${this.indexPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, items: this.items }));
    fs.renameSync(tmp, this.indexPath);
  }

  flush(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveNow();
  }

  onChange(fn: (e: ChangeEvent) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(e: ChangeEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  // ---------- 조회 ----------
  list(): Seorap.Item[] {
    return this.items;
  }

  get(id: string): Seorap.Item | null {
    return this.items.find((it) => it.id === id) ?? null;
  }

  private findByHash(hash: string | undefined): Seorap.Item | null {
    return hash ? (this.items.find((it) => it.hash === hash) ?? null) : null;
  }

  absPath(item: Seorap.Item | null): string | null {
    return item?.file ? path.join(this.dir, item.file) : null;
  }

  absThumb(item: Seorap.Item | null): string | null {
    return item?.thumb ? path.join(this.dir, item.thumb) : null;
  }

  /** 텍스트가 인덱스에 잘려 있으면 파일에서 전체를 읽는다. */
  readFullText(item: Seorap.Item | null): string {
    if (!item) return '';
    if (!item.truncated) return item.text ?? '';
    const p = this.absPath(item);
    try {
      return p ? fs.readFileSync(p, 'utf8') : (item.text ?? '');
    } catch {
      return item.text ?? '';
    }
  }

  // ---------- 추가 ----------
  private newId(): string {
    return Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
  }

  private insert(item: Seorap.Item): Seorap.Item {
    this.items.unshift(item);
    this.scheduleSave();
    this.emit({ type: 'add', item });
    return item;
  }

  private base(
    type: Seorap.ItemType,
    id: string,
    source: string | undefined,
  ): Seorap.Item {
    return {
      id,
      type,
      createdAt: Date.now(),
      pinned: false,
      tags: [],
      title: '',
      source: source ?? 'manual',
    };
  }

  /** 메모 모드에서 만드는 빈 메모. 첫 타이핑 전까지 본문이 비어 있다. */
  async addNote(): Promise<StoreResult> {
    const id = this.newId();
    const file = path.posix.join('items', `${id}.txt`);
    await fsp.writeFile(path.join(this.dir, file), '', 'utf8');
    const item: Seorap.Item = {
      ...this.base('text', id, 'note'),
      file,
      size: 0,
      text: '',
      truncated: false,
      note: true,
      updatedAt: Date.now(),
    };
    return { duplicate: false, item: this.insert(item) };
  }

  async addText(
    text: string,
    extra: AddExtra = {},
  ): Promise<StoreResult | null> {
    const clean = text.replace(/\r\n/g, '\n');
    if (!clean.trim()) return null;
    const isLink = URL_RE.test(clean.trim());
    const hash = sha1(Buffer.from(clean, 'utf8'));
    const dupe = this.findByHash(hash);
    if (dupe) return { duplicate: true, item: dupe };

    const id = this.newId();
    const file = path.posix.join('items', `${id}.txt`);
    await fsp.writeFile(path.join(this.dir, file), clean, 'utf8');
    const truncated = clean.length > TEXT_INLINE_LIMIT;
    const item: Seorap.Item = {
      ...this.base(isLink ? 'link' : 'text', id, extra.source),
      file,
      hash,
      size: Buffer.byteLength(clean, 'utf8'),
      text: truncated ? clean.slice(0, TEXT_INLINE_LIMIT) : clean,
      truncated,
      title: isLink ? '' : firstLine(clean).slice(0, 120),
      note: !isLink && !!extra.note,
      updatedAt: Date.now(),
    };
    if (isLink) item.url = clean.trim();
    return { duplicate: false, item: this.insert(item) };
  }

  async addImage(
    img: NativeImage,
    extra: AddExtra = {},
  ): Promise<StoreResult | null> {
    if (img.isEmpty()) return null;
    const png = img.toPNG();
    const hash = sha1(png);
    const dupe = this.findByHash(hash);
    if (dupe) return { duplicate: true, item: dupe };

    const id = this.newId();
    const file = path.posix.join('items', `${id}.png`);
    await fsp.writeFile(path.join(this.dir, file), png);
    const { width, height } = img.getSize();
    const thumb = await this.makeThumb(img, id);
    const item: Seorap.Item = {
      ...this.base('image', id, extra.source),
      file,
      thumb,
      hash,
      size: png.length,
      width,
      height,
      ext: 'png',
      title: extra.title ?? '',
    };
    return { duplicate: false, item: this.insert(item) };
  }

  async addFile(
    srcPath: string,
    extra: AddExtra = {},
  ): Promise<StoreResult | null> {
    const st = await fsp.stat(srcPath);
    if (st.isDirectory()) return null;
    const ext = path.extname(srcPath).toLowerCase();
    const id = this.newId();
    const file = path.posix.join('items', id + ext);
    const dest = path.join(this.dir, file);
    await fsp.copyFile(srcPath, dest);

    const hash =
      st.size < 64 * 1024 * 1024 ? sha1(await fsp.readFile(dest)) : undefined;
    const dupe = this.findByHash(hash);
    if (dupe) {
      await fsp.unlink(dest).catch(() => undefined);
      return { duplicate: true, item: dupe };
    }

    const isImage = IMAGE_EXTS.has(ext);
    const item: Seorap.Item = {
      ...this.base(isImage ? 'image' : 'file', id, extra.source),
      file,
      size: st.size,
      ext: ext.replace('.', ''),
      title: extra.title ?? path.basename(srcPath),
    };
    if (hash) item.hash = hash;
    if (isImage) {
      const img = nativeImage.createFromPath(dest);
      if (!img.isEmpty()) {
        const { width, height } = img.getSize();
        item.width = width;
        item.height = height;
        item.thumb = await this.makeThumb(img, id);
      }
    }
    return { duplicate: false, item: this.insert(item) };
  }

  /** 브라우저에서 드래그해 온 blob, URL 로 받아온 바이트 등 */
  async addBuffer(
    buf: Buffer,
    name = '',
    extra: AddExtra = {},
  ): Promise<StoreResult | null> {
    const img = nativeImage.createFromBuffer(buf);
    if (!img.isEmpty())
      return this.addImage(img, { source: extra.source, title: name });

    const ext = path.extname(name).toLowerCase() || guessExt(extra.mime);
    const hash = sha1(buf);
    const dupe = this.findByHash(hash);
    if (dupe) return { duplicate: true, item: dupe };

    const id = this.newId();
    const file = path.posix.join('items', id + ext);
    await fsp.writeFile(path.join(this.dir, file), buf);
    const item: Seorap.Item = {
      ...this.base(IMAGE_EXTS.has(ext) ? 'image' : 'file', id, extra.source),
      file,
      hash,
      size: buf.length,
      ext: ext.replace('.', ''),
      title: name || id + ext,
    };
    return { duplicate: false, item: this.insert(item) };
  }

  private async makeThumb(img: NativeImage, id: string): Promise<string> {
    const { width, height } = img.getSize();
    let small = img;
    if (width > THUMB_MAX || height > THUMB_MAX) {
      small =
        width >= height
          ? img.resize({ width: THUMB_MAX, quality: 'good' })
          : img.resize({ height: THUMB_MAX, quality: 'good' });
    }
    const alpha = hasAlpha(small);
    const rel = path.posix.join('thumbs', id + (alpha ? '.png' : '.jpg'));
    await fsp.writeFile(
      path.join(this.dir, rel),
      alpha ? small.toPNG() : small.toJPEG(84),
    );
    return rel;
  }

  // ---------- 수정 / 삭제 ----------
  update(id: string, patch: Seorap.ItemPatch): Seorap.Item | null {
    const item = this.get(id);
    if (!item) return null;
    if (patch.pinned !== undefined) item.pinned = patch.pinned;
    if (patch.tags !== undefined)
      item.tags = patch.tags.filter((t) => typeof t === 'string').slice(0, 50);
    if (patch.title !== undefined) item.title = patch.title;
    if (patch.linkTitle !== undefined) item.linkTitle = patch.linkTitle;
    if (patch.note !== undefined) item.note = patch.note;
    if (
      typeof patch.text === 'string' &&
      (item.type === 'text' || item.type === 'link')
    ) {
      const clean = patch.text.replace(/\r\n/g, '\n');
      const p = this.absPath(item);
      if (p) fs.writeFileSync(p, clean, 'utf8');
      item.truncated = clean.length > TEXT_INLINE_LIMIT;
      item.text = item.truncated ? clean.slice(0, TEXT_INLINE_LIMIT) : clean;
      item.size = Buffer.byteLength(clean, 'utf8');
      if (clean) item.hash = sha1(Buffer.from(clean, 'utf8'));
      else delete item.hash;
      if (item.type === 'text') item.title = firstLine(clean).slice(0, 120);
      if (item.type === 'link') item.url = clean.trim();
    }
    item.updatedAt = Date.now();
    this.scheduleSave();
    this.emit({ type: 'update', item });
    return item;
  }

  /** 메모 '직접 정렬': 주어진 순서대로 order 를 다시 매긴다. 렌더러가 이미 화면을 바꾼 뒤 부르므로 이벤트는 내지 않는다. */
  reorder(ids: string[]): void {
    const byId = new Map(this.items.map((it) => [it.id, it]));
    ids.forEach((id, i) => {
      const it = byId.get(id);
      if (it) it.order = i;
    });
    this.scheduleSave();
  }

  async remove(ids: string[]): Promise<number> {
    const set = new Set(ids);
    const removed = this.items.filter((it) => set.has(it.id));
    this.items = this.items.filter((it) => !set.has(it.id));
    this.scheduleSave();
    for (const it of removed) {
      for (const p of [this.absPath(it), this.absThumb(it)]) {
        if (p) await fsp.unlink(p).catch(() => undefined);
      }
    }
    this.emit({ type: 'remove', ids: removed.map((it) => it.id) });
    return removed.length;
  }

  async cleanup(days: number): Promise<number> {
    const cutoff = Date.now() - days * 86400000;
    const ids = this.items
      .filter((it) => !it.pinned && it.createdAt < cutoff)
      .map((it) => it.id);
    if (!ids.length) return 0;
    return this.remove(ids);
  }

  // ---------- 통계 / 이동 ----------
  stats(): Seorap.Stats {
    const byType: Record<Seorap.ItemType, number> = {
      image: 0,
      text: 0,
      link: 0,
      file: 0,
    };
    let bytes = 0;
    for (const it of this.items) {
      byType[it.type] += 1;
      bytes += it.size ?? 0;
    }
    let thumbBytes = 0;
    try {
      for (const f of fs.readdirSync(this.thumbsDir))
        thumbBytes += fs.statSync(path.join(this.thumbsDir, f)).size;
    } catch {
      /* ignore */
    }
    return {
      count: this.items.length,
      bytes,
      thumbBytes,
      byType,
      dir: this.dir,
      pinned: this.items.filter((i) => i.pinned).length,
    };
  }

  async moveTo(newDirRaw: string): Promise<void> {
    const newDir = path.resolve(newDirRaw);
    if (newDir === this.dir) return;
    if (newDir.startsWith(this.dir + path.sep))
      throw new Error(t('store.inside_current'));
    this.flush();
    await fsp.mkdir(newDir, { recursive: true });
    const existing = await fsp.readdir(newDir);
    if (existing.some((n) => !n.startsWith('.')))
      throw new Error(t('store.not_empty'));
    for (const sub of ['items', 'thumbs']) {
      await fsp.cp(path.join(this.dir, sub), path.join(newDir, sub), {
        recursive: true,
      });
    }
    await fsp.copyFile(this.indexPath, path.join(newDir, 'index.json'));
    for (const extra of ['vault.json']) {
      const src = path.join(this.dir, extra);
      if (fs.existsSync(src)) await fsp.copyFile(src, path.join(newDir, extra));
    }
    const oldDir = this.dir;
    this.setDir(newDir);
    await fsp.rm(oldDir, { recursive: true, force: true });
  }
}
