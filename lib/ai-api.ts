// AI API client functions for intelligence analysis and data correlation

export interface SearchResult {
  id: string
  source: string
  title: string
  content: string
  relevance: number
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AIInsight {
  id: string
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction'
  title: string
  description: string
  confidence: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  dataPoints: Array<{
    source: string
    value: any
    timestamp: Date
  }>
  recommendations?: string[]
}

export interface CorrelationResult {
  datasets: string[]
  correlation: number
  significance: number
  timeframe: {
    start: Date
    end: Date
  }
  insights: string[]
  visualizations?: {
    type: 'scatter' | 'timeseries' | 'heatmap'
    data: any[]
  }[]
}

export interface AIBriefing {
  id: string
  timestamp: Date
  summary: string
  keyFindings: Array<{
    title: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    sources: string[]
  }>
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
  nextActions: string[]
  confidence: number
}

export class AIAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'AIAPIError'
  }
}

// Base API configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'
const AI_ENDPOINTS = {
  STREAM: `${API_BASE}/ai/stream`,
  SEARCH: `${API_BASE}/ai/search`,
  INSIGHTS: `${API_BASE}/ai/insights`,
  CORRELATE: `${API_BASE}/ai/correlate`,
  BRIEFING: `${API_BASE}/ai/briefing`,
} as const

// Helper function to handle API errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      message: `HTTP ${response.status}: ${response.statusText}` 
    }))
    
    throw new AIAPIError(
      errorData.message || 'API request failed',
      response.status,
      errorData.code
    )
  }
  
  return response.json()
}

/**
 * Creates a streaming connection for AI analysis
 * Returns a ReadableStream that emits analysis chunks
 */
export async function streamAIAnalysis(
  endpoint: string, 
  data?: any
): Promise<ReadableStream> {
  const params = new URLSearchParams()
  
  if (data?.prompt) params.append('prompt', data.prompt)
  if (data?.sources) params.append('sources', JSON.stringify(data.sources))
  if (data?.analysisType) params.append('type', data.analysisType)
  if (data?.timeframe) params.append('timeframe', JSON.stringify(data.timeframe))
  
  const url = `${endpoint}?${params.toString()}`
  
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new AIAPIError(
        `Stream initialization failed: ${response.statusText}`,
        response.status
      )
    }
    
    if (!response.body) {
      throw new AIAPIError('No response body available for streaming')
    }
    
    return response.body
  } catch (error) {
    if (error instanceof AIAPIError) throw error
    
    throw new AIAPIError(
      `Failed to initialize stream: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Search across all enabled data sources
 * Returns aggregated search results with relevance scoring
 */
export async function searchAllSources(
  query: string, 
  sources: string[],
  options?: {
    limit?: number
    timeframe?: { start: Date; end: Date }
    filters?: Record<string, any>
  }
): Promise<SearchResult[]> {
  try {
    const response = await fetch(AI_ENDPOINTS.SEARCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        sources,
        limit: options?.limit || 50,
        timeframe: options?.timeframe,
        filters: options?.filters
      }),
    })
    
    return handleResponse<SearchResult[]>(response)
  } catch (error) {
    if (error instanceof AIAPIError) throw error
    
    throw new AIAPIError(
      `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get AI-generated insights for specific datasets
 * Analyzes patterns, trends, and anomalies
 */
export async function getAIInsights(
  datasetId: string, 
  analysisType: string,
  options?: {
    timeframe?: { start: Date; end: Date }
    confidence?: number
    includeMetadata?: boolean
  }
): Promise<AIInsight[]> {
  try {
    const response = await fetch(`${AI_ENDPOINTS.INSIGHTS}/${datasetId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisType,
        timeframe: options?.timeframe,
        minConfidence: options?.confidence || 0.7,
        includeMetadata: options?.includeMetadata || false
      }),
    })
    
    return handleResponse<AIInsight[]>(response)
  } catch (error) {
    if (error instanceof AIAPIError) throw error
    
    throw new AIAPIError(
      `Insights analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Perform correlation analysis between multiple datasets
 * Identifies relationships and patterns across data sources
 */
export async function getCorrelationAnalysis(
  datasets: string[],
  options?: {
    method?: 'pearson' | 'spearman' | 'kendall'
    timeframe?: { start: Date; end: Date }
    significance?: number
  }
): Promise<CorrelationResult> {
  if (datasets.length < 2) {
    throw new AIAPIError('At least 2 datasets required for correlation analysis')
  }
  
  try {
    const response = await fetch(AI_ENDPOINTS.CORRELATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        datasets,
        method: options?.method || 'pearson',
        timeframe: options?.timeframe,
        minSignificance: options?.significance || 0.05
      }),
    })
    
    return handleResponse<CorrelationResult>(response)
  } catch (error) {
    if (error instanceof AIAPIError) throw error
    
    throw new AIAPIError(
      `Correlation analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Generate comprehensive AI briefing with recommendations
 * Synthesizes insights from multiple sources into actionable intelligence
 */
export async function getAIBriefing(
  sources: string[],
  options?: {
    priority?: 'high' | 'medium' | 'low'
    timeframe?: { start: Date; end: Date }
    includeForecasts?: boolean
    maxFindings?: number
  }
): Promise<AIBriefing> {
  if (sources.length === 0) {
    throw new AIAPIError('At least one data source required for briefing')
  }
  
  try {
    const response = await fetch(AI_ENDPOINTS.BRIEFING, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sources,
        priority: options?.priority || 'medium',
        timeframe: options?.timeframe || {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          end: new Date()
        },
        includeForecasts: options?.includeForecasts || false,
        maxFindings: options?.maxFindings || 10
      }),
    })
    
    return handleResponse<AIBriefing>(response)
  } catch (error) {
    if (error instanceof AIAPIError) throw error
    
    throw new AIAPIError(
      `Briefing generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get real-time threat assessment
 * Monitors for emerging risks and opportunities
 */
export async function getThreatAssessment(
  sources: string[],
  options?: {
    severity?: 'low' | 'medium' | 'high' | 'critical'
    categories?: string[]
    realTime?: boolean
  }
): Promise<{
  overallThreat: 'low' | 'medium' | 'high' | 'critical'
  threats: Array<{
    id: string
    title: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    probability: number
    timeframe: string
    sources: string[]
    recommendations: string[]
  }>
  lastUpdated: Date
}> {
  try {
    const response = await fetch(`${AI_ENDPOINTS.BRIEFING}/threats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sources,
        minSeverity: options?.severity || 'low',
        categories: options?.categories,
        realTime: options?.realTime || false
      }),
    })
    
    return handleResponse(response)
  } catch (error) {
    if (error instanceof AIAPIError) throw error
    
    throw new AIAPIError(
      `Threat assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Export analysis results in various formats
 * Supports PDF, JSON, CSV formats for reports
 */
export async function exportAnalysis(
  analysisId: string,
  format: 'pdf' | 'json' | 'csv' = 'pdf',
  options?: {
    includeCharts?: boolean
    includeRawData?: boolean
    classification?: 'public' | 'internal' | 'confidential' | 'classified'
  }
): Promise<Blob> {
  try {
    const response = await fetch(`${AI_ENDPOINTS.BRIEFING}/${analysisId}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format,
        includeCharts: options?.includeCharts || true,
        includeRawData: options?.includeRawData || false,
        classification: options?.classification || 'internal'
      }),
    })
    
    if (!response.ok) {
      throw new AIAPIError(
        `Export failed: ${response.statusText}`,
        response.status
      )
    }
    
    return response.blob()
  } catch (error) {
    if (error instanceof AIAPIError) throw error
    
    throw new AIAPIError(
      `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}