'use client'

import { useEffect, useMemo, useState } from 'react'

export function TypewriterLine({
  text,
  speedMin = 25,
  speedMax = 40,
  className = '',
}: {
  text: string
  speedMin?: number
  speedMax?: number
  className?: string
}) {
  const [visible, setVisible] = useState('')
  const [done, setDone] = useState(false)

  const chars = useMemo(() => text.split(''), [text])

  useEffect(() => {
    setVisible('')
    setDone(false)
    let i = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = () => {
      if (i >= chars.length) {
        setDone(true)
        return
      }
      const next = chars[i]
      setVisible((prev) => prev + next)
      i += 1
      const punctuationPause = /[.,:;!?]/.test(next) ? 90 : 0
      const jitter = Math.floor(Math.random() * Math.max(speedMax - speedMin, 1))
      timer = setTimeout(tick, speedMin + jitter + punctuationPause)
    }

    timer = setTimeout(tick, speedMin)
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [chars, speedMin, speedMax])

  return (
    <span className={className}>
      {visible}
      {!done && <span className="animate-pulse">▊</span>}
    </span>
  )
}
