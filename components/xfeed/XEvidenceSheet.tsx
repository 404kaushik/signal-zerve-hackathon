'use client'

import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRightIcon, LinkSquare01Icon } from '@hugeicons/core-free-icons'
import type { XEvidenceItem } from '@/lib/api'
import { expandPanel } from '@/components/xfeed/_motion'

function stanceStyle(stance?: string): { dot: string; label: string } {
  if (stance?.includes('left')) return { dot: '#8ab4f8', label: 'left' }
  if (stance?.includes('right')) return { dot: '#e8a3b8', label: 'right' }
  if (stance === 'center') return { dot: '#7bc49a', label: 'center' }
  if (stance === 'mixed') return { dot: '#e4c590', label: 'mixed' }
  return { dot: '#a8a8a8', label: stance || 'source' }
}

interface XEvidenceSheetProps {
  evidence: XEvidenceItem[]
}

export function XEvidenceSheet({ evidence }: XEvidenceSheetProps) {
  return (
    <motion.div
      key="evidence"
      variants={expandPanel}
      initial="hidden"
      animate="show"
      exit="exit"
      className="mt-3 overflow-hidden border border-white/[0.07] bg-black/40"
    >
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2 text-[10px] font-sans uppercase tracking-[0.18em] text-white/45">
        <span className="flex items-center gap-2">
          <HugeiconsIcon icon={LinkSquare01Icon} size={11} strokeWidth={1.8} />
          Sources &amp; Evidence
        </span>
        <span className="tabular-nums text-white/35">
          {String(evidence.length).padStart(2, '0')} cited
        </span>
      </div>
      <div>
        {evidence.slice(0, 5).map((ev, idx) => {
          const s = stanceStyle(ev.stance)
          return (
            <a
              key={`${ev.url}-${idx}`}
              href={ev.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-start gap-3 border-b border-white/[0.04] px-3 py-2.5 transition-colors duration-200 last:border-b-0 hover:bg-white/[0.03]"
            >
              <span className="mt-1 font-sans text-[10px] tabular-nums text-white/30">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[10px] font-sans uppercase tracking-[0.14em] text-white/50">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: s.dot }}
                  />
                  <span className="font-semibold text-white/70">{ev.domain || 'source'}</span>
                  {ev.stance && (
                    <span className="border border-white/10 bg-white/[0.03] px-1.5 py-[1px] text-[9px] normal-case tracking-[0.12em]">
                      {s.label}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-white/85 line-clamp-2">
                  {ev.title || ev.url}
                </span>
              </span>
              <HugeiconsIcon
                icon={ArrowUpRightIcon}
                size={13}
                strokeWidth={1.8}
                className="mt-1 shrink-0 text-white/25 transition-all duration-200 group-hover:-translate-y-[2px] group-hover:translate-x-[2px] group-hover:text-white"
              />
            </a>
          )
        })}
      </div>
    </motion.div>
  )
}
