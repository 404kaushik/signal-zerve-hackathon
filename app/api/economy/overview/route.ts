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

async function getSpark(symbol: string) {
  const period1 = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const chart = await yf.chart(symbol, { period1, interval: '15m' })
  return (chart.quotes || [])
    .filter((row) => row.date && typeof row.close === 'number')
    .slice(-20)
    .map((row) => ({
      t: row.date.getTime(),
      v: row.close as number,
    }))
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
  const result = await yf.screener({ scrIds: scrId, count: 8, region: 'US', lang: 'en-US' })
  return mapMoverRows(result.quotes ?? [])
}

export async function GET() {
  try {
    const quotes = await Promise.all(
      INDEX_SYMBOLS.map(({ symbol }) => yf.quote(symbol))
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
      symbol: quote.symbol,
      shortName: quote.shortName ?? quote.longName ?? INDEX_SYMBOLS[index].shortName,
      price: toNumber(quote.regularMarketPrice),
      change: toNumber(quote.regularMarketChange),
      changePct: toNumber(quote.regularMarketChangePercent),
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
