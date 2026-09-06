import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveBasePath } from './lib/site-url.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * 앱 버전은 상위 폴더(Electron 앱)의 package.json 에서 가져온다.
 * 릴리스가 올라가면 사이트도 저절로 따라간다. 화면에 실제로 보이는 값은
 * GitHub API 가 알려주는 최신 릴리스이고, 이건 그 전에 잠깐 보이는 기본값이다.
 */
function readAppVersion() {
  try {
    const pkg = readFileSync(path.join(here, '..', 'package.json'), 'utf8');
    return JSON.parse(pkg).version;
  } catch {
    return '0.0.0';
  }
}

/** @type {import('next').NextConfig} */
export default {
  // 정적 파일로만 내보낸다. Vercel 이든 GitHub Pages 든 그대로 올라가고,
  // out/ 을 직접 서빙해서 확인할 수도 있다.
  output: 'export',
  basePath: resolveBasePath(),
  trailingSlash: true,
  images: { unoptimized: true },
  // 상위 폴더(Electron 앱)의 lockfile 을 루트로 잡지 않게 한다.
  outputFileTracingRoot: here,
  // 앱 쪽 ESLint 설정이 site/ 까지 끌려와서 빌드를 막는다. 여기서는 Biome + tsc 로 본다.
  eslint: { ignoreDuringBuilds: true },
  env: { NEXT_PUBLIC_APP_VERSION: readAppVersion() },
};
