// tsc 는 .ts 만 옮기므로 html/css 와 assets 는 여기서 out/ 으로 복사한다.
// out/ 은 프로젝트 루트와 같은 모양(out/src, out/assets)이라 상대 경로가 그대로 통한다.
import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..', '..');
const out = path.join(root, 'out');

function walk(dir: string, filter: (name: string) => boolean): string[] {
  const files: string[] = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) files.push(...walk(p, filter));
    else if (filter(name)) files.push(p);
  }
  return files;
}

let n = 0;
const copy = (from: string, to: string): void => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  n++;
};

for (const f of walk(path.join(root, 'src'), (name) => /\.(html|css)$/.test(name))) {
  copy(f, path.join(out, path.relative(root, f)));
}
for (const f of walk(path.join(root, 'assets'), () => true)) {
  copy(f, path.join(out, path.relative(root, f)));
}
console.log(`copied ${n} static files → out/`);
