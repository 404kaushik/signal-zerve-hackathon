import { cn } from '@/lib/utils'

type Pair = {
  a?: string
  b?: string
  pearson?: number
  lead_lag_days?: number
  n_obs?: number
}

function formatPair(pair: Pair): string {
  const a = pair.a || 'UNKNOWN_A'
  const b = pair.b || 'UNKNOWN_B'
  const corr = typeof pair.pearson === 'number' ? pair.pearson.toFixed(2) : 'n/a'
  const lead = typeof pair.lead_lag_days === 'number' ? `${pair.lead_lag_days}d` : 'n/a'
  const n = typeof pair.n_obs === 'number' ? String(pair.n_obs) : 'n/a'
  return `├── ${a.padEnd(8, ' ')}  ──${corr}──▶  ${b.padEnd(8, ' ')}  (lead ${lead} · n=${n})`
}

export function ConnectionsMap({ pairs, className }: { pairs: Pair[]; className?: string }) {
  return (
    <div className={cn('border border-[#1a1a1a] bg-[#0a0a0a] font-mono', className)}>
      <div className="border-b border-[#1a1a1a] p-3 text-[11px] text-[#888] tracking-[0.12em]">
        ▸ CONNECTIONS MAP
      </div>
      <div className="p-3 text-[11px] text-[#888] space-y-1 overflow-auto">
        {pairs.length === 0 ? (
          <div className="text-[#555]">▪ CONNECTIONS OFFLINE</div>
        ) : (
          pairs.slice(0, 10).map((pair, idx) => <div key={`${pair.a}-${pair.b}-${idx}`}>{formatPair(pair)}</div>)
        )}
      </div>
    </div>
  )
}
