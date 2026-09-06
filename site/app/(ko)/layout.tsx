import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/app/globals.css';
import { metadataFor, Shell } from '@/app/shell';

export const metadata: Metadata = metadataFor('ko');

export default function KoLayout({ children }: { children: ReactNode }) {
  return <Shell lang="ko">{children}</Shell>;
}
