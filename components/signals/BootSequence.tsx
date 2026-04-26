'use client'

import { useEffect, useState } from 'react'

const DEFAULT_LINES = [
  '> FRED ............ OK',
  '> POLYMARKET ...... OK',
  '> ENGINE .......... OK',
  '> GROK ............ READY',
]

export function BootSequence({
  lines = DEFAULT_LINES,
  intervalMs = 150,
  className = '',
}: {
  lines?: string[]
  intervalMs?: number
  className?: string
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(0)
    const timer = setInterval(() => {
      setCount((prev) => {
        if (prev >= lines.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, intervalMs)
    return () => clearInterval(timer)
  }, [lines, intervalMs])

  return (
    <div className={`font-mono text-[#888] text-[12px] leading-6 ${className}`}>
      {lines.slice(0, count).map((line) => (
        <div key={line}>{line}</div>
      ))}
      {count < lines.length && <div className="animate-pulse text-[#555]">▊</div>}
    </div>
  )
}
