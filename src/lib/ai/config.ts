import { createOpenAI } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'

// ---- Types ----

export type AIProviderName = 'openrouter' | 'gemini' | 'groq'

export interface AIModelConfig {
  chatModel: string
  reportModel: string
  commandModel: string
}

// ---- Environment ----

export function getProviderName(): AIProviderName {
  const raw = (process.env.AI_PROVIDER || 'openrouter').toLowerCase()
  if (raw === 'gemini' || raw === 'groq' || raw === 'openrouter') return raw
  return 'openrouter'
}

// ---- Model Configuration ----

const OPENROUTER_MODELS: AIModelConfig = {
  chatModel: process.env.AI_CHAT_MODEL || 'openai/gpt-4o-mini',
  reportModel: process.env.AI_REPORT_MODEL || 'openai/gpt-4o-mini',
  commandModel: process.env.AI_COMMAND_MODEL || 'openai/gpt-4o-mini',
}

const GEMINI_MODELS: AIModelConfig = {
  chatModel: 'gemini-1.5-flash-latest',
  reportModel: 'gemini-1.5-flash-latest',
  commandModel: 'gemini-flash-latest',
}

const GROQ_MODELS: AIModelConfig = {
  chatModel: 'llama-3.3-70b-versatile',
  reportModel: 'llama-3.3-70b-versatile',
  commandModel: 'llama-3.3-70b-versatile',
}

export function getModelConfig(): AIModelConfig {
  const provider = getProviderName()
  switch (provider) {
    case 'openrouter': return OPENROUTER_MODELS
    case 'gemini': return GEMINI_MODELS
    case 'groq': return GROQ_MODELS
  }
}

// ---- Vercel AI SDK Provider Instances ----

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  headers: {
    'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
    'X-Title': 'Dreamland Project Manager',
  },
  name: 'openrouter',
})

/**
 * Returns the Vercel AI SDK LanguageModel for use with streamText() in the chat route.
 */
export function getChatLanguageModel() {
  const provider = getProviderName()
  const models = getModelConfig()

  switch (provider) {
    case 'openrouter':
      return openrouter.chat(models.chatModel)
    case 'gemini':
      return google(models.chatModel)
    case 'groq': {
      const groqSdk = createOpenAI({
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY || '',
        name: 'groq',
      })
      return groqSdk.chat(models.chatModel)
    }
  }
}

/**
 * Returns OpenRouter base URL, API key, and headers for raw fetch usage (legacy provider system).
 */
export function getOpenRouterConfig() {
  return {
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    headers: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Dreamland Project Manager',
    },
  }
}
