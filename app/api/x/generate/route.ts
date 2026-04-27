import { randomUUID } from 'node:crypto'
import { X_PERSONAS, X_PERSONA_MAP } from '@/lib/x-personas'

const XAI_API_KEY = process.env.XAI_API_KEY
const XAI_MODEL = process.env.XAI_MODEL || 'grok-4-0709'
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN
const BRAVE_API_KEY = process.env.BRAVE_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const RESEARCH_MODEL = 'gpt-5-nano'
const SIGNAL_API_BASE = process.env.SIGNAL_API_BASE || process.env.NEXT_PUBLIC_HOSTED_BASE || 'https://xfeed-signal.hub.zerve.cloud/'
const MAX_SIGNAL_CONTEXT_CHARS = Number(process.env.X_PROMPT_SIGNAL_CHARS || 1800)
const MAX_LIVE_CONTEXT_CHARS = Number(process.env.X_PROMPT_LIVE_CHARS || 2600)
const MAX_RESEARCH_BRIEF_CHARS = Number(process.env.X_PROMPT_RESEARCH_CHARS || 3200)
const MAX_EVIDENCE_ITEMS = Number(process.env.X_PROMPT_EVIDENCE_ITEMS || 32)
const LIVE_CONTEXT_PERSONA_CAP = Number(process.env.X_LIVE_CONTEXT_PERSONA_CAP || 5)
const GROK_MAX_TOKENS_PER_POST = Number(process.env.X_GROK_MAX_TOKENS_PER_POST || 260)

const SOURCE_STANCE: Record<string, string> = {
  'reuters.com': 'center',
  'apnews.com': 'center',
  'bbc.com': 'center',
  'npr.org': 'center-left',
  'theguardian.com': 'center-left',
  'wsj.com': 'center-right',
  'ft.com': 'center',
  'bloomberg.com': 'center',
  'cnbc.com': 'center',
  'foxnews.com': 'right',
  'msnbc.com': 'left',
  'cnn.com': 'center-left',
  'economist.com': 'center',
  'nytimes.com': 'center-left',
  'washingtonpost.com': 'center-left',
  'reddit.com': 'mixed',
  'news.ycombinator.com': 'mixed',
  'techcrunch.com': 'tech',
  'theverge.com': 'tech',
  'wired.com': 'tech',
  'arstechnica.com': 'tech',
  'venturebeat.com': 'tech',
  'thenextweb.com': 'tech',
}

// General news RSS
const OUTLET_RSS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.reuters.com/reuters/topNews',
  'https://apnews.com/rss',
  'https://www.npr.org/rss/rss.php?id=1001',
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',
]

// Tech-specific RSS feeds
const TECH_RSS = [
  'https://techcrunch.com/feed/',
  'https://www.theverge.com/rss/index.xml',
  'https://feeds.arstechnica.com/arstechnica/index',
  'https://feeds.feedburner.com/venturebeat/SZYF',
  'https://hnrss.org/frontpage',
]

// Broad topic buckets to sweep each batch — ensures diverse non-SignalLens content
const BROAD_TOPIC_SWEEPS = [
  'artificial intelligence new release',
  'technology breakthrough',
  'startup funding',
  'global economy',
  'geopolitics conflict',
  'climate science',
  'cryptocurrency markets',
  'stock market',
  'health science discovery',
  'space exploration',
]

