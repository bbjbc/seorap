// scrap:// 주소 검사. 창이 데이터 폴더 밖을 읽거나 금고 파일을 가져오지 못하게 막는 자리라
// 통과시켜야 할 것보다 막아야 할 것이 훨씬 많다.
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveScrapPath } from '../../../src/main/scrap-url';

const DIR = path.resolve('/data/seorap');
const resolve = (url: string): string | null => resolveScrapPath(DIR, url);

describe('resolveScrapPath', () => {
  it('maps a thumb or item address to a path inside the folder', () => {
    expect(resolve('scrap://thumbs/abc.png')).toBe(
      path.join(DIR, 'thumbs', 'abc.png'),
    );
    expect(resolve('scrap://items/abc.txt')).toBe(
      path.join(DIR, 'items', 'abc.txt'),
    );
  });

  it('decodes percent escapes, so names with spaces work', () => {
    expect(resolve('scrap://items/my%20file.png')).toBe(
      path.join(DIR, 'items', 'my file.png'),
    );
  });

  it('lands inside the folder when the URL parser already collapsed the dots', () => {
    // 'scrap://items/../../secret.txt' 는 URL 이 만들어질 때 경로가 정리되어
    // hostname=items, pathname=/secret.txt 가 된다. 폴더 밖으로 나가지 않는다.
    expect(resolve('scrap://items/../../secret.txt')).toBe(
      path.join(DIR, 'items', 'secret.txt'),
    );
  });

  it('refuses a climb the URL parser leaves alone', () => {
    // hostname 자리의 '..' 는 정리되지 않고 그대로 남는다.
    expect(resolve('scrap://../secret.txt')).toBeNull();
  });

  it('refuses a climb hidden behind percent escapes', () => {
    // 여기가 경로 검사가 실제로 일하는 자리다. %2F 는 URL 이 경로 구분자로 보지 않으므로
    // 정리되지 않고 남아 있다가, 디코딩한 뒤 폴더 밖을 가리킨다.
    expect(resolve('scrap://items/..%2F..%2Fsettings.json')).toBeNull();
    expect(resolve('scrap://items/%2e%2e%2f%2e%2e%2fsecret.txt')).toBeNull();
  });

  it('refuses the vault, wherever it sits', () => {
    expect(resolve('scrap://vault.json')).toBeNull();
    expect(resolve('scrap://items/vault.json')).toBeNull();
  });

  it('refuses the data folder itself rather than returning a directory', () => {
    expect(resolve('scrap://')).toBeNull();
  });

  it('refuses any other scheme, so a file:// address cannot slip through', () => {
    expect(resolve('file:///etc/passwd')).toBeNull();
    expect(resolve('https://example.com/x.png')).toBeNull();
  });

  it('returns null for junk instead of throwing, since this runs on every request', () => {
    expect(resolve('not a url')).toBeNull();
    expect(resolve('')).toBeNull();
    // 깨진 % 이스케이프는 decodeURIComponent 가 던진다.
    expect(resolve('scrap://items/%ZZ')).toBeNull();
  });

  it('does not treat a sibling folder with the same prefix as inside', () => {
    expect(
      resolveScrapPath(
        '/data/seo',
        `scrap://${path.resolve('/data/seorap/x.png')}`,
      ),
    ).toBeNull();
  });
});
