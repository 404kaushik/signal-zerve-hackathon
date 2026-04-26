'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type {
  HostedSentimentData,
  HostedSignalsData,
  HostedTrendingData,
  XFeedPost,
} from '@/lib/api'
import { getHostedSentiment, getHostedSignals, getHostedTrendingDaily } from '@/lib/api'

const MAX_POSTS = 22
const BATCH_LADDER = [12, 5, 5]

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
  const [posts, setPosts] = useState<XFeedPost[]>([])
  const [topicPosts, setTopicPosts] = useState<XFeedPost[]>([])
  const [signalData, setSignalData] = useState<SignalSnapshot>({
    signals: null,
    sentiment: null,
    trending: null,
  })
  const [loadingData, setLoadingData] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [searchMode, setSearchMode] = useState(false)
  const [searchTopicValue, setSearchTopicValue] = useState('')

  const busyRef = useRef(false)
  const batchRef = useRef(0)
  const anglesRef = useRef<string[]>([])
  const topicsRef = useRef<string[]>([])
  const postsRef = useRef<XFeedPost[]>([])
  const readyRef = useRef(false)

  useEffect(() => {
    postsRef.current = posts
    if (posts.length >= MAX_POSTS) setDone(true)
  }, [posts])

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
      })
      if (!res.ok || !res.body) {
        throw new Error(`Generation failed (${res.status})`)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
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
              if (payloadObj.topic) topicsRef.current = [...new Set([...topicsRef.current, String(payloadObj.topic)])]
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
            // ignore malformed frame
          }
        }
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
      if (isFirst) {
        await streamGenerate({
          mode: 'feed',
          batchSize: count,
          target: 'feed',
        })
      } else {
        await streamGenerate({
          mode: 'world',
          batchSize: count,
          target: 'feed',
        })
      }
      batchRef.current += 1
    } catch (err) {
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

  useEffect(() => {
    if (!loadingData && signalData.signals && !readyRef.current) {
      readyRef.current = true
      void generateMore()
    }
  }, [generateMore, loadingData, signalData.signals])

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
