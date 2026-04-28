'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type {
  HostedSentimentData,
  HostedSignalsData,
  HostedTrendingData,
  XFeedPost,
} from '@/lib/api'
import { getHostedSentiment, getHostedSignals, getHostedTrendingDaily } from '@/lib/api'

const MAX_POSTS = 22
const BATCH_LADDER = [12, 5, 5]

// ── Session cache ─────────────────────────────────────────────────────────────
// Persists completed batches so navigating away + back (or a tab reload within
// the same session) never re-generates posts that are already done.
const FEED_SESSION_KEY = 'signal:feed:v2'
const SESSION_TTL_MS = 25 * 60 * 1000 // 25 min
const PREFETCH_KEY = 'signal:prefeed:v1'

type SessionCache = {
  ts: number
  batchIndex: number
  posts: XFeedPost[]
  angles: string[]
  topics: string[]
}

function readSessionCache(): SessionCache | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    // First check prefetch (landing page pre-generation)
    let raw = sessionStorage.getItem(PREFETCH_KEY)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        if (data?.ts && data?.posts?.length > 0) {
          return { ts: data.ts, batchIndex: 0, posts: data.posts, angles: [], topics: [] }
        }
      } catch {
        // not valid prefetch
      }
    }
    // Then check session cache
    raw = sessionStorage.getItem(FEED_SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as SessionCache
    if (!data || typeof data.ts !== 'number') return null
    if (Date.now() - data.ts > SESSION_TTL_MS) return null
    if (!Array.isArray(data.posts) || data.posts.length === 0) return null
    return data
  } catch {
    return null
  }
}

function writeSessionCache(cache: Omit<SessionCache, 'ts'>) {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(FEED_SESSION_KEY, JSON.stringify({ ...cache, ts: Date.now() }))
    sessionStorage.removeItem(PREFETCH_KEY)
  } catch {
    // quota / private mode — safe to ignore
  }
}
// ─────────────────────────────────────────────────────────────────────────────

type SignalSnapshot = {
  signals: HostedSignalsData | null
  sentiment: HostedSentimentData | null
  trending: HostedTrendingData | null
}

type FeedContextType = {
  posts: XFeedPost[]
  topicPosts: XFeedPost[]
  signalData: SignalSnapshot
  loadingData: boolean
  generating: boolean
  done: boolean
  error: string | null
  status: string | null
  searchMode: boolean
  searchTopicValue: string
  generateMore: () => Promise<void>
  searchTopic: (topic: string) => Promise<void>
  clearSearch: () => void
}

const FeedContext = createContext<FeedContextType | null>(null)

function parseSseFrames(buffer: string): { frames: string[]; rest: string } {
  const frames = buffer.split('\n\n')
  return { frames: frames.slice(0, -1), rest: frames[frames.length - 1] || '' }
}

