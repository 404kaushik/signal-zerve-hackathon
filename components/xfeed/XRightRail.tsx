'use client'

import { formatDistanceToNowStrict } from 'date-fns'
import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  ChartUpIcon,
  UserMultipleIcon,
  Pulse02Icon,
  FireIcon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { useMemo, useState } from 'react'
import type { XFeedPost, XPostCompact, XTrendItem } from '@/lib/api'
import { T_FAST } from '@/components/xfeed/_motion'
import { useChat } from '@/lib/chat-context'

interface XRightRailProps {
  trends: XTrendItem[]
  happening: XPostCompact[]
  onSearchTopic: (topic: string) => void
  activeUsers: Array<{
    id: string
    name: string
    handle: string
    avatarSeed: string
    hasRecentPost: boolean
  }>
  lastActivity: XFeedPost[]
}

interface SectionHeaderProps {
  index: string
  label: string
  icon: typeof Search01Icon
  count?: string
}

function SectionHeader({ index, label, icon, count }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-3.5 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-[10px] tabular-nums text-white/30">{index}</span>
        <HugeiconsIcon icon={icon} size={12} strokeWidth={1.8} className="text-white/60" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
          {label}
        </span>
      </div>
      {count && (
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
          {count}
        </span>
      )}
    </div>
  )
}

