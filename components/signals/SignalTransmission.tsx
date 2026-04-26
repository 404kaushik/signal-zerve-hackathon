'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { streamSignalTransmission } from '@/lib/api'
import { cn } from '@/lib/utils'
import { TypewriterLine } from './TypewriterLine'

function splitWatchLine(text: string): { body: string; watch: string | null } {
  const lines = text.split('\n')
  const watchLine = lines.find((line) => line.trim().startsWith('WATCH -> '))
  if (!watchLine) return { body: text, watch: null }
  const body = lines.filter((line) => line !== watchLine).join('\n').trim()
  return { body, watch: watchLine.replace('WATCH -> ', '').trim() }
}

export function SignalTransmission({
  signalId,
  sourceLabel,
  signalLabel,
  className,
}: {
  signalId?: string
  sourceLabel?: string
  signalLabel?: string
  className?: string
}) {
  const [content, setContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setContent('')
    setError(null)
    setIsStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    void streamSignalTransmission({
      signalId,
      signal: controller.signal,
      onChunk: (chunk) => setContent((prev) => prev + chunk),
      onDone: () => setIsStreaming(false),
      onError: (message) => {
        setError(message || 'GROK_UNAVAILABLE')
        setIsStreaming(false)
      },
    }).catch(() => {
      setError('GROK_UNAVAILABLE')
      setIsStreaming(false)
    })

    return () => controller.abort()
  }, [signalId, retryCount])

  const parsed = useMemo(() => splitWatchLine(content), [content])

  return (
    <div className={cn('border border-[#1a1a1a] bg-[#0a0a0a] font-mono', className)}>
      <div className="border-b border-[#1a1a1a] p-3 text-[11px] text-[#888] tracking-[0.12em]">
        ▸ TRANSMISSION · [{sourceLabel || 'SYSTEM'}] · {signalLabel || 'TOP FEED'}
      </div>
      <div className="p-4 min-h-[320px]">
        {error ? (
          <div className="space-y-3">
            <div className="text-[12px] text-[#888]">▪ TRANSMISSION OFFLINE · {error}</div>
            <button
              onClick={() => {
                abortRef.current?.abort()
                setContent('')
                setError(null)
                setIsStreaming(true)
                setRetryCount((prev) => prev + 1)
              }}
              className="border border-[#1a1a1a] px-3 py-1 text-[11px] text-[#888] hover:bg-[#111111]"
            >
              [ RETRY ]
            </button>
          </div>
        ) : (
          <div className="text-[12px] text-[#e8e8e8] whitespace-pre-wrap leading-6">
            {parsed.body || (isStreaming ? 'Loading transmission...' : '')}
            {isStreaming && <span className="animate-pulse text-[#888]"> ▊</span>}
          </div>
        )}
      </div>
      <div className="border-t border-[#1a1a1a] p-3 text-[11px] text-[#888]">
        WATCH -&gt;{' '}
        {parsed.watch ? <TypewriterLine text={parsed.watch} className="text-[#e8e8e8]" /> : <span className="text-[#555]">waiting...</span>}
      </div>
    </div>
  )
}
