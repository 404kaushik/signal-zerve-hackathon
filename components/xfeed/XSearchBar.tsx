'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Search01Icon,
  Image01Icon,
  AiBrain03Icon,
  Link02Icon,
  ArrowTurnBackwardIcon,
  Loading03Icon,
  FeatherIcon,
} from '@hugeicons/core-free-icons'
import { T_FAST, T_BASE } from '@/components/xfeed/_motion'

interface XSearchBarProps {
  running: boolean
  onSearch: (topic: string) => void
  onClearSearch: () => void
  searchMode: boolean
  searchTopicValue: string
}

export function XSearchBar({
  running,
  onSearch,
  onClearSearch,
  searchMode,
  searchTopicValue,
}: XSearchBarProps) {
  const [topic, setTopic] = useState('')
  const [focused, setFocused] = useState(false)

  const submit = () => {
    const clean = topic.trim()
    if (!clean || running) return
    onSearch(clean)
    setTopic('')
  }

  return (
    <div className="border-b border-white/[0.06] bg-black/20 px-5 py-4">
      <AnimatePresence initial={false}>
        {searchMode && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={T_BASE}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between border border-white/[0.08] bg-black/40 px-3 py-2 text-[11px] uppercase tracking-[0.16em]">
              <span className="flex items-center gap-2 text-white/50">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                Investigating
                <span className="font-semibold normal-case tracking-normal text-white">
                  {searchTopicValue}
                </span>
              </span>
              <button
                type="button"
                onClick={onClearSearch}
                className="flex items-center gap-1.5 text-white/60 transition-colors hover:text-white"
              >
                <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={14} strokeWidth={1.6} />
                Back
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-stretch gap-3">
        <div className="relative flex-1">
          <div
            className={`flex items-center gap-2.5 border bg-black/40 px-3.5 py-3 transition-all duration-200 ${
              focused
                ? 'border-white/30 bg-black/60 shadow-[0_0_0_4px_rgba(255,255,255,0.04)]'
                : 'border-white/[0.08] hover:border-white/[0.14]'
            }`}
          >
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              strokeWidth={1.6}
              className={focused ? 'text-white' : 'text-white/40'}
            />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
              placeholder="Investigate a topic — deep research across personas"
              className="w-full bg-transparent text-[14px] text-white outline-none placeholder:text-white/30"
            />
            {topic && (
              <span className="shrink-0 border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/50">
                ⏎
              </span>
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-4">
            {[
              { icon: AiBrain03Icon, label: 'Analyze' },
              { icon: Image01Icon, label: 'Attach' },
              { icon: Link02Icon, label: 'Reference' },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                className="group flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/40 transition-colors duration-200 hover:text-white"
              >
                <HugeiconsIcon
                  icon={action.icon}
                  size={13}
                  strokeWidth={1.6}
                  className="transition-transform duration-200 group-hover:-translate-y-[1px]"
                />
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          type="button"
          disabled={running || !topic.trim()}
          onClick={submit}
          whileTap={running ? undefined : { scale: 0.97 }}
          transition={T_FAST}
          className="group relative flex h-[46px] shrink-0 items-center gap-2 self-start border border-white/15 bg-white px-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition-all duration-200 hover:bg-white/90 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/40"
        >
          {running ? (
            <>
              <HugeiconsIcon
                icon={Loading03Icon}
                size={14}
                strokeWidth={1.8}
                className="animate-spin"
              />
              Transmitting
            </>
          ) : (
            <>
              <HugeiconsIcon
                icon={FeatherIcon}
                size={14}
                strokeWidth={1.8}
                className="transition-transform duration-200 group-hover:-rotate-12"
              />
              Transmit
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
}
