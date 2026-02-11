
import { AIProvider } from './provider.interface'
import { GeminiProvider } from './gemini-provider'
import { GroqProvider } from './groq-provider'

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'gemini'
  console.log('[AI Factory] Selected Provider:', provider);

  console.log(`[AI Factory] Using provider: ${provider}`)

  if (provider === 'groq') {
    console.log('[AI Factory] Instantiating GroqProvider');
    return new GroqProvider()
  }

  console.log('[AI Factory] Instantiating GeminiProvider');
  return new GeminiProvider()
}
