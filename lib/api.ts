// Signal API v3 client — talks to https://signal-lens.hub.zerve.cloud
// No fallback data. All helpers throw a real error when the API is unreachable
// or when an endpoint isn't part of Signal API v3.
//
// Browser-side requests are sent through the Next.js `/zapi/*` rewrite (see
// next.config.mjs) to bypass the upstream's restrictive CORS policy
// (which only allows https://app.zerve.ai). Server-side calls hit the
// absolute origin directly.

const REMOTE_BASE = 'https://signal-lens.hub.zerve.cloud'
const PROXY_BASE = '/zapi'

const NOT_IN_V3 = 'NOT_IN_SIGNAL_API_V3'

function apiBase(): string {
  // In the browser, go through the Next rewrite to avoid CORS.
  // On the server (SSR / route handlers), there is no rewrite, so go direct.
  return typeof window === 'undefined' ? REMOTE_BASE : PROXY_BASE
}

export interface APIResponse<T = unknown> {
  success: boolean
  data: T
  error?: string
  cached?: boolean
}

async function fetchSignalAPI<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBase()}${path}`
  const res = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`Signal API ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

async function fetchHostedJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return fetchSignalAPI<T>(endpoint, options)
}

// ── Health ────────────────────────────────────────────────────────────────
export async function getHealth(): Promise<{ status: string; env?: string; signals_loaded?: number }> {
  return fetchSignalAPI('/health')
}

// ── Overview ──────────────────────────────────────────────────────────────
export interface OverviewData {
  timestamp: string
  active_feeds: number
  system_status: string
  briefing_preview: string
  stress_score: {
    current: number | null
    change_1m: number | null
    change_3m: number | null
    trend_3m: string
    above_1sigma_now: boolean
    above_2sigma_now: boolean
    stress_percentile_now: number | null
  } | null
  macro_regimes: {
    inflation_regime: string
    labour_regime: string
    growth_regime: string
    cpi_yoy_pct: number | null
    unemployment_rate: number | null
    vix: number | null
    yield_curve_10y2y: number | null
    hy_credit_spread: number | null
  } | null
  risk_flags: string[]
  signals: Signal[]
  polymarket_summary: {
    markets_analysed: number
    total_volume: number | null
    contested_count: number
    biggest_mover: string | null
  } | null
}

export async function getOverview(): Promise<OverviewData> {
  return fetchSignalAPI<OverviewData>('/api/overview')
}

// ── Signals (legacy FRED-style; only used by /app/signals/__debug) ────────
export interface Signal {
  id: string
  label: string
  category: string
  value: number
  unit: string
  direction: string
  magnitude: number
  insight: string
  source: string
  timestamp: string
  metadata: {
    zerve?: {
      correlations_count?: number
      top_pairs?: Array<{
        a: string
        b: string
        pearson: number
        spearman: number
        lead_lag_days: number
        p_value?: number | null
        n_obs: number
      }>
      inflation_regime_prob?: number
      labour_regime_prob?: number
      growth_regime_prob?: number
      composite_risk?: number
    }
    history?: DataPoint[]
    [key: string]: unknown
  }
}

export interface SignalsData {
  signals: Signal[]
  count: number
  generated_at: string
  zerve_generated_at?: string
}

function hostedToSignal(h: HostedSignal): Signal {
  const rawYes = Number(h.market_probability?.yes?.toString().replace('%', '') ?? 0) / 100
  const direction = h.public_attention?.daily_direction || 'flat'
  const magnitude = Math.max(0, Math.min(1, Number(h.trending_score ?? 0) / 100))
  return {
    id: h.id,
    label: h.title || h.id,
    category: h.category || 'unknown',
    value: rawYes,
    unit: 'probability',
    direction,
    magnitude,
    insight: h.signal?.crowd_read || '',
    source: 'polymarket',
    timestamp: new Date().toISOString(),
    metadata: {
      hosted: h,
    },
  }
}

