'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bookmark, FileDown, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIStreamingResponse } from './AIStreamingResponse'
import { DataSourceSelector } from './DataSourceSelector'

interface Query {
  id: string
  query: string
  timestamp: Date
  response?: string
  sources: string[]
  threatLevel?: 'low' | 'medium' | 'high' | 'critical'
  bookmarked?: boolean
}

interface IntelligenceTerminalProps {
  className?: string
  onExportReport?: (queries: Query[]) => void
}

const TERMINAL_PROMPTS = [
  'ENTER INTELLIGENCE QUERY...',
  'SPECIFY SEARCH PARAMETERS...',
  'INPUT ANALYSIS REQUEST...',
  'PROVIDE INVESTIGATION DETAILS...'
]

const QUICK_COMMANDS = [
  { command: '/brief', description: 'Generate intelligence briefing', category: 'analysis' },
  { command: '/correlate', description: 'Find pattern correlations', category: 'analysis' },
  { command: '/threat', description: 'Assess threat levels', category: 'security' },
  { command: '/predict', description: 'Generate predictions', category: 'forecast' },
  { command: '/sources', description: 'List active data sources', category: 'info' },
  { command: '/history', description: 'Show query history', category: 'info' },
  { command: '/export', description: 'Export analysis report', category: 'utility' },
  { command: '/clear', description: 'Clear terminal history', category: 'utility' }
]

