// scrap:// 주소를 데이터 폴더 안의 실제 경로로 바꾼다.
//
// 렌더러는 이미지 미리보기를 이 주소로 불러온다. 주소를 만드는 쪽은 앱이지만, 렌더러에 들어온
// 어떤 내용이든 주소가 될 수 있다고 보고 다룬다. 폴더 밖으로 나가는 경로와 금고 파일은 막는다.
// 경로 판단만 하고 파일이 있는지는 보지 않는다. 그건 부르는 쪽 몫이다.
import path from 'node:path';

/** 허용된 경로면 절대 경로, 아니면 null. */
export function resolveScrapPath(dir: string, rawUrl: string): string | null {
  const root = path.resolve(dir);
  let rel: string;
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'scrap:') return null;
    // 'scrap://thumbs/a.png' 에서 thumbs 는 hostname, /a.png 는 pathname 으로 갈린다.
    rel = decodeURIComponent(u.hostname + u.pathname);
  } catch {
    // 주소가 아니거나 % 이스케이프가 깨진 경우
    return null;
  }
  const abs = path.resolve(root, rel);
  // 상위로 올라가는 경로, 다른 드라이브, 폴더 자기 자신은 모두 거른다.
  if (!abs.startsWith(root + path.sep)) return null;
  // 금고는 암호화돼 있지만 창을 통해 내보낼 이유가 없다.
  if (path.basename(abs) === 'vault.json') return null;
  return abs;
}
