'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAPI } from '@/hooks/use-api'
import {
  getHostedSentiment,
  getHostedTop,
  getHostedTrendingDaily,
  searchHostedSignals,
  type HostedSignal,
} from '@/lib/api'
import { TerminalPanel, MetricBox } from '@/components/worldlens/terminal-panel'
import { HugeIcon } from '@/components/worldlens/huge-icon'
import { useRouter } from 'next/navigation'

const CATEGORY_ICON: Record<string, string> = {
  crypto: 'Bitcoin01Icon',
  economy: 'Analytics01Icon',
  politics: 'Flag01Icon',
  geopolitics: 'Globe02Icon',
  sports: 'FootballIcon',
  tech: 'ChipIcon',
}

function categoryIcon(category?: string | null) {
  return CATEGORY_ICON[(category ?? '').toLowerCase()] ?? 'Tag01Icon'
}

function scoreSeries(signals: HostedSignal[]) {
  return signals.slice(0, 8).map((s, idx) => ({
    idx: idx + 1,
    score: Number(s.trending_score ?? 0),
  }))
}

export default function OverviewPage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<HostedSignal[]>([])
  const [searching, setSearching] = useState(false)

  const { data: sentiment, loading: sentimentLoading } = useAPI(getHostedSentiment)
  const { data: topData, loading: topLoading } = useAPI(getHostedTop)
  const { data: trendingData } = useAPI(getHostedTrendingDaily)

  useEffect(() => {
    const cleaned = query.trim()
    if (!cleaned) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const data = await searchHostedSignals(cleaned, undefined, 6)
        setResults(data.results || [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const topSignals = topData?.signals || []
  const chartData = useMemo(() => scoreSeries(topSignals), [topSignals])

  return (
    <div className="space-y-4 font-mono">
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3">
        <div className="text-[10px] tracking-[0.2em] text-[#e8e8e8]">OVERVIEW</div>
        <h1 className="mt-2 text-lg tracking-[0.12em] text-[#e8e8e8]">WORLD PULSE</h1>
        <p className="mt-2 text-[11px] text-[#888888]">{sentiment?.headline || 'Loading global sentiment feed...'}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-[#e8e8e8]">
        <MetricBox label="24H VOLUME" value={sentiment?.total_24h_volume || '--'} size="small" />
        <MetricBox label="MARKETS" value={sentiment?.markets_analyzed ?? '--'} size="small" />
        <MetricBox label="RISING" value={trendingData?.summary?.rising_count ?? '--'} size="small" />
        <MetricBox label="HOT CATEGORY" value={trendingData?.summary?.hottest_label || '--'} size="small" />
      </div>

      <TerminalPanel title="SEARCH FEED" subtitle="LIVE /SEARCH">
        <div className="space-y-3 font-mono">
          <div className="flex items-center gap-2 border border-[#1a1a1a] px-3 py-2">
            <HugeIcon name="Search01Icon" size={14} className="text-[#e8e8e8]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search category, topic, keyword..."
              className="w-full bg-transparent text-[11px] text-[#d0d0d0] placeholder:text-[#e8e8e8] outline-none"
            />
            {searching && <span className="text-[10px] text-[#e8e8e8] animate-pulse">...</span>}
          </div>
          {!!results.length && (
            <div className="space-y-1 font-mono">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => router.push(`/app/signals?signal=${encodeURIComponent(item.id)}`)}
                  className="w-full text-left border border-[#1a1a1a] px-3 py-2 hover:bg-[#0d0d0d] transition-colors"
                >
                  <div className="text-[11px] text-[#e8e8e8]">{item.title}</div>
                  <div className="text-[10px] text-[#e8e8e8]">
                    {(item.category_label || item.category || '--').toUpperCase()} | SCORE {item.trending_score ?? 0}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </TerminalPanel>

      <div className="grid lg:grid-cols-3 gap-4">
        <TerminalPanel title="TOP MARKETS" subtitle={topLoading ? 'LOADING' : `${topSignals.length} ITEMS`} className="lg:col-span-2">
          <div className="space-y-2 font-mono">
            {(topSignals || []).slice(0, 5).map((item) => (
              <div key={item.id} className="border border-[#1a1a1a] p-3">
                <div className="text-[11px] text-[#e8e8e8]">{item.title}</div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-[#e8e8e8]">
                  <HugeIcon name={categoryIcon(item.category)} size={11} className="shrink-0 text-[#888888]" />
                  {item.category_label || item.category} | {item.volume?.['24h_display'] || '--'} | YES {item.market_probability?.yes || '--'}
                </div>
              </div>
            ))}
            {!topSignals.length && (sentimentLoading || topLoading) && (
              <div className="text-[11px] text-[#e8e8e8] animate-pulse">syncing terminal feed...</div>
            )}
          </div>
        </TerminalPanel>

        <TerminalPanel title="MOMENTUM" subtitle="TREND SCORE">
          <div className="h-44 font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="idx" tick={{ fontSize: 9, fill: '#555555' }} axisLine={{ stroke: '#1a1a1a' }} />
                <YAxis tick={{ fontSize: 9, fill: '#555555' }} axisLine={{ stroke: '#1a1a1a' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', fontSize: 10 }}
                  labelStyle={{ color: '#999999' }}
                />
                <Area type="monotone" dataKey="score" stroke="#b5b5b5" fill="#1b1b1b" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TerminalPanel>
      </div>

      {sentiment?.most_excited_about && (
        <TerminalPanel title="MARKET MOOD" subtitle="LIVE SENTIMENT SIGNALS">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="border border-[#1a1a1a] p-3">
              <div className="text-[9px] text-[#e8e8e8] mb-1 tracking-[0.15em]">MOST EXCITED ABOUT</div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#e8e8e8]">
                <HugeIcon name="FireIcon" size={13} className="shrink-0 text-[#b5b5b5]" />
                {sentiment.most_excited_about.label}
              </div>
              <div className="text-[10px] text-[#e8e8e8] mt-1">{sentiment.most_excited_about.reason}</div>
            </div>
            {sentiment.most_bullish_on && (
              <div className="border border-[#1a1a1a] p-3">
                <div className="text-[9px] text-[#e8e8e8] mb-1 tracking-[0.15em]">MOST BULLISH ON</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#e8e8e8]">
                  <HugeIcon name="ChartBarIncreasingIcon" size={13} className="shrink-0 text-[#b5b5b5]" />
                  {sentiment.most_bullish_on.label}
                </div>
                <div className="text-[10px] text-[#e8e8e8] mt-1">{sentiment.most_bullish_on.reason}</div>
              </div>
            )}
            {sentiment.most_nervous_about && (
              <div className="border border-[#1a1a1a] p-3">
                <div className="text-[9px] text-[#e8e8e8] mb-1 tracking-[0.15em]">MOST NERVOUS ABOUT</div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#e8e8e8]">
                  <HugeIcon name="Alert01Icon" size={13} className="shrink-0 text-[#b5b5b5]" />
                  {sentiment.most_nervous_about.label}
                </div>
                <div className="text-[10px] text-[#e8e8e8] mt-1">{sentiment.most_nervous_about.reason}</div>
              </div>
            )}
          </div>
        </TerminalPanel>
      )}
    </div>
  )
}
