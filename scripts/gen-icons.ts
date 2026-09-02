// assets/icon.svg → assets/icon.png(256), assets/icon.ico(멀티 사이즈)
// 실행: npm run icons
import { app, BrowserWindow, nativeImage } from 'electron';
import fs from 'fs';
import path from 'path';

const ASSETS = path.join(__dirname, '..', '..', 'assets');
const SIZES = [16, 24, 32, 48, 64, 128, 256];

// ICO 컨테이너에 PNG 를 그대로 담는다 (Vista 이후 지원).
function buildIco(sizes: number[], pngs: Buffer[]): Buffer {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach((png, i) => {
    const s = sizes[i] ?? 256;
    const o = i * 16;
    entries.writeUInt8(s >= 256 ? 0 : s, o);
    entries.writeUInt8(s >= 256 ? 0 : s, o + 1);
    entries.writeUInt8(0, o + 2);
    entries.writeUInt8(0, o + 3);
    entries.writeUInt16LE(1, o + 4);
    entries.writeUInt16LE(32, o + 6);
    entries.writeUInt32LE(png.length, o + 8);
    entries.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, entries, ...pngs]);
}

async function main(): Promise<void> {
  let svg = fs.readFileSync(path.join(ASSETS, 'icon.svg'), 'utf8');
  // 글리프 PNG(투명 배경)가 있으면 배경 위에 얹는다. 256 캔버스 기준 12~244 영역.
  const glyphPath = path.join(ASSETS, 'icon-glyph.png');
  if (fs.existsSync(glyphPath)) {
    const b64 = fs.readFileSync(glyphPath).toString('base64');
    svg = svg.replace(
      '<!--GLYPH-->',
      `<image href="data:image/png;base64,${b64}" x="12" y="14" width="232" height="232" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true },
  });
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`;
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise((r) => setTimeout(r, 400));
  const img = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  const base = nativeImage.createFromBuffer(img.toPNG());

  fs.writeFileSync(path.join(ASSETS, 'icon.png'), base.toPNG());
  const pngs = SIZES.map((s) => (s === 256 ? base : base.resize({ width: s, height: s, quality: 'best' })).toPNG());
  fs.writeFileSync(path.join(ASSETS, 'icon.ico'), buildIco(SIZES, pngs));
  console.log('icons written:', SIZES.join(', '));
}

void app.whenReady().then(async () => {
  try {
    await main();
    app.quit();
  } catch (err) {
    console.error(err);
    app.exit(1);
  }
});
