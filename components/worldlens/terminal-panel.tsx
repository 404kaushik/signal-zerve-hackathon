'use client'

import { cn } from '@/lib/utils'

interface TerminalPanelProps {
  title?: string
  subtitle?: string
  status?: 'active' | 'inactive' | 'alert' | 'loading'
  children: React.ReactNode
  className?: string
  headerRight?: React.ReactNode
  noPadding?: boolean
}

export function TerminalPanel({
  title,
  subtitle,
  status = 'active',
  children,
  className,
  headerRight,
  noPadding = false,
}: TerminalPanelProps) {
  return (
    <div
      className={cn(
        'liquid-glass relative border border-[#1a1a1a]',
        status === 'alert' && 'border-[#8b3a3a]/50',
        className
      )}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between border-b border-[#1a1a1a] px-3 py-1.5">
          <div className="flex items-center gap-3">
            <StatusIndicator status={status} />
            {title && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#888888]">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="text-[10px] text-[#555555]">{subtitle}</span>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div className={cn(!noPadding && 'p-3')}>{children}</div>
    </div>
  )
}

function StatusIndicator({ status }: { status: 'active' | 'inactive' | 'alert' | 'loading' }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          'h-1.5 w-1.5',
          status === 'active' && 'bg-[#e8e8e8]',
          status === 'inactive' && 'bg-[#333333]',
          status === 'alert' && 'bg-[#8b3a3a] alert-pulse',
          status === 'loading' && 'bg-[#888888] animate-pulse'
        )}
      />
    </div>
  )
}

export function MetricBox({
  label,
  value,
  unit,
  change,
  alert,
  size = 'default',
}: {
  label: string
  value: string | number
  unit?: string
  change?: { value: number; label?: string }
  alert?: boolean
  size?: 'small' | 'default' | 'large'
}) {
  return (
    <div className={cn(
      'liquid-glass border border-[#1a1a1a] p-2.5',
      alert && 'border-[#8b3a3a]/50'
    )}>
      <div className="mb-1 text-[9px] uppercase tracking-[0.2em] text-[#e8e8e8]">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn(
            'tabular-nums font-light',
            size === 'small' && 'text-lg',
            size === 'default' && 'text-2xl',
            size === 'large' && 'text-4xl',
            alert && 'text-[#c45050]'
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-[10px] text-[#555555] uppercase">{unit}</span>
        )}
      </div>
      {change && (
        <div
          className={cn(
            'text-[10px] mt-1 tabular-nums',
            change.value > 0 && 'text-[#888888]',
            change.value < 0 && 'text-[#8b3a3a]',
            change.value === 0 && 'text-[#555555]'
          )}
        >
          {change.value > 0 ? '+' : ''}
          {change.value}%{change.label && ` ${change.label}`}
        </div>
      )}
    </div>
  )
}

export function StatusPill({
  label,
  status,
}: {
  label: string
  status: 'online' | 'offline' | 'warning' | 'syncing'
}) {
  return (
    <div className="liquid-glass flex items-center gap-2 border border-[#1a1a1a] px-2 py-1">
      <div
        className={cn(
          'h-1.5 w-1.5',
          status === 'online' && 'bg-[#e8e8e8]',
          status === 'offline' && 'bg-[#333333]',
          status === 'warning' && 'bg-[#8b6b3a]',
          status === 'syncing' && 'bg-[#888888] animate-pulse'
        )}
      />
      <span className="text-[9px] uppercase tracking-[0.15em] text-[#e8e8e8]">
        {label}
      </span>
    </div>
  )
}

export function DataRow({
  label,
  value,
  alert,
  muted,
}: {
  label: string
  value: string | number
  alert?: boolean
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#111111] last:border-0">
      <span className={cn(
        'text-[11px] uppercase tracking-wide',
        muted ? 'text-[#e8e8e8]' : 'text-[#888888]'
      )}>
        {label}
      </span>
      <span
        className={cn(
          'text-[11px] tabular-nums',
          alert ? 'text-[#c45050]' : muted ? 'text-[#e8e8e8]' : 'text-[#e8e8e8]'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function ProgressBar({
  value,
  max = 100,
  alert,
  label,
}: {
  value: number
  max?: number
  alert?: boolean
  label?: string
}) {
  const percentage = (value / max) * 100
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#555555]">
            {label}
          </span>
          <span className="text-[9px] tabular-nums text-[#888888]">
            {value}/{max}
          </span>
        </div>
      )}
      <div className="h-1 bg-[#111111] relative overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-500',
            alert ? 'bg-[#8b3a3a]' : 'bg-[#888888]'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
