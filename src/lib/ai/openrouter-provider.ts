import { AIProvider, AIResponse } from './provider.interface'
import { getTaskStatuses, createDefaultStatuses } from '@/modules/projects/actions/task-statuses'
import { getTaskLists } from '@/modules/projects/actions/task-lists'
import { getTasks } from '@/modules/projects/actions/tasks'
import { getProjects, getProjectById } from '@/modules/projects/actions/projects'
import { logAiUsage } from '@/lib/actions/ai-usage'
import { getOpenAIFormatTools } from './tools'
import { getOpenRouterConfig, getModelConfig } from './config'
import { TaskList, TaskStatus } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

function writeLog(data: unknown) {
  const logPath = path.join(process.cwd(), 'ai_debug.log')
  const entry = `\n--- ${new Date().toISOString()} ---\n${JSON.stringify(data, null, 2)}\n`
  fs.appendFileSync(logPath, entry)
}

export class OpenRouterProvider implements AIProvider {
  private config: ReturnType<typeof getOpenRouterConfig>
  private models: ReturnType<typeof getModelConfig>

  constructor() {
    this.config = getOpenRouterConfig()
    this.models = getModelConfig()
  }

  async processCommand(projectId: string, userText: string, locale: string = 'en'): Promise<AIResponse> {
    try {
      if (!this.config.apiKey) throw new Error('Missing OPENROUTER_API_KEY')

      // 1. Fetch Context
      const [lists, initialStatuses, tasks, allProjects, currentProject] = await Promise.all([
        getTaskLists(projectId),
        getTaskStatuses(),
        getTasks(projectId),
        getProjects(),
        getProjectById(projectId)
      ]) as [TaskList[], TaskStatus[], { title: string }[], { id: string; title: string }[], { title: string } | null]

      let finalStatuses = initialStatuses
      if (finalStatuses.length === 0) {
        finalStatuses = await createDefaultStatuses()
      }

      const context = `
        ACTIVE PROJECT: "${currentProject?.title || 'Unknown'}" (ID: ${projectId})

        PROJECT LIST:
        ${allProjects.map((p) => `- ${p.title} (${p.id})`).join('\n')}

        CURRENT PROJECT:
        Lists: ${lists.map((l) => l.name).join(', ')}
        Statuses: ${finalStatuses.map((s) => s.name).join(', ')}
        Tasks: ${tasks.map((t) => t.title).join(', ')}

        RULES:
        1. FOR REPORTS: If the user names a project (e.g. "Sherlock", "Biblia"), find it in the PROJECT LIST above and use its ID.
        2. FUZZY MATCHING IS REQUIRED: "Sherlock" matches "Sherlock: Desviación de Costes".
        3. TOOL USAGE: Always use 'generateReport' with the correct 'projectId' from the list.
      `

      const tools = getOpenAIFormatTools()

      const requestBody = {
        model: this.models.commandModel,
        messages: [
          {
            role: 'system',
            content: `
You are a premium AI assistant for "Dreamland", a project management system.

CAPABILITIES:
- Lists/Tasks: Create, Rename, Update, Delete.
- Reports: Generate comprehensive status reports for ANY project.

CONTEXT:
${context}

GUIDELINES:
1. Always use tools for actions.
2. For reports, match the project name fuzzy from the "PROJECT LIST" section.
3. Respond in ${locale === 'es' ? 'Spanish' : 'English'}.
4. Be concise and professional.
`
          },
          { role: 'user', content: userText }
        ],
        tools: tools,
        tool_choice: 'auto'
      }

      // 2. Call OpenRouter API
      const response = await fetch(this.config.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`)
      }

      const completion = await response.json()
      writeLog({ type: 'COMPLETION', body: completion })
      const responseMessage = completion.choices[0].message

      // Log Usage
      const usage = completion.usage
      if (usage) {
        logAiUsage({
          modelName: this.models.commandModel,
          actionType: 'voice_command',
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          projectId: projectId
        }).catch(e => console.error('Usage log error', e))
      }

      type RawToolCall = { type: string; function: { name: string; arguments: string } }
      const toolCalls = (responseMessage.tool_calls as RawToolCall[] | undefined)?.map((tc) => {
        if (tc.type !== 'function') return null
        return {
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments) as Record<string, unknown>
        }
      }).filter(Boolean) as Array<{ name: string; args: Record<string, unknown> }>


      if (toolCalls && toolCalls.length > 0) {
        return {
          success: true,
          transcript: userText,
          actions: [],
          toolCalls,
          message: responseMessage.content || undefined
        }
      }

      return {
        success: true,
        transcript: userText,
        actions: [],
        message: responseMessage.content || 'I heard you.',
        shouldSpeak: true
      }

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      const stack = error instanceof Error ? error.stack : undefined
      writeLog({ type: 'PROVIDER_ERROR', error: message, stack })
      console.error('OpenRouter Provider Error!', error)
      if (stack) console.error(stack)
      return {
        success: false,
        error: message,
        transcript: userText,
        actions: []
      }
    }
  }

  async generateText(projectId: string, prompt: string): Promise<AIResponse> {
    try {
      if (!this.config.apiKey) throw new Error('Missing OPENROUTER_API_KEY')

      const requestBody = {
        model: this.models.reportModel,
        messages: [
          { role: 'system', content: 'You are a senior project manager assistant. Generate concise and professional content.' },
          { role: 'user', content: prompt }
        ]
      }

      const response = await fetch(this.config.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          ...this.config.headers
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API Error: ${response.status} - ${errorText}`)
      }

      const completion = await response.json()
      const responseMessage = completion.choices[0].message
      const usage = completion.usage

      if (usage) {
        logAiUsage({
          modelName: this.models.reportModel,
          actionType: 'report_generation',
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
          projectId: projectId
        }).catch(e => console.error('Usage log error', e))
      }

      return {
        success: true,
        transcript: 'Direct generation',
        actions: [],
        message: responseMessage.content
      }

    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        transcript: 'Direct generation failed',
        actions: []
      }
    }
  }
}
