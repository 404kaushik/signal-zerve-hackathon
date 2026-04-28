'use client'

import { FeedProvider } from '@/lib/feed-context'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <FeedProvider>{children}</FeedProvider>
}