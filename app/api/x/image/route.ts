type ImageCandidate = {
  image_url: string
  source: string
  reason: string
  score: number
}

const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN
const BRAVE_API_KEY = process.env.BRAVE_API_KEY

const OUTLET_RSS = [
  'https://feeds.bbci.co.uk/news/rss.xml',
  'https://feeds.reuters.com/reuters/topNews',
  'https://apnews.com/rss',
  'https://www.npr.org/rss/rss.php?id=1001',
  'https://www.cnbc.com/id/100003114/device/rss/rss.html',
]

function textIncludesTopic(text: string, topic: string): boolean {
  const t = topic.toLowerCase().trim()
  if (!t) return false
  const words = t.split(/\s+/).filter(Boolean)
  const normalized = text.toLowerCase()
  const hitCount = words.filter((w) => normalized.includes(w)).length
  return hitCount >= Math.max(1, Math.floor(words.length / 2))
}

function pickOgImage(html: string): string | null {
  const metas = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]*property=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  ]
  for (const re of metas) {
    const match = html.match(re)
    if (match?.[1]?.startsWith('http')) return match[1]
  }
  return null
}

async function fetchOgImage(url: string, source: string): Promise<ImageCandidate | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const html = await res.text()
    const image = pickOgImage(html)
    if (!image) return null
    return {
      image_url: image,
      source,
      reason: 'Resolved OG image from article metadata',
      score: 0.75,
    }
  } catch {
    return null
  }
}

async function fromGoogleNews(topic: string): Promise<ImageCandidate[]> {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`
    const res = await fetch(rssUrl, { cache: 'no-store' })
    if (!res.ok) return []
    const xml = await res.text()
    const linkMatches = [...xml.matchAll(/<link>(https?:\/\/[^<]+)<\/link>/g)].map((m) => m[1])
    const links = linkMatches.filter((l) => !l.includes('news.google.com')).slice(0, 4)
    const out = await Promise.all(links.map((url) => fetchOgImage(url, 'gnews')))
    return out.filter((v): v is ImageCandidate => Boolean(v)).map((v) => ({ ...v, score: v.score + 0.08 }))
  } catch {
    return []
  }
}

async function fromOutletRss(topic: string): Promise<ImageCandidate[]> {
  const results = await Promise.all(
    OUTLET_RSS.map(async (rss) => {
      try {
        const res = await fetch(rss, { cache: 'no-store' })
        if (!res.ok) return [] as ImageCandidate[]
        const xml = await res.text()
        const items = xml.split('<item>').slice(0, 8)
        const matches = items
          .map((item) => {
            const title = item.match(/<title>(.*?)<\/title>/)?.[1] || ''
            const link = item.match(/<link>(https?:\/\/[^<]+)<\/link>/)?.[1] || ''
            return { title, link }
          })
          .filter((x) => x.link && textIncludesTopic(x.title, topic))
          .slice(0, 2)
        const images = await Promise.all(matches.map((m) => fetchOgImage(m.link, 'outlet_rss')))
        return images
          .filter((v): v is ImageCandidate => Boolean(v))
          .map((v) => ({ ...v, reason: `Matched in outlet RSS for topic "${topic}"`, score: v.score + 0.1 }))
      } catch {
        return [] as ImageCandidate[]
      }
    })
  )
  return results.flat()
}

async function fromReddit(topic: string): Promise<ImageCandidate[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=hot&limit=12`
    const res = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': 'SignalLens/1.0' } })
    if (!res.ok) return []
    const data = (await res.json()) as {
      data?: {
        children?: Array<{
          data?: {
            thumbnail?: string
            preview?: {
              images?: Array<{
                source?: { url?: string }
              }>
            }
          }
        }>
      }
    }
    return (data.data?.children || [])
      .map((c) => {
        const thumb = c.data?.thumbnail
        const preview = c.data?.preview?.images?.[0]?.source?.url?.replaceAll('&amp;', '&')
        const image = preview || thumb
        if (!image || !image.startsWith('http')) return null
        return {
          image_url: image,
          source: 'reddit',
          reason: 'Relevant Reddit discussion media',
          score: 0.55,
        }
      })
      .filter((v): v is ImageCandidate => Boolean(v))
      .slice(0, 3)
  } catch {
    return []
  }
}

