import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { dictionaries, type Lang, links } from '@/lib/dict';
import {
  APP,
  absolute,
  asset,
  BASE_PATH,
  FALLBACK_VERSION,
  SITE_URL,
} from '@/lib/site';

/** @font-face 는 basePath 를 붙여야 해서 CSS 파일 대신 여기서 넣는다. */
const FONT_FACE = `
@font-face {
  font-family: "Pretendard Variable";
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
  src: local("Pretendard Variable"), url("${BASE_PATH}/fonts/PretendardVariable.woff2") format("woff2-variations");
}`;

const PATH: Record<Lang, string> = { ko: '/', en: '/en' };

export function metadataFor(lang: Lang): Metadata {
  const t = dictionaries[lang];
  const other: Lang = lang === 'ko' ? 'en' : 'ko';
  const ogImage = absolute(`/img/og.${lang}.jpg`);

  return {
    metadataBase: new URL(`${SITE_URL}/`),
    title: { default: t.meta.title, template: `%s · ${APP.name}` },
    description: t.meta.description,
    applicationName: APP.name,
    authors: [{ name: APP.author, url: `https://github.com/${APP.author}` }],
    creator: APP.author,
    publisher: APP.author,
    keywords:
      lang === 'ko'
        ? [
            '서랍',
            'Seorap',
            '클립보드 관리',
            '클립보드 매니저',
            '윈도우 트레이 앱',
            '메모',
            '비밀번호 금고',
            '오픈소스',
          ]
        : [
            'Seorap',
            'clipboard manager',
            'Windows tray app',
            'scratchpad',
            'notes',
            'password vault',
            'open source',
          ],
    category: 'productivity',
    alternates: {
      canonical: PATH[lang],
      languages: { ko: PATH.ko, en: PATH.en, 'x-default': PATH.ko },
    },
    openGraph: {
      type: 'website',
      siteName: lang === 'ko' ? `${APP.nameKo} (${APP.name})` : APP.name,
      title: t.meta.title,
      description: t.meta.description,
      url: PATH[lang],
      locale: lang === 'ko' ? 'ko_KR' : 'en_US',
      alternateLocale: other === 'ko' ? 'ko_KR' : 'en_US',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          type: 'image/jpeg',
          alt: t.meta.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.meta.title,
      description: t.meta.description,
      images: [ogImage],
    },
    icons: {
      icon: asset('/img/icon.png'),
      apple: asset('/img/icon.png'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

/** 다운로드 페이지라 SoftwareApplication 으로 표시한다. 값은 릴리스와 맞춰 둔다. */
function structuredData(lang: Lang) {
  const t = dictionaries[lang];
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: lang === 'ko' ? `${APP.nameKo} (${APP.name})` : APP.name,
    description: t.meta.description,
    url: absolute(PATH[lang]),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Windows 10, Windows 11',
    softwareVersion: FALLBACK_VERSION.replace(/^v/, ''),
    downloadUrl: links.latest,
    installUrl: links.latest,
    softwareHelp: links.repo,
    license: APP.license,
    inLanguage: ['ko', 'en'],
    image: absolute(`/img/og.${lang}.jpg`),
    screenshot: absolute(`/img/board.${lang}.jpg`),
    author: {
      '@type': 'Person',
      name: APP.author,
      url: `https://github.com/${APP.author}`,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
    },
  };
}

export function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang}>
      <head>
        <style>{FONT_FACE}</style>
        <link
          rel="preload"
          href={`${BASE_PATH}/fonts/PretendardVariable.woff2`}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 는 이 방법뿐이다.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData(lang)),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
