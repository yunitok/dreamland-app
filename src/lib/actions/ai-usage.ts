'use server'

import { prisma } from '@/lib/prisma'

export async function logAiUsage(data: {
  modelName: string
  actionType: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  projectId?: string
  userId?: string
  remainingRequests?: number
  remainingTokens?: number
}) {
  try {
    await prisma.aiUsageLog.create({
      data: {
        modelName: data.modelName,
        actionType: data.actionType,
        promptTokens: data.promptTokens,
        completionTokens: data.completionTokens,
        totalTokens: data.totalTokens,
        projectId: data.projectId,
        userId: data.userId,
        remainingRequests: data.remainingRequests,
        remainingTokens: data.remainingTokens
      }
    })
  } catch (error) {
    console.error('Failed to log AI usage:', error)
    // Non-blocking error
  }
}

export async function getAiUsageStats() {
  try {
    const provider = process.env.AI_PROVIDER || 'gemini'
    const now = new Date()
    
    // Always calculate local usage stats as a baseline/fallback
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [rpmCount, rpdCount] = await Promise.all([
      prisma.aiUsageLog.count({ where: { createdAt: { gte: oneMinuteAgo } } }),
      prisma.aiUsageLog.count({ where: { createdAt: { gte: oneDayAgo } } })
    ])

    // If Groq, try to get real-time snapshot
    let remainingRequests: number | null = null
    let remainingTokens: number | null = null

    if (provider === 'groq') {
       const latestLog = await prisma.aiUsageLog.findFirst({
           where: { remainingRequests: { not: null } },
           orderBy: { createdAt: 'desc' }
       })
       if (latestLog) {
           remainingRequests = latestLog.remainingRequests
           remainingTokens = latestLog.remainingTokens
       }
    }

    return {
      provider,
      rpm: rpmCount,
      rpd: rpdCount,
      remainingRequests,
      remainingTokens,
      timestamp: now.toISOString()
    }
  } catch (error) {
    console.error('Failed to get AI usage stats:', error)
    return { rpm: 0, rpd: 0, error: 'Failed to fetch stats' }
  }
}
