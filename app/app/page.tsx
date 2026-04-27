'use client'

import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAPI } from '@/hooks/use-api'
import {
  getHostedSentiment,
  getHostedTop,
  getHostedTrendingDaily,
  searchHostedSignals,
  type HostedSignal,
} from '@/lib/api'
import { TerminalPanel, MetricBox } from '@/components/worldlens/terminal-panel'
import { HugeIcon } from '@/components/worldlens/huge-icon'
import { useRouter } from 'next/navigation'

const CATEGORY_ICON: Record<string, string> = {
  crypto: 'Bitcoin01Icon',
  economy: 'Analytics01Icon',
  politics: 'Flag01Icon',
  geopolitics: 'Globe02Icon',
  sports: 'FootballIcon',
  tech: 'ChipIcon',
}

function categoryIcon(category?: string | null) {
  return CATEGORY_ICON[(category ?? '').toLowerCase()] ?? 'Tag01Icon'
}

function scoreSeries(signals: HostedSignal[]) {
  return signals.slice(0, 8).map((s, idx) => ({
    idx: idx + 1,
    score: Number(s.trending_score ?? 0),
  }))
}

export default function OverviewPage() {
  }
