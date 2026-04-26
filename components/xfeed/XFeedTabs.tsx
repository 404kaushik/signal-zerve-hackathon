'use client'

import { motion } from 'framer-motion'
import { SPRING_BAR } from '@/components/xfeed/_motion'

interface XFeedTabsProps {
  mode: 'for-you' | 'following'
  onChange: (mode: 'for-you' | 'following') => void
}

const TABS: Array<{ id: 'for-you' | 'following'; label: string; index: string }> = [
  { id: 'for-you', label: 'For You', index: '01' },
  { id: 'following', label: 'Following', index: '02' },
]

export function XFeedTabs({ mode, onChange }: XFeedTabsProps) {
  return (
    <div className="relative grid grid-cols-2 border-b border-white/[0.06] bg-black/20">
      {TABS.map((tab) => {
        const active = mode === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`group relative flex items-center justify-center gap-2.5 py-3.5 text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 ${
              active ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <span className="tabular-nums text-[10px] text-white/30 group-hover:text-white/50">
              {tab.index}
            </span>
            <span className="font-medium">{tab.label}</span>
            {active && (
              <motion.span
                layoutId="xfeed-tab-bar"
                className="absolute bottom-[-1px] left-1/2 h-[2px] w-24 -translate-x-1/2 bg-white"
                transition={SPRING_BAR}
              />
            )}
            {active && (
              <motion.span
                layoutId="xfeed-tab-glow"
                className="pointer-events-none absolute inset-x-8 bottom-0 h-10 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.08),transparent_70%)]"
                transition={SPRING_BAR}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
