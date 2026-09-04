// 새 버전 확인. GitHub Releases 의 latest 를 한 번 조회해 현재 버전과 비교한다.
// 내려받거나 설치하지는 않는다. 알림만 하고, 받기는 사용자가 브라우저에서 한다.
import { net } from 'electron';

export const RELEASES_URL = 'https://github.com/bbjbc/seorap/releases';
const LATEST_API = 'https://api.github.com/repos/bbjbc/seorap/releases/latest';

/** "v1.2.3-beta.1" → [1,2,3] 와 prerelease 여부. 형식이 아니면 null. */
export function parseVersion(
  v: string,
): { nums: number[]; pre: boolean } | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(-[0-9A-Za-z.-]+)?/.exec(v.trim());
  if (!m) return null;
  return {
    nums: [Number(m[1]), Number(m[2]), Number(m[3])],
    pre: m[4] !== undefined,
  };
}

/** latest 가 current 보다 새 버전인가. 정식 버전은 같은 숫자의 프리릴리스보다 높다. */
export function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    const d = (a.nums[i] ?? 0) - (b.nums[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return b.pre && !a.pre;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** GitHub API 응답에서 필요한 것만 꺼낸다. */
export function parseRelease(
  raw: unknown,
): { version: string; url: string; publishedAt: number } | null {
  if (!isRecord(raw)) return null;
  const tag = raw['tag_name'];
  if (typeof tag !== 'string' || !parseVersion(tag)) return null;
  const url =
    typeof raw['html_url'] === 'string' ? raw['html_url'] : RELEASES_URL;
  const published =
    typeof raw['published_at'] === 'string'
      ? Date.parse(raw['published_at'])
      : NaN;
  return {
    version: tag.replace(/^v/, ''),
    url,
    publishedAt: Number.isFinite(published) ? published : 0,
  };
}

export async function fetchLatest(): Promise<Seorap.UpdateInfo | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await net.fetch(LATEST_API, {
      signal: ctrl.signal,
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'Seorap-update-check',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseRelease(await res.json());
  } finally {
    clearTimeout(t);
  }
}

/** 현재 버전보다 새 릴리스가 있으면 그 정보를, 아니면 null. 네트워크 오류는 그대로 던진다. */
export async function checkForUpdate(
  current: string,
): Promise<Seorap.UpdateInfo | null> {
  const latest = await fetchLatest();
  return latest && isNewer(latest.version, current) ? latest : null;
}