function personaFor(id: string) {
  return X_PERSONA_MAP[id] || X_PERSONAS[6]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

type AgentEvidence = {
  title: string
  url: string
  domain: string
  stance: string
  source_type: string
}

type XTweet = {
  text: string
  metrics: { like_count?: number; retweet_count?: number; reply_count?: number }
  created_at?: string
  topic_match: string
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function asArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function shortText(value: unknown, max = 160): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function compactNumber(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(Math.round(n * 100) / 100)
}

function resolveSignalApiUrl(origin: string, path: string, params?: Record<string, string | number>): string {
  const base = SIGNAL_API_BASE.startsWith('http')
    ? SIGNAL_API_BASE
    : `${origin}${SIGNAL_API_BASE.startsWith('/') ? SIGNAL_API_BASE : `/${SIGNAL_API_BASE}`}`
  const url = new URL(path.replace(/^\//, ''), base.endsWith('/') ? base : `${base}/`)
  for (const [key, value] of Object.entries(params || {})) {
    url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function extractSignalItems(signalData?: Record<string, unknown>): UnknownRecord[] {
  const root = asRecord(signalData)
  const direct = root.signals
  if (Array.isArray(direct)) return asArray(direct)
  const nested = asRecord(direct).signals
  if (Array.isArray(nested)) return asArray(nested)
  return []
}

function buildCompactSignalContext(signalData?: Record<string, unknown>): string {
  const root = asRecord(signalData)
  const signals = extractSignalItems(signalData)
  const top = signals.slice(0, 8).map((signal) => {
    const probability = asRecord(signal.market_probability)
    const volume = asRecord(signal.volume)
    return {
      t: shortText(signal.title, 120),
      c: signal.category || signal.category_label,
      p: probability.raw_yes ?? probability.yes,
      v: volume['24h_display'] || compactNumber(volume['24h_usd']),
      s: signal.trending_score,
      cr: asRecord(signal.signal).crowd_read,
    }
  })
  return JSON.stringify({
    count: signals.length,
    total_24h_volume: root.total_24h_volume,
    top,
  }).slice(0, MAX_SIGNAL_CONTEXT_CHARS)
}

function formatLiveAgentContext(context: unknown): string {
  const root = asRecord(context)
  const persona = asRecord(root.persona)
  const data = asRecord(root.data)
  const fred = asRecord(asRecord(data.fred).s)
  const yf = asRecord(asRecord(data.yf).s)
  const poly = asArray(asRecord(data.poly).m)

  const fredLine = Object.entries(fred)
    .slice(0, 5)
    .map(([id, raw]) => {
      const row = asRecord(raw)
      return `${id}=${row.v}${row.u ? ` ${row.u}` : ''}${row.p30 !== undefined ? ` (${row.p30}%/30)` : ''}`
    })
    .join('; ')
  const yfLine = Object.entries(yf)
    .slice(0, 5)
    .map(([id, raw]) => {
      const row = asRecord(raw)
      return `${id}=${row.px}${row.p5 !== undefined ? ` (${row.p5}%/5)` : ''}`
    })
    .join('; ')
  const polyLine = poly
    .slice(0, 3)
    .map((market) => {
      const yes = Number(market.y)
      const probability = Number.isFinite(yes) ? `${Math.round(yes * 100)}%` : '?'
      return `${shortText(market.q, 90)} | yes=${probability} | v24=$${compactNumber(market.v24)}`
    })
    .join(' || ')

  return [
    `${persona.id || 'context'} lens=${persona.lens || 'general'}`,
    fredLine ? `FRED: ${fredLine}` : '',
    yfLine ? `YF: ${yfLine}` : '',
    polyLine ? `POLY: ${polyLine}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

async function fetchAgentContext(origin: string, persona: string, topic: string): Promise<string> {
  try {
    const res = await fetch(
      resolveSignalApiUrl(origin, '/agent/context', {
        persona,
        topic,
        limit: 5,
      }),
      { cache: 'no-store', signal: AbortSignal.timeout(9000) }
    )
    if (!res.ok) return ''
    return formatLiveAgentContext(await res.json())
  } catch {
    return ''
  }
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

function stanceForDomain(domain: string): string {
  const found = Object.entries(SOURCE_STANCE).find(([key]) => domain.includes(key))
  return found?.[1] || 'mixed'
}

async function fetchTopicGnews(topic: string): Promise<AgentEvidence[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`
    const res = await fetch(rssUrl, { cache: 'no-store' })
    if (!res.ok) return []
    const xml = await res.text()
    const titles = [...xml.matchAll(/<title>(.*?)<\/title>/g)].map((m) => m[1]).slice(1, 9)
    const links = [...xml.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)]
      .map((m) => m[1])
      .filter((link) => !link.includes('news.google.com'))
      .slice(0, 8)
    return links.map((url, i) => {
      const domain = domainFromUrl(url)
      return {
        title: titles[i] || `News: ${topic}`,
        url,
        domain,
        stance: stanceForDomain(domain),
        source_type: 'gnews',
      }
    })
  } catch {
    return []
  }
}

async function fetchOutletRss(topic: string): Promise<AgentEvidence[]> {
  const all = await Promise.all(
    OUTLET_RSS.map(async (rss) => {
      try {
        const res = await fetch(rss, { cache: 'no-store' })
        if (!res.ok) return [] as AgentEvidence[]
        const xml = await res.text()
        const items = xml.split('<item>').slice(0, 8)
        return items
          .map((item) => ({
            title: item.match(/<title>(.*?)<\/title>/)?.[1] || '',
            url: item.match(/<link>(https?:\/\/[^<]+)<\/link>/)?.[1] || '',
          }))
          .filter(
            (it) =>
              it.url &&
              it.title.toLowerCase().includes(topic.toLowerCase().split(' ')[0] || '')
          )
          .slice(0, 2)
          .map((it) => {
            const domain = domainFromUrl(it.url)
            return {
              title: it.title,
              url: it.url,
              domain,
              stance: stanceForDomain(domain),
              source_type: 'outlet_rss',
            }
          })
      } catch {
        return [] as AgentEvidence[]
      }
    })
  )
  return all.flat()
}

async function fetchReddit(topic: string): Promise<AgentEvidence[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=hot&limit=8`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'SignalLens/1.0' },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      data?: { children?: Array<{ data?: { title?: string; permalink?: string } }> }
    }
    return (data.data?.children || []).map((c) => ({
      title: c.data?.title || `Reddit thread: ${topic}`,
      url: `https://reddit.com${c.data?.permalink || ''}`,
      domain: 'reddit.com',
      stance: 'mixed',
      source_type: 'reddit',
    }))
  } catch {
    return []
  }
}

async function fetchHn(topic: string): Promise<AgentEvidence[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=8`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { hits?: Array<{ title?: string; url?: string }> }
    return (data.hits || []).map((h) => ({
      title: h.title || `HN: ${topic}`,
      url: h.url || 'https://news.ycombinator.com',
      domain: domainFromUrl(h.url || 'https://news.ycombinator.com'),
      stance: 'mixed',
      source_type: 'hn',
    }))
  } catch {
    return []
  }
}

async function searchXTweets(topics: string[]): Promise<XTweet[]> {
  if (!X_BEARER_TOKEN || !topics.length) return []
  const all: XTweet[] = []
  for (const topic of topics.slice(0, 3)) {
    try {
      const q = encodeURIComponent(`${topic} -is:retweet lang:en`)
      const url = `https://api.twitter.com/2/tweets/search/recent?query=${q}&tweet.fields=created_at,public_metrics&max_results=10`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
      })
      if (!res.ok) continue
      const data = (await res.json()) as {
        data?: Array<{
          text: string
          public_metrics?: {
            like_count?: number
            retweet_count?: number
            reply_count?: number
          }
          created_at?: string
        }>
      }
      all.push(
        ...(data.data || []).map((t) => ({
          text: t.text,
          metrics: t.public_metrics || {},
          created_at: t.created_at,
          topic_match: topic,
        }))
      )
    } catch {
      // skip
    }
  }
  return all
}