export function FeedProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Restore from sessionStorage synchronously on first render (lazy useState).
  // This gives users back their posts instantly if they navigated away within
  // the same tab session without needing a new generation call.
  const [initialCache] = useState<SessionCache | null>(() => readSessionCache())
  const hasCache = initialCache != null

  const [posts, setPosts] = useState<XFeedPost[]>(initialCache?.posts ?? [])
  const [topicPosts, setTopicPosts] = useState<XFeedPost[]>([])
  const [signalData, setSignalData] = useState<SignalSnapshot>({
    signals: null,
    sentiment: null,
    trending: null,
  })
  const [loadingData, setLoadingData] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState((initialCache?.posts.length ?? 0) >= MAX_POSTS)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [searchTopicValue, setSearchTopicValue] = useState('')

  const busyRef = useRef(false)
  const batchRef = useRef(initialCache?.batchIndex ?? 0)
  const anglesRef = useRef<string[]>(initialCache?.angles ?? [])
  const topicsRef = useRef<string[]>(initialCache?.topics ?? [])
  const postsRef = useRef<XFeedPost[]>(initialCache?.posts ?? [])
  // readyRef guards auto-boot: skip the initial generateMore() if we already
  // have posts from the session cache.
  const readyRef = useRef(hasCache)
  // AbortController for the currently active SSE stream — cancelled if the
  // provider unmounts (i.e. user leaves /app/* entirely).
  const abortRef = useRef<AbortController | null>(null)
  const isFeedRoute = pathname === '/app/x'

  useEffect(() => {
    postsRef.current = posts
    if (posts.length >= MAX_POSTS) setDone(true)
  }, [posts])

  // If provider mounted before landing prefetch finished, re-hydrate when the
  // user enters /app/x so we can use prefetched/session data instead of
  // sending another first-batch request.
  useEffect(() => {
    if (!isFeedRoute) return
    if (postsRef.current.length > 0 || generating || searchMode) return
    const cache = readSessionCache()
    if (!cache || cache.posts.length === 0) return
    setPosts(cache.posts)
    setDone(cache.posts.length >= MAX_POSTS)
    batchRef.current = cache.batchIndex
    anglesRef.current = cache.angles
    topicsRef.current = cache.topics
    postsRef.current = cache.posts
    readyRef.current = true
  }, [generating, isFeedRoute, searchMode])

  // Cancel any in-flight stream when the provider is torn down.
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  // Fetch signal/sentiment/trending data. We still do this even when restoring
  // from cache so that subsequent batches have fresh context.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [sig, sent, trend] = await Promise.allSettled([
          getHostedSignals(),
          getHostedSentiment(),
          getHostedTrendingDaily(),
        ])
        if (!active) return
        setSignalData({
          signals: sig.status === 'fulfilled' ? sig.value : null,
          sentiment: sent.status === 'fulfilled' ? sent.value : null,
          trending: trend.status === 'fulfilled' ? trend.value : null,
        })
      } finally {
        if (active) setLoadingData(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const streamGenerate = useCallback(
    async ({
      mode,
      topic,
      batchSize,
      target,
      onDone,
    }: {
      mode: 'feed' | 'topic-search' | 'world'
      topic?: string
      batchSize: number
      target: 'feed' | 'topic'
      onDone?: () => void
    }) => {
      // Fresh controller per stream so abort() on the previous one doesn't
      // bleed into the new request.
      const controller = new AbortController()
      abortRef.current = controller

      const payload = {
        mode,
        topic,
        signalData,
        batchIndex: batchRef.current,
        batchSize,
        priorAngles: anglesRef.current,
        priorTopics: topicsRef.current,
      }
      const res = await fetch('/api/x/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) {
        throw new Error(`Generation failed (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          const { done: eof, value } = await reader.read()
          if (eof) break
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
              const payloadObj = JSON.parse(data.join('\n')) as Record<string, unknown>
              if (event === 'status') setStatus(String(payloadObj.message || ''))
              if (event === 'error') setError(String(payloadObj.message || 'Generation failed'))
              if (event === 'post') {
                const post = payloadObj as unknown as XFeedPost
                if (target === 'feed') {
                  setPosts((prev) => (prev.length >= MAX_POSTS ? prev : [...prev, post]))
                } else {
                  setTopicPosts((prev) => [...prev, post])
                }
                if (payloadObj.angle) anglesRef.current.push(String(payloadObj.angle))
                if (payloadObj.topic)
                  topicsRef.current = [...new Set([...topicsRef.current, String(payloadObj.topic)])]
              }
              if (event === 'post-image') {
                const update = (post: XFeedPost) =>
                  post.post_id === payloadObj.post_id
                    ? {
                        ...post,
                        image_url: String(payloadObj.image_url || ''),
                        image_source: String(payloadObj.image_source || ''),
                        image_kind: String(payloadObj.image_kind || ''),
                      }
                    : post
                if (target === 'feed') setPosts((prev) => prev.map(update))
                else setTopicPosts((prev) => prev.map(update))
              }
              if (event === 'done') {
                const covered = payloadObj.covered_angles as string[] | undefined
                if (Array.isArray(covered)) anglesRef.current.push(...covered)
              }
            } catch {
              // ignore malformed SSE frame
            }
          }
        }
      } catch (e) {
        // AbortError = user navigated away from /app entirely. Not a real error.
        if (e instanceof Error && e.name === 'AbortError') return
        throw e
      }
      onDone?.()
    },
    [signalData]
  )

  const generateMore = useCallback(async () => {
    if (busyRef.current || done || searchMode) return
    const idx = batchRef.current
    const isFirst = idx === 0
    if (isFirst && !signalData.signals) return
    const remaining = MAX_POSTS - postsRef.current.length
    if (remaining <= 0) {
      setDone(true)
      return
    }
    const desired = BATCH_LADDER[idx] ?? BATCH_LADDER[BATCH_LADDER.length - 1]
    const count = Math.min(desired, remaining)
    busyRef.current = true
    setGenerating(true)
    setError(null)
    try {
      await streamGenerate({
        mode: isFirst ? 'feed' : 'world',
        batchSize: count,
        target: 'feed',
      })
      batchRef.current += 1
      // Flush completed batch state to session so a reload / navigation away
      // restores posts immediately without regenerating.
      if (postsRef.current.length > 0) {
        writeSessionCache({
          posts: postsRef.current,
          batchIndex: batchRef.current,
          angles: anglesRef.current,
          topics: topicsRef.current,
        })
      }
    } catch (err) {
      // AbortError surfaces here when provider unmounts mid-stream — not an error.
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
      setStatus(null)
      busyRef.current = false
    }
  }, [done, searchMode, signalData.signals, streamGenerate])

  const searchTopic = useCallback(
    async (topic: string) => {
      const clean = topic.trim()
      if (!clean || busyRef.current) return
      busyRef.current = true
      setGenerating(true)
      setError(null)
      setSearchMode(true)
      setSearchTopicValue(clean)
      setTopicPosts([])
      try {
        await streamGenerate({
          mode: 'topic-search',
          topic: clean,
          batchSize: 14,
          target: 'topic',
        })
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Topic generation failed')
      } finally {
        setGenerating(false)
        setStatus(null)
        busyRef.current = false
      }
    },
    [streamGenerate]
  )

  const clearSearch = useCallback(() => {
    setSearchMode(false)
    setSearchTopicValue('')
    setTopicPosts([])
  }, [])

  // Auto-boot first batch. Skipped entirely when posts were restored from
  // session cache (readyRef starts as true in that case).
  useEffect(() => {
    if (!isFeedRoute) return
    if (!loadingData && signalData.signals && !readyRef.current) {
      readyRef.current = true
      void generateMore()
    }
  }, [generateMore, isFeedRoute, loadingData, signalData.signals])

  const value = useMemo<FeedContextType>(
    () => ({
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
    }),
    [posts, topicPosts, signalData, loadingData, generating, done, error, status, searchMode, searchTopicValue, generateMore, searchTopic, clearSearch]
  )

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>
}

export function useFeed() {
  const ctx = useContext(FeedContext)
  if (!ctx) throw new Error('useFeed must be used inside FeedProvider')
  return ctx
}
