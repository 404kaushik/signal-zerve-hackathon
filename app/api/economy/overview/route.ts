import { NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

export const dynamic = 'force-dynamic'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const INDEX_SYMBOLS = [
  { symbol: '^GSPC', shortName: 'S&P 500' },
  { symbol: '^IXIC', shortName: 'Nasdaq' },
  { symbol: '^DJI', shortName: 'Dow Jones' },
  { symbol: '^VIX', shortName: 'VIX' },
  { symbol: '^TNX', shortName: 'US 10Y' },
  { symbol: 'DX-Y.NYB', shortName: 'DXY' },
] as const
const YAHOO_TIMEOUT_MS = 7000

type MoverRow = {
  symbol: string
  shortName: string
  price: number | null
  changePct: number | null
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout after ${ms}ms (${label})`)), ms)
    ),
  ])
}

async function getSpark(symbol: string) {
  try {
    const period1 = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const chart = await withTimeout(
      yf.chart(symbol, { period1, interval: '15m' }),
      YAHOO_TIMEOUT_MS,
      `chart:${symbol}`
    )
    return (chart.quotes || [])
      .filter((row) => row.date && typeof row.close === 'number')
      .slice(-20)
      .map((row) => ({
        t: row.date.getTime(),
        v: row.close as number,
      }))
  } catch (error) {
    console.warn(`[economy/overview] spark failed for ${symbol}:`, error)
    return []
  }
}

function mapMoverRows(rows: any[]): MoverRow[] {
  return rows.slice(0, 5).map((row) => ({
    symbol: row.symbol ?? '--',
    shortName: row.shortName ?? row.longName ?? row.symbol ?? '--',
    price: toNumber(row.regularMarketPrice),
    changePct: toNumber(row.regularMarketChangePercent),
  }))
}

async function getMovers(scrId: 'day_gainers' | 'day_losers' | 'most_actives') {
  try {
    // Yahoo often omits optional quote fields; strict schema validation then fails the whole
    // screener (empty gainers/losers). We only need a few fields — skip result validation.
    const result = (await withTimeout(
      yf.screener(
        { scrIds: scrId, count: 8, region: 'US', lang: 'en-US' },
        undefined,
        { validateResult: false }
      ),
      YAHOO_TIMEOUT_MS,
      `screener:${scrId}`
    )) as { quotes?: unknown[] }
    const quotes = Array.isArray(result?.quotes) ? result.quotes : []
    return mapMoverRows(quotes as Parameters<typeof mapMoverRows>[0])
  } catch (error) {
    // Yahoo screener payloads can drift and trip schema validation.
    // Keep the endpoint alive with partial data instead of hard failing.
    console.warn(`[economy/overview] screener failed for ${scrId}:`, error)
    return []
  }
}

async function getIndexQuote(symbol: string) {
  try {
    return await withTimeout(yf.quote(symbol), YAHOO_TIMEOUT_MS, `quote:${symbol}`)
  } catch (error) {
    console.warn(`[economy/overview] quote failed for ${symbol}:`, error)
    return null
  }
}

export async function GET() {
  try {
    const quotes = await Promise.all(
      INDEX_SYMBOLS.map(({ symbol }) => getIndexQuote(symbol))
    )

    const sparks = await Promise.all(
      INDEX_SYMBOLS.map(({ symbol }) => getSpark(symbol))
    )

    const [gainers, losers, mostActive] = await Promise.all([
      getMovers('day_gainers'),
      getMovers('day_losers'),
      getMovers('most_actives'),
    ])

    const indices = quotes.map((quote, index) => ({
      symbol: quote?.symbol ?? INDEX_SYMBOLS[index].symbol,
      shortName: quote?.shortName ?? quote?.longName ?? INDEX_SYMBOLS[index].shortName,
      price: toNumber(quote?.regularMarketPrice),
      change: toNumber(quote?.regularMarketChange),
      changePct: toNumber(quote?.regularMarketChangePercent),
      spark: sparks[index],
    }))

    return NextResponse.json({
      ok: true,
      data: {
        indices,
        gainers,
        losers,
        mostActive,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch economy overview'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
