export type RangeKey = '1d' | '5d' | '1mo' | '6mo' | '1y' | '5y'

export type SparkPoint = { t: number; v: number }

export type IndexRow = {
  symbol: string
  shortName: string
  price: number | null
  change: number | null
  changePct: number | null
  spark: SparkPoint[]
}

export type MoverRow = {
  symbol: string
  shortName: string
  price: number | null
  changePct: number | null
}

export type EconomyOverview = {
  indices: IndexRow[]
  gainers: MoverRow[]
  losers: MoverRow[]
  mostActive: MoverRow[]
}

export type SearchRow = {
  symbol: string
  shortName: string
  exchange: string
  typeDisp: string
}

export type QuotePoint = {
  t: number
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export type EconomyQuote = {
  symbol: string
  shortName: string
  longName: string
  exchange: string
  currency: string
  marketState: string
  price: {
    regular: number | null
    change: number | null
    changePct: number | null
    previousClose: number | null
  }
  chart: QuotePoint[]
  fundamentals: {
    marketCap: number | null
    trailingPE: number | null
    eps: number | null
    fiftyTwoWeekHigh: number | null
    fiftyTwoWeekLow: number | null
    averageVolume: number | null
    dividendYield: number | null
    beta: number | null
  }
  longBusinessSummary: string | null
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()

  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || `Request failed: ${res.status}`)
  }

  return json.data as T
}

export function fetchEconomyOverview(): Promise<EconomyOverview> {
  return getJSON<EconomyOverview>('/api/economy/overview')
}

export function searchTickers(q: string): Promise<SearchRow[]> {
  return getJSON<SearchRow[]>(`/api/economy/search?q=${encodeURIComponent(q)}`)
}

export function fetchTickerQuote(symbol: string, range: RangeKey): Promise<EconomyQuote> {
  return getJSON<EconomyQuote>(
    `/api/economy/quote?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`
  )
}