export function XRightRail({
  trends,
  happening,
  onSearchTopic,
  activeUsers,
  lastActivity,
}: XRightRailProps) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const { openChat } = useChat()
  const activityCards = useMemo(
    () =>
      lastActivity.map((post) => ({
        id: post.post_id,
        author: post.author,
        handle: post.handle,
        body: post.body,
        timeAgo: formatDistanceToNowStrict(new Date(post.timestamp), { addSuffix: true }),
      })),
    [lastActivity]
  )

  return (
    <aside className="hidden xl:block sticky top-0 h-screen space-y-4 overflow-auto px-4 py-5 scrollbar-none">
      <div
        className={`flex h-11 items-center border bg-black/40 px-3 transition-all duration-200 ${
          focused
            ? 'border-white/30 shadow-[0_0_0_4px_rgba(255,255,255,0.04)]'
            : 'border-white/[0.08]'
        }`}
      >
        <HugeiconsIcon
          icon={Search01Icon}
          size={14}
          strokeWidth={1.6}
          className={`mr-2.5 ${focused ? 'text-white' : 'text-white/40'}`}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              onSearchTopic(query.trim())
              setQuery('')
            }
          }}
          placeholder="Search signals…"
          className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-white/30"
        />
        <span className="ml-2 border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/40">
          ⌘K
        </span>
      </div>

      <section className="border border-white/[0.08] bg-[#0a0a0a]/70">
        <SectionHeader
          index="03"
          label="Network"
          icon={UserMultipleIcon}
          count={`${activeUsers.filter((u) => u.hasRecentPost).length.toString().padStart(2, '0')} active`}
        />
        <div>
          {activeUsers.map((user) => (
            <button
              type="button"
              key={user.id}
              onClick={() => openChat({ personaId: user.id })}
              className="group flex w-full items-center gap-3 border-b border-white/[0.04] px-3.5 py-2 text-left transition-colors duration-200 last:border-b-0 hover:bg-white/[0.04] focus:outline-none focus-visible:bg-white/[0.05]"
            >
              <div className="relative">
                <img
                  src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(user.avatarSeed)}`}
                  alt={user.name}
                  className="h-8 w-8 bg-black ring-1 ring-white/10 transition-transform duration-200 group-hover:scale-[1.05]"
                />
                {user.hasRecentPost && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#7bc49a] ring-2 ring-[#050505]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-white group-hover:underline group-hover:decoration-white/30 group-hover:underline-offset-2">
                  {user.name}
                </div>
                <div className="truncate font-mono text-[10px] text-white/40">
                  {user.handle}
                </div>
              </div>
              <span
                className={`font-mono text-[9px] uppercase tracking-[0.16em] transition-colors group-hover:text-white ${
                  user.hasRecentPost ? 'text-[#7bc49a]' : 'text-white/25'
                }`}
              >
                {user.hasRecentPost ? 'live' : 'chat'}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="border border-white/[0.08] bg-[#0a0a0a]/70">
        <SectionHeader
          index="01"
          label="Pulse"
          icon={Pulse02Icon}
          count={`${happening.length.toString().padStart(2, '0')} live`}
        />
        <div>
          {happening.slice(0, 5).map((h, idx) => (
            <motion.button
              key={h.post_id}
              whileHover={{ x: 3 }}
              transition={T_FAST}
              onClick={() => onSearchTopic(h.topic || h.headline || '')}
              className="group flex w-full items-start gap-3 border-b border-white/[0.04] px-3.5 py-2.5 text-left transition-colors duration-200 last:border-b-0 hover:bg-white/[0.03]"
            >
              <span className="mt-0.5 font-mono text-[10px] tabular-nums text-white/25">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                  <HugeiconsIcon icon={FireIcon} size={10} strokeWidth={1.8} />
                  Trending · {h.category || 'World'}
                </span>
                <span className="mt-1 block text-[13px] font-medium leading-tight text-white line-clamp-2">
                  {h.headline || h.topic}
                </span>
              </span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={12}
                strokeWidth={1.8}
                className="mt-1 shrink-0 text-white/20 transition-colors duration-200 group-hover:text-white"
              />
            </motion.button>
          ))}
        </div>
      </section>

      <section className="border border-white/[0.08] bg-[#0a0a0a]/70">
        <SectionHeader
          index="02"
          label="Signals"
          icon={ChartUpIcon}
          count={`${Math.min(trends.length, 8).toString().padStart(2, '0')} tracked`}
        />
        <div>
          {trends.slice(0, 8).map((t, idx) => (
            <motion.button
              key={`${t.topic}-${idx}`}
              whileHover={{ x: 3 }}
              transition={T_FAST}
              onClick={() => onSearchTopic(t.topic || '')}
              className="group flex w-full items-center gap-3 border-b border-white/[0.04] px-3.5 py-2.5 text-left transition-colors duration-200 last:border-b-0 hover:bg-white/[0.03]"
            >
              <span className="font-mono text-[10px] tabular-nums text-white/25">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">
                  {t.category || 'Trending'}
                </span>
                <span className="mt-0.5 block truncate text-[13px] font-medium text-white">
                  {t.topic || 'Topic'}
                </span>
              </span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-white/50">
                {t.volume_24h || `${t.post_count || 0}`}
              </span>
            </motion.button>
          ))}
        </div>
      </section>


      <section className="border border-white/[0.08] bg-[#0a0a0a]/70">
        <SectionHeader
          index="04"
          label="Stream"
          icon={Pulse02Icon}
          count={activityCards.length ? `${activityCards.length.toString().padStart(2, '0')} recent` : undefined}
        />
        <div>
          {activityCards.length ? (
            activityCards.map((post) => (
              <article
                key={post.id}
                className="border-b border-white/[0.04] px-3.5 py-2.5 transition-colors duration-200 last:border-b-0 hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
                  <span className="font-semibold normal-case tracking-normal text-white/85">
                    {post.author}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="normal-case tracking-normal">{post.timeAgo}</span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-[1.5] text-white/70">
                  {post.body}
                </p>
              </article>
            ))
          ) : (
            <div className="px-3.5 py-4 font-mono text-[11px] text-white/35">
              Awaiting transmissions…
            </div>
          )}
        </div>
      </section>

      <footer className="px-2 pb-4">
        <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
          <span className="transition-colors hover:text-white/60">Terms</span>
          <span className="h-1 w-1 self-center rounded-full bg-white/15" />
          <span className="transition-colors hover:text-white/60">Privacy</span>
          <span className="h-1 w-1 self-center rounded-full bg-white/15" />
          <span className="transition-colors hover:text-white/60">Accessibility</span>
        </div>
        <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/20">
          © 2026 · Signal Lens
        </div>
      </footer>
    </aside>
  )
}
