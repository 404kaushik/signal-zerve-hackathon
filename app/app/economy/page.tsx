'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { TerminalPanel, MetricBox, DataRow } from '@/components/worldlens/terminal-panel'
import { HugeIcon } from '@/components/worldlens/huge-icon'
import { useAPI } from '@/hooks/use-api'
import {
  fetchEconomyOverview,
  fetchTickerQuote,
  searchTickers,
  type EconomyOverview,
  type EconomyQuote,
  type RangeKey,
  type SearchRow,
} from '@/lib/economy'

const RANGE_OPTIONS: RangeKey[] = ['1d', '5d', '1mo', '6mo', '1y', '5y']

function formatCompact(value: number | null) {
  if (value === null) return '--'
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)
}

function formatPrice(value: number | null, currency = 'USD') {
  if (value === null) return '--'
  return Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value)
}

function formatPercent(value: number | null) {
  if (value === null) return '--'
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function ChangeValue({ value, className = '' }: { value: number | null; className?: string }) {
  const toneClass =
    value === null ? 'text-[#666666]' : value >= 0 ? 'text-[#b5b5b5]' : 'text-[#8b3a3a]'
  return <span className={`tabular-nums ${toneClass} ${className}`}>{formatPercent(value)}</span>
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debouncedValue
}

export default function EconomyPage() {
  const [selected, setSelected] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>('1mo')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchResults, setShowSearchResults] = useState(false)
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300)

  const overviewAPI = useAPI<EconomyOverview>(fetchEconomyOverview)
  const quoteAPI = useAPI<EconomyQuote>(
    () => {
      if (!selected) throw new Error('Select a ticker to load quote details')
      return fetchTickerQuote(selected, range)
    },
    { autoFetch: false, stickySession: false }
  )
  const searchAPI = useAPI<SearchRow[]>(
    () => {
      if (!debouncedSearch) return Promise.resolve([])
      return searchTickers(debouncedSearch)
    },
    { autoFetch: false, stickySession: false }
  )

  useEffect(() => {
    if (!selected && overviewAPI.data?.indices?.[0]?.symbol) {
      setSelected(overviewAPI.data.indices[0].symbol)
    }
  }, [overviewAPI.data, selected])

  useEffect(() => {
    if (!selected) return
    void quoteAPI.refetch()
  }, [selected, range])

  useEffect(() => {
    if (!debouncedSearch) {
      setShowSearchResults(false)
      return
    }
    setShowSearchResults(true)
    void searchAPI.refetch()
  }, [debouncedSearch])

  const selectedQuote = quoteAPI.data
  const searchResults = debouncedSearch ? (searchAPI.data || []) : []

  return (
    <div className="space-y-4 font-mono">
      <div className="liquid-glass border border-[#1a1a1a] px-4 py-3">
        <div className="text-[10px] tracking-[0.2em] text-[#555555]">ECONOMY</div>
        <div className="mt-2 flex items-center gap-2">
          <HugeIcon name="ChartCandlestickIcon" size={18} className="text-[#b5b5b5]" />
          <h1 className="text-lg tracking-[0.12em] text-[#e8e8e8]">MARKETS IN MOTION</h1>
        </div>
      </div>

      {overviewAPI.error && (
        <div className="border border-[#8b3a3a] bg-[#0f0808] px-4 py-3 text-[11px] text-[#b97a7a]">
          {overviewAPI.error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {(overviewAPI.data?.indices || []).map((idx) => (
          <TerminalPanel key={idx.symbol} title={idx.symbol} subtitle={idx.shortName} className="min-h-[160px]">
            <div className="space-y-2">
              <div className="text-xl tabular-nums text-[#e8e8e8]">{formatPrice(idx.price)}</div>
              <div>
                <ChangeValue value={idx.changePct} className="text-[20px]" />
              </div>
              <div className="h-14">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={idx.spark}>
                    <defs>
                      <linearGradient id={`spark-${idx.symbol}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e8e8e8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#e8e8e8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#e8e8e8"
                      strokeWidth={1.2}
                      fill={`url(#spark-${idx.symbol})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TerminalPanel>
        ))}
        {overviewAPI.loading && !overviewAPI.data && (
          <div className="col-span-full border border-[#1a1a1a] px-4 py-3 text-[11px] text-[#666666]">
            syncing market indices...
          </div>
        )}
      </div>

      <TerminalPanel title="STOCK SEARCH" subtitle="YAHOO FINANCE LIVE" className="relative z-40 overflow-visible">
        <div className="relative">
          <div className="flex items-center gap-2 border border-[#1a1a1a] px-3 py-2">
            <HugeIcon name="Search01Icon" size={14} className="text-[#888888]" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setShowSearchResults(true)
              }}
              placeholder="Search ticker or company..."
              className="w-full text-[11px] text-[#d0d0d0] placeholder:text-[#555555] outline-none"
            />
          </div>

          {!!searchResults.length && showSearchResults && (
            <div className="liquid-glass-strong absolute left-0 right-0 top-[calc(100%+4px)] z-50 border border-[#1a1a1a] p-1 shadow-xl">
              {searchResults.map((result) => (
                <button
                  key={`${result.symbol}-${result.exchange}`}
                  type="button"
                  onClick={() => {
                    setSelected(result.symbol)
                    setSearchQuery(result.symbol)
                    setShowSearchResults(false)
                  }}
                  className="flex w-full items-center justify-between px-2 py-2 text-left bg-[#0d0d0d]"
                >
                  <span className="text-[11px] text-[#e8e8e8]">
                    {result.symbol} - {result.shortName}
                  </span>
                  <span className="text-[10px] text-[#777777]">{result.typeDisp}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </TerminalPanel>

      <div className="grid gap-4 lg:grid-cols-12">
        <TerminalPanel
          title="SELECTED STOCK"
          subtitle={selectedQuote ? selectedQuote.symbol : selected || 'NONE'}
          className="lg:col-span-8"
        >
          {!selected && <div className="text-[11px] text-[#666666]">Select a ticker to load details.</div>}

          {!!selected && quoteAPI.loading && !selectedQuote && (
            <div className="text-[11px] text-[#666666] animate-pulse">loading stock chart...</div>
          )}

          {!!selected && quoteAPI.error && (
            <div className="border border-[#8b3a3a] bg-[#0f0808] px-3 py-2 text-[11px] text-[#b97a7a]">
              {quoteAPI.error}
            </div>
          )}

          {selectedQuote && (
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[13px] text-[#e8e8e8]">{selectedQuote.longName}</div>
                  <div className="text-[10px] text-[#666666]">
                    {selectedQuote.symbol} | {selectedQuote.exchange} | {selectedQuote.marketState}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl tabular-nums text-[#e8e8e8]">
                    {formatPrice(selectedQuote.price.regular, selectedQuote.currency)}
                  </div>
                  <div>
                    <ChangeValue value={selectedQuote.price.changePct} className="text-xl" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {RANGE_OPTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRange(key)}
                    className={`border px-3 py-1 text-[10px] ${
                      range === key
                        ? 'border-[#777777] text-[#e8e8e8]'
                        : 'border-[#1a1a1a] text-[#666666]'
                    }`}
                  >
                    {key.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedQuote.chart}>
                    <defs>
                      <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e8e8e8" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#e8e8e8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#111111" vertical={false} />
                    <XAxis
                      dataKey="t"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      tick={{ fontSize: 9, fill: '#666666' }}
                      axisLine={{ stroke: '#1a1a1a' }}
                    />
                    <YAxis tick={{ fontSize: 9, fill: '#666666' }} axisLine={{ stroke: '#1a1a1a' }} />
                    <Tooltip
                      labelFormatter={(value) =>
                        new Date(Number(value)).toLocaleString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      }
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #1a1a1a',
                        fontSize: 10,
                        color: '#e8e8e8',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#e8e8e8"
                      strokeWidth={1.4}
                      fill="url(#priceFill)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-0">
                  <DataRow label="Market Cap" value={formatCompact(selectedQuote.fundamentals.marketCap)} />
                  <DataRow label="Trailing P/E" value={selectedQuote.fundamentals.trailingPE ?? '--'} />
                  <DataRow label="EPS" value={selectedQuote.fundamentals.eps ?? '--'} />
                  <DataRow label="52W High" value={formatPrice(selectedQuote.fundamentals.fiftyTwoWeekHigh, selectedQuote.currency)} />
                </div>
                <div className="space-y-0">
                  <DataRow label="52W Low" value={formatPrice(selectedQuote.fundamentals.fiftyTwoWeekLow, selectedQuote.currency)} />
                  <DataRow label="Avg Volume" value={formatCompact(selectedQuote.fundamentals.averageVolume)} />
                  <DataRow label="Dividend Yield" value={formatPercent(selectedQuote.fundamentals.dividendYield === null ? null : selectedQuote.fundamentals.dividendYield * 100)} />
                  <DataRow label="Beta" value={selectedQuote.fundamentals.beta ?? '--'} />
                </div>
              </div>

              {selectedQuote.longBusinessSummary && (
                <details className="border border-[#1a1a1a] p-3">
                  <summary className="cursor-pointer text-[10px] tracking-[0.2em] text-[#888888]">
                    BUSINESS SUMMARY
                  </summary>
                  <p className="mt-2 text-[11px] text-[#b5b5b5]">{selectedQuote.longBusinessSummary}</p>
                </details>
              )}
            </div>
          )}
        </TerminalPanel>

        <div className="space-y-4 lg:col-span-4">
          <MetricBox label="SELECTED SYMBOL" value={selectedQuote?.symbol ?? selected ?? '--'} size="small" />
          <MetricBox label="LAST PRICE" value={selectedQuote ? formatPrice(selectedQuote.price.regular, selectedQuote.currency) : '--'} size="small" />
          <MetricBox label="DAY CHANGE" value={selectedQuote ? formatPercent(selectedQuote.price.changePct) : '--'} size="small" />
          <MetricBox label="RANGE" value={range.toUpperCase()} size="small" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <TerminalPanel
          title="TOP GAINERS"
          subtitle="US"
          headerRight={<HugeIcon name="AnalyticsUpIcon" size={14} className="text-[#888888]" />}
        >
          <div className="space-y-2">
            {(overviewAPI.data?.gainers || []).map((row) => (
              <button
                key={row.symbol}
                type="button"
                onClick={() => setSelected(row.symbol)}
                className="flex w-full items-center justify-between border border-[#1a1a1a] p-2 text-left hover:border-[#333333]"
              >
                <div>
                  <div className="text-[11px] text-[#e8e8e8]">{row.symbol}</div>
                  <div className="text-[10px] text-[#666666] truncate">{row.shortName}</div>
                </div>
                <div>
                  <ChangeValue value={row.changePct} className="text-base" />
                </div>
              </button>
            ))}
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="MOST ACTIVE"
          subtitle="US"
          headerRight={<HugeIcon name="Pulse01Icon" size={14} className="text-[#888888]" />}
        >
          <div className="space-y-2">
            {(overviewAPI.data?.mostActive || []).map((row) => (
              <button
                key={row.symbol}
                type="button"
                onClick={() => setSelected(row.symbol)}
                className="flex w-full items-center justify-between border border-[#1a1a1a] p-2 text-left hover:border-[#333333]"
              >
                <div>
                  <div className="text-[11px] text-[#e8e8e8]">{row.symbol}</div>
                  <div className="text-[10px] text-[#666666] truncate">{row.shortName}</div>
                </div>
                <div className="text-base tabular-nums text-[#b5b5b5]">{formatPrice(row.price)}</div>
              </button>
            ))}
          </div>
        </TerminalPanel>

        <TerminalPanel
          title="TOP LOSERS"
          subtitle="US"
          headerRight={<HugeIcon name="AnalyticsDownIcon" size={14} className="text-[#888888]" />}
        >
          <div className="space-y-2">
            {(overviewAPI.data?.losers || []).map((row) => (
              <button
                key={row.symbol}
                type="button"
                onClick={() => setSelected(row.symbol)}
                className="flex w-full items-center justify-between border border-[#1a1a1a] p-2 text-left hover:border-[#333333]"
              >
                <div>
                  <div className="text-[11px] text-[#e8e8e8]">{row.symbol}</div>
                  <div className="text-[10px] text-[#666666] truncate">{row.shortName}</div>
                </div>
                <div>
                  <ChangeValue value={row.changePct} className="text-base" />
                </div>
              </button>
            ))}
          </div>
        </TerminalPanel>
      </div>
    </div>
  )
}

