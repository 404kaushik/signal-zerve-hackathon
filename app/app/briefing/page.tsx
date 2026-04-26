'use client'

import { useAPI } from '@/hooks/use-api'
import { getHostedSentiment, getHostedTop, getHostedTrendingDaily } from '@/lib/api'
import { TerminalPanel, MetricBox } from '@/components/worldlens/terminal-panel'

export default function BriefingPage() {
  const { data: sentiment, loading, error: sentimentError } = useAPI(getHostedSentiment)
  const { data: top, error: topError } = useAPI(getHostedTop)
  const { data: trending, error: trendingError } = useAPI(getHostedTrendingDaily)

  const rising = trending?.rising || []
  const topSignals = top?.signals || []
  const anyError = sentimentError || topError || trendingError

  return (
    <div className="space-y-4 font-mono">
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3">
        <div className="text-[10px] tracking-[0.2em] text-[#555555]">BRIEFING</div>
        <h1 className="mt-2 text-lg tracking-[0.12em] text-[#e8e8e8]">DAILY INTEL DIGEST</h1>
      </div>

      {anyError && (
        <div className="border border-[#8b3a3a] bg-[#0f0808] px-4 py-3 text-[11px] text-[#a76666]">
          feed error: {anyError}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricBox label="DATE" value={trending?.date || '--'} size="small" />
        <MetricBox label="24H VOLUME" value={sentiment?.total_24h_volume || '--'} size="small" />
        <MetricBox label="MARKETS" value={sentiment?.markets_analyzed ?? '--'} size="small" />
        <MetricBox label="RISING SIGNALS" value={trending?.summary?.rising_count ?? '--'} size="small" />
      </div>

      <TerminalPanel title="HEADLINE" subtitle="GLOBAL SENTIMENT">
        <p className="text-[12px] text-[#d6d6d6] leading-relaxed">
          {sentiment?.headline || (loading ? 'building briefing...' : 'no headline returned')}
        </p>
      </TerminalPanel>

      <div className="grid lg:grid-cols-2 gap-4">
        <TerminalPanel title="WHAT CHANGED TODAY" subtitle="RISING">
          <div className="space-y-2">
            {rising.slice(0, 6).map((item) => (
              <div key={item.id} className="border border-[#1a1a1a] p-3">
                <div className="text-[11px] text-[#e8e8e8]">{item.title}</div>
                <div className="text-[10px] text-[#666666] mt-1">
                  {item.category_emoji || ''} {item.category || '--'} | score {item.trending_score ?? 0} | Δ {item.daily_delta ?? '--'} {item.daily_direction || ''}
                </div>
              </div>
            ))}
            {!rising.length && (
              <div className="text-[11px] text-[#666666]">
                {loading ? <span className="animate-pulse">loading rising signals...</span> : 'no rising entries at this moment'}
              </div>
            )}
          </div>
        </TerminalPanel>

        <TerminalPanel title="TOP VOLUME MARKETS" subtitle="CURRENT">
          <div className="space-y-2">
            {topSignals.slice(0, 6).map((item) => (
              <div key={item.id} className="border border-[#1a1a1a] p-3">
                <div className="text-[11px] text-[#e8e8e8]">{item.title}</div>
                <div className="text-[10px] text-[#666666] mt-1">
                  {item.volume?.['24h_display'] || '--'} | YES {item.market_probability?.yes || '--'} | {item.signal?.crowd_read || '--'}
                </div>
              </div>
            ))}
            {!topSignals.length && (
              <div className="text-[11px] text-[#666666]">
                {loading ? <span className="animate-pulse">loading top markets...</span> : 'no top market rows available'}
              </div>
            )}
          </div>
        </TerminalPanel>
      </div>

      <TerminalPanel title="SENTIMENT BREAKDOWN" subtitle="BY CATEGORY">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(sentiment?.category_breakdown || {}).map(([key, cat]) => (
            <div key={key} className="border border-[#1a1a1a] p-3">
              <div className="text-[10px] text-[#555555] mb-1">
                {cat.emoji || ''} {cat.label || key.toUpperCase()}
              </div>
              <div className="text-[11px] text-[#d0d0d0]">{cat['24h_volume_display'] || '--'}</div>
              <div className="text-[10px] text-[#666666] mt-0.5">{cat.mood?.toUpperCase() || '--'} | {cat.market_count ?? 0} mkts</div>
            </div>
          ))}
          {!Object.keys(sentiment?.category_breakdown || {}).length && loading && (
            <div className="col-span-3 text-[11px] text-[#666666] animate-pulse">loading categories...</div>
          )}
        </div>
      </TerminalPanel>

      <TerminalPanel title="WHAT TO WATCH NEXT" subtitle="TOMORROW">
        <ul className="space-y-2 text-[11px] text-[#c9c9c9]">
          <li>- Monitor the top two rising signals for crowd probability shifts above 5 points.</li>
          <li>- Track whether hottest category leadership changes on the next daily refresh.</li>
          <li>- Recheck search for your theme to capture newly listed high-momentum markets.</li>
        </ul>
      </TerminalPanel>
    </div>
  )
}

