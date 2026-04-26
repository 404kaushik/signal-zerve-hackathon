'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Alert01Icon,
  AnalyticsDownIcon,
  Analytics01Icon,
  AnalyticsUpIcon,
  Bitcoin01Icon,
  Cancel01Icon,
  ChartBarIncreasingIcon,
  ChartCandlestickIcon,
  ChipIcon,
  CommandLineIcon,
  File02Icon,
  FireIcon,
  Flag01Icon,
  FootballIcon,
  Globe02Icon,
  Menu01Icon,
  Pulse01Icon,
  Search01Icon,
  Tag01Icon,
} from '@hugeicons/core-free-icons'

interface Props {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
}

export function HugeIcon({ name, size = 16, className, strokeWidth = 1.6 }: Props) {
  const map: Record<string, unknown> = {
    Alert01Icon,
    AnalyticsDownIcon,
    Analytics01Icon,
    AnalyticsUpIcon,
    Bitcoin01Icon,
    Cancel01Icon,
    ChartBarIncreasingIcon,
    ChartCandlestickIcon,
    ChipIcon,
    CommandLineIcon,
    File02Icon,
    FireIcon,
    Flag01Icon,
    FootballIcon,
    Globe02Icon,
    Menu01Icon,
    Pulse01Icon,
    Search01Icon,
    Tag01Icon,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icon = (map[name] ?? Search01Icon) as any
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={strokeWidth} className={className} />
}