export async function getSignals(): Promise<SignalsData> {
  const data = await getHostedSignals()
  return {
    signals: (data.signals || []).map(hostedToSignal),
    count: data.count ?? data.signals?.length ?? 0,
    generated_at: new Date().toISOString(),
  }
}

export interface TimingPredictionsData {
  generated_at: string
  events: Array<{
    name: string
    series_id: string
    probability: number
    confidence_low: number
    confidence_high: number
    horizon_days: number
    key_indicators: string[]
    latest_value: number
    threshold: number
  }>
}

export async function getTimingPredictions(horizonDays = 14): Promise<TimingPredictionsData> {
  return fetchSignalAPI<TimingPredictionsData>(`/api/signals/timing-predictions?horizon_days=${horizonDays}`)
}

export interface ContrarianOpportunitiesData {
  generated_at: string
  opportunities: Array<{
    market_id: string
    question: string
    crowd_prob: number
    model_prob: number
    divergence_pp: number
    confidence: number
    rationale: string
  }>
}

export async function getContrarianOps(): Promise<ContrarianOpportunitiesData> {
  return fetchSignalAPI<ContrarianOpportunitiesData>('/api/signals/contrarian-opportunities')
}

export interface TrendBriefTopic {
  market_id?: string
  question?: string
  crowd_prob?: number
  model_prob?: number
  divergence_pp?: number
  rationale?: string
}

export interface TrendBriefData {
  generated_at: string
  zerve_generated_at?: string | null
  topic: TrendBriefTopic
  bullets: string[]
  raw_tldr?: string
  sports_style?: boolean
}

export async function fetchTrendBrief(): Promise<TrendBriefData> {
  return fetchSignalAPI<TrendBriefData>('/api/signals/trend-brief', {
    method: 'POST',
    body: '{}',
  })
}

export interface ReliabilityData {
  generated_at: string
  precision_30d: number
  hit_rate_30d: number
  signals_tracked: number
  last_updated: string
  notes?: string
}

export async function getReliability(): Promise<ReliabilityData> {
  return fetchSignalAPI<ReliabilityData>('/api/signals/reliability')
}

export interface SignalEvidenceData {
  signal_id: string
  signal: Signal
  indicator_id: string | null
  pairs: Array<{
    a: string
    b: string
    pearson: number
    spearman: number
    lead_lag_days: number
    p_value?: number | null
    n_obs: number
  }>
  regime: Record<string, unknown>
  generated_at: string
}

export async function getSignalEvidence(signalId: string): Promise<SignalEvidenceData> {
  return fetchSignalAPI<SignalEvidenceData>(`/api/signals/evidence/${encodeURIComponent(signalId)}`)
}

