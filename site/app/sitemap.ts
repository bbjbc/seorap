import type { MetadataRoute } from 'next';
import { absolute } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { ko: absolute('/'), en: absolute('/en/') };
  return [
    {
      url: absolute('/'),
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages },
    },
    {
      url: absolute('/en/'),
      changeFrequency: 'monthly',
      priority: 0.8,
      alternates: { languages },
    },
  ];
}
