import { NextResponse } from 'next/server'

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'

function buildPrompt(title: string, category: string) {
  return [
    'You are a sharp market operator writing for curious builders.',
    `Market: ${title}`,
    `Category: ${category || 'unknown'}`,
    '',
    'Use only current web information and real-world reporting.',
    'Do not use hypothetical placeholder examples.',
    'Do not use fallback or synthetic data.',
    'Write in plain, concrete language. Avoid buzzwords and analyst jargon.',
    'If a technical term is unavoidable, add a 3-6 word explanation in parentheses.',
    'Return exactly these sections in this order:',
    '### PAST SIGNALS',
    '### WHAT TO EXPECT',
    '### FUTURE OUTLOOK',
    '',
    'Format rules:',
    '- 4 bullets per section, each bullet max 22 words.',
    '- Start each section with a hook bullet in this format: -> <surprising or high-stakes fact>.',
    '- Include specific dates, percentages, and named actors when available.',
    '- Prefer cause -> effect framing so readers learn quickly.',
    '- Do not include citations like [1] or URLs.',
  ].join('\n')
}

export async function POST(request: Request) {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'PERPLEXITY_API_KEY is missing' }, { status: 500 })
  }

  let body: { title?: string; category?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const title = body.title?.trim()
  const category = body.category?.trim() || 'general'
  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const upstream = await fetch(PERPLEXITY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: 'sonar',
      stream: true,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: 'You deliver high-signal market intelligence in a compact format.',
        },
        {
          role: 'user',
          content: buildPrompt(title, category),
        },
      ],
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '')
    return NextResponse.json(
      { error: `Perplexity request failed (${upstream.status})`, details: text.slice(0, 500) },
      { status: 502 }
    )
  }

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          controller.enqueue(value)
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      } finally {
        reader.releaseLock()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
