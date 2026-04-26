'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface AIStreamingResponseProps {
  /** Full backend path, e.g. "/api/explorer/insights/fred_cpiaucsl" */
  endpoint: string
  prompt?: string
  data?: any
  className?: string
  title?: string
  onComplete?: (response: string) => void
}

const LOADING_STATES = [
  'ANALYZING...',
  'PROCESSING INTELLIGENCE...',
  'CROSS-REFERENCING SOURCES...',
  'DECRYPTING PATTERNS...',
  'COMPILING BRIEFING...'
]

export function AIStreamingResponse({
  endpoint,
  prompt,
  data,
  className,
  title,
  onComplete
}: AIStreamingResponseProps) {
  const [response, setResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low')
  const [loadingStateIndex, setLoadingStateIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [showGlitch, setShowGlitch] = useState(false)
  
  const abortRef = useRef<AbortController | null>(null)
  const typewriterRef = useRef<NodeJS.Timeout | null>(null)
  const fullResponseRef = useRef('')
  const endpointRef = useRef(endpoint)
  endpointRef.current = endpoint

  // Cycle through loading states
  useEffect(() => {
    if (!isStreaming) return

    const interval = setInterval(() => {
      setLoadingStateIndex(prev => (prev + 1) % LOADING_STATES.length)
    }, 1500)

    return () => clearInterval(interval)
  }, [isStreaming])

  // Typewriter effect — runs once streaming finishes and full response is available
  useEffect(() => {
    if (!response || isStreaming) return

    fullResponseRef.current = response
    setDisplayedText('')
    
    let currentIndex = 0
    const typeNextCharacter = () => {
      if (currentIndex < fullResponseRef.current.length) {
        setDisplayedText(prev => prev + fullResponseRef.current[currentIndex])
        currentIndex++
        
        // Add glitch effect for dramatic words
        const dramaticWords = ['CLASSIFIED', 'CRITICAL', 'THREAT', 'ALERT', 'WARNING']
        const currentWord = fullResponseRef.current.slice(Math.max(0, currentIndex - 20), currentIndex)
        if (dramaticWords.some(word => currentWord.includes(word))) {
          setShowGlitch(true)
          setTimeout(() => setShowGlitch(false), 100)
        }
        
        typewriterRef.current = setTimeout(typeNextCharacter, Math.random() * 50 + 20)
      } else {
        setIsComplete(true)
        onComplete?.(response)
      }
    }

    typewriterRef.current = setTimeout(typeNextCharacter, 100)

    return () => {
      if (typewriterRef.current) {
        clearTimeout(typewriterRef.current)
      }
    }
  }, [response, isStreaming, onComplete])

  /**
   * Use fetch() + ReadableStream instead of EventSource.
   * EventSource only supports GET with query-string params, but our backend
   * streams SSE over a plain GET to a path like /api/explorer/insights/{dataset_id}.
   * Using fetch gives us proper error handling and avoids CORS/reconnect quirks.
   */
  const startStream = useCallback(async () => {
    setIsStreaming(true)
    setError(null)
    setResponse('')
    setDisplayedText('')
    setIsComplete(false)
    setShowGlitch(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const url = `${API_BASE}${endpointRef.current}`
      const res = await fetch(url, { signal: controller.signal })

      if (!res.ok) {
        throw new Error(`API ${res.status}: ${res.statusText}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE lines (each line starts with "data: ")
        const lines = buffer.split('\n')
        // Keep the last potentially-incomplete line in the buffer
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          try {
            const payload = JSON.parse(trimmed.slice(6))

            if (payload.type === 'content' && payload.content) {
              accumulated += payload.content
              setResponse(accumulated)
            } else if (payload.type === 'done') {
              // Stream finished normally
            } else if (payload.type === 'error') {
              throw new Error(payload.error || 'AI analysis failed')
            } else if (payload.type === 'metadata') {
              setConfidence(payload.confidence || 0)
              setThreatLevel(payload.threatLevel || 'low')
            }
          } catch (parseErr: any) {
            // Ignore JSON parse errors on partial lines — they are expected
            if (parseErr.message && !parseErr.message.includes('JSON')) {
              throw parseErr
            }
          }
        }
      }

      // If we got no content at all, treat as error
      if (!accumulated) {
        throw new Error('No analysis content received from backend')
      }

      setIsStreaming(false)
    } catch (err: any) {
      if (err.name === 'AbortError') return // user cancelled
      setError(err.message || 'CONNECTION LOST')
      setIsStreaming(false)
    }
  }, [])

  const stopStream = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const retry = useCallback(() => {
    stopStream()
    setTimeout(startStream, 500)
  }, [stopStream, startStream])

  // Auto-start when endpoint / data changes
  useEffect(() => {
    startStream()
    return () => stopStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint])

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-400 animate-pulse'
      case 'high': return 'text-orange-400'
      case 'medium': return 'text-yellow-400'
      default: return 'text-green-400'
    }
  }

  return (
    <div className={cn(
      'relative bg-black/90 border border-green-500/30 rounded-lg p-6 font-mono',
      'shadow-lg shadow-green-500/20',
      showGlitch && 'animate-pulse',
      className
    )}>
      {/* CRT Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="h-full w-full bg-gradient-to-b from-transparent via-green-500/10 to-transparent bg-repeat animate-pulse" 
             style={{ backgroundSize: '100% 4px' }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 text-green-400">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-sm uppercase tracking-wider">
            {title || 'INTELLIGENCE ANALYSIS'}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span>CONFIDENCE:</span>
            <span className="text-green-300">{confidence}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span>THREAT LEVEL:</span>
            <span className={cn('font-bold uppercase', getThreatColor(threatLevel))}>
              {threatLevel}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[200px] relative">
        {isStreaming ? (
          <div className="flex items-center gap-3 text-green-400">
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
            <span className="animate-pulse">
              {LOADING_STATES[loadingStateIndex]}
            </span>
          </div>
        ) : error ? (
          <div className="text-red-400">
            <div className="mb-4">{error}</div>
            <button
              onClick={retry}
              className="px-4 py-2 border border-red-400/50 rounded hover:bg-red-400/10 transition-colors"
            >
              RETRY CONNECTION
            </button>
          </div>
        ) : (
          <div className={cn(
            'text-green-300 whitespace-pre-wrap leading-relaxed',
            showGlitch && 'animate-pulse filter blur-[1px]'
          )}>
            {displayedText}
            {!isComplete && (
              <span className="inline-block w-2 h-5 bg-green-400 ml-1 animate-pulse" />
            )}
          </div>
        )}
      </div>

      {/* Bottom Status */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-green-500/20 text-xs text-green-500/70">
        <div className="flex items-center gap-4">
          <span>STATUS: {isStreaming ? 'STREAMING' : isComplete ? 'COMPLETE' : 'STANDBY'}</span>
          <span>TIMESTAMP: {new Date().toISOString()}</span>
        </div>
        
        {isStreaming && (
          <button
            onClick={stopStream}
            className="px-2 py-1 border border-red-400/50 rounded text-red-400 hover:bg-red-400/10 transition-colors"
          >
            ABORT
          </button>
        )}
      </div>

      {/* Matrix rain effect during loading */}
      {isStreaming && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-20 bg-gradient-to-b from-green-400/0 via-green-400/30 to-green-400/0 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
