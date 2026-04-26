'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAPI } from '@/hooks/use-api'
import { getHostedSignals } from '@/lib/api'
import { TerminalPanel } from '@/components/worldlens/terminal-panel'

export default function SignalsPage() {
  const params = useSearchParams()
  const { data, loading, error } = useAPI(getHostedSignals)
  const [category, setCategory] = useState('all')
  const selectedFromQuery = params.get('signal')

  const signals = data?.signals || []
  const filtered = useMemo(
    () => (category === 'all' ? signals : signals.filter((s) => s.category === category)),
    [signals, category]
  )

  const selected = useMemo(() => {
    if (!filtered.length) return null
    if (selectedFromQuery) return filtered.find((s) => s.id === selectedFromQuery) || filtered[0]
    return filtered[0]
  }, [filtered, selectedFromQuery])

  if (loading) {
    return (
      <div className="font-mono border border-[#1a1a1a] bg-[#0a0a0a] p-4 text-[11px] text-[#666666] animate-pulse">
        syncing signal queue...
      </div>
    )
  }

  if (error) {
    return <div className="font-mono border border-[#8b3a3a] bg-[#0f0808] p-4 text-[11px] text-[#a76666]">{error}</div>
  }

  return (
    <div className="space-y-4 font-mono">
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] px-4 py-3">
        <div className="text-[10px] tracking-[0.2em] text-[#555555]">SIGNALS</div>
        <h1 className="mt-2 text-lg tracking-[0.12em] text-[#e8e8e8]">DEEP DIVE QUEUE</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'crypto', 'economy', 'politics', 'geopolitics', 'sports', 'tech'].map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 text-[10px] border ${c === category ? 'border-[#777777] text-[#e8e8e8]' : 'border-[#1a1a1a] text-[#666666]'}`}
          >
            {c.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <TerminalPanel title="QUEUE" subtitle={`${filtered.length} ITEMS`} className="lg:col-span-4">
          <div className="max-h-[calc(100vh-16rem)] space-y-2 overflow-auto pr-1">
            {filtered.map((item) => {
              const active = selected?.id === item.id
              return (
                <div key={item.id} className={`border p-2 ${active ? 'border-[#777777] bg-[#111111]' : 'border-[#1a1a1a]'}`}>
                  <div className="text-[11px] text-[#e8e8e8]">{item.title}</div>
                  <div className="mt-1 text-[10px] text-[#666666]">
                    {item.category_emoji || ''} {item.category || '--'} | {item.market_probability?.yes || '--'}
                  </div>
                </div>
              )
            })}
          </div>
        </TerminalPanel>

        <TerminalPanel title="SELECTED SIGNAL" subtitle={selected?.id || '--'} className="lg:col-span-8">
          {selected ? (
            <div className="space-y-3">
              <div className="text-[13px] text-[#e8e8e8]">{selected.title}</div>
              <div className="text-[11px] text-[#777777]">
                {selected.category_label || selected.category} | trend score {selected.trending_score ?? 0}
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="border border-[#1a1a1a] p-3">
                  <div className="text-[10px] text-[#555555] mb-1">CROWD PROBABILITY</div>
                  <div className="text-[12px] text-[#d7d7d7]">YES {selected.market_probability?.yes || '--'}</div>
                  <div className="text-[11px] text-[#777777] mt-1">NO {selected.market_probability?.no || '--'}</div>
                </div>
                <div className="border border-[#1a1a1a] p-3">
                  <div className="text-[10px] text-[#555555] mb-1">PUBLIC ATTENTION</div>
                  <div className="text-[12px] text-[#d7d7d7]">{selected.public_attention?.current_interest ?? '--'}/100</div>
                  <div className="text-[11px] text-[#777777] mt-1">
                    {(selected.public_attention?.['7d_trend'] || '--').toUpperCase()} | Δ {selected.public_attention?.daily_delta ?? '--'}
                  </div>
                </div>
              </div>
              <div className="border border-[#1a1a1a] p-3">
                <div className="text-[10px] text-[#555555] mb-1">READ</div>
                <div className="text-[11px] text-[#cccccc]">{selected.signal?.crowd_read || 'No crowd summary for this market yet.'}</div>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-[#666666] animate-pulse">no signal selected</div>
          )}
        </TerminalPanel>
      </div>
    </div>
  )
}

