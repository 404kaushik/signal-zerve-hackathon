'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Pulse02Icon,
  Alert01Icon,
  CheckmarkBadge03Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons'
import { XFeedTabs } from '@/components/xfeed/XFeedTabs'
import { XLeftNav } from '@/components/xfeed/XLeftNav'
import { XPostCard } from '@/components/xfeed/XPostCard'
import { XRightRail } from '@/components/xfeed/XRightRail'
import { XFeedSkeleton } from '@/components/xfeed/XFeedSkeleton'
import type { XFeedPost, XPostCompact, XTrendItem } from '@/lib/api'
import { XSearchBar } from '@/components/xfeed/XSearchBar'
import { useFeed } from '@/lib/feed-context'
import { X_PERSONAS } from '@/lib/x-personas'
import { T_BASE } from '@/components/xfeed/_motion'

const PREFETCH_OFFSET_FROM_END = 5

export default function XPage() {
  const {
    posts,
    topicPosts,
    signalData,
    loadingData,
    generating,
    done,
    error,
    status,
    searchMode,
    searchTopicValue,
    generateMore,
    searchTopic,
    clearSearch,
  } = useFeed()
  const [mode, setMode] = useState<'for-you' | 'following'>('for-you')
  const visiblePosts = searchMode ? topicPosts : posts
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const sentinelIndex = Math.max(0, visiblePosts.length - PREFETCH_OFFSET_FROM_END)

  useEffect(() => {
    if (searchMode || !sentinelRef.current) return
    const node = sentinelRef.current
    const obs = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !generating &&
          !done &&
          visiblePosts.length > 0
        ) {
          void generateMore()
        }
      },
      { rootMargin: '400px 0px' }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [done, generateMore, generating, searchMode, visiblePosts.length])

  const trendItems: XTrendItem[] = useMemo(() => {
    const cats = signalData.trending?.categories
    if (!cats) return []
    return cats.slice(0, 8).map((c) => ({
      topic: c.top_market_title || c.label || '',
      category: c.label || c.category || '',
      post_count: c.market_count || 0,
      volume_24h: c.volume_display || '',
    }))
  }, [signalData.trending])

  const happeningItems: XPostCompact[] = useMemo(() => {
    const top = signalData.trending?.top_markets
    if (!top) return []
    return top.slice(0, 5).map((m) => ({
      post_id: m.id,
      topic: m.title || '',
      category: m.category_label || m.category || '',
      headline: m.title || '',
      confidence_0_1: m.trending_score || 0,
    }))
  }, [signalData.trending])

  const activeUsers = useMemo(() => {
    return X_PERSONAS.map((persona) => {
      const latest = posts
        .filter((post) => post.persona === persona.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
      return {
        id: persona.id,
        name: persona.name,
        handle: persona.handle,
        avatarSeed: latest?.avatar_seed || persona.seed,
        hasRecentPost: Boolean(latest),
      }
    })
  }, [posts])

  const lastActivityPosts = useMemo<XFeedPost[]>(() => {
    const personaIds = new Set(X_PERSONAS.map((persona) => persona.id))
    return [...posts]
      .filter((post) => Boolean(post.persona && personaIds.has(post.persona)))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 2)
  }, [posts])

  return (
    <div className="min-h-screen  text-white/90 font-sans antialiased">
      <div className="mx-auto grid max-w-[1280px] lg:grid-cols-[260px_minmax(0,620px)_minmax(280px,340px)] lg:gap-4">
        <XLeftNav generating={generating} />

        <main className="relative min-h-screen border-x border-white/[0.06] bg-[#070707]/90">
          <div className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#050505]/85 px-5 py-4 backdrop-blur-xl backdrop-saturate-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-sans text-[10px] tabular-nums text-white/30">
                  00
                </span>
                <h1 className="text-[18px] font-semibold uppercase tracking-[0.24em] text-white">
                  Feed
                </h1>
              </div>
              <div className="flex items-center gap-2 border border-white/[0.08] bg-black/40 px-2.5 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-white/55">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7bc49a] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7bc49a]" />
                </span>
                Live
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.16em] text-white/30">
              <span className="h-px flex-1 bg-white/[0.08]" />
              <HugeiconsIcon icon={SparklesIcon} size={11} strokeWidth={1.6} />
              <span>{X_PERSONAS.length} personas · deep research</span>
              <span className="h-px flex-1 bg-white/[0.08]" />
            </div>
          </div>

          <XFeedTabs mode={mode} onChange={setMode} />
          <XSearchBar
            running={generating}
            onSearch={searchTopic}
            onClearSearch={clearSearch}
            searchMode={searchMode}
            searchTopicValue={searchTopicValue}
          />

          <AnimatePresence initial={false}>
            {status && (
              <motion.div
                key="status"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={T_BASE}
                className="overflow-hidden border-b border-white/[0.06] bg-white/[0.015]"
              >
                <div className="flex items-center gap-3 px-5 py-2.5 font-sans text-[11px] uppercase tracking-[0.16em] text-white/70">
                  <HugeiconsIcon
                    icon={Pulse02Icon}
                    size={13}
                    strokeWidth={1.8}
                    className="animate-pulse text-white"
                  />
                  <span>{status}</span>
                  <span className="ml-auto flex gap-[2px]">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-3 w-[2px] bg-white/60 signal-bar"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={T_BASE}
                className="overflow-hidden border-b border-[#c45050]/30 bg-[#c45050]/[0.06]"
              >
                <div className="flex items-center gap-2.5 px-5 py-3 text-[12px] text-[#e8a3a3]">
                  <HugeiconsIcon
                    icon={Alert01Icon}
                    size={14}
                    strokeWidth={1.8}
                    className="shrink-0"
                  />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode === 'for-you' ? (
            <>
              {(loadingData || (generating && visiblePosts.length === 0)) && (
                <XFeedSkeleton count={5} />
              )}

              <section>
                {visiblePosts.map((post, idx) => (
                  <Fragment key={post.post_id}>
                    {idx === sentinelIndex && !searchMode && (
                      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
                    )}
                    <XPostCard post={post} index={idx} />
                  </Fragment>
                ))}
              </section>

              {generating && visiblePosts.length > 0 && (
                <XFeedSkeleton count={3} />
              )}

              {!searchMode && done && visiblePosts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={T_BASE}
                  className="relative mx-5 my-10 border border-white/[0.08] bg-black/40 px-6 py-10 text-center"
                >
                  <div className="absolute inset-x-0 top-0 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  <HugeiconsIcon
                    icon={CheckmarkBadge03Icon}
                    size={22}
                    strokeWidth={1.6}
                    className="mx-auto text-white"
                  />
                  <div className="mt-3 font-sans text-[10px] uppercase tracking-[0.24em] text-white/40">
                    End of transmission
                  </div>
                  <div className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-white">
                    You&apos;re all caught up
                  </div>
                  <div className="mt-1.5 font-sans text-[11px] tabular-nums text-white/45">
                    {visiblePosts.length} signals · {X_PERSONAS.length} personas
                  </div>
                </motion.div>
              )}

              {!visiblePosts.length && !loadingData && !generating && (
                <div className="mx-5 my-12 border border-dashed border-white/[0.1] p-12 text-center">
                  <div className="font-sans text-[10px] uppercase tracking-[0.24em] text-white/40">
                    No transmission
                  </div>
                  <div className="mt-2 text-[13px] text-white/60">
                    No signal data available. Check back soon.
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="mx-5 my-12 border border-dashed border-white/[0.1] p-12 text-center">
              <div className="font-sans text-[10px] uppercase tracking-[0.24em] text-white/40">
                Empty channel
              </div>
              <div className="mt-2 text-[13px] text-white/60">
                Follow topics to see curated signals here.
              </div>
            </div>
          )}
        </main>

        <XRightRail
          activeUsers={activeUsers}
          trends={trendItems}
          happening={happeningItems}
          onSearchTopic={searchTopic}
          lastActivity={lastActivityPosts}
        />
      </div>
    </div>
  )
}
