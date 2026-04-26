'use client'

import { useState } from 'react'
import { 
  AIStreamingResponse, 
  DataSourceSelector, 
  IntelligenceTerminal,
  ThreatLevelIndicator,
  ThreatDashboard,
  PatternVisualizer 
} from '@/components/ai'
import { useAIStreaming, useDataSources } from '@/hooks'

// Example usage component demonstrating the AI intelligence terminal
export function IntelligenceDemo() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'threats' | 'patterns'>('terminal')
  
  // Initialize data sources
  const { sources, toggleSource, enabledSources } = useDataSources([
    'fred', 'polymarket', 'alphavantage'
  ])

  // Sample threat data
  const sampleThreats = [
    {
      id: '1',
      level: 'high' as const,
      confidence: 87,
      title: 'Market Volatility Spike Detected',
      lastUpdated: new Date()
    },
    {
      id: '2',
      level: 'medium' as const,
      confidence: 72,
      title: 'Social Sentiment Shift',
      lastUpdated: new Date(Date.now() - 300000)
    }
  ]

  // Sample pattern data
  const sampleNodes = [
    {
      id: '1',
      label: 'Fed Policy',
      type: 'source' as const,
      value: 0.8,
      confidence: 0.9,
      timestamp: new Date(),
      connections: ['2', '3']
    },
    {
      id: '2',
      label: 'Market Response',
      type: 'pattern' as const,
      value: 0.6,
      confidence: 0.8,
      timestamp: new Date(),
      connections: ['1', '3']
    },
    {
      id: '3',
      label: 'Risk Alert',
      type: 'threat' as const,
      value: 0.9,
      confidence: 0.85,
      timestamp: new Date(),
      connections: ['1', '2']
    }
  ]

  const sampleEdges = [
    {
      from: '1',
      to: '2',
      strength: 0.8,
      type: 'causation' as const,
      confidence: 0.9
    },
    {
      from: '2',
      to: '3',
      strength: 0.7,
      type: 'correlation' as const,
      confidence: 0.8
    }
  ]

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="border border-green-500/30 rounded-lg bg-black/50 p-6">
          <h1 className="text-2xl font-mono text-green-400 mb-2">
            SIGNAL INTELLIGENCE OPERATIONS CENTER
          </h1>
          <p className="text-green-300/70 font-mono">
            Classified AI-powered market intelligence and threat assessment system
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'terminal', label: 'INTELLIGENCE TERMINAL' },
            { id: 'threats', label: 'THREAT ASSESSMENT' },
            { id: 'patterns', label: 'PATTERN ANALYSIS' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-mono text-sm border rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-green-500/20 border-green-500/50 text-green-300'
                  : 'border-green-500/30 text-green-400/70 hover:bg-green-500/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Terminal Tab */}
        {activeTab === 'terminal' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <IntelligenceTerminal 
                onExportReport={(queries) => {
                  console.log('Exporting report:', queries)
                }}
              />
            </div>
            
            <div className="space-y-6">
              {/* Data Source Selector */}
              <DataSourceSelector
                currentSources={enabledSources}
                availableSources={[]}
                onSourceToggle={toggleSource}
              />

              {/* Sample AI Response */}
              <AIStreamingResponse
                endpoint="/api/ai/analyze"
                title="LIVE ANALYSIS"
                prompt="Analyze current market conditions"
                data={{ sources: enabledSources }}
                onComplete={(response) => {
                  console.log('Analysis complete:', response)
                }}
              />
            </div>
          </div>
        )}

        {/* Threats Tab */}
        {activeTab === 'threats' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThreatDashboard 
              threats={sampleThreats}
              className="lg:col-span-2"
            />
            
            {sampleThreats.map((threat) => (
              <ThreatLevelIndicator
                key={threat.id}
                level={threat.level}
                confidence={threat.confidence}
                lastUpdated={threat.lastUpdated}
                className="w-full"
              />
            ))}
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            <PatternVisualizer
              nodes={sampleNodes}
              edges={sampleEdges}
              interactive={true}
              autoPlay={false}
              onNodeClick={(node) => {
                console.log('Node clicked:', node)
              }}
              onPatternDetected={(pattern) => {
                console.log('Pattern detected:', pattern)
              }}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sampleNodes.map((node) => (
                <div 
                  key={node.id}
                  className="bg-black/50 border border-green-500/20 rounded p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-green-400 font-mono text-sm">{node.label}</span>
                    <span className="text-xs text-green-400/70 uppercase">{node.type}</span>
                  </div>
                  <div className="text-green-300/70 text-xs font-mono">
                    Confidence: {(node.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-green-500/20 pt-6">
          <div className="flex items-center justify-between text-xs text-green-400/50 font-mono">
            <span>CLASSIFICATION: RESTRICTED</span>
            <span>SYSTEM STATUS: OPERATIONAL</span>
            <span>UPTIME: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}