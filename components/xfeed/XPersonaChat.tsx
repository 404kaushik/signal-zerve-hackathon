'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  SentIcon,
  CheckmarkBadge03Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons'
import { format } from 'date-fns'
import { useChat } from '@/lib/chat-context'
import { useFeed } from '@/lib/feed-context'
import { X_PERSONA_MAP, X_PERSONAS } from '@/lib/x-personas'
import { getPersonaTheme } from '@/lib/x-persona-theme'
import { T_BASE, T_FAST } from '@/components/xfeed/_motion'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  pending?: boolean
}

function parseSseFrames(buffer: string): { frames: string[]; rest: string } {
  const frames = buffer.split('\n\n')
  return { frames: frames.slice(0, -1), rest: frames[frames.length - 1] || '' }
}

export function XPersonaChat() {
  const { isOpen, personaId, post, closeChat } = useChat()
  const { posts: feedPosts } = useFeed()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const persona = useMemo(() => {
    if (!personaId) return null
    return X_PERSONA_MAP[personaId] || X_PERSONAS[6]
  }, [personaId])

  const theme = useMemo(() => getPersonaTheme(personaId || undefined), [personaId])

  const avatar = useMemo(() => {
    if (!persona) return ''
    const seed = post?.avatar_seed || persona.seed
    return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}`
  }, [persona, post])

  // Reset chat each time the modal opens for a new persona/post combo.
  useEffect(() => {
    if (!isOpen || !persona) return
    setError(null)
    setInput('')
    const opener: ChatMessage = post
      ? {
          id: `seed-${Date.now()}`,
          role: 'assistant',
          content: post.body,
          timestamp: new Date(post.timestamp).getTime() || Date.now(),
        }
      : {
          id: `seed-${Date.now()}`,
          role: 'assistant',
          content: `hey, it's ${persona.name.split(' ')[0].toLowerCase()}. ask me anything i'm tracking.`,
          timestamp: Date.now(),
        }
    setMessages([opener])
    // Focus the composer shortly after the modal animates in.
    const t = setTimeout(() => inputRef.current?.focus(), 200)
    return () => clearTimeout(t)
  }, [isOpen, persona, post])

  // Auto-scroll on new messages or streaming deltas.
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  // Esc to close.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChat()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeChat])

  // Cancel any in-flight stream when the modal closes.
  useEffect(() => {
    if (!isOpen && abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
      setStreaming(false)
    }
  }, [isOpen])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!personaId || !text.trim() || streaming) return
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      }
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        pending: true,
      }
      const history = messages
        .filter((m) => !m.pending)
        // Skip the initial seed post (it's not a real assistant message in
        // the conversation thread — it's context shown as the first bubble).
        .slice(post ? 1 : 0)
        .map((m) => ({ role: m.role, content: m.content }))

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setInput('')
      setError(null)
      setStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      const priorPosts = feedPosts
        .filter((p) => p.persona === personaId)
        .map((p) => ({
          author: p.author,
          handle: p.handle,
          body: p.body,
          topic: p.topic,
          category: p.category,
          stance: p.stance,
          angle: p.angle,
          confidence_0_1: p.confidence_0_1,
          evidence: (p.evidence || []).slice(0, 3).map((e) => ({
            title: e.title,
            url: e.url,
            domain: e.domain,
          })),
        }))

      try {
        const res = await fetch('/api/x/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            personaId,
            post: post
              ? {
                  author: post.author,
                  handle: post.handle,
                  body: post.body,
                  topic: post.topic,
                  category: post.category,
                  stance: post.stance,
                  angle: post.angle,
                  confidence_0_1: post.confidence_0_1,
                  evidence: (post.evidence || []).slice(0, 5).map((e) => ({
                    title: e.title,
                    url: e.url,
                    domain: e.domain,
                  })),
                }
              : undefined,
            priorPosts,
            history,
            message: text.trim(),
          }),
        })

        if (!res.ok || !res.body) {
          throw new Error(`Chat failed (${res.status})`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const parsed = parseSseFrames(buffer)
          buffer = parsed.rest
          for (const frame of parsed.frames) {
            const lines = frame.split('\n').map((l) => l.trim()).filter(Boolean)
            let event = 'message'
            const data: string[] = []
            for (const line of lines) {
              if (line.startsWith('event:')) event = line.slice(6).trim()
              if (line.startsWith('data:')) data.push(line.slice(5).trim())
            }
            if (!data.length) continue
            try {
              const payload = JSON.parse(data.join('\n')) as Record<string, unknown>
              if (event === 'delta') {
                const text = String(payload.text || '')
                if (text) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, content: m.content + text }
                        : m
                    )
                  )
                }
              } else if (event === 'error') {
                setError(String(payload.message || 'Chat failed'))
              }
            } catch {
              // ignore malformed
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : 'Chat failed')
        }
      } finally {
        setStreaming(false)
        abortRef.current = null
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, pending: false, timestamp: Date.now() }
              : m
          )
        )
      }
    },
    [feedPosts, messages, personaId, post, streaming]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && persona && (
        <motion.div
          key="chat-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={T_FAST}
          onClick={closeChat}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md sm:p-6"
        >
          <motion.div
            key="chat-modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={T_BASE}
            onClick={(e) => e.stopPropagation()}
            className="relative flex h-full w-full flex-col overflow-hidden border border-white/[0.08] bg-[#070707] shadow-[0_30px_120px_-20px_rgba(0,0,0,0.9)] sm:h-[640px] sm:max-h-[90vh] sm:w-[440px] sm:rounded-2xl"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-white/[0.06] bg-[#0a0a0a]/95 px-4 py-3 backdrop-blur-xl">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg, transparent, ${theme.accent}80, transparent)`,
                }}
              />
              <div className="relative shrink-0">
                <img
                  src={avatar}
                  alt={persona.name}
                  className="h-10 w-10 rounded-full bg-black ring-1 ring-white/10"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0a0a0a]"
                  style={{ backgroundColor: theme.accent }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-white">
                    {persona.name}
                  </span>
                  <HugeiconsIcon
                    icon={CheckmarkBadge03Icon}
                    size={12}
                    strokeWidth={1.8}
                    style={{ color: theme.accent }}
                  />
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                  <span className="lowercase tracking-normal text-white/45">
                    {persona.handle}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span style={{ color: theme.accent }}>{theme.label}</span>
                </div>
              </div>
              <button
                onClick={closeChat}
                aria-label="Close chat"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.8} />
              </button>
            </div>

            {/* Optional context banner */}
            {post && (
              <div className="flex items-start gap-2 border-b border-white/[0.05] bg-white/[0.015] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                <HugeiconsIcon
                  icon={InformationCircleIcon}
                  size={11}
                  strokeWidth={1.8}
                  className="mt-[2px] shrink-0"
                />
                <span className="leading-[1.5]">
                  About their post · {post.topic || post.category || 'recent signal'}
                </span>
              </div>
            )}

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 scrollbar-none"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <div className="flex flex-col gap-1.5">
                {messages.map((msg, idx) => {
                  const prev = messages[idx - 1]
                  const showStamp =
                    idx === 0 ||
                    !prev ||
                    msg.timestamp - prev.timestamp > 5 * 60 * 1000
                  const isUser = msg.role === 'user'
                  const groupedWithPrev =
                    prev && prev.role === msg.role && !showStamp
                  return (
                    <div key={msg.id} className="flex flex-col">
                      {showStamp && (
                        <div className="my-2 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                          {format(new Date(msg.timestamp), 'h:mm a')}
                        </div>
                      )}
                      <div
                        className={`flex items-end gap-2 ${
                          isUser ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        {!isUser && (
                          <div
                            className={`h-6 w-6 shrink-0 ${
                              groupedWithPrev ? 'opacity-0' : 'opacity-100'
                            }`}
                          >
                            <img
                              src={avatar}
                              alt={persona.name}
                              className="h-6 w-6 rounded-full bg-black ring-1 ring-white/10"
                            />
                          </div>
                        )}
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={T_FAST}
                          className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] leading-[1.4] ${
                            isUser
                              ? 'rounded-br-md bg-[#2563eb] text-white shadow-[0_2px_12px_rgba(37,99,235,0.25)]'
                              : 'rounded-bl-md border border-white/[0.06] bg-white/[0.04] text-white/90'
                          }`}
                          style={
                            !isUser
                              ? {
                                  borderColor: `${theme.accent}30`,
                                  background: `linear-gradient(180deg, ${theme.accent}10, rgba(255,255,255,0.02))`,
                                }
                              : undefined
                          }
                        >
                          {msg.content || (msg.pending ? <TypingDots /> : '')}
                          {msg.pending && msg.content && (
                            <span
                              className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse"
                              style={{ backgroundColor: theme.accent }}
                            />
                          )}
                        </motion.div>
                      </div>
                      {isUser &&
                        idx === messages.length - 1 &&
                        !streaming && (
                          <div className="mt-0.5 pr-1 text-right font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">
                            Delivered
                          </div>
                        )}
                    </div>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="border-t border-[#c45050]/30 bg-[#c45050]/[0.06] px-4 py-2 text-[11px] text-[#e8a3a3]">
                {error}
              </div>
            )}

            {/* Composer */}
            <div className="border-t border-white/[0.06] bg-[#0a0a0a]/90 px-3 py-3 backdrop-blur-xl">
              <div className="flex items-end gap-2">
                <div className="flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] focus-within:border-white/20">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    rows={1}
                    placeholder={`Message ${persona.name.split(' ')[0]}…`}
                    className="block max-h-32 w-full resize-none bg-transparent px-3.5 py-2.5 text-[14px] leading-[1.4] text-white outline-none placeholder:text-white/30"
                    disabled={streaming}
                  />
                </div>
                <motion.button
                  onClick={() => void sendMessage(input)}
                  disabled={!input.trim() || streaming}
                  whileTap={{ scale: 0.92 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    backgroundColor: input.trim() && !streaming ? theme.accent : '#2a2a2a',
                  }}
                  aria-label="Send"
                >
                  <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={2} />
                </motion.button>
              </div>
              <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.18em] text-white/25">
                <span>Powered by Grok · {persona.name}</span>
                <span>Esc to close</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-white/50"
          style={{
            animation: 'signalTyping 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes signalTyping {
          0%, 60%, 100% {
            opacity: 0.25;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(-2px);
          }
        }
      `}</style>
    </span>
  )
}
