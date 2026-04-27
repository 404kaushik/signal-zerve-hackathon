import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'
const SIGNAL_BASE = 'https://signal-lens.hub.zerve.cloud'

type TodayBriefResponse = {
  asOf: string
  lead: string
  lines: string[]
}

type SignalContext = {
  date?: string | null
  risingCount: number
  hottestLabel?: string | null
  topRising: string[]
  topMarkets: string[]
  sentimentHeadline?: string | null
}

function cleanLine(line: string): string {
  return line
    .replace(/^\s*[-*•]+\s*/, '')
    .replace(/\[(\d+)\]/g, '')
    .trim()
}

function parseLines(text: string): string[] {
  const rows = text
    .split('\n')
    .map((s) => cleanLine(s))
    .filter(Boolean)
    .filter((s) => !/^Till the exact moment/i.test(s))

  const uniq: string[] = []
  for (const row of rows) {
    if (!uniq.includes(row)) uniq.push(row)
    if (uniq.length >= 8) break
  }
  return uniq
}

function fallback(context?: SignalContext): TodayBriefResponse {
  const asOfDate = new Date()
  const time = asOfDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const date = asOfDate.toLocaleDateString([], { month: 'long', day: 'numeric' })
  const lines: string[] = []

  if (context) {
    lines.push(`Signal feed tracks ${context.risingCount} rising market signals so far today.`)
    if (context.hottestLabel) {
      lines.push(`Hottest category in live market flow: ${context.hottestLabel}.`)
    }
    if (context.topRising[0]) {
      lines.push(`Top rising signal currently: ${context.topRising[0]}.`)
    }
    if (context.topMarkets[0]) {
      lines.push(`Highest-volume active market feed includes: ${context.topMarkets[0]}.`)
    }
    if (context.sentimentHeadline) {
      lines.push(context.sentimentHeadline)
    }
  }

  if (!lines.length) {
    lines.push('Live signal context is updating; market and geopolitics digests are syncing now.')
  }

  return {
    asOf: asOfDate.toISOString(),
    lead: `Till the exact moment of ${time} on ${date}, this has happened:`,
    lines: lines.slice(0, 6),
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

async function getSignalContext(): Promise<SignalContext | null> {
  const [trending, top, sentiment] = await Promise.all([
    fetchJson<{
      date?: string | null
      summary?: { rising_count?: number | null; hottest_label?: string | null } | null
      rising?: Array<{ title?: string | null }>
    }>(`${SIGNAL_BASE}/trending/daily`),
    fetchJson<{ signals?: Array<{ title?: string | null }> }>(`${SIGNAL_BASE}/top`),
    fetchJson<{ headline?: string | null }>(`${SIGNAL_BASE}/sentiment`),
  ])

  if (!trending && !top && !sentiment) return null

  return {
    date: trending?.date ?? null,
    risingCount: Number(trending?.summary?.rising_count ?? 0),
    hottestLabel: trending?.summary?.hottest_label ?? null,
    topRising: (trending?.rising || [])
      .map((r) => (r.title || '').trim())
      .filter(Boolean)
      .slice(0, 3),
    topMarkets: (top?.signals || [])
      .map((s) => (s.title || '').trim())
      .filter(Boolean)
      .slice(0, 3),
    sentimentHeadline: (sentiment?.headline || '').trim() || null,
  }
}

export async function GET(): Promise<Response> {
  const context = await getSignalContext()
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    return NextResponse.json(fallback(context || undefined))
  }

  const now = new Date()
  const dateText = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const timeText = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  const prompt = [
    `Today is ${dateText}. Current local time is ${timeText}.`,
    `Signal context snapshot: ${JSON.stringify(context || {}, null, 0)}`,
    'Using current web information, produce exactly 6 one-line updates on the most important events so far today.',
    'Ground your output in the provided Signal context when available, and expand with corroborating world context.',
    'Cover geopolitics, macro/markets, tech/ai, and one consumer-facing item if relevant.',
    'Each line must be max 18 words, concrete, and factual.',
    'No preamble, no numbering, no markdown headings, no citations, no URLs.',
    'Output only bullet lines starting with "- ".',
  ].join('\n')

  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: 'You are a concise live news desk. Prioritize factual, current updates.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(12000),
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(fallback(context || undefined))
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const raw = payload.choices?.[0]?.message?.content || ''
    const lines = parseLines(raw)
    const fb = fallback(context || undefined)
    return NextResponse.json({
      asOf: new Date().toISOString(),
      lead: fb.lead,
      lines: lines.length ? lines : fb.lines,
    } satisfies TodayBriefResponse)
  } catch {
    return NextResponse.json(fallback(context || undefined))
  }
}

