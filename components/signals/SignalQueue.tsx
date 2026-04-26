'use client'

import { cn } from '@/lib/utils'
import type { Signal } from '@/lib/api'

export type SignalFilter = 'ALL' | 'FRED' | 'POLY' | 'RISK'

function sourceTag(signal: Signal): 'FRED' | 'POLY' {
  return signal.source.toLowerCase().includes('poly') ? 'POLY' : 'FRED'
}

function magnitudeBar(value: number): string {
  const clamped = Math.max(0, Math.min(1, value))
  const filled = Math.round(clamped * 10)
  return `${'▓'.repeat(filled)}${'░'.repeat(10 - filled)}`
}

export function filterSignals(signals: Signal[], filter: SignalFilter): Signal[] {
  if (filter === 'ALL') return signals
  if (filter === 'RISK') return signals.filter((s) => s.category.toLowerCase() === 'risk')
  return signals.filter((s) => sourceTag(s) === filter)
}

export function SignalQueue({
  signals,
  selectedId,
  onSelect,
  filter,
  onFilterChange,
  className,
}: {
  signals: Signal[]
  selectedId?: string
  onSelect: (signalId: string) => void
  filter: SignalFilter
  onFilterChange: (value: SignalFilter) => void
  className?: string
}) {
  const filters: SignalFilter[] = ['ALL', 'FRED', 'POLY', 'RISK']

  return (
    <div className={cn('border border-[#1a1a1a] bg-[#0a0a0a] font-mono', className)}>
      <div className="border-b border-[#1a1a1a] p-3 text-[11px] text-[#888] tracking-[0.12em]">
        ▸ SIGNAL QUEUE
      </div>
      <div className="p-3 border-b border-[#1a1a1a] flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item}
            onClick={() => onFilterChange(item)}
            className={cn(
              'px-2 py-1 text-[10px] border border-[#1a1a1a] text-[#888] tracking-[0.1em]',
              filter === item && 'bg-[#e8e8e8] text-[#0a0a0a] border-[#e8e8e8]'
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="max-h-[480px] overflow-auto">
        {signals.length === 0 ? (
          <div className="p-4 text-[11px] text-[#555]">▪ NO SIGNALS IN FEED</div>
        ) : (
          signals.slice(0, 10).map((signal, idx) => {
            const selected = signal.id === selectedId
            const sign = signal.direction === 'up' ? '▲' : signal.direction === 'down' ? '▼' : '■'
            const tag = sourceTag(signal)
            return (
              <button
                key={signal.id}
                onClick={() => onSelect(signal.id)}
                className={cn(
                  'w-full text-left px-3 py-2 border-b border-[#111111] text-[11px] text-[#888]',
                  selected && 'bg-[#e8e8e8] text-[#0a0a0a]'
                )}
              >
                <div className="truncate">
                  {String(idx + 1).padStart(2, '0')}  [{tag}]  {signal.label}  {sign}  {magnitudeBar(signal.magnitude)}
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
