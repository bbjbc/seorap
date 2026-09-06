import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/app/globals.css';
import { metadataFor, Shell } from '@/app/shell';

export const metadata: Metadata = metadataFor('en');

export default function EnLayout({ children }: { children: ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}
