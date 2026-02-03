
import { AIProvider } from './provider.interface'
import { GeminiProvider } from './gemini-provider'
import { GroqProvider } from './groq-provider'

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || 'gemini'

  console.log(`[AI Factory] Using provider: ${provider}`)

  if (provider === 'groq') {
    return new GroqProvider()
  }

  return new GeminiProvider()
}
