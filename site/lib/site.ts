import { resolveBasePath, resolveSiteUrl } from './site-url.mjs';

/** 끝의 슬래시를 뗀 사이트 루트. 예: https://seorap.vercel.app */
export const SITE_URL: string = resolveSiteUrl();

/** 하위 경로. 루트 배포면 빈 문자열이다. 예: /seorap */
export const BASE_PATH: string = resolveBasePath();

/** public/ 아래 파일 경로에 basePath 를 붙인다. */
export const asset = (path: string) => `${BASE_PATH}${path}`;

/** 메타데이터용 절대 URL. basePath 는 SITE_URL 에 이미 들어 있다. */
export const absolute = (path: string) => `${SITE_URL}${path}`;

/**
 * GitHub API 응답이 오기 전에 잠깐 보이는 버전. next.config.mjs 가 앱의
 * package.json 에서 읽어 넣는다. 손으로 맞출 필요가 없다.
 */
export const FALLBACK_VERSION = `v${process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0'}`;

export const APP = {
  name: 'Seorap',
  nameKo: '서랍',
  author: 'bbjbc',
  license: 'https://github.com/bbjbc/seorap/blob/main/LICENSE',
} as const;
