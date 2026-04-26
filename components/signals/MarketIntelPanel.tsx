'use client'

import { Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TypewriterLine } from '@/components/signals/TypewriterLine'
import type { HostedSignal } from '@/lib/api'
import { cn } from '@/lib/utils'

type IntelSections = {
  past: string
  expect: string
  future: string
}

const HEADER_PAST = '### PAST SIGNALS'
const HEADER_EXPECT = '### WHAT TO EXPECT'
const HEADER_FUTURE = '### FUTURE OUTLOOK'

function parseSections(raw: string): IntelSections {
  const pastIdx = raw.indexOf(HEADER_PAST)
  const expectIdx = raw.indexOf(HEADER_EXPECT)
  const futureIdx = raw.indexOf(HEADER_FUTURE)

  if (pastIdx === -1) {
    return { past: '', expect: '', future: '' }
  }

  const startPast = pastIdx + HEADER_PAST.length
  const startExpect = expectIdx === -1 ? raw.length : expectIdx
  const startFuture = futureIdx === -1 ? raw.length : futureIdx

  const past = raw.slice(startPast, startExpect).trim()
  const expect =
    expectIdx === -1
      ? ''
      : raw.slice(expectIdx + HEADER_EXPECT.length, startFuture).trim()
  const future =
    futureIdx === -1
      ? ''
      : raw.slice(futureIdx + HEADER_FUTURE.length).trim()

  return { past, expect, future }
}

function extractContentFromPayload(payload: string): string {
  if (!payload || payload === '[DONE]') return ''
  try {
    const parsed = JSON.parse(payload)
    const choice = parsed?.choices?.[0]
    const delta = choice?.delta?.content
    if (typeof delta === 'string') return delta
    if (Array.isArray(delta)) {
      return delta
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
    }
    const message = choice?.message?.content
    if (typeof message === 'string') return message
    if (Array.isArray(message)) {
      return message
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join('')
    }
    return ''
  } catch {
    return ''
  }
}

function extractSseContent(eventBlock: string): string {
  const lines = eventBlock.split('\n')
  let out = ''
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue
    const payload = line.slice(6).trim()
    out += extractContentFromPayload(payload)
  }
  return out
}

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`strong-${idx}`} className="font-semibold text-[#f0f0f0]">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <Fragment key={`text-${idx}`}>{part}</Fragment>
  })
}

function normalizeForDisplay(text: string): string {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function renderBody(text: string, isStreaming?: boolean) {
  const normalized = normalizeForDisplay(text)
  const lines = normalized.split('\n')
  const blocks: Array<{ type: 'bullet' | 'paragraph'; text: string }> = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^[-*]\s+/.test(line)) {
      blocks.push({ type: 'bullet', text: line.replace(/^[-*]\s+/, '').trim() })
      continue
    }

    if (blocks.length > 0) {
      const last = blocks[blocks.length - 1]
      last.text = `${last.text} ${line}`.trim()
    } else {
      blocks.push({ type: 'paragraph', text: line })
    }
  }

  return (
    <div className="space-y-2.5">
      {blocks.map((block, idx) =>
        block.type === 'bullet' ? (
          <div key={`bullet-${idx}`} className="flex items-start gap-2 text-[12px] leading-6 text-[#cfe4d4]">
            <span className="mt-[2px] text-[#6bbd8b]">{idx === 0 ? '>' : '-'}</span>
            <span className={idx === 0 ? 'text-[#e7f7ec]' : ''}>{renderInline(block.text)}</span>
          </div>
        ) : (
          <p key={`paragraph-${idx}`} className="text-[12px] leading-6 text-[#cfe4d4]">
            {renderInline(block.text)}
          </p>
        )
      )}
      {isStreaming && <span className="animate-pulse text-[#6bbd8b]">▊</span>}
    </div>
  )
}

