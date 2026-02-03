'use client'

import { useState, useEffect } from 'react'
import { getAiUsageStats } from '@/lib/actions/ai-usage'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { Activity, Info, Zap } from 'lucide-react'

type UsageStats = {
    provider: string
    rpm: number
    rpd: number
    remainingRequests?: number | null
    remainingTokens?: number | null
    error?: string
}

export function AiUsageIndicator() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      const data = await getAiUsageStats()
      // @ts-ignore - simple type mismatch fix for optional/null vs undefined
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch usage stats', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return null

  const isGroq = stats?.provider === 'groq'
  
  // Status logic
  let isHighUsage = false
  if (isGroq) {
      // For Groq, low remaining is "high usage"
      if (stats?.remainingRequests !== null && stats?.remainingRequests !== undefined) {
          isHighUsage = stats.remainingRequests < 100
      }
  } else {
      // For Gemini, high count is "high usage"
      isHighUsage = (stats?.rpm || 0) > 10 || (stats?.rpd || 0) > 1000
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-2 cursor-help text-xs text-muted-foreground hover:text-foreground transition-colors">
            {isGroq ? <Zap className="h-3.5 w-3.5 text-yellow-500" /> : <Activity className="h-3.5 w-3.5" />}
            <span>{isGroq ? 'Groq Status' : 'AI Status'}</span>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
                {isGroq ? <Zap className="h-4 w-4 text-yellow-500" /> : <Activity className="h-4 w-4" />}
                {isGroq ? 'Groq Quota (Real-time)' : 'Gemini Usage (Estimated)'}
            </h4>
            
            {isGroq ? (
                /* GROQ VIEW */
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col p-2 bg-muted/50 rounded-md">
                        <span className="text-xs text-muted-foreground">Requests Left</span>
                        <span className="font-mono text-lg font-bold">
                            {stats?.remainingRequests ?? '...'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">per day</span>
                    </div>
                    <div className="flex flex-col p-2 bg-muted/50 rounded-md">
                        <span className="text-xs text-muted-foreground">Tokens Left</span>
                        <span className="font-mono text-lg font-bold">
                            {stats?.remainingTokens ?? '...'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">per min</span>
                    </div>
                </div>
            ) : (
                /* GEMINI VIEW */
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex flex-col p-2 bg-muted/50 rounded-md">
                        <span className="text-xs text-muted-foreground">Last Minute</span>
                        <span className="font-mono text-lg font-bold">{stats?.rpm || 0}</span>
                        <span className="text-[10px] text-muted-foreground">reqs / min</span>
                    </div>
                    <div className="flex flex-col p-2 bg-muted/50 rounded-md">
                        <span className="text-xs text-muted-foreground">Last 24h</span>
                        <span className="font-mono text-lg font-bold">{stats?.rpd || 0}</span>
                        <span className="text-[10px] text-muted-foreground">reqs / day</span>
                    </div>
                </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
                <Info className="h-3 w-3 inline mr-1" />
                {isGroq 
                    ? "Quota tracked via API headers. Refreshes on command." 
                    : "Stats tracked locally. Actual quota varies by Google."}
            </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