export function IntelligenceTerminal({ 
  className, 
  onExportReport 
}: IntelligenceTerminalProps) {
  const [queries, setQueries] = useState<Query[]>([])
  const [currentQuery, setCurrentQuery] = useState('')
  const [currentSources, setCurrentSources] = useState<string[]>(['fred', 'polymarket', 'alphavantage'])
  const [showCommands, setShowCommands] = useState(false)
  const [activeQuery, setActiveQuery] = useState<Query | null>(null)
  const [promptIndex, setPromptIndex] = useState(0)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)

  // Cycle through terminal prompts
  useEffect(() => {
    const interval = setInterval(() => {
      setPromptIndex(prev => (prev + 1) % TERMINAL_PROMPTS.length)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [queries, activeQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentQuery.trim()) return

    // Handle quick commands
    if (currentQuery.startsWith('/')) {
      handleCommand(currentQuery)
      return
    }

    // Create new query
    const newQuery: Query = {
      id: Date.now().toString(),
      query: currentQuery,
      timestamp: new Date(),
      sources: currentSources
    }

    setQueries(prev => [...prev, newQuery])
    setActiveQuery(newQuery)
    setCurrentQuery('')
  }

  const handleCommand = (command: string) => {
    const cmd = command.toLowerCase().split(' ')[0]
    
    switch (cmd) {
      case '/clear':
        setQueries([])
        setActiveQuery(null)
        break
      case '/sources':
        addSystemMessage(`ACTIVE SOURCES: ${currentSources.join(', ').toUpperCase()}`)
        break
      case '/history':
        addSystemMessage(`QUERY HISTORY: ${queries.length} ENTRIES`)
        break
      case '/export':
        onExportReport?.(queries)
        addSystemMessage('REPORT EXPORT INITIATED')
        break
      case '/brief':
        handleBriefing()
        break
      default:
        addSystemMessage(`UNKNOWN COMMAND: ${command}`)
    }
    
    setCurrentQuery('')
  }

  const handleBriefing = () => {
    const briefingQuery: Query = {
      id: Date.now().toString(),
      query: '/brief - Generate intelligence briefing from active sources',
      timestamp: new Date(),
      sources: currentSources
    }
    
    setQueries(prev => [...prev, briefingQuery])
    setActiveQuery(briefingQuery)
  }

  const addSystemMessage = (message: string) => {
    const systemQuery: Query = {
      id: Date.now().toString(),
      query: message,
      timestamp: new Date(),
      sources: [],
      response: `SYSTEM: ${message}`
    }
    
    setQueries(prev => [...prev, systemQuery])
  }

  const handleResponseComplete = (response: string) => {
    if (activeQuery) {
      setQueries(prev => 
        prev.map(q => 
          q.id === activeQuery.id 
            ? { ...q, response }
            : q
        )
      )
      setActiveQuery(null)
    }
  }

  const toggleBookmark = (queryId: string) => {
    setQueries(prev =>
      prev.map(q =>
        q.id === queryId
          ? { ...q, bookmarked: !q.bookmarked }
          : q
      )
    )
  }

  const filteredCommands = QUICK_COMMANDS.filter(cmd =>
    currentQuery.startsWith('/') && cmd.command.startsWith(currentQuery)
  )

  return (
    <div className={cn(
      'bg-black/95 border border-green-500/30 rounded-lg shadow-xl shadow-green-500/20 font-mono',
      'flex flex-col h-[800px]',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-green-500/20">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse" />
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <span className="ml-4 text-green-400 uppercase tracking-wider text-sm">
            INTELLIGENCE TERMINAL v2.1.7
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-xs text-green-400/70">
          <span>QUERIES: {queries.length}</span>
          <span>SOURCES: {currentSources.length}</span>
          <span>STATUS: ONLINE</span>
        </div>
      </div>

      {/* Data Source Selector */}
      <div className="p-4 border-b border-green-500/10">
        <DataSourceSelector
          currentSources={currentSources}
          availableSources={[]}
          onSourceToggle={(sourceId) => {
            setCurrentSources(prev =>
              prev.includes(sourceId)
                ? prev.filter(id => id !== sourceId)
                : [...prev, sourceId]
            )
          }}
        />
      </div>

      {/* Terminal Output */}
      <div 
        ref={terminalRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {queries.map((query) => (
          <div key={query.id} className="space-y-2">
            {/* Query */}
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">{'>'}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-green-300">{query.query}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleBookmark(query.id)}
                      className={cn(
                        'p-1 rounded hover:bg-green-500/20 transition-colors',
                        query.bookmarked ? 'text-yellow-400' : 'text-green-400/50'
                      )}
                    >
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-green-400/50">
                      {query.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-green-400/70 mt-1">
                  SOURCES: {query.sources.join(', ').toUpperCase()}
                </div>
              </div>
            </div>

            {/* Response */}
            {query.response && !activeQuery && (
              <div className="ml-6 text-green-300 whitespace-pre-wrap leading-relaxed">
                {query.response}
              </div>
            )}
          </div>
        ))}

        {/* Active Streaming Response */}
        {activeQuery && (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">{'>'}</span>
              <div className="flex-1">
                <span className="text-green-300">{activeQuery.query}</span>
                <div className="text-xs text-green-400/70 mt-1">
                  SOURCES: {activeQuery.sources.join(', ').toUpperCase()}
                </div>
              </div>
            </div>
            
            <div className="ml-6">
              <AIStreamingResponse
                endpoint="/api/ai/analyze"
                prompt={activeQuery.query}
                data={{ sources: activeQuery.sources }}
                onComplete={handleResponseComplete}
              />
            </div>
          </div>
        )}

        {/* Welcome message if no queries */}
        {queries.length === 0 && !activeQuery && (
          <div className="text-center py-12">
            <div className="text-green-400/70 space-y-2">
              <div>INTELLIGENCE TERMINAL INITIALIZED</div>
              <div className="text-sm">ENTER QUERY OR USE QUICK COMMANDS</div>
              <div className="text-xs mt-4 space-x-4">
                {QUICK_COMMANDS.slice(0, 4).map(cmd => (
                  <span key={cmd.command} className="text-green-500/50">
                    {cmd.command}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Command Suggestions */}
      {showCommands && filteredCommands.length > 0 && (
        <div className="border-t border-green-500/20 bg-green-500/5 max-h-40 overflow-y-auto">
          {filteredCommands.map((cmd) => (
            <button
              key={cmd.command}
              onClick={() => {
                setCurrentQuery(cmd.command + ' ')
                setShowCommands(false)
                inputRef.current?.focus()
              }}
              className="w-full flex items-center justify-between p-2 hover:bg-green-500/10 transition-colors text-left"
            >
              <div>
                <span className="text-green-400">{cmd.command}</span>
                <span className="text-green-300/70 ml-2 text-sm">{cmd.description}</span>
              </div>
              <span className="text-xs text-green-500/50 uppercase">{cmd.category}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-green-500/20">
        <div className="flex items-center gap-3">
          <span className="text-green-400">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={currentQuery}
            onChange={(e) => {
              setCurrentQuery(e.target.value)
              setShowCommands(e.target.value.startsWith('/'))
            }}
            placeholder={TERMINAL_PROMPTS[promptIndex]}
            className="flex-1 bg-transparent text-green-400 placeholder-green-500/50 focus:outline-none"
            disabled={!!activeQuery}
          />
          
          <div className="flex items-center gap-2">
            {queries.filter(q => q.bookmarked).length > 0 && (
              <div className="flex items-center gap-1 text-xs text-yellow-400/70">
                <Bookmark className="w-4 h-4" />
                <span>{queries.filter(q => q.bookmarked).length}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={!currentQuery.trim() || !!activeQuery}
              className="p-2 text-green-400 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      {/* Bottom Status Bar */}
      <div className="px-4 py-2 border-t border-green-500/10 bg-green-500/5">
        <div className="flex items-center justify-between text-xs text-green-400/50">
          <div className="flex items-center gap-4">
            <span>UPTIME: {new Date().toLocaleTimeString()}</span>
            <span>MEMORY: {queries.length * 1.2}KB</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span>READY</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}