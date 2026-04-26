'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThreatLevelIndicatorProps {
  level: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  lastUpdated?: Date
  animated?: boolean
  showDetails?: boolean
  className?: string
}

const THREAT_CONFIG = {
  low: {
    color: 'text-green-400',
    bgColor: 'bg-green-400/20',
    borderColor: 'border-green-400/50',
    glowColor: 'shadow-green-400/20',
    icon: ShieldCheck,
    label: 'LOW THREAT',
    description: 'Normal operational conditions'
  },
  medium: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/20',
    borderColor: 'border-yellow-400/50',
    glowColor: 'shadow-yellow-400/20',
    icon: AlertTriangle,
    label: 'MEDIUM THREAT',
    description: 'Elevated risk conditions detected'
  },
  high: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/20',
    borderColor: 'border-orange-400/50',
    glowColor: 'shadow-orange-400/20',
    icon: ShieldAlert,
    label: 'HIGH THREAT',
    description: 'Significant risk factors identified'
  },
  critical: {
    color: 'text-red-400',
    bgColor: 'bg-red-400/20',
    borderColor: 'border-red-400/50',
    glowColor: 'shadow-red-400/20',
    icon: ShieldAlert,
    label: 'CRITICAL THREAT',
    description: 'Immediate attention required'
  }
}

export function ThreatLevelIndicator({
  level,
  confidence,
  lastUpdated,
  animated = true,
  showDetails = true,
  className
}: ThreatLevelIndicatorProps) {
  const [isBlinking, setIsBlinking] = useState(false)
  const [decayedConfidence, setDecayedConfidence] = useState(confidence)
  
  const config = THREAT_CONFIG[level]
  const Icon = config.icon

  // Trigger blinking animation for high/critical threats
  useEffect(() => {
    if (level === 'high' || level === 'critical') {
      setIsBlinking(true)
      const timer = setTimeout(() => setIsBlinking(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [level])

  // Time-based confidence decay
  useEffect(() => {
    if (!lastUpdated) return

    const updateDecay = () => {
      const now = new Date().getTime()
      const updateTime = lastUpdated.getTime()
      const timeDiff = now - updateTime
      
      // Decay confidence over 1 hour (3600000ms)
      const decayRate = Math.max(0, 1 - (timeDiff / 3600000))
      setDecayedConfidence(confidence * decayRate)
    }

    updateDecay()
    const interval = setInterval(updateDecay, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [confidence, lastUpdated])

  const getTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={cn(
      'relative inline-flex items-center gap-3 px-4 py-3 rounded-lg border font-mono',
      config.bgColor,
      config.borderColor,
      animated && 'transition-all duration-300',
      isBlinking && animated && 'animate-pulse',
      className
    )}>
      {/* Pulsing glow effect for active threats */}
      {(level === 'high' || level === 'critical') && animated && (
        <div className={cn(
          'absolute inset-0 rounded-lg blur-sm',
          config.bgColor,
          'animate-pulse'
        )} />
      )}

      {/* Main content */}
      <div className="relative flex items-center gap-3">
        {/* Threat icon */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full',
          config.bgColor,
          config.borderColor,
          'border'
        )}>
          <Icon className={cn('w-5 h-5', config.color)} />
        </div>

        {/* Threat info */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={cn('font-bold text-sm uppercase tracking-wider', config.color)}>
              {config.label}
            </span>
            
            {/* Confidence indicator */}
            <div className="flex items-center gap-1">
              <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full transition-all duration-1000',
                    config.color.replace('text-', 'bg-')
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, decayedConfidence))}%` }}
                />
              </div>
              <span className={cn('text-xs', config.color)}>
                {Math.round(decayedConfidence)}%
              </span>
            </div>
          </div>

          {/* Details */}
          {showDetails && (
            <div className="flex items-center gap-4 mt-1 text-xs">
              <span className="text-gray-400">
                {config.description}
              </span>
              
              {lastUpdated && (
                <span className="text-gray-500">
                  Updated {getTimeAgo(lastUpdated)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Classification badge */}
      <div className={cn(
        'absolute -top-2 -right-2 px-2 py-1 rounded text-xs font-bold',
        'bg-black border uppercase tracking-wider',
        config.color,
        config.borderColor
      )}>
        {level === 'critical' ? 'CLASSIFIED' : 
         level === 'high' ? 'CONFIDENTIAL' : 
         level === 'medium' ? 'INTERNAL' : 'PUBLIC'}
      </div>

      {/* Scanning effect for critical threats */}
      {level === 'critical' && animated && (
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div className={cn(
            'absolute top-0 left-0 w-full h-px opacity-75',
            'bg-gradient-to-r from-transparent via-red-400 to-transparent',
            'animate-pulse'
          )} 
          style={{
            animation: 'scan 2s linear infinite',
            transform: 'translateY(0)'
          }} />
        </div>
      )}

      <style jsx>{`
        @keyframes scan {
          0% { transform: translateY(0px); }
          100% { transform: translateY(60px); }
        }
      `}</style>
    </div>
  )
}

// Compound component for displaying multiple threat indicators
interface ThreatDashboardProps {
  threats: Array<{
    id: string
    level: 'low' | 'medium' | 'high' | 'critical'
    confidence: number
    title: string
    lastUpdated: Date
  }>
  className?: string
}

export function ThreatDashboard({ threats, className }: ThreatDashboardProps) {
  const overallThreat = threats.length > 0 
    ? threats.reduce((max, threat) => {
        const levels = ['low', 'medium', 'high', 'critical']
        return levels.indexOf(threat.level) > levels.indexOf(max) ? threat.level : max
      }, 'low' as const)
    : 'low' as const

  const averageConfidence = threats.length > 0
    ? threats.reduce((sum, threat) => sum + threat.confidence, 0) / threats.length
    : 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Overall Status */}
      <div className="bg-black/50 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-green-400 font-mono text-sm uppercase tracking-wider">
            Overall Threat Assessment
          </h3>
          <span className="text-green-400/70 text-xs font-mono">
            {threats.length} ACTIVE MONITORS
          </span>
        </div>
        
        <ThreatLevelIndicator
          level={overallThreat}
          confidence={averageConfidence}
          lastUpdated={new Date()}
          showDetails={false}
        />
      </div>

      {/* Individual Threats */}
      {threats.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-green-400/70 font-mono text-xs uppercase tracking-wider">
            Active Threat Vectors
          </h4>
          
          {threats.map((threat) => (
            <div 
              key={threat.id}
              className="bg-black/30 border border-green-500/10 rounded p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-green-300 text-sm font-mono">
                  {threat.title}
                </span>
                <ThreatLevelIndicator
                  level={threat.level}
                  confidence={threat.confidence}
                  lastUpdated={threat.lastUpdated}
                  showDetails={false}
                  className="scale-75"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}