'use client';

import { SWRConfig } from 'swr';
import { swrConfig } from '@/lib/fetcher';

export default function Providers({ children }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}
