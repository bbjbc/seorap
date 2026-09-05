// 새 버전 확인: 버전 비교·릴리스 파싱은 순수 함수, 네트워크는 electron.net 만 흉내 낸다.

import { net } from 'electron';
import { describe, expect, it, vi } from 'vitest';
import {
  checkForUpdate,
  fetchLatest,
  isNewer,
  parseRelease,
  parseVersion,
  RELEASES_URL,
} from '../../../src/main/update';

vi.mock('electron', () => ({ net: { fetch: vi.fn() } }));

const fetchMock = vi.mocked(net.fetch);
const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('parseVersion', () => {
  it('reads major.minor.patch with an optional v prefix', () => {
    expect(parseVersion('v1.2.3')).toEqual({ nums: [1, 2, 3], pre: false });
    expect(parseVersion('0.10.0')).toEqual({ nums: [0, 10, 0], pre: false });
  });
  it('flags prerelease suffixes', () => {
    expect(parseVersion('1.0.0-beta.2')?.pre).toBe(true);
  });
  it('rejects things that are not versions', () => {
    expect(parseVersion('nightly')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });
});

describe('isNewer', () => {
  it('compares numerically, not lexically', () => {
    expect(isNewer('0.1.10', '0.1.9')).toBe(true);
    expect(isNewer('0.2.0', '0.1.4')).toBe(true);
    expect(isNewer('1.0.0', '0.9.9')).toBe(true);
  });
  it('treats equal and older versions as not newer', () => {
    expect(isNewer('0.1.4', '0.1.4')).toBe(false);
    expect(isNewer('0.1.3', '0.1.4')).toBe(false);
  });
  it('ranks a release above the prerelease of the same number', () => {
    expect(isNewer('0.2.0', '0.2.0-beta.1')).toBe(true);
    expect(isNewer('0.2.0-beta.1', '0.2.0')).toBe(false);
  });
  it('never reports an update for unparseable input', () => {
    expect(isNewer('garbage', '0.1.4')).toBe(false);
    expect(isNewer('0.2.0', 'garbage')).toBe(false);
  });
});

describe('parseRelease', () => {
  it('extracts version, url and publish time', () => {
    const r = parseRelease({
      tag_name: 'v0.2.0',
      html_url: 'https://x/releases/tag/v0.2.0',
      published_at: '2026-09-04T00:00:00Z',
    });
    expect(r).toEqual({
      version: '0.2.0',
      url: 'https://x/releases/tag/v0.2.0',
      publishedAt: Date.parse('2026-09-04T00:00:00Z'),
    });
  });
  it('falls back to the releases page and 0 when fields are missing', () => {
    expect(parseRelease({ tag_name: '1.0.0' })).toEqual({
      version: '1.0.0',
      url: RELEASES_URL,
      publishedAt: 0,
    });
  });
  it('returns null for non-version tags and non-objects', () => {
    expect(parseRelease({ tag_name: 'nightly' })).toBeNull();
    expect(parseRelease(null)).toBeNull();
    expect(parseRelease('v1.0.0')).toBeNull();
  });
});

describe('fetchLatest / checkForUpdate', () => {
  it('asks the GitHub API with a JSON accept header', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tag_name: 'v9.9.9' }));
    const r = await fetchLatest();
    expect(r?.version).toBe('9.9.9');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://api.github.com/repos/bbjbc/seorap/releases/latest',
    );
    expect(
      (init?.headers as Record<string, string> | undefined)?.['accept'],
    ).toBe('application/vnd.github+json');
  });
  it('throws on a non-2xx response instead of pretending there is no update', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'rate limited' }, 403),
    );
    await expect(fetchLatest()).rejects.toThrow('HTTP 403');
  });
  it('reports the release only when it is newer than the running version', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ tag_name: 'v0.3.0' }));
    expect((await checkForUpdate('0.2.0'))?.version).toBe('0.3.0');
    fetchMock.mockResolvedValueOnce(jsonResponse({ tag_name: 'v0.2.0' }));
    expect(await checkForUpdate('0.2.0')).toBeNull();
  });
});
