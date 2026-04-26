'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BootSequenceProps {
  onComplete: () => void
}

const bootMessages = [
  { text: 'INITIALIZING SIGNAL CORE SYSTEM', delay: 0 },
  { text: 'LOADING GLOBAL DATA ARCHITECTURE', delay: 400 },
  { text: 'CONNECTING ECONOMIC SIGNAL FEEDS', delay: 800 },
  { text: 'MAPPING MARKET PROBABILITY VECTORS', delay: 1200 },
  { text: 'SYNCING CLIMATE OBSERVATION LAYER', delay: 1600 },
  { text: 'INGESTING CULTURAL SENTIMENT STREAMS', delay: 2000 },
  { text: 'CALIBRATING PREDICTION ENGINES', delay: 2400 },
  { text: 'ESTABLISHING SECURE CHANNELS', delay: 2800 },
  { text: 'SYSTEM INTEGRITY CHECK COMPLETE', delay: 3200 },
  { text: 'ALL INTELLIGENCE LAYERS ONLINE', delay: 3600 },
]

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number[]>([])
  const [showReady, setShowReady] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    bootMessages.forEach((msg, index) => {
      setTimeout(() => {
        setVisibleLines((prev) => [...prev, index])
        setProgress(((index + 1) / bootMessages.length) * 100)
      }, msg.delay)
    })

    setTimeout(() => {
      setShowReady(true)
    }, 4200)
  }, [])

  return (
    <div className="dot-grid relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-8 font-mono">
      {/* Coordinate grid overlay */}
      <div className="coord-grid pointer-events-none absolute inset-0 opacity-20" />

      {/* Scanlines */}
      <div className="scanlines pointer-events-none absolute inset-0" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="liquid-glass mx-16 mb-8 p-5 text-center"
        >
          <div className="mb-3 text-[9px] tracking-[0.5em] text-[#e8e8e8]">
            GLOBAL INTELLIGENCE SYSTEM
          </div>
          <div className="mb-2 flex items-center justify-center gap-3">
            <h1 className="font-light tracking-[0.3em] text-[#e8e8e8] text-4xl md:text-5xl">
              SIGNAL
            </h1>
          </div>
          <div className="text-[9px] tracking-[0.3em] text-[#e8e8e8]">
            VERSION 2.4.1 // SECURE TERMINAL
          </div>
        </motion.div>

        {/* Boot messages panel */}
        <div className="liquid-glass mb-8 border border-[#1a1a1a] p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-[#111111] pb-3">
            <div className="h-1.5 w-1.5 animate-pulse bg-[#e8e8e8]" />
            <span className="text-[9px] tracking-[0.3em] text-[#e8e8e8]">
              SYSTEM INITIALIZATION
            </span>
          </div>

          <div className="mb-6 h-[220px] space-y-1 overflow-hidden">
            {bootMessages.map((msg, index) => (
              <AnimatePresence key={index}>
                {visibleLines.includes(index) && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-3"
                  >
                    <span className="w-12 tabular-nums text-[9px] text-[#e8e8e8]">
                      {String(index + 1).padStart(2, '0')}.
                      {String(Math.floor(Math.random() * 99)).padStart(2, '0')}
                    </span>
                    <span className="text-[10px] tracking-wide text-[#e8e8e8]">
                      {msg.text}
                    </span>
                    <span className="ml-auto text-[9px] text-[#e8e8e8]">
                      [OK]
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[9px]">
              <span className="tracking-[0.2em] text-[#e8e8e8]">LOADING</span>
              <span className="tabular-nums text-[#e8e8e8]">{Math.floor(progress)}%</span>
            </div>
            <div className="h-0.5 overflow-hidden bg-[#111111]">
              <motion.div
                className="h-full bg-[#e8e8e8]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Reserved slot — fixed height prevents header/panel from shifting */}
        <div className="h-40">
          <AnimatePresence>
            {showReady && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center"
              >
                <div className="mb-6 text-[10px] tracking-[0.3em] text-[#e8e8e8]">
                  SYSTEM READY
                </div>

                <button
                  onClick={onComplete}
                  className={cn(
                    'liquid-glass group relative border border-[#333333] px-12 py-4',
                    'font-mono text-[11px] tracking-[0.3em] text-[#e8e8e8]',
                    'transition-all duration-300 hover:border-[#aaaaaa]'
                  )}
                >
                  <span className="relative z-10">ENTER INTERFACE</span>
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-[#aaaaaa] to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-[#aaaaaa] to-transparent" />
                  </div>
                </button>

                <div className="mt-6 flex items-center justify-center gap-6 text-[8px] tracking-[0.2em] text-[#e8e8e8]">
                  <span>47 ACTIVE FEEDS</span>
                  <span>|</span>
                  <span>LATENCY: 12MS</span>
                  <span>|</span>
                  <span>ENCRYPTION: AES-256</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Corner coordinates */}
      <div className="absolute left-4 top-4 text-[8px] tracking-[0.2em] text-[#e8e8e8]">
        00.0000°N
      </div>
      <div className="absolute right-4 top-4 text-[8px] tracking-[0.2em] text-[#e8e8e8]">
        00.0000°E
      </div>
      <div className="absolute bottom-4 left-4 text-[8px] tracking-[0.2em] text-[#e8e8e8]">
        SECURE CHANNEL
      </div>
      <div className="absolute bottom-4 right-4 text-[8px] tracking-[0.2em] text-[#e8e8e8]">
        NODE: PRIMARY
      </div>
    </div>
  )
}
