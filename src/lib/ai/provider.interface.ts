
export interface AIUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface AIResponse {
  success: boolean
  transcript: string
  actions: string[]
  message?: string
  shouldSpeak?: boolean
  error?: string
  debugStack?: string // For client-side debugging
  usage?: AIUsage
  toolCalls?: Array<{ name: string, args: any }>
  report?: {
    id: string
    title: string
    content: string
    redirectUrl: string
  }
}

export interface AIProvider {
  processCommand(projectId: string, userText: string, locale?: string): Promise<AIResponse>
  generateText(projectId: string, prompt: string): Promise<AIResponse>
}
