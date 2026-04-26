'use client'

import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Bitcoin01Icon,
  ChartBarIncreasingIcon,
  Flag01Icon,
  Globe02Icon,
  FootballIcon,
  ChipIcon,
  Menu01Icon,
} from '@hugeicons/core-free-icons'
import { useAPI } from '@/hooks/use-api'
import { getHostedSignals, searchHostedSignals, type HostedSignal } from '@/lib/api'
import { MetricBox, TerminalPanel } from '@/components/worldlens/terminal-panel'
import { MarketIntelPanel } from '@/components/signals/MarketIntelPanel'

const CATEGORIES = ['all', 'crypto', 'economy', 'politics', 'geopolitics', 'sports', 'tech'] as const
const CATEGORY_LABELS: Record<string, string> = {
  all: 'all',
  crypto: 'crypto',
  economy: 'economy',
  politics: 'politics',
  geopolitics: 'geopolitics',
  sports: 'sports',
  tech: 'tech',
}
const CATEGORY_ICONS = {
  all: Menu01Icon,
  crypto: Bitcoin01Icon,
  economy: ChartBarIncreasingIcon,
  politics: Flag01Icon,
  geopolitics: Globe02Icon,
  sports: FootballIcon,
  tech: ChipIcon,
} as const
type SortMode = 'volume' | 'score'
type CategoryValue = (typeof CATEGORIES)[number]