function IntelSection({ title, body, isStreaming }: { title: string; body: string; isStreaming?: boolean }) {
  if (!body && !isStreaming) return null

  return (
    <section className="border border-[#163326] bg-[#070b08] p-4 space-y-3">
      <div className="inline-flex items-center border border-[#214634] bg-[#0a120d] px-2 py-1 text-[10px] tracking-[0.16em] text-[#71c892]">
        <TypewriterLine text={title} speedMin={15} speedMax={25} />
      </div>
      {renderBody(body, isStreaming)}
    </section>
  )
}

export function MarketIntelPanel({
  market,
  className,
  fetchNonce = 0,
}: {
  market: HostedSignal | null
  className?: string
  fetchNonce?: number
}) {
  const [rawText, setRawText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)
  const sseBufferRef = useRef('')

  const runFetch = useCallback(async () => {
    if (!market?.title) return

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setRawText('')
    setError(null)
    setBusy(true)
    sseBufferRef.current = ''

    try {
      const response = await fetch('/api/perplexity/market-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: market.title,
          category: market.category || 'general',
        }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        throw new Error('INTEL_STREAM_FAILED')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        sseBufferRef.current += decoder.decode(value, { stream: true })

        const blocks = sseBufferRef.current.split('\n\n')
        sseBufferRef.current = blocks.pop() || ''

        let nextText = ''
        for (const block of blocks) {
          nextText += extractSseContent(block)
        }

        if (nextText) setRawText((prev) => prev + nextText)
      }

      // Flush any final event that may not end with double newline.
      const finalBlock = sseBufferRef.current.trim()
      if (finalBlock) {
        const finalText = extractSseContent(finalBlock)
        if (finalText) setRawText((prev) => prev + finalText)
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError('TRANSMISSION FAILED')
      }
    } finally {
      setBusy(false)
    }
  }, [market])

  useEffect(() => {
    if (!market || fetchNonce <= 0) return
    void runFetch()
    return () => controllerRef.current?.abort()
  }, [runFetch, retryCount, market, fetchNonce])

  const parsed = useMemo(() => parseSections(rawText), [rawText])
  const hasSections = Boolean(parsed.past || parsed.expect || parsed.future)

  return (
    <div className={cn('h-full border border-[#163326] bg-[#050805] p-0 transition-opacity duration-300 font-mono flex min-h-0 flex-col overflow-hidden', className)}>
      <div className="border-b border-[#163326] px-3 py-2 text-[10px] tracking-[0.12em] text-[#63ad80]">
        {`> intel_stream --market "${market?.title || 'none'}"`}
      </div>

      {!market ? (
        <div className="flex-1 overflow-y-auto p-4 text-[11px] text-[#4e7d61]">select a market to start transmission</div>
      ) : error ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] text-[#d18d8d]">! {error}</div>
          <button
            onClick={() => setRetryCount((v) => v + 1)}
            className="border border-[#214634] bg-[#0a120d] px-3 py-1 text-[11px] text-[#cfe4d4] hover:bg-[#0f1b14]"
          >
            [ RETRY ]
          </button>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-3 pr-2 space-y-3">
          {!hasSections && rawText && (
            <section className="border border-[#163326] bg-[#070b08] p-4 space-y-3">
              <div className="inline-flex items-center border border-[#214634] bg-[#0a120d] px-2 py-1 text-[10px] tracking-[0.16em] text-[#71c892]">
                <TypewriterLine text="LIVE MARKET INTEL" speedMin={15} speedMax={25} />
              </div>
              {renderBody(rawText, busy)}
            </section>
          )}
          <IntelSection title="PAST SIGNALS" body={parsed.past} isStreaming={busy && !parsed.expect && !parsed.future} />
          <IntelSection title="WHAT TO EXPECT" body={parsed.expect} isStreaming={busy && !!parsed.expect && !parsed.future} />
          <IntelSection title="FUTURE OUTLOOK" body={parsed.future} isStreaming={busy && !!parsed.future} />
          {busy && !rawText && (
            <div className="text-[11px] text-[#4e7d61]">
              pulling live signal flow<span className="animate-pulse text-[#6bbd8b]"> ▊</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
