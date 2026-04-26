'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Maximize2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PatternNode {
  id: string
  label: string
  type: 'source' | 'pattern' | 'insight' | 'threat'
  value: number
  confidence: number
  timestamp: Date
  connections: string[]
  metadata?: Record<string, any>
}

interface PatternEdge {
  from: string
  to: string
  strength: number
  type: 'correlation' | 'causation' | 'influence' | 'dependency'
  confidence: number
}

interface PatternVisualizerProps {
  nodes: PatternNode[]
  edges: PatternEdge[]
  viewMode?: 'network' | 'timeline' | 'heatmap'
  interactive?: boolean
  autoPlay?: boolean
  className?: string
  onNodeClick?: (node: PatternNode) => void
  onPatternDetected?: (pattern: any) => void
}

const NODE_COLORS = {
  source: 'fill-blue-400 stroke-blue-300',
  pattern: 'fill-green-400 stroke-green-300',
  insight: 'fill-yellow-400 stroke-yellow-300',
  threat: 'fill-red-400 stroke-red-300'
}

const EDGE_COLORS = {
  correlation: 'stroke-purple-400',
  causation: 'stroke-orange-400',
  influence: 'stroke-cyan-400',
  dependency: 'stroke-pink-400'
}

export function PatternVisualizer({
  nodes = [],
  edges = [],
  viewMode = 'network',
  interactive = true,
  autoPlay = false,
  className,
  onNodeClick,
  onPatternDetected
}: PatternVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<PatternNode | null>(null)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Animation timeline
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const maxTime = Math.max(...nodes.map(n => n.timestamp.getTime()))
        const minTime = Math.min(...nodes.map(n => n.timestamp.getTime()))
        const newTime = prev + (maxTime - minTime) / 100
        
        return newTime > maxTime ? minTime : newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying, nodes])

  // Filter nodes based on current time and search
  const visibleNodes = nodes.filter(node => {
    const timeMatch = !isPlaying || node.timestamp.getTime() <= currentTime
    const searchMatch = !searchTerm || 
      node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.type.toLowerCase().includes(searchTerm.toLowerCase())
    
    return timeMatch && searchMatch
  })

  const visibleEdges = edges.filter(edge => {
    const fromVisible = visibleNodes.some(n => n.id === edge.from)
    const toVisible = visibleNodes.some(n => n.id === edge.to)
    return fromVisible && toVisible
  })

  // Simple force-directed layout calculation
  const layoutNodes = (nodes: PatternNode[]) => {
    const centerX = 300
    const centerY = 200
    const radius = 120

    return nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      const nodeRadius = radius * (0.5 + node.value * 0.5)
      
      return {
        ...node,
        x: centerX + Math.cos(angle) * nodeRadius,
        y: centerY + Math.sin(angle) * nodeRadius
      }
    })
  }

  const positionedNodes = layoutNodes(visibleNodes)

  const handleNodeClick = (node: PatternNode) => {
    setSelectedNode(node)
    onNodeClick?.(node)
    
    // Simulate pattern detection
    const connectedNodes = edges
      .filter(e => e.from === node.id || e.to === node.id)
      .map(e => e.from === node.id ? e.to : e.from)
    
    if (connectedNodes.length > 2) {
      onPatternDetected?.({
        type: 'cluster',
        centerNode: node.id,
        connectedNodes,
        strength: connectedNodes.length / nodes.length
      })
    }
  }

  const renderNetworkView = () => (
    <svg
      ref={svgRef}
      viewBox="0 0 600 400"
      className="w-full h-full"
      style={{ transform: `scale(${zoomLevel})` }}
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10b981" strokeWidth="0.5" opacity="0.1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Edges */}
      {visibleEdges.map((edge, index) => {
        const fromNode = positionedNodes.find(n => n.id === edge.from)
        const toNode = positionedNodes.find(n => n.id === edge.to)
        
        if (!fromNode || !toNode) return null

        return (
          <g key={`edge-${index}`}>
            <line
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              className={cn(
                EDGE_COLORS[edge.type],
                'transition-all duration-300'
              )}
              strokeWidth={Math.max(1, edge.strength * 4)}
              opacity={edge.confidence}
              strokeDasharray={edge.type === 'correlation' ? '5,5' : undefined}
            />
            
            {/* Edge label */}
            <text
              x={(fromNode.x + toNode.x) / 2}
              y={(fromNode.y + toNode.y) / 2}
              className="fill-green-300 text-xs font-mono"
              textAnchor="middle"
              opacity="0.7"
            >
              {(edge.confidence * 100).toFixed(0)}%
            </text>
          </g>
        )
      })}

      {/* Nodes */}
      {positionedNodes.map((node) => (
        <g key={node.id}>
          {/* Node circle */}
          <circle
            cx={node.x}
            cy={node.y}
            r={Math.max(8, node.value * 20)}
            className={cn(
              NODE_COLORS[node.type],
              'cursor-pointer transition-all duration-300 hover:stroke-white',
              selectedNode?.id === node.id && 'stroke-white stroke-2'
            )}
            onClick={() => interactive && handleNodeClick(node)}
            opacity={node.confidence}
          />
          
          {/* Confidence ring */}
          <circle
            cx={node.x}
            cy={node.y}
            r={Math.max(8, node.value * 20) + 3}
            fill="none"
            className="stroke-green-400"
            strokeWidth="1"
            opacity="0.3"
            strokeDasharray={`${node.confidence * 100}, 100`}
          />
          
          {/* Node label */}
          <text
            x={node.x}
            y={node.y + Math.max(8, node.value * 20) + 15}
            className="fill-green-300 text-xs font-mono"
            textAnchor="middle"
          >
            {node.label}
          </text>
          
          {/* Threat indicator */}
          {node.type === 'threat' && (
            <circle
              cx={node.x + Math.max(8, node.value * 20) - 3}
              cy={node.y - Math.max(8, node.value * 20) + 3}
              r="4"
              className="fill-red-500 animate-pulse"
            />
          )}
        </g>
      ))}

      {/* Scanning effect */}
      {isPlaying && (
        <circle
          cx="300"
          cy="200"
          r="150"
          fill="none"
          className="stroke-green-400"
          strokeWidth="2"
          opacity="0.3"
          strokeDasharray="10,10"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="0 300 200;360 300 200"
            dur="4s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </svg>
  )

  const renderTimelineView = () => (
    <div className="h-full flex flex-col">
      {/* Timeline header */}
      <div className="flex items-center justify-between p-4 border-b border-green-500/20">
        <span className="text-green-400 font-mono text-sm">PATTERN EMERGENCE TIMELINE</span>
        <div className="text-xs text-green-400/70">
          {positionedNodes.length} PATTERNS DETECTED
        </div>
      </div>

      {/* Timeline visualization */}
      <div className="flex-1 p-4 overflow-y-auto">
        {positionedNodes
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          .map((node, index) => (
            <div 
              key={node.id}
              className={cn(
                'flex items-center gap-4 p-3 mb-2 rounded border cursor-pointer',
                'hover:bg-green-500/5 transition-colors',
                NODE_COLORS[node.type].includes('blue') && 'border-blue-400/30',
                NODE_COLORS[node.type].includes('green') && 'border-green-400/30',
                NODE_COLORS[node.type].includes('yellow') && 'border-yellow-400/30',
                NODE_COLORS[node.type].includes('red') && 'border-red-400/30'
              )}
              onClick={() => handleNodeClick(node)}
            >
              <div className="w-12 text-xs text-green-400/70 font-mono">
                {node.timestamp.toLocaleTimeString()}
              </div>
              
              <div className={cn(
                'w-3 h-3 rounded-full',
                NODE_COLORS[node.type].replace('fill-', 'bg-').replace('stroke-', '')
              )} />
              
              <div className="flex-1">
                <div className="text-green-300 font-mono text-sm">{node.label}</div>
                <div className="text-green-400/70 text-xs uppercase">{node.type}</div>
              </div>
              
              <div className="text-right">
                <div className="text-green-400 text-sm font-mono">
                  {(node.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-green-400/70 text-xs">CONFIDENCE</div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )

  const renderHeatmapView = () => (
    <div className="h-full p-4">
      <div className="text-green-400 font-mono text-sm mb-4">PATTERN CORRELATION HEATMAP</div>
      
      <div className="grid grid-cols-6 gap-1 h-full">
        {Array.from({ length: 36 }).map((_, index) => {
          const intensity = Math.random()
          return (
            <div
              key={index}
              className={cn(
                'rounded aspect-square flex items-center justify-center text-xs font-mono',
                intensity > 0.7 ? 'bg-red-400/60 text-red-100' :
                intensity > 0.4 ? 'bg-yellow-400/60 text-yellow-100' :
                'bg-green-400/60 text-green-100'
              )}
            >
              {(intensity * 100).toFixed(0)}
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className={cn(
      'bg-black/90 border border-green-500/30 rounded-lg font-mono h-96 flex flex-col',
      className
    )}>
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-green-500/20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-green-400 text-sm uppercase tracking-wider">
              PATTERN ANALYSIS
            </span>
          </div>
          
          {/* View mode selector */}
          <div className="flex rounded border border-green-500/30 overflow-hidden">
            {['network', 'timeline', 'heatmap'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as any)}
                className={cn(
                  'px-3 py-1 text-xs uppercase transition-colors',
                  viewMode === mode 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'text-green-400/70 hover:bg-green-500/10'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-400/50" />
            <input
              type="text"
              placeholder="Filter patterns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 bg-black/50 border border-green-500/30 rounded text-xs text-green-400 placeholder-green-400/50 focus:border-green-500/50 focus:outline-none w-32"
            />
          </div>

          {/* Controls */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 text-green-400 hover:text-green-300 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setZoomLevel(prev => Math.min(2, prev + 0.2))}
            className="p-2 text-green-400 hover:text-green-300 transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visualization Area */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        {viewMode === 'network' && renderNetworkView()}
        {viewMode === 'timeline' && renderTimelineView()}
        {viewMode === 'heatmap' && renderHeatmapView()}
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="p-4 border-t border-green-500/20 bg-green-500/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-300 font-mono text-sm">{selectedNode.label}</div>
              <div className="text-green-400/70 text-xs uppercase">
                {selectedNode.type} • {(selectedNode.confidence * 100).toFixed(0)}% CONFIDENCE
              </div>
            </div>
            
            <button
              onClick={() => setSelectedNode(null)}
              className="text-green-400/70 hover:text-green-400 text-xs"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  )
}