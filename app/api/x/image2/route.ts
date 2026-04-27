export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

type ImageCandidate = {
  image_url: string
  source: string
  reason: string
  score: number
}

type BraveImageResult = {
  title?: string
  url?: string
  source?: string
  confidence?: 'high' | 'medium' | 'low' | string
  thumbnail?: { src?: string; width?: number; height?: number }
  properties?: { url?: string; placeholder?: string; width?: number; height?: number }
}

type BraveImageResponse = {
  type?: string
  results?: BraveImageResult[]
}

const BRAVE_API_KEY = process.env.BRAVE_API_KEY

const BLOCKED_HOSTS = ['wikipedia.org', 'wikimedia.org', 'wikidata.org', 'upload.wikimedia.org']

const CACHE_MAX = 256
const CACHE_TTL_MS = 30 * 60 * 1000

type CacheEntry = { value: ResponsePayload; expiresAt: number }
type ResponsePayload = {
  topic: string
  image_url: string
  image_source: string
  image_kind: 'web' | 'fallback'
  reason: string
  candidates: ImageCandidate[]
}

const cache: Map<string, CacheEntry> = (globalThis as unknown as { __image2Cache?: Map<string, CacheEntry> }).__image2Cache ?? new Map()
;(globalThis as unknown as { __image2Cache?: Map<string, CacheEntry> }).__image2Cache = cache

function cacheGet(key: string): ResponsePayload | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    cache.delete(key)
    return null
  }
  cache.delete(key)
  cache.set(key, hit)
  return hit.value
}

function cacheSet(key: string, value: ResponsePayload): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest === undefined) break
    cache.delete(oldest)
  }
}

function isBlocked(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase()
    return BLOCKED_HOSTS.some((d) => host.includes(d))
  } catch {
    return false
  }
}

function confidenceScore(c?: string): number {
  switch ((c || '').toLowerCase()) {
    case 'high':
      return 0.9
    case 'medium':
      return 0.7
    case 'low':
      return 0.5
    default:
      return 0.6
  }
}

function fallbackImage(topic: string): ImageCandidate {
  const seed = encodeURIComponent(topic.toLowerCase().replace(/\s+/g, '-').slice(0, 60) || 'signal')
  return {
    image_url: `https://picsum.photos/seed/${seed}/1024/640`,
    source: 'fallback',
    reason: 'Deterministic placeholder when Brave Images returned nothing',
    score: 0.05,
  }
}

async function fetchBraveImages(topic: string): Promise<ImageCandidate[]> {
  if (!BRAVE_API_KEY) return []
  const url = `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(topic)}&count=10&safesearch=strict&spellcheck=1&country=us&search_lang=en`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': BRAVE_API_KEY },
      signal: AbortSignal.timeout(4500),
      cache: 'no-store',
    })
  } catch {
    return []
  }
  if (!res.ok) return []
  let data: BraveImageResponse
  try {
    data = (await res.json()) as BraveImageResponse
  } catch {
    return []
  }
  const results = data.results || []
  return results
    .map((r, idx) => {
      const image = r.thumbnail?.src || r.properties?.url
      if (!image || !image.startsWith('http')) return null
      if (isBlocked(image)) return null
      const positionBonus = Math.max(0, (10 - idx) * 0.005)
      return {
        image_url: image,
        source: 'brave_images',
        reason: r.title
          ? `Brave Images result: ${r.title}${r.source ? ` (${r.source})` : ''}`
          : 'Brave Images search result',
        score: confidenceScore(r.confidence) + positionBonus,
      } satisfies ImageCandidate
    })
    .filter((v): v is ImageCandidate => Boolean(v))
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as {
    topic?: string
    candidateUrls?: string[]
  }
  const cleanTopic = (body.topic || '').trim()
  if (!cleanTopic) {
    return Response.json({ error: 'topic is required' }, { status: 400 })
  }

  const cacheKey = cleanTopic.toLowerCase()
  const cached = cacheGet(cacheKey)
  if (cached) {
    return Response.json(cached)
  }

  console.log('[image2] topic:', cleanTopic)
  console.log('[image2] has BRAVE_API_KEY:', !!BRAVE_API_KEY)

  const candidates = await fetchBraveImages(cleanTopic)
  console.log('[image2] brave candidates:', candidates.length)

  const deduped = new Map<string, ImageCandidate>()
  for (const item of candidates) {
    if (!deduped.has(item.image_url)) deduped.set(item.image_url, item)
  }
  const ranked = [...deduped.values()].sort((a, b) => b.score - a.score)

  let payload: ResponsePayload
  if (ranked.length) {
    const top = ranked[0]
    payload = {
      topic: cleanTopic,
      image_url: top.image_url,
      image_source: top.source,
      image_kind: 'web',
      reason: top.reason,
      candidates: ranked.slice(0, 8),
    }
  } else {
    const fb = fallbackImage(cleanTopic)
    payload = {
      topic: cleanTopic,
      image_url: fb.image_url,
      image_source: fb.source,
      image_kind: 'fallback',
      reason: fb.reason,
      candidates: [fb],
    }
  }

  cacheSet(cacheKey, payload)
  return Response.json(payload)
}