async function fromHn(topic: string): Promise<ImageCandidate[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=10`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { hits?: Array<{ url?: string }> }
    const links = (data.hits || []).map((h) => h.url).filter((u): u is string => Boolean(u)).slice(0, 3)
    const out = await Promise.all(links.map((link) => fetchOgImage(link, 'hn')))
    return out.filter((v): v is ImageCandidate => Boolean(v)).map((v) => ({ ...v, score: v.score + 0.03 }))
  } catch {
    return []
  }
}

async function fromBrave(topic: string): Promise<ImageCandidate[]> {
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
      results?: Array<{ thumbnail?: { src?: string }; title?: string }>
    }
    return (data.results || [])
      .map((r) => {
        const img = r.thumbnail?.src
        if (!img) return null
        return {
          image_url: img,
          source: 'brave_news',
          reason: r.title ? `Brave thumbnail for: ${r.title}` : 'Brave news thumbnail',
          score: 0.78,
        }
      })
      .filter((v): v is ImageCandidate => Boolean(v))
      .slice(0, 4)
  } catch {
    return []
  }
}

async function fromXApi(topic: string): Promise<ImageCandidate[]> {
  if (!X_BEARER_TOKEN) return []
  try {
    const q = encodeURIComponent(`${topic} has:images -is:retweet lang:en`)
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${q}&max_results=10&expansions=attachments.media_keys&media.fields=type,url,preview_image_url`
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      includes?: { media?: Array<{ type?: string; url?: string; preview_image_url?: string }> }
    }
    return (data.includes?.media || [])
      .map((m) => m.url || m.preview_image_url)
      .filter((u): u is string => Boolean(u))
      .map((u) => ({
        image_url: u,
        source: 'x_api',
        reason: 'Image from related X discussions',
        score: 0.73,
      }))
      .slice(0, 4)
  } catch {
    return []
  }
}

export async function POST(req: Request): Promise<Response> {
  const { topic, candidateUrls = [] } = (await req.json()) as { topic?: string; candidateUrls?: string[] }
  const cleanTopic = (topic || '').trim()
  if (!cleanTopic) return Response.json({ error: 'topic is required' }, { status: 400 })

  const ogSeed = await Promise.all(
    (candidateUrls || []).slice(0, 4).map((u) => fetchOgImage(u, 'og_image'))
  )

  const pools = await Promise.all([
    fromGoogleNews(cleanTopic),
    fromOutletRss(cleanTopic),
    fromReddit(cleanTopic),
    fromHn(cleanTopic),
    fromBrave(cleanTopic),
    fromXApi(cleanTopic),
  ])

  const blocked = ['wikipedia.org', 'wikimedia.org', 'wikidata.org', 'upload.wikimedia.org']
  const isBlocked = (url: string) => {
    try {
      const h = new URL(url).hostname.toLowerCase()
      return blocked.some((d) => h.includes(d))
    } catch {
      return false
    }
  }

  const merged = [...ogSeed.filter((v): v is ImageCandidate => Boolean(v)), ...pools.flat()]
    .filter((item) => !isBlocked(item.image_url))
  const deduped = new Map<string, ImageCandidate>()
  for (const item of merged) {
    if (!deduped.has(item.image_url)) deduped.set(item.image_url, item)
  }
  const ranked = [...deduped.values()].sort((a, b) => b.score - a.score)
  const top = ranked[0] || null

  return Response.json({
    topic: cleanTopic,
    image_url: top?.image_url || null,
    image_source: top?.source || null,
    image_kind: 'web',
    reason: top?.reason || null,
    candidates: ranked.slice(0, 8),
  })
}
