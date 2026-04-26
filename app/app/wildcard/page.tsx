'use client'

import { TerminalPanel, MetricBox, DataRow, ProgressBar } from '@/components/worldlens/terminal-panel'
import { Sparkline } from '@/components/worldlens/sparkline'
import { Shuffle, Zap, Radio, Globe, ExternalLink, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

const wildcardFeeds = [
  {
    id: 1,
    name: 'ISS Location Tracker',
    category: 'SPACE',
    status: 'live',
    dataPoints: '1,247',
    description: 'Real-time International Space Station position and crew activity',
    lastValue: 'LAT: 42.8°N, LON: 138.2°E',
  },
  {
    id: 2,
    name: 'Global Flight Radar',
    category: 'AVIATION',
    status: 'live',
    dataPoints: '892,450',
    description: 'Active commercial and private aircraft worldwide',
    lastValue: '12,847 aircraft tracked',
  },
  {
    id: 3,
    name: 'Earthquake Monitor',
    category: 'SEISMIC',
    status: 'live',
    dataPoints: '45,892',
    description: 'USGS earthquake detection and intensity mapping',
    lastValue: 'Last: M4.2, 12min ago',
  },
  {
    id: 4,
    name: 'Bitcoin Network',
    category: 'CRYPTO',
    status: 'live',
    dataPoints: '2.4M',
    description: 'Blockchain transactions and network health',
    lastValue: 'TPS: 7.2 | Mempool: 45MB',
  },
  {
    id: 5,
    name: 'Solar Activity',
    category: 'ASTRONOMY',
    status: 'live',
    dataPoints: '12,450',
    description: 'Solar flare activity and geomagnetic storm predictions',
    lastValue: 'Kp Index: 3 (Quiet)',
  },
  {
    id: 6,
    name: 'Container Ship Tracking',
    category: 'MARITIME',
    status: 'live',
    dataPoints: '156,789',
    description: 'Global shipping lanes and port congestion',
    lastValue: '52,450 vessels active',
  },
]

const unusualMetrics = [
  { label: 'Wikipedia Edits/Min', value: '432', trend: [400, 420, 415, 430, 425, 432] },
  { label: 'GitHub Commits/Hr', value: '1.2M', trend: [1.0, 1.1, 1.15, 1.18, 1.2, 1.2] },
  { label: 'Reddit Posts/Hr', value: '89K', trend: [82, 85, 87, 86, 88, 89] },
  { label: 'Tweets/Sec', value: '6,000', trend: [5500, 5800, 5900, 6100, 5950, 6000] },
]

const randomFacts = [
  { fact: 'There are currently 7,847 satellites orbiting Earth', source: 'ESA' },
  { fact: 'The global internet traffic is 4.8 exabytes per day', source: 'Cisco' },
  { fact: '500 hours of video are uploaded to YouTube every minute', source: 'YouTube' },
  { fact: 'The world produces 2.5 quintillion bytes of data daily', source: 'IBM' },
]

export default function WildcardPage() {
  const [selectedFeed, setSelectedFeed] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <div className="text-[9px] tracking-[0.3em] text-[#555555] mb-1">
            INTELLIGENCE LAYER
          </div>
          <h1 className="text-xl tracking-[0.15em] font-light">WILDCARD</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 border border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a] transition-colors">
            <Shuffle className="h-3 w-3 text-[#666666]" />
            <span className="text-[9px] tracking-[0.15em] text-[#888888]">RANDOM FEED</span>
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 border border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a] transition-colors">
            <RefreshCw className="h-3 w-3 text-[#666666]" />
            <span className="text-[9px] tracking-[0.15em] text-[#888888]">REFRESH ALL</span>
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="border border-[#1a1a1a] bg-[#0a0a0a] p-4">
        <p className="text-[11px] text-[#666666] leading-relaxed">
          WILDCARD aggregates unconventional and eclectic data sources that don&apos;t fit traditional categories. 
          Explore real-time feeds from space agencies, seismic monitors, blockchain networks, and other 
          unusual data streams that reveal hidden patterns in our world.
        </p>
      </div>

      {/* Unusual Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {unusualMetrics.map((metric, index) => (
          <div key={index} className="border border-[#1a1a1a] bg-[#0a0a0a] p-3">
            <div className="text-[9px] text-[#555555] mb-2">{metric.label.toUpperCase()}</div>
            <div className="flex items-end justify-between">
              <span className="text-[20px] tabular-nums font-light">{metric.value}</span>
              <Sparkline data={metric.trend} height={28} className="w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Feeds Grid */}
      <TerminalPanel title="AVAILABLE FEEDS" subtitle="UNCONVENTIONAL DATA">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wildcardFeeds.map((feed) => (
            <div
              key={feed.id}
              onClick={() => setSelectedFeed(selectedFeed === feed.id ? null : feed.id)}
              className={cn(
                'border p-4 cursor-pointer transition-all',
                selectedFeed === feed.id
                  ? 'border-[#333333] bg-[#111111]'
                  : 'border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#2a2a2a]'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-[8px] tracking-[0.2em] text-[#555555]">{feed.category}</span>
                  <h3 className="text-[12px] text-[#e8e8e8] mt-1">{feed.name}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 bg-[#888888] animate-pulse" />
                  <span className="text-[8px] text-[#666666] uppercase">{feed.status}</span>
                </div>
              </div>
              
              <p className="text-[10px] text-[#555555] mb-3 leading-relaxed">
                {feed.description}
              </p>
              
              <div className="flex items-center justify-between pt-3 border-t border-[#1a1a1a]">
                <span className="text-[9px] text-[#444444]">
                  {feed.dataPoints} data points
                </span>
                <span className="text-[9px] tabular-nums text-[#666666]">
                  {feed.lastValue}
                </span>
              </div>
            </div>
          ))}
        </div>
      </TerminalPanel>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Selected Feed Detail */}
        <div className="lg:col-span-2">
          <TerminalPanel
            title={selectedFeed ? wildcardFeeds.find(f => f.id === selectedFeed)?.name.toUpperCase() : 'SELECT A FEED'}
            subtitle={selectedFeed ? 'LIVE DATA' : 'NO FEED SELECTED'}
            status={selectedFeed ? 'active' : 'inactive'}
          >
            {selectedFeed ? (
              <div className="space-y-4">
                <div className="h-48 border border-[#1a1a1a] bg-[#050505] flex items-center justify-center">
                  <div className="text-center">
                    <Radio className="h-8 w-8 text-[#333333] mx-auto mb-3" />
                    <p className="text-[11px] text-[#555555]">
                      Live visualization would render here
                    </p>
                    <p className="text-[9px] text-[#444444] mt-1">
                      Connect to API for real data
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[9px] text-[#555555] mb-1">STATUS</div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 bg-[#888888]" />
                      <span className="text-[11px] text-[#888888]">STREAMING</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#555555] mb-1">LATENCY</div>
                    <div className="text-[11px] tabular-nums">45ms</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-[#555555] mb-1">UPTIME</div>
                    <div className="text-[11px] tabular-nums">99.94%</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Zap className="h-8 w-8 text-[#333333] mx-auto mb-3" />
                <p className="text-[11px] text-[#555555]">
                  Click on a feed above to view live data
                </p>
              </div>
            )}
          </TerminalPanel>
        </div>

        {/* Random Facts */}
        <div className="space-y-4">
          <TerminalPanel title="DATA FACTS" subtitle="CURIOSITIES">
            <div className="space-y-4">
              {randomFacts.map((item, index) => (
                <div key={index} className="pb-4 border-b border-[#111111] last:border-0 last:pb-0">
                  <p className="text-[11px] text-[#888888] mb-2 leading-relaxed">
                    {item.fact}
                  </p>
                  <span className="text-[9px] text-[#444444]">SOURCE: {item.source}</span>
                </div>
              ))}
            </div>
          </TerminalPanel>

          <TerminalPanel title="COVERAGE">
            <div className="space-y-3">
              <DataRow label="Active APIs" value="24" />
              <DataRow label="Data Sources" value="156" />
              <DataRow label="Countries" value="89" />
              <DataRow label="Update Frequency" value="REAL-TIME" />
            </div>
          </TerminalPanel>
        </div>
      </div>
    </div>
  )
}
