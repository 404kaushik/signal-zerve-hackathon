import { X_PERSONA_MAP, X_PERSONAS } from '@/lib/x-personas'
import { getPersonaVoice } from '@/lib/x-persona-prompts'

const XAI_API_KEY = process.env.XAI_API_KEY
const XAI_MODEL = process.env.XAI_MODEL || 'grok-4-1-fast-reasoning'
const SIGNAL_API_BASE = process.env.SIGNAL_API_BASE || process.env.NEXT_PUBLIC_HOSTED_BASE || 'https://xfeed-signal.hub.zerve.cloud/'
const CHAT_HISTORY_LIMIT = Number(process.env.X_CHAT_HISTORY_LIMIT || 6)
const CHAT_MAX_TOKENS = Number(process.env.X_CHAT_MAX_TOKENS || 420)
const CHAT_LIVE_CONTEXT_CHARS = Number(process.env.X_CHAT_LIVE_CONTEXT_CHARS || 1400)
const MAX_PRIOR_POSTS = Number(process.env.X_CHAT_MAX_PRIOR_POSTS || 8)

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type PostContext = {
  author?: string
  handle?: string
  body?: string
  topic?: string
  category?: string
  stance?: string
  angle?: string
  confidence_0_1?: number
  evidence?: Array<{ title?: string; url?: string; domain?: string }>
}

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {}
}

function asArray(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function shortText(value: unknown, max = 140): string {
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
      return `${shortText(market.q, 80)} | yes=${probability} | v24=$${compactNumber(market.v24)}`
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
    .slice(0, CHAT_LIVE_CONTEXT_CHARS)
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

function sse(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`
}

function formatPriorPost(p: PostContext, i: number): string {
  const head = `[${i + 1}] ${p.topic || p.category || 'post'}${p.stance ? ` · ${p.stance}` : ''}${p.confidence_0_1 !== undefined ? ` · conv ${Math.round(p.confidence_0_1 * 100)}%` : ''}`
  const body = (p.body || '').replace(/\s+/g, ' ').trim().slice(0, 240)
  const ev = (p.evidence || [])
    .slice(0, 2)
    .map((e) => `${e.domain || ''}${e.title ? ` — ${e.title}` : ''}`)
    .filter(Boolean)
    .join(' | ')
  return `${head}\n"""${body}"""${ev ? `\nrefs: ${ev}` : ''}`
}

function buildSystemPrompt(
  personaId: string,
  post?: PostContext,
  priorPosts: PostContext[] = [],
  liveContext = ''
): string {
  const persona = X_PERSONA_MAP[personaId] || X_PERSONAS[6]
  const voice = getPersonaVoice(personaId)

  const allPosts: PostContext[] = []
  if (post) allPosts.push(post)
  for (const p of priorPosts) {
    if (!p?.body) continue
    if (allPosts.some((existing) => existing.body === p.body)) continue
    allPosts.push(p)
  }

  const postBlock = allPosts.length
    ? `

YOUR POSTS THIS SESSION (these are the only posts you actually made — never deny one of these, never hallucinate posts that aren't here):

${allPosts.map(formatPriorPost).join('\n\n')}

If the user references "your tweet about X" or "what you posted about Y", scan this list and stay grounded in what you actually said — quote or paraphrase YOUR OWN words, do not contradict your own post. If they ask about something that genuinely is not in this list, say plainly that it is not something you have posted about today and answer in-character from your voice DNA below — never invent post content you did not write.`
    : `

The user opened your DMs. They want to learn what you're tracking and how you think. You have not posted anything yet this session — speak from your voice DNA below, do not invent past posts.`

  return `You ARE ${persona.name}, posting on X as ${persona.handle}.

VOICE DNA:
${voice}

${postBlock}

${liveContext ? `LIVE CONTEXT — compact current FRED/Yahoo/Polymarket data for your persona:\n${liveContext}\n` : ''}

CHAT RULES (you are texting the user in an iMessage-style DM):
- Stay 100% in character. NEVER break the fourth wall, never mention you are an AI, an assistant, or Grok.
- Keep replies SHORT and conversational by default — 1 to 3 sentences. Match the energy of a real text. Use longer replies (4-8 lines) only when the user asks for depth or a breakdown.
- Use newline-separated bullets when listing data points (Data Dana, Prof. Iris, Full Picture style).
- When you reference a number, name, date, or source, be specific — never invent figures, but you may reference the post's evidence list.
- Use LIVE CONTEXT only when it directly helps answer the user. Do not dump raw data; translate the relevant number into your persona's voice.
- Casual personas (Just Jake, Broke Brandon, Tinfoil Ted) can use lowercase and abbreviations naturally.
- Never use hashtags or @mentions in DM replies — this is a private chat.
- If the user asks something outside your wheelhouse, deflect IN CHARACTER (e.g. Nervous Nick: "not my lane but here's why I'd still worry about X...").
- Refer to your earlier post naturally ("yeah so the thing I posted...", "the divergence I flagged..."), don't restate it verbatim.

Output plain text only. No JSON, no markdown headers, no preamble.`
}

export async function POST(req: Request): Promise<Response> {
  if (!XAI_API_KEY) {
    return Response.json({ error: 'XAI_API_KEY not configured' }, { status: 500 })
  }

  let body: {
    personaId?: string
    post?: PostContext
    priorPosts?: PostContext[]
    history?: ChatMessage[]
    message?: string
  }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const personaId = body.personaId || 'just_jake'
  const message = (body.message || '').trim()
  const history = Array.isArray(body.history) ? body.history.slice(-CHAT_HISTORY_LIMIT) : []
  const priorPosts = Array.isArray(body.priorPosts)
    ? body.priorPosts.slice(-MAX_PRIOR_POSTS)
    : []

  if (!message) {
    return Response.json({ error: 'message is required' }, { status: 400 })
  }

  const liveContext = await fetchAgentContext(
    new URL(req.url).origin,
    personaId,
    body.post?.topic || body.post?.category || message
  )
  const systemPrompt = buildSystemPrompt(personaId, body.post, priorPosts, liveContext)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({
      role: m.role,
      content: String(m.content || ''),
    })),
    { role: 'user', content: message },
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(sse(event, payload)))
      }

      try {
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
            temperature: 0.85,
            max_tokens: CHAT_MAX_TOKENS,
            messages,
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
              const parsed = JSON.parse(chunk) as {
                choices?: Array<{ delta?: { content?: string } }>
              }
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) push('delta', { text: delta })
            } catch {
              // ignore partial chunks
            }
          }
        }

        push('done', {})
      } catch (err) {
        push('error', {
          message: err instanceof Error ? err.message : 'Chat failed',
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
