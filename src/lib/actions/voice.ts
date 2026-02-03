'use server'

import { getAIProvider } from '@/lib/ai/factory'
import { getLocale } from 'next-intl/server'

export async function processTextCommand(projectId: string, userText: string) {
  const provider = getAIProvider()
  const locale = await getLocale()
  return await provider.processCommand(projectId, userText, locale)
}

