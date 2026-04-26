'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseAPIOptions {
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean
  /** Polling interval in ms (0 = no polling) */
  pollInterval?: number
  /** Retry count on failure */
  retries?: number
  /** Keep one-fetch-per-page-session behavior (default: true) */
  stickySession?: boolean
}

interface UseAPIReturn<T> {
  data: T | null
  error: string | null
  loading: boolean
  refetch: () => Promise<void>
}

export function useAPI<T>(
  fetcher: () => Promise<T>,
  options: UseAPIOptions = {}
): UseAPIReturn<T> {
  const { autoFetch = true, pollInterval = 0, retries = 2, stickySession = true } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(autoFetch)
  const mountedRef = useRef(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const doFetch = useCallback(async () => {
    if (!mountedRef.current) return
    setLoading(true)
    setError(null)

    let lastError: string = ''
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await fetcherRef.current()
        if (mountedRef.current) {
          setData(result)
          setError(null)
          setLoading(false)
        }
        return
      } catch (err) {
        lastError = err instanceof Error ? err.message : 'Unknown error'
        if (attempt < retries) {
          // Exponential backoff: 500ms, 1s, 2s...
          await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)))
        }
      }
    }

    if (mountedRef.current) {
      setError(lastError)
      setLoading(false)
    }
  }, [retries])

  useEffect(() => {
    mountedRef.current = true
    if (autoFetch) {
      doFetch()
    }

    let intervalId: ReturnType<typeof setInterval> | null = null
    if (!stickySession && pollInterval > 0) {
      intervalId = setInterval(doFetch, pollInterval)
    }

    return () => {
      mountedRef.current = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [autoFetch, pollInterval, stickySession, doFetch])

  return { data, error, loading, refetch: doFetch }
}
