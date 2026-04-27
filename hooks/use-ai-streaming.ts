'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface UseAIStreamingOptions {
  endpoint: string
  autoStart?: boolean
  retries?: number
}

export interface UseAIStreamingReturn {
  response: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
  confidence: number
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  startStream: (data?: any) => void
  stopStream: () => void
  retry: () => void
}

export function useAIStreaming({
  endpoint,
  autoStart = false,
  retries = 3
}: UseAIStreamingOptions): UseAIStreamingReturn {
  const [response, setResponse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState(0)
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'critical'>('low')
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const retryCountRef = useRef(0)
  const lastDataRef = useRef<any>(null)

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const startStream = useCallback((data?: any) => {
    // Store data for retries
    lastDataRef.current = data

    // Reset states
    setResponse('')
    setIsComplete(false)
    setError(null)
    setIsStreaming(true)
    setConfidence(0)
    setThreatLevel('low')

    // Close existing connection
    stopStream()

    try {
      // Build query parameters
      const params = new URLSearchParams()
      if (data?.prompt) params.append('prompt', data.prompt)
      if (data?.sources) params.append('sources', JSON.stringify(data.sources))
      if (data) params.append('data', JSON.stringify(data))

      const url = `${endpoint}?${params.toString()}`
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      // Handle incoming messages
      eventSource.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data)

          switch (eventData.type) {
            case 'content':
              setResponse(prev => prev + (eventData.content || ''))
              break

            case 'metadata':
              if (eventData.confidence !== undefined) {
                setConfidence(eventData.confidence)
              }
              if (eventData.threatLevel) {
                setThreatLevel(eventData.threatLevel)
              }
              break

            case 'error':
              setError(eventData.message || 'Analysis failed')
              setIsStreaming(false)
              eventSource.close()
              break

            case 'complete':
              setIsComplete(true)
              setIsStreaming(false)
              eventSource.close()
              retryCountRef.current = 0 // Reset retry count on success
              break

            default:
              console.warn('Unknown event type:', eventData.type)
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError)
          setError('Data parsing error')
        }
      }

      // Handle connection errors
      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event)
        setIsStreaming(false)
        eventSource.close()

        // Set appropriate error message based on ready state
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Connection lost - analysis terminated')
        } else {
          setError('Connection unstable - retrying...')
        }

        // Auto-retry if within retry limit
        if (retryCountRef.current < retries) {
          retryCountRef.current++
          setTimeout(() => {
            if (!isComplete) {
              startStream(lastDataRef.current)
            }
          }, Math.pow(2, retryCountRef.current) * 1000) // Exponential backoff
        } else {
          setError('Maximum retry attempts reached')
        }
      }

      // Handle connection opening
      eventSource.onopen = () => {
        console.log('SSE connection established')
        setError(null)
      }

    } catch (initError) {
      console.error('Error initializing SSE:', initError)
      setError('Failed to initialize connection')
      setIsStreaming(false)
    }
  }, [endpoint, retries, stopStream, isComplete])

  const retry = useCallback(() => {
    retryCountRef.current = 0
    startStream(lastDataRef.current)
  }, [startStream])

  // Auto-start if requested
  useEffect(() => {
    if (autoStart) {
      startStream()
    }

    // Cleanup on unmount
    return () => {
      stopStream()
    }
  }, [autoStart, startStream, stopStream])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  return {
    response,
    isStreaming,
    isComplete,
    error,
    confidence,
    threatLevel,
    startStream,
    stopStream,
    retry
  }
}