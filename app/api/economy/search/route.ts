import { NextResponse } from 'next/server'
import YahooFinance from 'yahoo-finance2'

export const dynamic = 'force-dynamic'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

const VALID_TYPES = new Set(['EQUITY', 'ETF', 'INDEX'])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return NextResponse.json({ ok: false, error: 'Missing query parameter: q' }, { status: 400 })
  }

  try {
    const result = await yf.search(q, {
      quotesCount: 8,
      newsCount: 0,
      region: 'US',
      lang: 'en-US',
    })

    const quotes = (result.quotes || [])
      .filter((quote) => Boolean((quote as any)?.symbol))
      .filter((quote) => VALID_TYPES.has(String((quote as any)?.quoteType ?? '').toUpperCase()))
      .map((quote) => ({
        symbol: String((quote as any).symbol),
        shortName: String((quote as any).shortname ?? (quote as any).longname ?? (quote as any).symbol),
        exchange: String((quote as any).exchange ?? '--'),
        typeDisp: String((quote as any).typeDisp ?? (quote as any).quoteType ?? '--'),
      }))

    return NextResponse.json({ ok: true, data: quotes })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to search tickers'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
