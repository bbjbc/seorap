// package.json 의 version 을 따라가야 하는 파일들을 한 번에 맞춘다.
//
// `npm version` 이 version 라이프사이클 훅에서 이걸 부르므로, 버전을 올리면 대상 파일이 함께
// 고쳐지고 스테이지된다. `npm run check` 는 --check 로 불러서 어긋난 파일이 있으면 실패한다.
// 새로 따라가야 할 파일이 생기면 TARGETS 에 한 줄 더한다.
//
// 패키지가 CJS 라서 .mts 로 둔다 (vitest.config.mts 와 같은 이유).
// 실행: node --experimental-strip-types scripts/sync-version.mts [--check]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');

/** 자리에 들어갈 semver 를 찾는 패턴. {} 는 새 버전으로 바뀐다. */
interface Target {
  file: string;
  /** 각 항목은 [찾을 정규식, 새 버전을 끼운 결과] */
  rules: [RegExp, (version: string) => string][];
  why: string;
}

const SEMVER = String.raw`\d+\.\d+\.\d+`;

/**
 * 데모는 install.ps1 을 돌린 터미널 화면을 vhs 로 녹화한 것이다. tape 은 대본, svg 는 결과물이라
 * 버전이 글자로 박혀 있다. vhs 를 설치하지 않아도 되도록 두 파일을 같이 고친다. 자릿수가 같으면
 * svg 의 textLength 도 그대로 맞는다.
 */
const demo = (file: string): Target => ({
  file,
  why: 'install.ps1 데모 녹화에 찍힌 버전',
  rules: [
    [new RegExp(`v${SEMVER}`, 'g'), (v) => `v${v}`],
    [
      new RegExp(String.raw`Seorap-Setup-${SEMVER}\.exe`, 'g'),
      (v) => `Seorap-Setup-${v}.exe`,
    ],
    [
      new RegExp(String.raw`Seorap-${SEMVER}-portable\.exe`, 'g'),
      (v) => `Seorap-${v}-portable.exe`,
    ],
  ],
});

const TARGETS: Target[] = [
  demo('docs/demo/seorap.tape'),
  demo('docs/demo/seorap.en.tape'),
  demo('docs/demo/seorap.svg'),
  demo('docs/demo/seorap.en.svg'),
];

function readVersion(): string {
  const raw: unknown = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
  );
  const version =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)['version']
      : undefined;
  if (typeof version !== 'string')
    throw new Error('package.json 에 version 이 없어요');
  return version;
}

/** 고친 내용을 돌려준다. 바꿀 게 없으면 null. */
function apply(target: Target, version: string): string | null {
  const abs = path.join(ROOT, target.file);
  const before = fs.readFileSync(abs, 'utf8');
  let after = before;
  for (const [pattern, replace] of target.rules)
    after = after.replace(pattern, replace(version));
  return after === before ? null : after;
}

const check = process.argv.includes('--check');
const version = readVersion();
const stale: string[] = [];

for (const target of TARGETS) {
  const next = apply(target, version);
  if (next === null) continue;
  stale.push(target.file);
  if (!check) fs.writeFileSync(path.join(ROOT, target.file), next);
}

if (!stale.length) {
  console.log(`version ${version}: 대상 ${TARGETS.length}개 모두 최신`);
} else if (check) {
  console.error(`version ${version} 과 어긋난 파일:`);
  for (const f of stale) console.error(`  ${f}`);
  console.error('`npm run sync-version` 으로 맞추세요.');
  process.exit(1);
} else {
  console.log(`version ${version} 으로 맞춤:`);
  for (const f of stale) console.log(`  ${f}`);
}
