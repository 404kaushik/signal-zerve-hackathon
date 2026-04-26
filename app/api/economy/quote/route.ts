import { NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

export const dynamic = 'force-dynamic'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const RANGE_CONFIG = {
  '1d': { days: 1, interval: '5m' },
  '5d': { days: 5, interval: '30m' },
  '1mo': { days: 30, interval: '1d' },
  '6mo': { days: 180, interval: '1d' },
  '1y': { days: 365, interval: '1wk' },
  '5y': { days: 365 * 5, interval: '1mo' },
} as const

type RangeKey = keyof typeof RANGE_CONFIG

function isRangeKey(value: string): value is RangeKey {
  return value in RANGE_CONFIG
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')?.trim().toUpperCase() ?? ''
  const rangeParam = searchParams.get('range') ?? '1mo'

  if (!symbol) {
    return NextResponse.json({ ok: false, error: 'Missing query parameter: symbol' }, { status: 400 })
  }

  const range: RangeKey = isRangeKey(rangeParam) ? rangeParam : '1mo'
  const rangeConfig = RANGE_CONFIG[range]
  const period1 = new Date(Date.now() - rangeConfig.days * 24 * 60 * 60 * 1000)

  try {
    const [quote, chart, summary] = await Promise.all([
      yf.quote(symbol),
      yf.chart(symbol, { period1, interval: rangeConfig.interval }),
      yf.quoteSummary(symbol, {
        modules: ['summaryDetail', 'price', 'defaultKeyStatistics', 'financialData', 'assetProfile'],
      }),
    ])

    const series = (chart.quotes || [])
      .filter((row) => row.date)
      .map((row) => ({
        t: row.date!.getTime(),
        open: toNumber(row.open),
        high: toNumber(row.high),
        low: toNumber(row.low),
        close: toNumber(row.close),
        volume: toNumber(row.volume),
      }))

    return NextResponse.json({
      ok: true,
      data: {
        symbol: quote.symbol,
        shortName: quote.shortName ?? quote.longName ?? symbol,
        longName: quote.longName ?? quote.shortName ?? symbol,
        exchange: quote.fullExchangeName ?? quote.exchange ?? '--',
        currency: quote.currency ?? 'USD',
        marketState: quote.marketState ?? '--',
        price: {
          regular: toNumber(quote.regularMarketPrice),
          change: toNumber(quote.regularMarketChange),
          changePct: toNumber(quote.regularMarketChangePercent),
          previousClose: toNumber(quote.regularMarketPreviousClose),
        },
        chart: series,
        fundamentals: {
          marketCap: toNumber(summary.summaryDetail?.marketCap),
          trailingPE: toNumber(summary.summaryDetail?.trailingPE),
          eps: toNumber(summary.defaultKeyStatistics?.trailingEps),
          fiftyTwoWeekHigh: toNumber(summary.summaryDetail?.fiftyTwoWeekHigh),
          fiftyTwoWeekLow: toNumber(summary.summaryDetail?.fiftyTwoWeekLow),
          averageVolume: toNumber(summary.summaryDetail?.averageVolume),
          dividendYield: toNumber(summary.summaryDetail?.dividendYield),
          beta: toNumber(summary.summaryDetail?.beta),
        },
        longBusinessSummary: summary.assetProfile?.longBusinessSummary ?? null,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch ticker quote'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
