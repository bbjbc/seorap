'use client';

import { useLatestRelease } from './DownloadButton';

/** 히어로/마지막 CTA 아래 줄. 값이 오기 전에는 서버에서 렌더한 기본값을 그대로 둔다. */
export function Version({ fallback }: { fallback: string }) {
  const release = useLatestRelease();
  return <span className="mono">{release?.version || fallback}</span>;
}

export function AssetSize({ fallback }: { fallback: string }) {
  const release = useLatestRelease();
  if (!release?.sizeMb) return <span>{fallback}</span>;
  return <span>{`${release.sizeMb} MB`}</span>;
}
