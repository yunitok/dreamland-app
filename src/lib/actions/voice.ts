'use server'

import { getAIProvider } from '@/lib/ai/factory'

export async function processTextCommand(projectId: string, userText: string) {
  const provider = getAIProvider()
  return await provider.processCommand(projectId, userText)
}

