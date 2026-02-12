import { AIProvider } from './provider.interface'
import { GeminiProvider } from './gemini-provider'
import { GroqProvider } from './groq-provider'
import { OpenRouterProvider } from './openrouter-provider'
import { getProviderName } from './config'

export function getAIProvider(): AIProvider {
  const provider = getProviderName()
  console.log(`[AI Factory] Using provider: ${provider}`)

  switch (provider) {
    case 'groq':
      return new GroqProvider()
    case 'gemini':
      return new GeminiProvider()
    case 'openrouter':
    default:
      return new OpenRouterProvider()
  }
}
