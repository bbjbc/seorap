'use client';

import { useEffect, useState } from 'react';
import { links } from '@/lib/dict';

type Release = {
  tag_name?: string;
  assets?: { name?: string; browser_download_url?: string; size?: number }[];
};

export type LatestRelease = {
  version: string;
  url: string;
  assetName: string;
  sizeMb: number | null;
};

let cached: Promise<LatestRelease | null> | null = null;

/**
 * 릴리스 자산 이름에 버전이 박혀 있어서(Seorap-Setup-0.3.1.exe) 고정 URL 을 쓸 수 없다.
 * GitHub API 로 최신 설치 파일을 찾고, 실패하면 릴리스 페이지로 보낸다.
 */
function fetchLatest(): Promise<LatestRelease | null> {
  cached ??= fetch(
    'https://api.github.com/repos/bbjbc/seorap/releases/latest',
    {
      headers: { Accept: 'application/vnd.github+json' },
    },
  )
    .then((res) => (res.ok ? (res.json() as Promise<Release>) : null))
    .then((data) => {
      const asset = data?.assets?.find((a) =>
        /setup.*\.exe$/i.test(a.name ?? ''),
      );
      if (!asset?.browser_download_url || !asset.name) return null;
      return {
        version: data?.tag_name ?? '',
        url: asset.browser_download_url,
        assetName: asset.name,
        sizeMb: asset.size ? Math.round(asset.size / 1024 / 1024) : null,
      };
    })
    .catch(() => null);
  return cached;
}

export function useLatestRelease(): LatestRelease | null {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  useEffect(() => {
    let alive = true;
    fetchLatest().then((r) => {
      if (alive) setRelease(r);
    });
    return () => {
      alive = false;
    };
  }, []);
  return release;
}

function DownloadIcon({ size = 19 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title />
      <path d="M12 3v13" />
      <path d="m6 11 6 6 6-6" />
      <path d="M4 21h16" />
    </svg>
  );
}

type Props = {
  className?: string;
  label: string;
  iconSize?: number;
  withIcon?: boolean;
};

/** 최신 설치 파일로 바로 내려받는 버튼. API 가 답하기 전에는 릴리스 페이지를 가리킨다. */
export function DownloadButton({
  className = 'btn',
  label,
  iconSize = 19,
  withIcon = true,
}: Props) {
  const release = useLatestRelease();
  return (
    <a
      className={className}
      href={release?.url ?? links.latest}
      download={release ? release.assetName : undefined}
    >
      {withIcon ? <DownloadIcon size={iconSize} /> : null}
      <span>{label}</span>
    </a>
  );
}
