
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
  usage?: AIUsage
}

export interface AIProvider {
  processCommand(projectId: string, userText: string): Promise<AIResponse>
}
