'use client'

import { useMemo, useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Comment01Icon,
  RepeatIcon,
  FavouriteIcon,
  Analytics01Icon,
  Bookmark01Icon,
  Share08Icon,
  MoreHorizontalIcon,
  CheckmarkBadge03Icon,
  LinkSquare01Icon,
} from '@hugeicons/core-free-icons'
import type { XFeedPost } from '@/lib/api'
import { XEvidenceSheet } from '@/components/xfeed/XEvidenceSheet'
import { T_BASE, fadeUp } from '@/components/xfeed/_motion'
import { getPersonaTheme } from '@/lib/x-persona-theme'
import { useChat } from '@/lib/chat-context'

const STANCE_STYLE: Record<string, string> = {
  bullish: 'text-[#7bc49a] border-[#7bc49a]/30',
  bearish: 'text-[#c45050] border-[#c45050]/30',
  alarming: 'text-[#e08b5a] border-[#e08b5a]/30',
  contrarian: 'text-[#b59dff] border-[#b59dff]/30',
}

function compactNumber(n: number): string {
  if (n < 1000) return String(n)
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K`
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
}

interface XPostCardProps {
  post: XFeedPost
  index?: number
}

export function XPostCard({ post, index = 0 }: XPostCardProps) {
  const [showEvidence, setShowEvidence] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [liked, setLiked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const theme = getPersonaTheme(post.persona)
  const { openChat } = useChat()
  const handleOpenChat = () => {
    if (post.persona) openChat({ personaId: post.persona, post })
  }

  const avatar = useMemo(
    () =>
      `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(post.avatar_seed || post.handle || post.post_id)}`,
    [post.avatar_seed, post.handle, post.post_id]
  )
  const showImage = Boolean(post.image_url && !imgFailed)
  const timeAgo = useMemo(
    () => formatDistanceToNowStrict(new Date(post.timestamp), { addSuffix: false }),
    [post.timestamp]
  )
  const metricSeed = useMemo(
    () => [...post.post_id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
    [post.post_id]
  )
  const metric = (base: number) => Math.max(0, base + (metricSeed % 97))

  const stanceTag = post.stance && post.stance !== 'neutral' ? post.stance : null

  const renderedBody = useMemo(() => {
    const raw = post.body || ''
    const lines = raw.split('\n')
    const elements: Array<{ type: 'text' | 'bullet'; content: string }> = []
    let textBuffer: string[] = []

    const flushText = () => {
      if (textBuffer.length) {
        elements.push({ type: 'text', content: textBuffer.join('\n') })
        textBuffer = []
      }
    }

    for (const line of lines) {
      const trimmed = line.trim()
      if (/^[•\-–—*▸▹►]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
        flushText()
        const cleaned = trimmed.replace(/^[•\-–—*▸▹►]\s*/, '').replace(/^\d+[.)]\s*/, '')
        elements.push({ type: 'bullet', content: cleaned })
      } else {
        textBuffer.push(line)
      }
    }
    flushText()

    return elements
  }, [post.body])

  const highlightInline = (text: string) =>
    text
      .replace(/(^|\s)(#\w+)/g, '$1<span class="font-semibold text-white">$2</span>')
      .replace(/(^|\s)(@\w+)/g, '$1<span class="font-semibold text-white">$2</span>')

  const actions = [
    {
      key: 'reply',
      icon: Comment01Icon,
      count: metric(2),
      label: 'Reply',
      active: false,
      onClick: () => {},
      activeColor: '#e8e8e8',
    },
    {
      key: 'repost',
      icon: RepeatIcon,
      count: metric(18) + (reposted ? 1 : 0),
      label: 'Repost',
      active: reposted,
      onClick: () => setReposted((v) => !v),
      activeColor: '#7bc49a',
    },
    {
      key: 'like',
      icon: FavouriteIcon,
      count: metric(65) + (liked ? 1 : 0),
      label: 'Like',
      active: liked,
      onClick: () => setLiked((v) => !v),
      activeColor: '#e8a3b8',
    },
    {
      key: 'view',
      icon: Analytics01Icon,
      count: metric(230),
      label: 'Views',
      active: false,
      onClick: () => {},
      activeColor: '#e8e8e8',
    },
  ] as const

  return (
    <motion.article
      variants={fadeUp}
      initial="hidden"
      animate="show"
      transition={{ ...T_BASE, delay: Math.min(index * 0.04, 0.24) }}
      className="group/post relative border-b border-white/[0.05] px-5 py-5 transition-colors duration-300 hover:bg-white/[0.015]"
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[2px] opacity-40 transition-opacity duration-300 group-hover/post:opacity-100"
        style={{ backgroundColor: theme.accent }}
      />

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={handleOpenChat}
          aria-label={`Chat with ${post.author}`}
          className="relative mt-0.5 shrink-0 cursor-pointer rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <div
            className="absolute -inset-[2px] rounded-full opacity-0 blur-md transition-opacity duration-300 group-hover/post:opacity-60"
            style={{ backgroundColor: theme.accent }}
          />
          <img
            src={avatar}
            alt={post.author}
            className="relative h-10 w-10 rounded-full bg-black ring-1 ring-white/10 transition-transform duration-200 hover:scale-[1.04]"
          />
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-[#050505]"
            style={{ backgroundColor: theme.accent }}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <button
              type="button"
              onClick={handleOpenChat}
              className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-left transition-colors duration-200 hover:[&_.x-author]:underline focus:outline-none"
            >
              <span className="x-author truncate text-[15px] font-semibold tracking-[-0.01em] text-white decoration-white/30 underline-offset-4">
                {post.author}
              </span>
              <HugeiconsIcon
                icon={CheckmarkBadge03Icon}
                size={13}
                strokeWidth={1.8}
                className="shrink-0"
                style={{ color: theme.accent }}
              />
              <span className="truncate font-sans text-[13px] text-white/40">
                {post.handle}
              </span>
              <span className="font-sans text-[13px] text-white/30">·</span>
              <span className="shrink-0 font-sans text-[13px] text-white/40">
                {timeAgo}
              </span>
            </button>
            <button
              type="button"
              className="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/35 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
              aria-label="More"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} size={15} strokeWidth={1.6} />
            </button>
          </div>

          {(stanceTag || post.persona) && (
            <div className="mt-1.5 flex items-center gap-1.5">
              {post.persona && (
                <span
                  className="inline-flex items-center gap-1.5 border border-white/[0.08] bg-white/[0.02] px-2 py-[3px] text-[9px] font-medium uppercase tracking-[0.18em]"
                  style={{ color: theme.accent }}
                >
                  <span
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: theme.accent }}
                  />
                  {theme.label}
                </span>
              )}
              {stanceTag && (
                <span
                  className={`inline-flex items-center border bg-black/40 px-2 py-[3px] text-[9px] font-medium uppercase tracking-[0.18em] ${
                    STANCE_STYLE[stanceTag] || 'text-white/60 border-white/10'
                  }`}
                >
                  {stanceTag}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 space-y-2 text-[14.5px] leading-[1.55] text-white/90">
            {renderedBody
              .filter((el) => el.type === 'text')
              .map((el, i) => (
                <p
                  key={`t-${i}`}
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: highlightInline(el.content) }}
                />
              ))}
            {renderedBody.some((el) => el.type === 'bullet') && (
              <ul className="mt-2 space-y-1.5 border-l border-white/[0.08] pl-3.5">
                {renderedBody
                  .filter((el) => el.type === 'bullet')
                  .map((el, i) => (
                    <li
                      key={`b-${i}`}
                      className="flex items-start gap-2.5 text-[14px] leading-[1.5]"
                    >
                      <span
                        className="mt-[9px] h-[3px] w-[8px] shrink-0"
                        style={{ backgroundColor: theme.accent }}
                      />
                      <span
                        className="text-white/85"
                        dangerouslySetInnerHTML={{ __html: highlightInline(el.content) }}
                      />
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {showImage && (
            <div className="relative mt-4 overflow-hidden border border-white/[0.06] bg-black">
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.02] via-white/[0.04] to-white/[0.02]" />
              )}
              <img
                src={post.image_url as string}
                alt={post.topic || post.author}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => {
                  setImgFailed(true)
                  setImgLoaded(false)
                }}
                className={`relative block max-h-[440px] w-full object-cover transition-all duration-700 ${
                  imgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]'
                }`}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
              {post.topic && (
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.18em] text-white/70">
                  <span className="h-px flex-1 bg-white/20" />
                  <span>{post.topic}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex items-center gap-1 border-t border-white/[0.04] pt-3">
            {actions.map((a) => (
              <motion.button
                key={a.key}
                onClick={a.onClick}
                whileTap={{ scale: 0.92 }}
                transition={{ duration: 0.15 }}
                className="group/act flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-sans tabular-nums uppercase tracking-[0.12em] transition-colors duration-200"
                style={{ color: a.active ? a.activeColor : undefined }}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center transition-all duration-200 ${
                    a.active ? '' : 'text-white/40 group-hover/act:text-white'
                  }`}
                >
                  <HugeiconsIcon
                    icon={a.icon}
                    size={15}
                    strokeWidth={1.6}
                    className={a.active && a.key === 'like' ? 'fill-current' : ''}
                  />
                </span>
                <span
                  className={`transition-colors duration-200 ${
                    a.active ? '' : 'text-white/40 group-hover/act:text-white/85'
                  }`}
                >
                  {compactNumber(a.count)}
                </span>
              </motion.button>
            ))}

            <div className="ml-auto flex items-center gap-0.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={() => setBookmarked((v) => !v)}
                className={`flex h-7 w-7 items-center justify-center transition-colors duration-200 ${
                  bookmarked ? 'text-white' : 'text-white/40 hover:text-white'
                }`}
                aria-label="Bookmark"
              >
                <HugeiconsIcon
                  icon={Bookmark01Icon}
                  size={15}
                  strokeWidth={1.6}
                  className={bookmarked ? 'fill-current' : ''}
                />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex h-7 w-7 items-center justify-center text-white/40 transition-colors duration-200 hover:text-white"
                aria-label="Share"
              >
                <HugeiconsIcon icon={Share08Icon} size={15} strokeWidth={1.6} />
              </motion.button>
            </div>
          </div>

          {post.evidence?.length > 0 && (
            <button
              onClick={() => setShowEvidence((v) => !v)}
              className="mt-3 inline-flex items-center gap-1.5 border border-white/[0.08] bg-black/20 px-2.5 py-1 text-[10px] font-sans uppercase tracking-[0.16em] text-white/50 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
            >
              <HugeiconsIcon icon={LinkSquare01Icon} size={11} strokeWidth={1.8} />
              {showEvidence
                ? 'Hide sources'
                : `Sources · ${String(post.evidence.length).padStart(2, '0')}`}
            </button>
          )}
          <AnimatePresence initial={false}>
            {showEvidence && <XEvidenceSheet evidence={post.evidence || []} />}
          </AnimatePresence>
        </div>
      </div>
    </motion.article>
  )
}