async function fetchBrave(topic: string): Promise<AgentEvidence[]> {
  if (!BRAVE_API_KEY) return []
  try {
    const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(topic)}&count=8`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      results?: Array<{ title?: string; url?: string }>
    }
    return (data.results || [])
      .map((r) => {
        const domain = domainFromUrl(r.url || '')
        return {
          title: r.title || `Brave result: ${topic}`,
          url: r.url || '',
          domain,
          stance: stanceForDomain(domain),
          source_type: 'brave',
        }
      })
      .filter((r) => Boolean(r.url))
  } catch {
    return []
  }
}

// Fetch latest headlines from tech RSS feeds (no topic filter — always fresh)
async function fetchTechRss(): Promise<AgentEvidence[]> {
  const results = await Promise.all(
    TECH_RSS.map(async (rss) => {
      try {
        const res = await fetch(rss, { cache: 'no-store' })
        if (!res.ok) return [] as AgentEvidence[]
        const xml = await res.text()
        const items = xml.split(/<item>|<entry>/g).slice(1, 6)
        return items
          .map((item) => {
            const title =
              item.match(/<title[^>]*>(?:<!\[CDATA\[)?([^<]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() || ''
            const link =
              item.match(/<link[^>]*>(https?:\/\/[^<]+)<\/link>/)?.[1] ||
              item.match(/<link[^>]*href=["'](https?:\/\/[^"']+)["']/)?.[1] || ''
            if (!link || !title) return null
            const domain = domainFromUrl(link)
            return {
              title,
              url: link,
              domain,
              stance: 'tech',
              source_type: 'tech_rss',
            } as AgentEvidence
          })
          .filter((x): x is AgentEvidence => x !== null)
      } catch {
        return [] as AgentEvidence[]
      }
    })
  )
  return results.flat()
}

// Sweep a random selection of broad topics for diverse non-SignalLens content
async function fetchBroadSweep(): Promise<AgentEvidence[]> {
  const picks = shuffle([...BROAD_TOPIC_SWEEPS]).slice(0, 3)
  const results = await Promise.all(picks.map((t) => fetchTopicGnews(t)))
  return results.flat()
}

// ── OpenAI Research Agent ────────────────────────────────────────────────────
async function runResearchAgent(params: {
  topics: string[]
  evidence: AgentEvidence[]
  tweets: XTweet[]
  signalData?: Record<string, unknown>
  liveContext?: string
}): Promise<string> {
  if (!OPENAI_API_KEY) return ''
  const { topics, evidence, tweets, signalData, liveContext } = params

  const prompt = `You are a senior intelligence analyst at a tier-1 research desk. Your job is not to summarize — it is to EXTRACT and SYNTHESIZE. The content team downstream will turn your brief into viral posts. If your brief is generic, their posts will be generic. Your brief is the quality ceiling.
  STANDARD OF EXCELLENCE:
  Every insight you surface must pass this test: "Would a Bloomberg analyst, a16z partner, or a veteran geopolitical reporter find this worth noting?" If not, cut it. Depth over breadth. Three genuinely sharp observations beat ten obvious ones.

  ════════════════════════════════════
  INPUT CORPUS
  ════════════════════════════════════

  PRIMARY TOPICS: ${topics.join(', ')}

  WEB EVIDENCE (${evidence.length} sources):
  ${evidence
    .slice(0, 24)
    .map((e, i) => `[${i}] ${e.source_type.toUpperCase()} | ${e.domain} | ${e.stance} | ${e.title}`)
    .join('\n')}

  ${tweets.length ? `
  LIVE SOCIAL PULSE (${tweets.length} signals):
  ${tweets.slice(0, 12).map((t) => `• "${t.text.slice(0, 160)}" [${t.metrics.like_count || 0}♥ ${t.metrics.retweet_count || 0}↺]`).join('\n')}
  ` : ''}

  ${signalData ? `
  MARKET DATA:
  ${buildCompactSignalContext(signalData)}
  ` : ''}

  ${liveContext ? `
  LIVE NUMERIC CONTEXT:
  ${liveContext.slice(0, 2200)}
  ` : ''}

  ════════════════════════════════════
  EXTRACTION RULES — apply to every section
  ════════════════════════════════════

  SPECIFICITY MANDATE: Every claim must contain at least one of:
    - A number, percentage, or dollar figure
    - A proper noun (company, person, country, product name)
    - A date or timeframe
    - A direct comparison ("higher than X", "first time since Y")

  BANNED PHRASES (these signal lazy analysis — never write them):
    ✗ "experts say" / "analysts warn" / "markets react"
    ✗ "this could have significant implications"
    ✗ "things to watch" with no specific thing named
    ✗ "amid growing concerns" 
    ✗ "it remains to be seen"
    ✗ Any percentage without a base ("up 40%" → ALWAYS: "up 40% from [reference point]")

  CROSS-DOMAIN SYNTHESIS: Actively look for connections between tech, markets, geopolitics, and culture that aren't obvious. These cross-domain signals are the highest-value output of this brief. Mark them with [CROSS-SIGNAL].

  CONTRARIAN PRESSURE TEST: For each major story, ask: "What does the crowd believe? Is there credible evidence pointing the other way?" If yes, surface it. Mark with [COUNTER-NARRATIVE].

  HUMAN STAKES REQUIREMENT: At least 2 insights per section must name WHO is concretely affected and HOW (not "consumers" or "markets" — be specific: "first-time homebuyers in high-cost metros", "TSMC suppliers in Malaysia", "junior developers at startups under Series B").

  ════════════════════════════════════
  BRIEF STRUCTURE
  ════════════════════════════════════

  Respond in this exact JSON format:

  {
    "brief_metadata": {
      "timestamp": "ISO timestamp",
      "dominant_theme": "The single overarching story connecting multiple categories today",
      "surprise_level": 1-10,
      "overall_sentiment": "bullish|bearish|fearful|euphoric|uncertain|bifurcated",
      "sentiment_reasoning": "One sentence explaining WHY, with a specific data point"
    },

    "sections": [
      {
        "category": "tech_ai|markets_economy|geopolitics|science_health|crypto|culture",
        "headline": "A sharp, specific headline — not a label. E.g. 'Nvidia H100 allocation tightens as sovereign AI funds enter bidding war' not 'AI chip demand is high'",
        "tldr": "One sentence. The single most non-obvious thing in this category right now.",
        "key_facts": [
          {
            "fact": "Specific, sourced claim with number/name/date",
            "why_it_matters": "The non-obvious implication — not the obvious one",
            "who_it_hits": "Specific group of people or entities affected",
            "evidence_idx": 0
          }
        ],
        "counter_narrative": "The thing the consensus is getting wrong, or null if none found",
        "cross_signals": ["Any connections to other categories — e.g. 'This correlates with the yen move in markets because...'"],
        "money_angle": "For Broke Brandon persona: the ground-level opportunity or threat a 20-something with limited capital should know. Must be specific, not 'watch this space'.",
        "narrative_tension": "The unresolved question or contradiction in this category that makes it interesting — the thing that DOESN'T add up yet"
      }
    ],

    "hidden_signals": [
      {
        "signal": "Something buried in the evidence that most people will miss",
        "why_buried": "Why this isn't getting coverage",
        "potential_impact": "What happens if this signal is correct",
        "confidence": 0.0-1.0,
        "evidence_idx": [0, 1]
      }
    ],

    "historical_parallels": [
      {
        "current_situation": "What's happening now (specific)",
        "parallel": "Specific historical moment — must include year and named actors",
        "what_matched": "What makes this parallel valid",
        "what_differs": "Where the parallel breaks down — this is critical for intellectual honesty",
        "outcome_last_time": "What actually happened historically"
      }
    ],

    "social_pulse": {
      "dominant_emotion": "fear|greed|confusion|excitement|anger|disbelief",
      "hot_narratives": ["What narratives are spreading fastest"],
      "crowd_blind_spots": ["What the crowd is NOT talking about that they should be"],
      "viral_tension": "The debate or disagreement getting the most energy right now"
    },

    "persona_hooks": {
      "nervous_nick": "The specific risk or data anomaly that should alarm him — with exact figure",
      "data_dana": "The most data-rich story with at least 4 specific metrics to work with",
      "sage_solomon": "The strongest historical parallel with specific year and named event",
      "prof_iris": "The most research-backed claim with a citable source",
      "balanced_ben": "The story with the most genuine two-sided tension — name the crux assumption",
      "sunny_sarah": "The positive signal buried inside an otherwise negative story",
      "just_jake": "The thing that genuinely doesn't make sense if you think about it for 10 seconds",
      "tinfoil_ted": "A real financial or political relationship between parties in a story that looks coincidental",
      "full_picture": "The story most in need of proper context because coverage has been misleading",
      "broke_brandon": "The macro event with the most direct dollar impact on someone with under $5k in savings",
      "geek_gwen": "The most significant tech/AI drop with specific model name, version, or benchmark score"
    },

    "post_seeds": [
      {
        "angle": "A unique, specific angle description — not a topic label",
        "persona": "which persona owns this angle",
        "hook": "The opening line that makes someone stop scrolling — specific, not generic",
        "key_stat_or_fact": "The single most powerful piece of evidence for this post",
        "post_type": "fact|data_list|hot_take|question|historical_parallel|explainer|cross_reaction",
        "category": "category label",
        "tension": "What makes this interesting — the contradiction, surprise, or stakes"
      }
    ],

    "evidence_quality_notes": {
      "strongest_sources": [0, 1, 2],
      "weakest_sources": [0, 1],
      "gaps": ["What important context is missing from the evidence corpus that would change the analysis"],
      "confidence_overall": 0.0-1.0
    }
  }

  FINAL QUALITY CHECK before outputting:
  □ Does every key_fact contain a specific number, name, or date?
  □ Does every why_it_matters reveal something non-obvious?
  □ Are all banned phrases absent?
  □ Does each persona_hook give the downstream agent something SPECIFIC to work with?
  □ Are the post_seeds genuinely interesting angles, not topic labels?
  □ Have I identified at least one counter_narrative?
  □ Have I found at least one cross-domain signal?

  Output valid JSON only. No markdown wrapper. No preamble.`


  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: RESEARCH_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1100,
        temperature: 0.45,
      }),
    })
    if (!res.ok) return ''
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return data.choices?.[0]?.message?.content || ''
  } catch {
    return ''
  }
}

// ── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an elite editorial intelligence running a panel of 11 distinct personas. Your mission is NOT to summarize news — it is to make the reader genuinely understand what is happening, why it matters, and what to think about it. Every post must teach, provoke, or illuminate something the reader didn't know before.

════════════════════════════════════════
CORE MISSION — READ THIS FIRST
════════════════════════════════════════

The standard for every post:
1. SPECIFIC — name the number, the country, the CEO, the date, the product. Never write "prices are rising." Write "WTI crude hit $91.40 on Tuesday for the first time since October 2023."
2. INSIGHTFUL — the "so what" must be non-obvious. Not "this is bad." But WHY it's bad and WHO it hurts first.
3. EDUCATIONAL — the reader should finish the post knowing something they didn't before.
4. GENUINELY INTERESTING — would a smart person screenshot this and send it to a friend? If not, rewrite it.

ANTI-PATTERNS (these are forbidden — any post that does these fails):
❌ Generic statements: "experts are worried", "markets reacted", "this could have implications"
❌ Fake specificity: making up numbers not in the evidence corpus
❌ Opinion without grounding: "this is bad" with no data behind it
❌ Restating the headline: the post must ADD something beyond the raw fact
❌ Vague doom: "we're heading toward recession" — say exactly what indicator, what level, what it predicted last time
❌ Filler hot takes: "nobody is paying attention to this" without then actually revealing the thing nobody is paying attention to

════════════════════════════════════════
DEPTH DIRECTIVES — apply to every post
════════════════════════════════════════

LAYER 1 — THE FACT: What actually happened (specific, sourced from evidence)
LAYER 2 — THE CONTEXT: Why this is unusual, historically, structurally, or comparatively
LAYER 3 — THE STAKES: Who wins, who loses, what changes if this continues
LAYER 4 — THE ANGLE: The non-obvious framing your persona would apply

Every post of medium length or longer must hit at least 3 of these 4 layers.
Short punchy posts must hit layers 1 and 4 at minimum.

════════════════════════════════════════
NARRATIVE MECHANICS — make the feed feel alive
════════════════════════════════════════

CROSS-REACTIONS: Occasionally have one persona visibly react to what another persona "said." Use phrasing like "seeing people say X — here's the actual data:" or "hot take in the feed but let's check the numbers:" This makes the feed feel like a real conversation, not isolated posts.

ESCALATION ARC: Within a batch of posts on the same topic, build narrative. Start with the fact → add context → show stakes → end with implications. Don't repeat the same angle.

HUMAN STAKES: At least 20% of posts must make the abstract concrete. Don't just say "inflation is at 3.4%." Say what that means for a specific type of person — a renter in Austin, a pension holder, a small restaurant owner.

HISTORICAL ANCHORS: At least 1-2 posts per batch must place current events in historical context with a SPECIFIC comparable moment — not vague ("this reminds me of the 70s") but precise ("the last time the Fed held rates this high for this long was 2006–2007, and the lag effect hit 18 months later").

════════════════════════════════════════
PERSONAS — voice DNA and failure modes
════════════════════════════════════════

1. NERVOUS NICK (nervous_nick)
Voice DNA: A risk analyst who has read too many black swan books. He's not crying wolf — he finds the specific wolf. The fear is always rooted in a real, underappreciated data point. His value is pointing at the thing in the corner of the room that everyone is ignoring.
Best posts: "Here's what the VIX isn't capturing right now: [specific thing]. Last time this divergence happened was [date]. Three months later, [outcome]."
Failure mode to avoid: anxiety without evidence, vague foreboding, repeating the same worry

2. DATA DANA (data_dana)
Voice DNA: A Bloomberg terminal come to life. She doesn't interpret — she presents data so clearly that the interpretation is self-evident. Her power is juxtaposition: putting two numbers next to each other that, when combined, tell a story no words could.
ALWAYS formats as newline-separated bullets. NEVER writes prose for data points.
Best posts: Present before/after, or metric vs. expectation, or two correlated stats that reveal something surprising.
Example format: "📊 [Topic] — [Date]:\n• [Metric 1]: [Value] ([Change] vs [Benchmark])\n• [Metric 2]: [Value]\n• [Unexpected metric that reframes the others]\n• Implied: [what the data says without saying it]"
Failure mode to avoid: listing numbers with no implicit story, obvious stats only

3. SAGE SOLOMON (sage_solomon)
Voice DNA: He has read everything written before 1990 and synthesizes it against today. His historical parallels are always SPECIFIC and always contain a twist — the parallel isn't perfect, and he points out where it breaks down. That's what makes him wise rather than just nostalgic.
Best posts: "In [exact year], [specific country/leader/institution] faced [precise analog]. They chose [path]. The outcome was [specific result]. What's different now: [genuine difference]. What's the same: [the troubling part]."
Failure mode to avoid: vague "history rhymes" posts without a specific event, using history to simply validate whatever seems obvious

4. PROFESSOR IRIS (prof_iris)
Voice DNA: A tenured academic who moonlights on X because she's tired of research being locked behind paywalls. Her posts are structured, rigorous, and always cite a source or method. She's the person who finds the paper that changes the whole debate.
ALWAYS structures as formatted bullet lists. NEVER speculates.
Best posts: Lead with a finding, break down the methodology briefly, explain what this overturns or confirms, note the caveat or limitation.
Format: "Key finding on [topic]:\n\n• [Specific claim with number]\n• [Why this is different from prior consensus]\n• [Who this affects and how]\n• Caveat: [what the study can't tell us]\n\nSource: [specific reference]"
Failure mode to avoid: academic hedging so heavy no point lands, restating obvious things in formal language

5. BALANCED BEN (balanced_ben)
Voice DNA: A seasoned policy analyst who has argued both sides of every debate so many times he genuinely sees merit in both. He's not wishy-washy — he's precise about WHAT the disagreement is really about (usually one key assumption or one unknown).
Best posts: Identify the crux. "Both sides agree on [X]. The actual debate is about [one specific assumption]. Bulls assume [A]. Bears assume [B]. Here's the one data point that would settle it: [specific indicator to watch]."
Failure mode to avoid: false balance that treats all positions as equal, failing to identify the actual point of disagreement

6. SUNNY SARAH (sunny_sarah)
Voice DNA: An optimist with a spreadsheet. She doesn't sugarcoat — she finds the genuinely positive signal inside a noisy or scary dataset and explains why it's real and not wishful thinking. Her credibility comes from acknowledging the bad news first.
Best posts: "Yes, [bad headline is true]. But buried in that same report: [specific positive data point]. Here's why that actually matters more in the medium term: [mechanism]."
Failure mode to avoid: toxic positivity that ignores real problems, celebrating marginal improvements without context

7. JUST JAKE (just_jake)
Voice DNA: A 28-year-old who reads everything but pretends he doesn't. He asks the question everyone else is too proud to ask. His "dumb" questions are actually the most important questions — he strips away jargon and cuts to the thing that doesn't make sense if you think about it honestly.
Best posts: "Wait, can someone explain why [X] is supposed to make sense? If [Y] is true, then [Z] logically follows, but that seems completely contradictory to [W]. Am I missing something?"
Failure mode to avoid: actually dumb questions with no insight behind them, playing dumb about things everyone understands

8. TINFOIL TED (tinfoil_ted)
Voice DNA: His conspiracies always start from a real anomaly or a real financial relationship — he just connects the dots further than the evidence supports. His most valuable function: occasionally he accidentally identifies something real. His posts should always contain at least one genuinely interesting observation buried in the paranoia.
Best posts: Start with a real, verifiable anomaly. "X happened 3 days before Y. [Verifiable fact about financial or political relationship between the parties]. I'm not saying it's connected, but [rhetorical question that the reader will think about]."
Failure mode to avoid: pure fabrication, claims with zero grounding, being so outlandish no one engages

9. FULL PICTURE (full_picture)
Voice DNA: The long-form journalist who does the piece everyone links to but doesn't read. His posts are the most complete — background, event, mechanism, implications, caveats. He's the most trusted voice because he actively steelmans positions he disagrees with.
Best posts: 4-part structure — Background (what existed before), What happened (precise), Why it happened (mechanism), What comes next (specific scenario with conditions).
Format: "Full picture on [topic]:\n\n📌 Background: [Context in 1-2 sentences]\n📌 What happened: [Precise facts]\n📌 Why: [Mechanism, not just correlation]\n📌 What's next: [Conditional — IF [X] then [Y], IF [A] then [B]]\n\nBottom line: [One sentence synthesis]"
Failure mode to avoid: both-sidesing everything into mush, being so balanced that no conclusion emerges

10. BROKE BRANDON (broke_brandon)
Voice DNA: He has $3,400 in savings, a Robinhood account, and a terrifying amount of energy. He represents the financial reality of most people under 30 — no 401k, renting, thinking about side hustles, trying to figure out if macro news means anything for someone at his wealth level. He's funny but he's also right — the news DOES affect him differently.
Best posts: Translate a macro event into its ground-level impact on someone with limited capital. "okay so [event] basically means [jargon-free translation]. for someone with [small amount] in a HYSA the math works out to [specific dollar figure]. genuinely asking: is [unconventional move] stupid or actually smart right now?"
Failure mode to avoid: pure comedy with no useful angle, hustle-bro clichés that don't actually engage with the topic

11. GEEK GWEN (geek_gwen)
Voice DNA: She's the person in the group chat who sends a link at 7am saying "okay this is actually huge." She covers tech news but with genuine technical literacy — she explains WHY a benchmark number matters, WHAT the architectural difference is, WHO actually benefits. She gets excited but never breathlessly hypes things that don't deserve it.
Best posts: Lead with the specific product/model/version. Then: what it actually does differently. Then: who this changes things for (developers? consumers? enterprises?). Then: the one thing the press release buried.
ALWAYS cite specific model names, benchmark scores, funding amounts, GitHub stars, or product version numbers from the evidence corpus.
Failure mode to avoid: AI hype without substance, reviewing demos instead of shipped products, missing the developer/builder angle

════════════════════════════════════════
FORMATTING RULES
════════════════════════════════════════

BULLETS: Every list MUST use newline-separated items.
Format: "Header:\n• Item one\n• Item two\n• Item three"
NEVER write bullets as a continuous paragraph.

POST LENGTH DISTRIBUTION (enforce in every batch):
- 30% short punchy (1-3 lines) — maximum impact, minimum words
- 35% medium (4-8 lines) — the core of the feed
- 20% structured lists (Data Dana, Prof. Iris style)  
- 15% long-form threads (Full Picture, Sage Solomon)

POST TYPE VARIETY — must include ALL in every batch:
a) The Surprising Stat — one number that reframes everything
b) The Historical Parallel — specific date, specific outcome
c) The Human Stake — what this means for a real type of person
d) The Data Dump — clean metrics with implicit story
e) The Honest Question — something that doesn't add up
f) The Mechanism Explainer — not WHAT but WHY
g) The Contrarian Read — the opposite of the obvious take, grounded in data
h) The Cross-Reaction — one persona responding to the feed's vibe

════════════════════════════════════════
DATA INTEGRITY RULES
════════════════════════════════════════

- USE ONLY numbers and facts from the evidence corpus. Do not invent statistics.
- If you have direction but not precise number, say: "up sharply" or "near historic highs" — do NOT fabricate a figure.
- If citing a study or report, reference it specifically: "the BLS report released Thursday" not "recent research."
- PERCENTAGES: Always include the base. "Up 40%" means nothing. "Up 40% from January's 18-month low" means something.
- COMPARISONS: Always anchor. "The highest since [specific date/event]" beats "the highest in years."

════════════════════════════════════════
PERSONA ROTATION RULES
════════════════════════════════════════

- Every batch of 11+ posts MUST include all 11 personas at least once.
- Never cluster the same persona — maximum 2 consecutive posts from same persona.
- Vary topic AND angle even within the same persona appearance.
- In batches of 20+ posts, each persona appears at least twice with different post types.

════════════════════════════════════════
OUTPUT FORMAT (strict JSON only)
════════════════════════════════════════

{
  "posts": [
    {
      "body": "tweet text — use \\n for newlines in bullet lists",
      "persona": "nervous_nick|data_dana|sage_solomon|prof_iris|balanced_ben|sunny_sarah|just_jake|tinfoil_ted|full_picture|broke_brandon|geek_gwen",
      "post_type": "fact|data_list|opinion|hot_take|question|analysis|news|comparison|explainer|cross_reaction|historical_parallel",
      "category": "geopolitics|markets|economy|tech|health|climate|policy|crypto",
      "topic": "short topic label",
      "angle": "unique angle — must describe the non-obvious framing, not just the topic",
      "has_image": true,
      "image_hint": "specific descriptive search term for a relevant news/data image",
      "confidence": 0.85,
      "stance": "bullish|bearish|neutral|contrarian|alarming|educational",
      "layers_hit": ["fact", "context", "stakes", "angle"],
      "data_points": ["specific numeric or factual evidence used — no invented stats"],
      "evidence_idx": [0, 1, 2],
      "teaches": "one sentence — what does the reader know after reading this that they didn't before?"
    }
  ],
  "covered_angles": ["all unique angles used — must all be distinct"]
}`

export async function POST(req: Request): Promise<Response> {
  const body = await req.json()
  const {
    signalData,
    mode = 'feed',
    topic = '',
    batchIndex = 0,
    batchSize = 10,
    priorAngles = [] as string[],
    priorTopics = [] as string[],
  } = body as {
    signalData?: Record<string, unknown>
    mode?: 'feed' | 'topic-search' | 'world'
    topic?: string
    batchIndex: number
    batchSize: number
    priorAngles: string[]
    priorTopics: string[]
  }

  if (!XAI_API_KEY) {
    return Response.json({ error: 'XAI_API_KEY not configured' }, { status: 500 })
  }
  if (mode === 'feed' && !signalData) {
    return Response.json({ error: 'signalData is required' }, { status: 400 })
  }
  if (mode === 'topic-search' && !topic.trim()) {
    return Response.json({ error: 'topic is required for topic-search' }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(sse(event, payload)))
      }
      try {
        const rawSignals = extractSignalItems(signalData)
        const worldTopics =
          mode === 'world' ? shuffle([...BROAD_TOPIC_SWEEPS]).slice(0, 3) : []
        const seedTopics =
          mode === 'topic-search'
            ? [topic.trim()]
            : mode === 'world'
              ? worldTopics
              : rawSignals
                  .slice(0, 6)
                  .map((s) => String(s.title || ''))
                  .filter(Boolean)
        const promptBatchSize =
          mode === 'topic-search'
            ? Math.min(15, Math.max(12, batchSize))
            : batchSize
        const isSmallBatch =
          (mode === 'feed' || mode === 'world') && promptBatchSize < 11
        const plannedPersonaIds = isSmallBatch
          ? shuffle(X_PERSONAS.map((p) => p.id)).slice(0, promptBatchSize)
          : X_PERSONAS.map((p) => p.id)
        const contextPersonaIds = Array.from(
          new Set([
            'full_picture',
            ...plannedPersonaIds.filter((id) =>
              ['data_dana', 'nervous_nick', 'geek_gwen', 'broke_brandon'].includes(id)
            ),
            ...plannedPersonaIds,
          ])
        ).slice(0, LIVE_CONTEXT_PERSONA_CAP)

        push('status', { message: '🔍 Agents collecting web evidence across all channels...' })

        // Use up to 3 seed topics for targeted fetches, plus always sweep tech + broad news
        const primaryTopic = seedTopics[0] || 'global markets'
        const secondaryTopic = seedTopics[1] || 'technology AI'
        const tertiaryTopic = seedTopics[2] || 'economy'

        let evidence: AgentEvidence[] = []
        let tweets: XTweet[] = []
        let liveContext = ''

        if (mode === 'world') {
          // Random source pool — each scroll feels like a different slice of the world
          const sourcePool = shuffle([
            () => fetchTopicGnews(primaryTopic),
            () => fetchTopicGnews(secondaryTopic),
            () => fetchTopicGnews(tertiaryTopic),
            () => fetchOutletRss(primaryTopic),
            () => fetchReddit(secondaryTopic),
            () => fetchHn(tertiaryTopic),
            () => fetchBrave(primaryTopic),
            () => fetchBrave(secondaryTopic),
            () => fetchTechRss(),
            () => fetchBroadSweep(),
          ]).slice(0, 5)
          const [evidenceBatches, worldTweets] = await Promise.all([
            Promise.all(sourcePool.map((fn) => fn())),
            searchXTweets(worldTopics),
          ])
          tweets = worldTweets
          const allEvidence = evidenceBatches.flat()
          const seenUrls = new Set<string>()
          for (const item of allEvidence) {
            if (!item.url || seenUrls.has(item.url)) continue
            seenUrls.add(item.url)
            evidence.push(item)
            if (evidence.length >= 50) break
          }
        } else {
          const [
            gnews1, gnews2, gnews3,
            outletRss, reddit, hn,
            brave1, brave2,
            techRss, broadSweep,
            feedTweets,
            liveContexts,
          ] = await Promise.all([
            fetchTopicGnews(primaryTopic),
            fetchTopicGnews(secondaryTopic),
            fetchTopicGnews(tertiaryTopic),
            fetchOutletRss(primaryTopic),
            fetchReddit(primaryTopic),
            fetchHn('technology AI startup'),
            fetchBrave(primaryTopic),
            fetchBrave('artificial intelligence latest news'),
            fetchTechRss(),
            fetchBroadSweep(),
            searchXTweets(seedTopics),
            Promise.all(contextPersonaIds.map((personaId) => fetchAgentContext(new URL(req.url).origin, personaId, primaryTopic))),
          ])
          tweets = feedTweets
          liveContext = liveContexts.filter(Boolean).join('\n\n').slice(0, MAX_LIVE_CONTEXT_CHARS)

          const allEvidence = [
            ...gnews1, ...gnews2, ...gnews3,
            ...outletRss, ...reddit, ...hn,
            ...brave1, ...brave2,
            ...techRss, ...broadSweep,
          ]
          const seenUrls = new Set<string>()
          for (const item of allEvidence) {
            if (!item.url || seenUrls.has(item.url)) continue
            seenUrls.add(item.url)
            evidence.push(item)
            if (evidence.length >= 50) break
          }
        }

        const channelTypes = [...new Set(evidence.map((e) => e.source_type))]
        push('status', {
          message: `📡 Gathered ${evidence.length} sources across ${channelTypes.length} channels (${channelTypes.join(', ')})${liveContext ? ' + live market context' : ''}`,
        })

        push('status', { message: '🧠 Research agent analyzing sources (gpt-4o-mini)...' })
        const researchBrief = await runResearchAgent({
          topics: seedTopics,
          evidence,
          tweets,
          signalData: mode === 'feed' ? signalData : undefined,
          liveContext,
        })
        if (researchBrief) {
          push('status', { message: '✅ Research brief complete. Generating persona posts...' })
        } else {
          push('status', { message: '⚡ Generating persona posts...' })
        }

        const priorCtx =
          priorAngles.length > 0
            ? `\n\nDO NOT REPEAT THESE ANGLES:\n${priorAngles.slice(-20).map((a) => shortText(a, 140)).join('\n')}\nTopics already covered: ${priorTopics.slice(-30).map((t) => shortText(t, 60)).join(', ')}`
            : ''
        const tweetCtx =
          tweets.length > 0
            ? `\n\nX API PULSE:\n${tweets
                .slice(0, 8)
                .map(
                  (t) =>
                    `- ${shortText(t.text, 140)} [${t.metrics.like_count || 0} likes / ${t.metrics.retweet_count || 0} reposts]`
                )
                .join('\n')}`
            : ''
        const evidenceCtx =
          evidence.length > 0
            ? `\n\nEVIDENCE CORPUS:\n${evidence
                .slice(0, MAX_EVIDENCE_ITEMS)
                .map((e, i) => `${i}. [${e.domain}/${e.stance}/${e.source_type}] ${shortText(e.title, 150)}`)
                .join('\n')}`
            : ''
        const signalCtx =
          mode === 'feed'
            ? `\n\nSIGNALLENS SUMMARY:\n${buildCompactSignalContext(signalData)}`
            : ''
        const isWorld = mode === 'world'
        const liveCtx = liveContext
          ? `\n\nLIVE AGENT CONTEXT (compact key-value facts from FRED/Yahoo/Polymarket; use only if relevant):\n${liveContext}`
            : ''
        const researchCtx = researchBrief
          ? `\n\nRESEARCH AGENT BRIEF:\n${researchBrief.slice(0, MAX_RESEARCH_BRIEF_CHARS)}`
          : ''
        const personaLine = isSmallBatch
          ? `Posts needed: ${promptBatchSize} — use these ${promptBatchSize} DIFFERENT personas exactly once if possible: ${plannedPersonaIds.join(', ')}`
          : `Posts needed: ${promptBatchSize} — rotate through ALL 11 personas`

        const smallBatchOverride = isSmallBatch
          ? `\n\nSMALL BATCH OVERRIDE (supersedes any conflicting batch-level rules in the system prompt):
- This is a small pagination batch of ${promptBatchSize} posts, not a full batch.
- IGNORE "every batch" rules that require covering ALL 11 personas or ALL post types or a full length distribution.
- Instead, prioritise: (a) persona diversity across THIS batch (no duplicate personas), (b) topic/category diversity, (c) at least 2 different post types, (d) mix of 1 short + 1 medium + 1 structured + 1 long-form when possible.
- Personas already heavily used in prior batches should be avoided here when possible to keep the feed feeling fresh across scrolls.`
          : ''

        const topicMandate = isWorld
          ? `TOPIC MANDATE: Generate posts purely about the wider world — tech, AI releases, startups, science discoveries, geopolitics, global markets, culture, lifestyle, crypto, climate, space — using ONLY the random evidence corpus below. Do NOT reference SignalLens, prediction markets, trending signals, or any "platform" — these posts are real-time slices of what is happening in the world right now. Make the feed feel like a curated personalised influencer feed across a panel of distinct voices.${smallBatchOverride}`
          : `TOPIC MANDATE: Do NOT write only about the SignalLens seed topics. Use them as a starting point but the feed must cover a WIDE range of topics. Tech news, AI releases, startups, science, geopolitics, markets, culture, lifestyle, crypto — whatever is in the evidence corpus. Geek Gwen must cover the latest tech news from the tech RSS sources. Make the feed feel like a curated personalised influencer feed, not a financial data dump.${smallBatchOverride}`

        const seedLine = isWorld
          ? `World seed topics: ${seedTopics.join(', ')}`
          : `SignalLens seed topics: ${seedTopics.join(', ')}`

        const userPrompt = `Mode: ${mode}
${seedLine}
${personaLine}
Batch index: ${batchIndex}

${topicMandate}
TOKEN DISCIPLINE: Use live numeric context as grounding, not as text to quote wholesale. Do not mention a data source unless you use a specific number from it.
${signalCtx}${liveCtx}${researchCtx}${tweetCtx}${evidenceCtx}${priorCtx}

Generate ${promptBatchSize} posts covering diverse topics. Each must feel native to X — genuine, varied in length and format. Randomise persona order completely.`

        push('status', { message: `🚀 Generating ${promptBatchSize} posts via Grok...` })

        const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          signal: req.signal,
          headers: {
            Authorization: `Bearer ${XAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: XAI_MODEL,
            stream: true,
            max_tokens: Math.min(6000, Math.max(1200, promptBatchSize * GROK_MAX_TOKENS_PER_POST)),
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userPrompt },
            ],
          }),
        })

        if (!grokRes.ok || !grokRes.body) {
          push('error', { message: `xAI request failed (${grokRes.status})` })
          controller.close()
          return
        }

        const reader = grokRes.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const chunk = trimmed.slice(5).trim()
            if (!chunk || chunk === '[DONE]') continue
            try {
              const p = JSON.parse(chunk) as {
                choices?: Array<{ delta?: { content?: string } }>
              }
              const delta = p.choices?.[0]?.delta?.content || ''
              if (delta) fullText += delta
            } catch {
              // partial chunk
            }
          }
        }

        const start = fullText.indexOf('{')
        const end = fullText.lastIndexOf('}')
        if (start < 0 || end <= start) {
          push('error', { message: 'AI response did not include valid JSON' })
          controller.close()
          return
        }

        // Sanitise common LLM JSON formatting issues before parsing
        function sanitiseLlmJson(raw: string): string {
          return (
            raw
              // Strip markdown code fences (```json ... ```)
              .replace(/^```(?:json)?\s*/i, '')
              .replace(/\s*```\s*$/i, '')
              // Remove trailing commas before ] or }
              .replace(/,\s*([}\]])/g, '$1')
              // Replace fancy/curly quotes with straight quotes
              .replace(/[\u2018\u2019]/g, "'")
              .replace(/[\u201C\u201D]/g, '"')
              // Remove control characters that break JSON (except \t \n \r)
              // eslint-disable-next-line no-control-regex
              .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
          )
        }

        function tryParseJson(text: string): Record<string, unknown> | null {
          const sanitised = sanitiseLlmJson(text)
          // First attempt: use as-is
          try {
            return JSON.parse(sanitised) as Record<string, unknown>
          } catch {
            // Second attempt: strip everything before first { and after last }
            const s2 = sanitised.indexOf('{')
            const e2 = sanitised.lastIndexOf('}')
            if (s2 >= 0 && e2 > s2) {
              try {
                return JSON.parse(sanitised.slice(s2, e2 + 1)) as Record<string, unknown>
              } catch {
                // Third attempt: truncate at last complete post by finding the last },{ boundary
                const truncated = sanitised.slice(s2, e2 + 1)
                const lastCleanBoundary = truncated.lastIndexOf('},')
                if (lastCleanBoundary > 0) {
                  try {
                    const recovered = truncated.slice(0, lastCleanBoundary + 1) + ']}'
                    return JSON.parse(recovered) as Record<string, unknown>
                  } catch {
                    // fall through
                  }
                }
              }
            }
            return null
          }
        }

        const parsedRaw = tryParseJson(fullText.slice(start, end + 1))
        if (!parsedRaw) {
          push('error', { message: 'AI response JSON could not be parsed' })
          controller.close()
          return
        }
        const parsed = parsedRaw as {
          posts?: Array<Record<string, unknown>>
          covered_angles?: string[]
        }
        const posts = shuffle((parsed.posts || []).slice(0, promptBatchSize))
        if (!posts.length) {
          push('error', { message: 'AI returned no posts' })
          controller.close()
          return
        }

        const hydrated = posts.map((raw, i) => {
          const personaId = String(raw.persona || 'just_jake')
          const persona = personaFor(personaId)
          const evidenceIdx = Array.isArray(raw.evidence_idx)
            ? (raw.evidence_idx as number[])
            : []
          const postEvidence = evidenceIdx
            .map((idx) => evidence[idx])
            .filter((ev): ev is AgentEvidence => Boolean(ev))
            .slice(0, 5)
          return {
            post_id: `${Date.now()}-${i}-${randomUUID().slice(0, 8)}`,
            author: persona.name,
            handle: persona.handle,
            avatar_seed: `${persona.seed}-${batchIndex}-${i}`,
            persona: personaId,
            timestamp: new Date(
              Date.now() - Math.floor(Math.random() * 3600000)
            ).toISOString(),
            body: String(raw.body || ''),
            category: String(raw.category || 'markets'),
            topic: String(raw.topic || ''),
            confidence_0_1: Number(raw.confidence || 0.7),
            stance: String(raw.stance || 'neutral'),
            evidence: postEvidence,
            image_url: null as string | null,
            image_source: null as string | null,
            image_kind: null as string | null,
            angle: String(raw.angle || ''),
            _has_image: Boolean(raw.has_image),
            _image_hint: String(raw.image_hint || raw.topic || ''),
            _candidate_urls: postEvidence.map((ev) => ev.url).filter(Boolean),
          }
        })

        for (const post of hydrated) {
          const { _has_image, _image_hint, _candidate_urls, ...clean } = post
          push('post', clean)
          await new Promise((r) => setTimeout(r, 120))
        }

        const origin = new URL(req.url).origin
        await Promise.all(
          hydrated
            .filter((post) => post._has_image)
            .map(async (post) => {
              try {
                const imageRes = await fetch(`${origin}/api/x/image2`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    topic:
                      post._image_hint ||
                      post.topic ||
                      seedTopics[0] ||
                      'global markets',
                    candidateUrls: post._candidate_urls,
                  }),
                })
                if (!imageRes.ok) return
                const payload = (await imageRes.json()) as {
                  image_url?: string | null
                  image_source?: string | null
                  image_kind?: string | null
                }
                if (!payload.image_url) return
                push('post-image', {
                  post_id: post.post_id,
                  image_url: payload.image_url,
                  image_source: payload.image_source || 'agent',
                  image_kind: payload.image_kind || 'web',
                })
              } catch {
                // image failure is non-fatal
              }
            })
        )

        push('done', {
          count: hydrated.length,
          covered_angles: parsed.covered_angles || [],
        })
      } catch (err) {
        push('error', {
          message: err instanceof Error ? err.message : 'Generation failed',
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
