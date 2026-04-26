'use client'

import { useState } from 'react'
import { ChevronDown, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataSource {
  id: string
  name: string
  description: string
  type: 'economic' | 'market' | 'social' | 'intelligence'
  status: 'active' | 'loading' | 'error'
  cost?: 'free' | 'premium'
}

interface DataSourceSelectorProps {
  currentSources: string[]
  availableSources?: DataSource[]
  onSourceToggle: (sourceId: string) => void
  maxSources?: number
}

const DEFAULT_SOURCES: DataSource[] = [
  {
    id: 'fred',
    name: 'FRED Economic Data',
    description: 'Federal Reserve Economic Database - Real-time economic indicators',
    type: 'economic',
    status: 'active',
    cost: 'free'
  },
  {
    id: 'polymarket',
    name: 'Polymarket Intelligence',
    description: 'Decentralized prediction market data and sentiment analysis',
    type: 'market',
    status: 'active',
    cost: 'premium'
  },
  {
    id: 'kalshi',
    name: 'Kalshi Markets',
    description: 'CFTC-regulated prediction markets for real-world events',
    type: 'market',
    status: 'active',
    cost: 'premium'
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    description: 'Real-time and historical financial market data API',
    type: 'market',
    status: 'active',
    cost: 'free'
  },
  {
    id: 'reddit',
    name: 'Reddit Sentiment',
    description: 'Social media sentiment analysis across financial subreddits',
    type: 'social',
    status: 'loading',
    cost: 'free'
  },
  {
    id: 'openai-intel',
    name: 'OpenAI Intelligence Layer',
    description: 'Advanced AI analysis and pattern recognition systems',
    type: 'intelligence',
    status: 'active',
    cost: 'premium'
  }
]

export function DataSourceSelector({
  currentSources = [],
  availableSources = DEFAULT_SOURCES,
  onSourceToggle,
  maxSources = 4
}: DataSourceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredSources = availableSources.filter(source =>
    source.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    source.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeColor = (type: DataSource['type']) => {
    switch (type) {
      case 'economic': return 'text-blue-400 border-blue-400/50'
      case 'market': return 'text-green-400 border-green-400/50'
      case 'social': return 'text-purple-400 border-purple-400/50'
      case 'intelligence': return 'text-red-400 border-red-400/50'
      default: return 'text-gray-400 border-gray-400/50'
    }
  }

  const getStatusIcon = (status: DataSource['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'loading':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
    }
  }

  const selectedSources = availableSources.filter(source => 
    currentSources.includes(source.id)
  )

  const canAddMore = currentSources.length < maxSources

  return (
    <div className="relative font-mono">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between p-4 bg-black/90 border border-green-500/30',
          'rounded-lg hover:border-green-500/50 transition-colors text-green-400',
          isOpen && 'border-green-500/50 shadow-lg shadow-green-500/20'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <div className="text-left">
            <div className="text-sm uppercase tracking-wider">DATA SOURCES</div>
            <div className="text-xs text-green-300 mt-1">
              {currentSources.length}/{maxSources} ACTIVE
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {selectedSources.slice(0, 3).map((source, index) => (
              <div
                key={source.id}
                className={cn(
                  'w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-xs font-bold',
                  getTypeColor(source.type)
                )}
                title={source.name}
              >
                {source.name[0]}
              </div>
            ))}
            {selectedSources.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-green-400/50 bg-green-400/20 flex items-center justify-center text-xs text-green-400">
                +{selectedSources.length - 3}
              </div>
            )}
          </div>
          <ChevronDown 
            className={cn('w-5 h-5 transition-transform', isOpen && 'rotate-180')} 
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 border border-green-500/30 rounded-lg shadow-xl shadow-green-500/20 z-50 overflow-hidden">
          {/* Search */}
          <div className="p-4 border-b border-green-500/20">
            <input
              type="text"
              placeholder="SEARCH INTELLIGENCE SOURCES..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border border-green-500/30 rounded px-3 py-2 text-green-400 placeholder-green-500/50 focus:border-green-500/50 focus:outline-none"
            />
          </div>

          {/* Source List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredSources.map((source) => {
              const isSelected = currentSources.includes(source.id)
              const isDisabled = !isSelected && !canAddMore

              return (
                <div
                  key={source.id}
                  className={cn(
                    'flex items-center justify-between p-4 border-b border-green-500/10 last:border-b-0',
                    'hover:bg-green-500/5 transition-colors cursor-pointer',
                    isSelected && 'bg-green-500/10',
                    isDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  onClick={() => !isDisabled && onSourceToggle(source.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {/* Status Icon */}
                    {getStatusIcon(source.status)}
                    
                    {/* Source Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-medium">
                          {source.name}
                        </span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs border uppercase tracking-wider',
                          getTypeColor(source.type)
                        )}>
                          {source.type}
                        </span>
                        {source.cost === 'premium' && (
                          <span className="px-2 py-0.5 rounded text-xs bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 uppercase">
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-green-300/70 mt-1">
                        {source.description}
                      </div>
                    </div>
                  </div>

                  {/* Selection Checkbox */}
                  <div className={cn(
                    'w-5 h-5 border-2 rounded flex items-center justify-center ml-3',
                    isSelected 
                      ? 'bg-green-400 border-green-400' 
                      : 'border-green-500/30 hover:border-green-500/50'
                  )}>
                    {isSelected && (
                      <CheckCircle2 className="w-3 h-3 text-black" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-green-500/20 bg-green-500/5">
            <div className="flex items-center justify-between text-xs text-green-400/70">
              <span>
                SOURCES SELECTED: {currentSources.length}/{maxSources}
              </span>
              <span>
                CLASSIFICATION: {selectedSources.some(s => s.cost === 'premium') ? 'PREMIUM' : 'STANDARD'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}