function normalizeCategory(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function CategoryPill({
  category,
  label,
  active = false,
  onClick,
}: {
  category: string
  label: string
  active?: boolean
  onClick?: () => void
}) {
  const key = normalizeCategory(category)
  const icon = CATEGORY_ICONS[key as keyof typeof CATEGORY_ICONS] || Menu01Icon
  const className = onClick
    ? `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] border tracking-[0.08em] transition-all duration-200 ${
        active
          ? 'border-[#6bbd8b]/60 bg-[#0e1712] text-[#9adfb6] shadow-[0_0_0_1px_rgba(107,189,139,0.18),0_6px_20px_-14px_rgba(107,189,139,0.55)]'
          : 'border-white/10 bg-white/[0.02] text-[#7a7a7a] hover:border-white/20 hover:bg-white/[0.04] hover:text-[#c8c8c8]'
      }`
    : 'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] text-[#808080]'

  const content = (
    <>
      <HugeiconsIcon icon={icon} size={11} strokeWidth={1.8} />
      <span>{label}</span>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return <span className={className}>{content}</span>
}

function bySort(a: HostedSignal, b: HostedSignal, mode: SortMode) {
  if (mode === 'score') return Number(b.trending_score ?? 0) - Number(a.trending_score ?? 0)
  return Number(b.volume?.['24h_usd'] ?? 0) - Number(a.volume?.['24h_usd'] ?? 0)
}

export default function MarketsPage() {
  const { data, loading, error } = useAPI(getHostedSignals)
  const [category, setCategory] = useState<CategoryValue>('all')
  const [query, setQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('volume')
  const [searchBusy, setSearchBusy] = useState(false)
  const [searchResults, setSearchResults] = useState<HostedSignal[] | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<HostedSignal | null>(null)
  const [intelFetchNonce, setIntelFetchNonce] = useState(0)
  // map of market id → overridden category
  const [categoryOverrides, setCategoryOverrides] = useState<Map<string, string>>(new Map())

  const allSignals = data?.signals || []
  const rows = useMemo(() => {
    const source = searchResults ?? allSignals
    const filtered = category === 'all'
      ? source
      : source.filter((s) => {
          const effective = categoryOverrides.get(s.id) ?? s.category
          return effective === category
        })
    return [...filtered].sort((a, b) => bySort(a, b, sortMode))
  }, [allSignals, searchResults, category, sortMode, categoryOverrides])

  useEffect(() => {
    if (!rows.length) {
      setSelectedMarket(null)
      return
    }
    setSelectedMarket((prev) => {
      if (!prev) return rows[0]
      const stillExists = rows.find((item) => item.id === prev.id)
      return stillExists || rows[0]
    })
  }, [rows])

  const onSearch = async () => {
    const cleaned = query.trim()
    if (!cleaned) {
      setSearchResults(null)
      return
    }
    try {
      setSearchBusy(true)
      const res = await searchHostedSignals(cleaned, category === 'all' ? undefined : category, 25)
      setSearchResults(res.results || [])
    } catch {
      setSearchResults([])
    } finally {
      setSearchBusy(false)
    }
  }

  const onCategoryTabClick = (nextCategory: CategoryValue) => {
    setCategory(nextCategory)
    // Category tabs in MARKET LIST should always reflect the full live feed,
    // not stale scoped search results.
    setSearchResults(null)
    setQuery('')
  }

  const effectiveCategory = selectedMarket
    ? (categoryOverrides.get(selectedMarket.id) ?? selectedMarket.category ?? 'unknown')
    : null

  const assignCategory = (cat: string) => {
    if (!selectedMarket) return
    setCategoryOverrides((prev) => {
      const next = new Map(prev)
      // if same as original, remove override
      if (cat === (selectedMarket.category ?? 'unknown')) {
        next.delete(selectedMarket.id)
      } else {
        next.set(selectedMarket.id, cat)
      }
      return next
    })
  }

  const overrideCount = categoryOverrides.size

  return (
    <div className="space-y-4 font-mono">
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3">
        <div className="text-[10px] tracking-[0.2em] text-[#555555]">MARKETS</div>
        <h1 className="mt-2 text-lg tracking-[0.12em] text-[#e8e8e8]">PREDICTION TAPE</h1>
      </div>

      {error && (
        <div className="border border-[#8b3a3a] bg-[#0f0808] px-4 py-3 text-[11px] text-[#a76666]">
          feed error: {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricBox label="TOTAL SIGNALS" value={loading ? '...' : (data?.count ?? '--')} size="small" />
        <MetricBox label="24H VOLUME" value={data?.total_24h_volume || '--'} size="small" />
        <MetricBox label="CATEGORY" value={CATEGORY_LABELS[category] || category} size="small" />
        <MetricBox label="SORT" value={sortMode.toUpperCase()} size="small" />
      </div>

      <TerminalPanel title="FILTER CONSOLE" subtitle="LIVE /signals + /search">
        <div className="grid lg:grid-cols-3 gap-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void onSearch()
            }}
            placeholder="search keyword..."
            className="font-mono border border-[#1a1a1a] bg-transparent px-3 py-2 text-[11px] text-[#dddddd] placeholder:text-[#555555] outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as CategoryValue)}
            className="font-mono border border-[#1a1a1a] bg-[#0a0a0a] px-3 py-2 text-[11px] text-[#d0d0d0] outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c] || c}
              </option>
            ))}
          </select>
          <button onClick={() => void onSearch()} className="font-mono border border-[#1a1a1a] px-3 py-2 text-[11px] text-[#cccccc] hover:bg-[#101010]">
            {searchBusy ? 'SEARCHING...' : 'RUN SEARCH'}
          </button>
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setSortMode('volume')}
            className={`px-3 py-1 text-[10px] border ${sortMode === 'volume' ? 'border-[#777777] text-[#e8e8e8]' : 'border-[#1a1a1a] text-[#666666]'}`}
          >
            SORT BY VOLUME
          </button>
          <button
            onClick={() => setSortMode('score')}
            className={`px-3 py-1 text-[10px] border ${sortMode === 'score' ? 'border-[#777777] text-[#e8e8e8]' : 'border-[#1a1a1a] text-[#666666]'}`}
          >
            SORT BY TREND SCORE
          </button>
        </div>
      </TerminalPanel>

      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 flex flex-col gap-3">
          <TerminalPanel title="MARKET LIST" subtitle={loading ? 'SYNCING...' : `${rows.length} ITEMS`}>
            <div className="mb-3">
              <div className="rounded-xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => {
                    const active = category === c
                    return (
                      <CategoryPill
                        key={c}
                        category={c}
                        label={CATEGORY_LABELS[c] || c}
                        active={active}
                        onClick={() => onCategoryTabClick(c)}
                      />
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="h-[calc(100vh-26rem)] min-h-[260px] overflow-y-auto pr-1">
              {loading && !data ? (
                <div className="text-[11px] text-[#555555] animate-pulse">connecting to signal feed...</div>
              ) : (
                <div className="space-y-2">
                  {rows.map((item) => {
                    const active = selectedMarket?.id === item.id
                    const overridden = categoryOverrides.has(item.id)
                    const displayCat = overridden
                      ? categoryOverrides.get(item.id)!
                      : (item.category_label || item.category || '--')
                    const categoryKey = overridden
                      ? categoryOverrides.get(item.id)!
                      : (item.category || '')
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedMarket(item)
                          setIntelFetchNonce((n) => n + 1)
                        }}
                        className={`w-full text-left border p-3 transition-colors ${active ? 'border-[#777777] bg-[#111111]' : 'border-[#1a1a1a] hover:border-[#333333]'}`}
                      >
                        <div className="text-[11px] text-[#e8e8e8]">{item.title}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#666666]">
                          <CategoryPill category={categoryKey} label={displayCat} />
                          {overridden && <span className="text-[#555555]">[overridden]</span>}
                          <span>|</span>
                          <span>{item.volume?.['24h_display'] || '--'}</span>
                          <span>|</span>
                          <span>YES {item.market_probability?.yes || '--'}</span>
                          <span>|</span>
                          <span>SCORE {item.trending_score ?? 0}</span>
                        </div>
                      </button>
                    )
                  })}
                  {!rows.length && !loading && (
                    <div className="text-[11px] text-[#666666] animate-pulse">no results for current filter</div>
                  )}
                </div>
              )}
            </div>
          </TerminalPanel>

          {/* ── CATEGORISER ───────────────────────────────────── */}
          <TerminalPanel
            title="CATEGORISER"
            subtitle={
              selectedMarket
                ? `${selectedMarket.id.slice(0, 16)}… · ${overrideCount > 0 ? `${overrideCount} override${overrideCount > 1 ? 's' : ''}` : 'no overrides'}`
                : 'SELECT A MARKET'
            }
          >
            {!selectedMarket ? (
              <div className="text-[11px] text-[#555555]">select a market in the list above to assign a category</div>
            ) : (
              <div className="space-y-3">
                <div className="text-[11px] text-[#aaaaaa] leading-relaxed">
                  <span className="text-[#555555]">market: </span>
                  {selectedMarket.title?.slice(0, 80)}{(selectedMarket.title?.length ?? 0) > 80 ? '…' : ''}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#555555]">
                  <span>CURRENT:</span>
                  <span className="border border-[#333333] px-2 py-0.5 text-[#d0d0d0] tracking-[0.12em]">
                    {effectiveCategory}
                  </span>
                  {categoryOverrides.has(selectedMarket.id) && (
                    <button
                      onClick={() => {
                        setCategoryOverrides((prev) => {
                          const next = new Map(prev)
                          next.delete(selectedMarket.id)
                          return next
                        })
                      }}
                      className="ml-1 border border-[#3a1a1a] px-2 py-0.5 text-[#a76666] hover:bg-[#1a0a0a] tracking-[0.1em]"
                    >
                      RESET
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.filter((c) => c !== 'all').map((c) => {
                    const isActive = effectiveCategory === c
                    return (
                      <CategoryPill key={c} category={c} label={CATEGORY_LABELS[c]} active={isActive} onClick={() => assignCategory(c)} />
                    )
                  })}
                </div>
                {overrideCount > 0 && (
                  <button
                    onClick={() => setCategoryOverrides(new Map())}
                    className="text-[10px] text-[#555555] hover:text-[#888888] tracking-[0.1em] underline underline-offset-2"
                  >
                    clear all {overrideCount} override{overrideCount > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
          </TerminalPanel>
        </div>

        <TerminalPanel title="MARKET INTEL" subtitle={selectedMarket?.id || '--'} className="lg:col-span-7">
          <MarketIntelPanel
            market={selectedMarket}
            fetchNonce={intelFetchNonce}
            className="h-[calc(100vh-16rem)] min-h-[320px] font-mono"
          />
        </TerminalPanel>
      </div>
    </div>
  )
}
