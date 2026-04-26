'use client'

import { useEffect, useState, useMemo } from 'react'
import { SignalWave } from './sparkline'
import { getHostedSentiment, getHostedTrendingDaily, type HostedSentimentData, type HostedTrendingData } from '@/lib/api'

export function StatusBar() {
  const [time, setTime] = useState<string>('')
  const [date, setDate] = useState<string>('')
  const [sentiment, setSentiment] = useState<HostedSentimentData | null>(null)
  const [trending, setTrending] = useState<HostedTrendingData | null>(null)

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
          timeZone: 'UTC',
        })
      )
      setDate(
        now.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          timeZone: 'UTC',
        }).toUpperCase()
      )
    }
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [sent, trend] = await Promise.all([getHostedSentiment(), getHostedTrendingDaily()])
        setSentiment(sent)
        setTrending(trend)
      } catch {
        // Silent fail - status bar should not block UI
      }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 45000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="liquid-glass-strong flex h-8 items-center justify-between border-b border-[#1a1a1a] px-4">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 bg-[#888888] animate-pulse" />
          <span className="text-[9px] tracking-[0.2em] text-[#e8e8e8]">
            GLOBAL INTELLIGENCE TERMINAL |
          </span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[9px] text-[#e8e8e8]">
          <span>MARKETS: <span className="text-[#e8e8e8] tabular-nums">{sentiment?.markets_analyzed ?? '--'}</span></span>
          <span className="text-[#e8e8e8]">|</span>
          <span>HOT: <span className="text-[#e8e8e8]">{trending?.summary?.hottest_label ?? 'CONNECTING...'}</span></span>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-3">
          <SignalWave bars={4} active />
          <span className="text-[9px] tracking-[0.15em] text-[#ffffff]">
            {sentiment ? 'LIVE FEED' : 'CONNECTING'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] tabular-nums">
          <span className="text-[#e8e8e8]">{date}</span>
          <span className="text-[#e8e8e8] font-medium">{time}</span>
          <span className="text-[9px] text-[#e8e8e8]">UTC</span>
        </div>
      </div>
    </header>
  )
}

export function TransmissionTicker() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sentiment, setSentiment] = useState<HostedSentimentData | null>(null)
  const [trending, setTrending] = useState<HostedTrendingData | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [sent, trend] = await Promise.all([getHostedSentiment(), getHostedTrendingDaily()])
        setSentiment(sent)
        setTrending(trend)
      } catch { /* silent */ }
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 45000)
    return () => clearInterval(interval)
  }, [])

  const messages = useMemo(() => {
    if (!sentiment || !trending) return ['CONNECTING TO SIGNAL API...']
    const msgs: string[] = []
    msgs.push(sentiment.headline || 'Live prediction signals online.')
    msgs.push(`TOTAL VOLUME: ${sentiment.total_24h_volume || '--'} | MARKETS: ${sentiment.markets_analyzed ?? '--'}`)
    msgs.push(`RISING NOW: ${trending.summary?.rising_count ?? 0} | HOTTEST: ${trending.summary?.hottest_label || '--'}`)
    if (trending.rising?.length) {
      msgs.push(`WATCH: ${trending.rising[0]?.title || '--'}`)
    }
    return msgs.length > 0 ? msgs : ['SIGNAL ONLINE — MONITORING GLOBAL FEEDS']
  }, [sentiment, trending])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % messages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [messages.length])

  return (
    <div className="liquid-glass-strong flex h-5 items-center overflow-hidden border-t border-[#1a1a1a] px-4">
      <div className="flex items-center gap-3 text-[9px]">
        <span className="text-[#e8e8e8] tracking-[0.2em]">TRANSMISSION</span>
        <div className="h-1 w-1 bg-[#888888] animate-pulse" />
        <span className="text-[#e8e8e8] tracking-wide">
          {messages[currentIndex]}
        </span>
      </div>
    </div>
  )
}
