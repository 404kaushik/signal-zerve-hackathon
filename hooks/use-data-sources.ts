'use client'

import { useState, useCallback, useEffect } from 'react'

export interface DataSource {
  id: string
  name: string
  enabled: boolean
  status: 'connected' | 'error' | 'loading'
  lastUpdated: Date | null
  errorMessage?: string
}

export interface UseDataSourcesReturn {
  sources: DataSource[]
  toggleSource: (sourceId: string) => void
  refreshSource: (sourceId: string) => void
  enabledSources: string[]
}

const DEFAULT_SOURCES: Omit<DataSource, 'enabled' | 'status' | 'lastUpdated'>[] = [
  {
    id: 'fred',
    name: 'FRED Economic Data'
  },
  {
    id: 'polymarket',
    name: 'Polymarket Intelligence'
  },
  {
    id: 'kalshi',
    name: 'Kalshi Markets'
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage'
  },
  {
    id: 'reddit',
    name: 'Reddit Sentiment'
  },
  {
    id: 'openai-intel',
    name: 'OpenAI Intelligence Layer'
  }
]

export function useDataSources(initialSources: string[] = []): UseDataSourcesReturn {
  const [sources, setSources] = useState<DataSource[]>(() =>
    DEFAULT_SOURCES.map(source => ({
      ...source,
      enabled: initialSources.includes(source.id),
      status: 'loading' as const,
      lastUpdated: null
    }))
  )

  // Check source connectivity on mount and when sources change
  const checkSourceStatus = useCallback(async (sourceId: string) => {
    setSources(prev =>
      prev.map(source =>
        source.id === sourceId
          ? { ...source, status: 'loading', errorMessage: undefined }
          : source
      )
    )

    try {
      // Simulate API call to check source status
      const response = await fetch(`/api/data-sources/${sourceId}/status`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      setSources(prev =>
        prev.map(source =>
          source.id === sourceId
            ? {
                ...source,
                status: data.connected ? 'connected' : 'error',
                lastUpdated: new Date(),
                errorMessage: data.error || undefined
              }
            : source
        )
      )
    } catch (error) {
      console.error(`Error checking ${sourceId} status:`, error)
      
      setSources(prev =>
        prev.map(source =>
          source.id === sourceId
            ? {
                ...source,
                status: 'error',
                lastUpdated: new Date(),
                errorMessage: error instanceof Error ? error.message : 'Connection failed'
              }
            : source
        )
      )
    }
  }, [])

  // Toggle source enabled state
  const toggleSource = useCallback((sourceId: string) => {
    setSources(prev =>
      prev.map(source => {
        if (source.id === sourceId) {
          const newEnabled = !source.enabled
          
          // If enabling, check status immediately
          if (newEnabled) {
            setTimeout(() => checkSourceStatus(sourceId), 100)
          }
          
          return { ...source, enabled: newEnabled }
        }
        return source
      })
    )
  }, [checkSourceStatus])

  // Refresh a specific source
  const refreshSource = useCallback((sourceId: string) => {
    checkSourceStatus(sourceId)
  }, [checkSourceStatus])

  // Get list of enabled source IDs
  const enabledSources = sources
    .filter(source => source.enabled)
    .map(source => source.id)

  // Initial status check for enabled sources
  useEffect(() => {
    const enabledSourceIds = sources
      .filter(source => source.enabled)
      .map(source => source.id)
    
    enabledSourceIds.forEach(sourceId => {
      checkSourceStatus(sourceId)
    })
  }, []) // Only run on mount

  // No background polling: explicit user refresh only.

  // Simulate some sources being slower to connect
  useEffect(() => {
    const slowSources = ['reddit', 'openai-intel']
    
    slowSources.forEach(sourceId => {
      const source = sources.find(s => s.id === sourceId)
      if (source?.enabled && source.status === 'loading') {
        setTimeout(() => {
          // Randomly succeed or fail for demo purposes
          const success = Math.random() > 0.3
          
          setSources(prev =>
            prev.map(s =>
              s.id === sourceId
                ? {
                    ...s,
                    status: success ? 'connected' : 'error',
                    lastUpdated: new Date(),
                    errorMessage: success ? undefined : 'Service temporarily unavailable'
                  }
                : s
            )
          )
        }, 2000 + Math.random() * 3000) // 2-5 second delay
      }
    })
  }, [sources])

  return {
    sources,
    toggleSource,
    refreshSource,
    enabledSources
  }
}