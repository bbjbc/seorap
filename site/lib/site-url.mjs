/**
 * 사이트 주소를 정하는 한 곳. next.config.mjs 와 lib/site.ts 가 같이 쓴다.
 * (설정 파일에서도 읽어야 해서 TS 가 아니라 .mjs 다)
 *
 * 우선순위
 *   1. NEXT_PUBLIC_SITE_URL      직접 지정. 하위 경로까지 포함해서 준다.
 *                                예: https://seorap.dev
 *                                    https://bbjbc.github.io/seorap
 *   2. Vercel 이 넣어주는 운영 도메인. 아무것도 설정하지 않아도 canonical 과
 *      og:image 가 실제 주소로 박힌다. 미리보기 배포에서도 운영 도메인을 가리킨다.
 *   3. 로컬 기본값.
 */
export function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercel =
    process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

/** 하위 경로. 루트 배포면 빈 문자열이다. 예: /seorap */
export function resolveBasePath() {
  return new URL(resolveSiteUrl()).pathname.replace(/\/+$/, '');
}
