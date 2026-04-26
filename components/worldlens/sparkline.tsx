'use client'

import { Area, AreaChart, Line, LineChart, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]
  type?: 'line' | 'area'
  color?: 'default' | 'alert' | 'muted'
  height?: number
  className?: string
}

export function Sparkline({
  data,
  type = 'line',
  color = 'default',
  height = 32,
  className,
}: SparklineProps) {
  const chartData = data.map((value, index) => ({ value, index }))
  
  const strokeColor = {
    default: '#888888',
    alert: '#8b3a3a',
    muted: '#444444',
  }[color]
  
  const fillColor = {
    default: 'rgba(136, 136, 136, 0.1)',
    alert: 'rgba(139, 58, 58, 0.2)',
    muted: 'rgba(68, 68, 68, 0.1)',
  }[color]

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'area' ? (
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1}
              fill={`url(#gradient-${color})`}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export function SignalWave({ bars = 5, active = true }: { bars?: number; active?: boolean }) {
  return (
    <div className="flex items-end gap-0.5 h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-0.5 bg-[#888888] origin-bottom',
            active && 'signal-bar'
          )}
          style={{
            height: `${40 + Math.random() * 60}%`,
            animationDelay: `${i * 0.15}s`,
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
    </div>
  )
}