export async function streamSignalTransmission(opts: {
  signalId?: string
  onChunk: (chunk: string) => void
  onDone?: () => void
  onError?: (message: string) => void
  signal?: AbortSignal
}): Promise<void> {
  const endpoint = opts.signalId
    ? `/api/signals/transmission/${encodeURIComponent(opts.signalId)}`
    : '/api/signals/transmission'
  const res = await fetch(`${apiBase()}${endpoint}`, { signal: opts.signal, cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Signal API ${res.status}: ${res.statusText}`)
  }
  const reader = res.body?.getReader()
  if (!reader) {
    throw new Error('No response body')
  }
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
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const raw = trimmed.slice(6)
      try {
        const payload = JSON.parse(raw) as { type?: string; content?: string; error?: string }
        if (payload.type === 'content' && payload.content) {
          opts.onChunk(payload.content)
        } else if (payload.type === 'done') {
          opts.onDone?.()
        } else if (payload.type === 'error') {
          opts.onError?.(payload.error || 'TRANSMISSION_ERROR')
        }
      } catch {
        // Ignore malformed partial lines.
      }
    }
  }
}

export interface CostOfLivingData {
  signals: Signal[]
  summary: {
    total_annual_squeeze: number | null
    pct_income_lost: number | null
    real_wage_verdict: string | null
    food_verdict: string | null
    housing_verdict: string | null
    warning_signs: string[]
  }
  hidden_inflation: Array<{
    category: string
    '1yr_inflation_pct': number | null
    '2yr_inflation_pct': number | null
    '5yr_inflation_pct': number | null
    trend_3m: string
  }>
}

export async function getCostOfLiving(): Promise<CostOfLivingData> {
  return fetchSignalAPI<CostOfLivingData>('/api/signals/cost-of-living')
}

// ── Explorer ──────────────────────────────────────────────────────────────
export interface Dataset {
  id: string
  label: string
  category: string
  description?: string
  frequency?: string
}

export async function getDatasets(): Promise<Dataset[]> {
  return fetchSignalAPI<Dataset[]>('/api/explorer/datasets')
}

export interface DataPoint {
  date: string
  value: number
  label?: string
}

export interface DatasetQueryResult {
  source: string
  category: string
  metric: string
  unit: string
  description: string
  data: DataPoint[]
  insight?: string
}

export async function queryDataset(dataset: string, limit?: number): Promise<DatasetQueryResult> {
  const params = new URLSearchParams({ dataset })
  if (limit) params.set('limit', String(limit))
  return fetchSignalAPI<DatasetQueryResult>(`/api/explorer/query?${params}`)
}

// ── Briefing ──────────────────────────────────────────────────────────────
export interface BriefingItem {
  rank: number
  headline: string
  body: string
  category: string
  severity: string
  source: string
}

export interface BriefingData {
  date: string
  items: BriefingItem[]
  generated_at: string
}

export async function getBriefing(): Promise<BriefingData> {
  return fetchSignalAPI<BriefingData>('/api/briefing/legacy')
}

// ── Economy ───────────────────────────────────────────────────────────────
export interface EconomicIndicator {
  id: string
  label: string
  description: string
  unit: string
  category: string
  higher_is: string
  latest_date: string
  current_value: number | null
  value_1m_ago: number | null
  value_1yr_ago: number | null
  pct_change_1m: number | null
  pct_change_1yr: number | null
  trend_3m: string
  trend_6m: string
  percentile_now: number | null
  '5yr_low': number | null
  '5yr_high': number | null
  '5yr_mean': number | null
  [key: string]: unknown
}

export interface EconomyData {
  indicators: EconomicIndicator[]
  generated_at: string
}

export async function getEconomy(): Promise<EconomyData> {
  return fetchSignalAPI<EconomyData>('/api/economy')
}

export interface StressData {
  stress_score: {
    current: number | null
    change_1m: number | null
    change_3m: number | null
    mean_3yr: number | null
    std_3yr: number | null
    threshold_1sigma: number | null
    threshold_2sigma: number | null
    peak_value: number | null
    peak_date: string
    trough_value: number | null
    trough_date: string
    above_1sigma_now: boolean
    above_2sigma_now: boolean
    trend_3m: string
    trend_6m: string
    stress_percentile_now: number | null
  }
  macro_regimes: {
    inflation_regime: string
    labour_regime: string
    growth_regime: string
    cpi_yoy_pct: number | null
    pce_yoy_pct: number | null
    breakeven_inflation_5yr: number | null
    unemployment_rate: number | null
    unemployment_1yr_ago: number | null
    jobless_claims_latest: number | null
    jobless_claims_trend: string
    gdp_yoy_pct: number | null
    gdp_trend_6m: string
    yield_curve_10y2y: number | null
    hy_credit_spread: number | null
    vix: number | null
  }
  risk_flags: string[]
  indicators: Array<{
    id: string
    label: string
    current_value: number | null
    z_score_current: number | null
    trend_3m: string
    pct_change_yoy: number | null
    [key: string]: unknown
  }>
}

export async function getStress(): Promise<StressData> {
  return fetchSignalAPI<StressData>('/api/economy/stress')
}

export interface TrendsData {
  indicators: EconomicIndicator[]
  derived_insights: {
    real_hourly_wage?: {
      current: number | null
      '1yr_ago': number | null
      real_change_1yr_pct: number | null
      verdict: string
    }
    food_cost_comparison?: {
      grocery_inflation_1yr_pct: number | null
      restaurant_inflation_1yr_pct: number | null
      verdict: string
    }
    housing_affordability?: {
      median_home_price_now: number | null
      mortgage_rate_now: number | null
      est_monthly_payment_now: number | null
      payment_change_pct: number | null
      verdict: string
    }
    financial_resilience?: {
      personal_savings_rate_pct: number | null
      debt_service_pct_of_income: number | null
      cc_delinquency_rate_pct: number | null
      warning_signs: string[]
    }
    gas_price_impact?: {
      price_per_gallon_now: number | null
      monthly_fuel_cost_now: number | null
      monthly_difference: number | null
    }
    hidden_inflation_breakdown?: {
      categories: Array<{
        category: string
        '1yr_inflation_pct': number | null
        '5yr_inflation_pct': number | null
        trend_3m: string
      }>
    }
    household_budget_impact?: {
      total_est_annual_cost_increase: number | null
      total_est_monthly_cost_increase: number | null
      pct_of_income_lost_to_inflation: number | null
      categories: Array<{
        category: string
        budget_share_pct: number
        category_inflation_1yr_pct: number | null
        est_annual_cost_increase_usd: number | null
      }>
    }
  }
}

export async function getTrends(): Promise<TrendsData> {
  return fetchSignalAPI<TrendsData>('/api/economy/trends')
}

// ── Markets (Polymarket) ──────────────────────────────────────────────────
export interface PolymarketMarket {
  id: string
  question: string
  category: string
  description?: string
  yes_probability: number | null
  no_probability: number | null
  volume_total: number | null
  volume_24h: number | null
  liquidity: number | null
  change_7d: number | null
  change_1d: number | null
  high_7d: number | null
  low_7d: number | null
  range_7d: number | null
  volatility_7d: number | null
  momentum: number | null
  price_acceleration: string | null
  days_remaining: number | null
  end_date: string | null
  flags: string[]
  spread_pp: number | null
  best_bid: number | null
  best_ask: number | null
  mid_price: number | null
  tags?: string[]
}

export interface MarketsData {
  source: string
  snapshot_utc: string
  market_count: number
  markets: PolymarketMarket[]
}

function hostedToPolymarket(h: HostedSignal): PolymarketMarket {
  const yes = Number(h.market_probability?.yes?.toString().replace('%', '') ?? 0) / 100
  const no = Number(h.market_probability?.no?.toString().replace('%', '') ?? 0) / 100
  return {
    id: h.id,
    question: h.title || h.id,
    category: h.category || 'unknown',
    yes_probability: Number.isFinite(yes) ? yes : null,
    no_probability: Number.isFinite(no) ? no : null,
    volume_total: null,
    volume_24h: typeof h.volume?.['24h_usd'] === 'number' ? (h.volume?.['24h_usd'] as number) : null,
    liquidity: null,
    change_7d: null,
    change_1d: null,
    high_7d: null,
    low_7d: null,
    range_7d: null,
    volatility_7d: null,
    momentum: null,
    price_acceleration: null,
    days_remaining: null,
    end_date: null,
    flags: [],
    spread_pp: null,
    best_bid: null,
    best_ask: null,
    mid_price: null,
    tags: h.category_label ? [h.category_label] : [],
  }
}

export async function getMarkets(opts?: { nocache?: boolean }): Promise<MarketsData> {
  const data = await getHostedSignals()
  void opts
  return {
    source: 'signal-lens-v3',
    snapshot_utc: new Date().toISOString(),
    market_count: data.signals.length,
    markets: data.signals.map(hostedToPolymarket),
  }
}

export interface MarketsAggregateData {
  snapshot_utc: string
  markets_analysed: number
  probability: {
    mean: number | null
    median: number | null
    p25: number | null
    p75: number | null
    contested_count: number
    high_confidence_count: number
  }
  volume: {
    total_across_markets: number | null
    mean_per_market: number | null
    median_per_market: number | null
    top_market_volume: number | null
  }
  liquidity: {
    mean: number | null
    median: number | null
  }
  price_change_7d: {
    mean: number | null
    median: number | null
    markets_moved_up: number
    markets_moved_down: number
    markets_stable: number
    biggest_mover: string | null
  }
  flag_summary: Record<string, number>
}

export interface MarketsAggregateAPIResponse {
  aggregate: MarketsAggregateData | null
  meta?: Record<string, unknown>
  note?: string
}

export async function getMarketsAggregate(opts?: { nocache?: boolean }): Promise<MarketsAggregateAPIResponse> {
  const q = opts?.nocache ? '?nocache=true' : ''
  return fetchSignalAPI<MarketsAggregateAPIResponse>(`/api/markets/aggregate${q}`)
}

// ── Telegram bot — NOT IN SIGNAL API V3 ───────────────────────────────────
export interface SmsBotStatusData {
  channel: string
  telegram_configured: boolean
  grok_configured: boolean
  connected_users: number
  latest_user?: {
    user_key: string
    telegram_user_id: number
    telegram_chat_id: number
    username?: string | null
    channel: string
    connected_at: string
    updated_at: string
    active: boolean
  } | null
  timestamp: string
}

export async function getSmsBotStatus(): Promise<SmsBotStatusData> {
  throw new Error(`${NOT_IN_V3}: sms-bot/status`)
}

export interface SmsBotConnectPayload {
  telegram_user_id: number
  telegram_chat_id: number
  username?: string | null
}

export interface SmsBotConnectData {
  user_key: string
  telegram_user_id: number
  telegram_chat_id: number
  username?: string | null
  channel: string
  connected_at: string
  updated_at: string
  active: boolean
}

export async function connectSmsBot(_payload: SmsBotConnectPayload): Promise<SmsBotConnectData> {
  void _payload
  throw new Error(`${NOT_IN_V3}: sms-bot/connect`)
}

export interface SmsBotSendTestPayload {
  telegram_chat_id: number
  message?: string
}

export interface SmsBotSendTestData {
  sent: {
    sid?: string | null
    status?: string | null
    to?: string | null
    from?: string | null
    provider?: string
  }
}

export async function sendSmsBotTest(_payload: SmsBotSendTestPayload): Promise<SmsBotSendTestData> {
  void _payload
  throw new Error(`${NOT_IN_V3}: sms-bot/send-test`)
}

// ── Hosted SignalLens contract (Signal API v3 root endpoints) ─────────────
export const XX = 'XX'

export function textOrXX(value: unknown): string {
  if (value === null || value === undefined) return XX
  const text = String(value).trim()
  return text.length ? text : XX
}

export interface HostedSignal {
  id: string
  title?: string | null
  category?: string | null
  category_label?: string | null
  category_emoji?: string | null
  category_color?: string | null
  trending_score?: number | null
  public_attention?: {
    keyword?: string | null
    current_interest?: number | null
    ['7d_trend']?: string | null
    ['7d_avg']?: number | null
    daily_delta?: number | null
    daily_direction?: string | null
  } | null
  market_probability?: { yes?: string | number | null; no?: string | number | null } | null
  volume?: { '24h_display'?: string | null; '24h_usd'?: number | null; context?: string | null } | null
  signal?: { strength?: string | null; crowd_read?: string | null; why_it_matters?: string[] } | null
  live_data?: Record<string, unknown> | null
}

export interface HostedSignalsData {
  signals: HostedSignal[]
  count?: number | null
  total_24h_volume?: string | null
}

export interface HostedSentimentData {
  headline?: string | null
  total_24h_volume?: string | null
  markets_analyzed?: number | null
  generated_at?: string | null
  most_excited_about?: {
    category?: string | null
    label?: string | null
    emoji?: string | null
    '24h_volume'?: string | null
    reason?: string | null
  } | null
  most_bullish_on?: {
    category?: string | null
    label?: string | null
    emoji?: string | null
    avg_probability?: string | null
    reason?: string | null
  } | null
  most_nervous_about?: {
    category?: string | null
    label?: string | null
    emoji?: string | null
    uncertainty_score?: number | null
    reason?: string | null
  } | null
  top_3_markets_by_volume?: Array<{
    title?: string | null
    category?: string | null
    emoji?: string | null
    volume24h?: string | null
    probability?: string | null
    crowd_read?: string | null
  }> | null
  category_breakdown?: Record<
    string,
    {
      mood?: string | null
      avg_probability?: number | null
      '24h_volume_usd'?: number | null
      '24h_volume_display'?: string | null
      market_count?: number | null
      uncertainty_score?: number | null
      emoji?: string | null
      label?: string | null
    }
  > | null
}

export interface HostedTopData {
  title?: string | null
  sentiment_headline?: string | null
  signals: HostedSignal[]
}

export interface HostedTrendingCategory {
  category?: string | null
  label?: string | null
  emoji?: string | null
  color?: string | null
  volume_display?: string | null
  volume24h_usd?: number | null
  market_count?: number | null
  top_market_title?: string | null
  avg_attention?: number | null
  avg_trending_score?: number | null
  attention_direction?: string | null
  markets?: TrendingMarketItem[]
}

export interface TrendingRisingItem {
  id: string
  title?: string | null
  category?: string | null
  category_emoji?: string | null
  volume24h?: string | null
  probability?: string | null
  trending_score?: number | null
  daily_direction?: string | null
  daily_delta?: number | null
}

export interface TrendingMarketItem {
  id: string
  title?: string | null
  category?: string | null
  category_label?: string | null
  category_emoji?: string | null
  category_color?: string | null
  volume24h?: string | null
  probability?: string | null
  crowd_read?: string | null
  trending_score?: number | null
  signal_strength?: string | null
}

export interface HostedTrendingData {
  date?: string | null
  generated_at?: string | null
  top_markets?: TrendingMarketItem[]
  rising?: TrendingRisingItem[]
  hot_right_now?: TrendingMarketItem | null
  categories?: HostedTrendingCategory[]
  summary?: {
    total_24h_volume?: string | null
    total_markets?: number | null
    rising_count?: number | null
    hottest_label?: string | null
    hottest_category?: string | null
  } | null
}

export interface HostedSearchData {
  query?: string
  count?: number
  results: HostedSignal[]
}

export async function getHostedSignals(): Promise<HostedSignalsData> {
  const data = await fetchHostedJSON<HostedSignalsData | HostedSignal[]>('/signals')
  if (Array.isArray(data)) return { signals: data, count: data.length, total_24h_volume: null }
  return {
    signals: data.signals || [],
    count: data.count ?? data.signals?.length ?? 0,
    total_24h_volume: data.total_24h_volume ?? null,
  }
}

export async function getHostedVolTreSignals(): Promise<HostedSignalsData> {
  const data = await fetchHostedJSON<HostedSignalsData | HostedSignal[]>('/signals/vol-tre')
  if (Array.isArray(data)) return { signals: data, count: data.length, total_24h_volume: null }
  return {
    signals: data.signals || [],
    count: data.count ?? data.signals?.length ?? 0,
    total_24h_volume: data.total_24h_volume ?? null,
  }
}

export async function getHostedSentiment(): Promise<HostedSentimentData> {
  return fetchHostedJSON<HostedSentimentData>('/sentiment')
}

export async function getHostedTop(): Promise<HostedTopData> {
  const data = await fetchHostedJSON<HostedTopData | HostedSignal[]>('/top')
  return Array.isArray(data) ? { signals: data, title: 'Top markets', sentiment_headline: '' } : { ...data, signals: data.signals || [] }
}

export async function getHostedTrendingDaily(): Promise<HostedTrendingData> {
  return fetchHostedJSON<HostedTrendingData>('/trending/daily')
}

export async function searchHostedSignals(query: string, category?: string, limit = 20): Promise<HostedSearchData> {
  const params = new URLSearchParams({ q: query, limit: String(limit) })
  if (category) params.set('category', category)
  const data = await fetchHostedJSON<HostedSearchData | HostedSignal[]>(`/search?${params.toString()}`)
  return Array.isArray(data) ? { results: data } : { results: data.results || [] }
}

// ── X feed — NOT IN SIGNAL API V3 (lives on a different deploy) ───────────
export interface XEvidenceItem {
  title?: string
  url: string
  domain?: string
  stance?: string
  published_at?: string
  source_type?: string
  snippet?: string
}

export interface XFeedPost {
  post_id: string
  author: string
  handle: string
  avatar_seed: string
  timestamp: string
  body: string
  category: string
  topic?: string
  confidence_0_1?: number
  stance?: 'bullish' | 'bearish' | 'uncertain' | string
  persona?: string
  angle?: string
  evidence: XEvidenceItem[]
  market_ref?: {
    id?: string
    probability?: string
    volume24h?: string
  }
  image_url?: string | null
  image_source?: string | null
  image_kind?: string | null
}

export interface XTrendItem {
  topic?: string
  category?: string
  post_count?: number
  volume_24h?: string
  avg_score?: number
}

export interface XFeedData {
  generated_at: string
  posts: XFeedPost[]
  trends: XTrendItem[]
  summary?: Record<string, unknown>
  errors?: Array<{ topic?: string; error?: string }>
}

export interface XPostCompact {
  post_id: string
  topic?: string
  category?: string
  headline?: string
  confidence_0_1?: number
}

export interface XWhatsHappeningData {
  generated_at: string
  items: XPostCompact[]
}

export async function getXFeed(_limit = 40): Promise<XFeedData> {
  void _limit
  throw new Error(`${NOT_IN_V3}: x/feed`)
}

export async function getXTrends(): Promise<{ generated_at: string; trends: XTrendItem[] }> {
  throw new Error(`${NOT_IN_V3}: x/trends`)
}

export async function getXPost(_postId: string): Promise<XFeedPost> {
  void _postId
  throw new Error(`${NOT_IN_V3}: x/post`)
}

export async function getXWhatsHappening(_limit = 5): Promise<XWhatsHappeningData> {
  void _limit
  throw new Error(`${NOT_IN_V3}: x/whats-happening`)
}

export interface XResearchStep {
  id: string
  label: string
  status: 'running' | 'done' | 'error'
  count?: number
  detail?: string
}

export interface XResearchBrief {
  topic: string
  generated_at?: string
  market_ref?: Record<string, unknown>
  sources: XEvidenceItem[]
  trace_id?: string
}

export interface XLivePostDelta {
  idx: number
  text: string
}

export async function streamXLiveResearch(_opts: {
  topic: string
  language?: string
  tone?: string
  onStep?: (step: XResearchStep) => void
  onBrief?: (brief: XResearchBrief) => void
  onGrokDelta?: (delta: XLivePostDelta) => void
  onPostComplete?: (post: XFeedPost) => void
  onPostImage?: (payload: { post_id: string; image_url: string; image_source?: string | null; image_kind?: string | null }) => void
  onDone?: (payload?: Record<string, unknown>) => void
  onError?: (message: string) => void
  signal?: AbortSignal
}): Promise<void> {
  throw new Error(`${NOT_IN_V3}: x/live-research`)
}

// Kept exported for any consumer that wants the absolute origin
// (e.g. server-side route handlers). Browser code should not need these.
export { REMOTE_BASE as HOSTED_BASE, REMOTE_BASE as API_BASE }
