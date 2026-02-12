
import { AIProvider, AIResponse } from './provider.interface'
import { genAI } from '@/lib/gemini'
import { getTaskStatuses, createDefaultStatuses } from '@/modules/projects/actions/task-statuses'
import { getTaskLists } from '@/modules/projects/actions/task-lists'
import { getTasks } from '@/modules/projects/actions/tasks'
import { getProjects, getProjectById } from '@/modules/projects/actions/projects'
import { logAiUsage } from '@/lib/actions/ai-usage'
import { getGeminiTools } from './tools'
import { TaskList, TaskStatus } from '@prisma/client'

export class GeminiProvider implements AIProvider {
  async processCommand(projectId: string, userText: string, locale?: string): Promise<AIResponse> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Missing Google API Key')
    
        // 1. Fetch Context (Lists, Statuses, Tasks, Projects)
        const [lists, initialStatuses, tasks, allProjects, currentProject] = await Promise.all([
          getTaskLists(projectId),
          getTaskStatuses(),
          getTasks(projectId),
          getProjects(),
          getProjectById(projectId)
        ]) as [TaskList[], TaskStatus[], { title: string }[], { id: string; title: string }[], { title: string } | null]

        let statuses = initialStatuses

        // Auto-fix: If no statuses, create defaults
        if (statuses.length === 0) {
            statuses = await createDefaultStatuses()
        }
    
        const context = `
          ACTIVE PROJECT: "${currentProject?.title || 'Unknown'}" (ID: ${projectId})
          
          PROJECT LIST:
          ${allProjects.map((p) => `- ${p.title} (${p.id})`).join('\n')}
    
          CURRENT PROJECT:
          Lists: ${lists.map((l) => l.name).join(', ')}
          Statuses: ${statuses.map((s) => s.name).join(', ')}
          Tasks: ${tasks.map((t) => t.title).join(', ')}

          RULES:
          1. FOR REPORTS: If the user names a project (e.g. "Sherlock", "Biblia"), find it in the PROJECT LIST above and use its ID.
          2. FUZZY MATCHING IS REQUIRED: "Sherlock" matches "Sherlock: Desviación de Costes".
          3. TOOL USAGE: Always use 'generateReport' with the correct 'projectId' from the list.
          4. TASK LISTS: If adding a task to a newly created list (in this turn), use "LATEST_CREATED".
        `
    
        // 2. Initialize Gemini Model with System Instruction
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-flash-latest',
          systemInstruction: {
            role: 'system',
            parts: [{ text: `
    SYSTEM PROMPT: 
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
    ` }]
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: [getGeminiTools() as any]
        })
    
        const chat = model.startChat({
          history: [],
        })
    
        // 3. Send Message
        const result = await chat.sendMessage(userText)
        const response = result.response
        const calls = response.functionCalls()
    
        const toolCalls = calls?.map(call => ({
          name: call.name,
          args: call.args as Record<string, unknown>
        }))
    
        // Log Usage
        const usageMetadata = response.usageMetadata
        if (usageMetadata) {
            logAiUsage({
                modelName: 'gemini-1.5-flash',
                actionType: 'voice_command',
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens: usageMetadata.totalTokenCount || 0,
                projectId: projectId
            }).catch(err => console.error('Usage log error:', err))
        }
    
        if (toolCalls && toolCalls.length > 0) {
          return {
            success: true,
            transcript: userText,
            actions: [], // Will be populated by voice action executor
            toolCalls
          }
        }
    
        return {
          success: true, 
          transcript: userText,
          actions: [],
          message: response.text(), 
          shouldSpeak: true 
        }

    } catch (error: unknown) {
        console.error('Gemini Provider Error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            transcript: userText,
            actions: []
        }
    }
  }

  async generateText(projectId: string, prompt: string): Promise<AIResponse> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Missing Google API Key')

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })
        const result = await model.generateContent(prompt)
        const response = result.response

        const usageMetadata = response.usageMetadata
        if (usageMetadata) {
            logAiUsage({
                modelName: 'gemini-1.5-flash',
                actionType: 'report_generation',
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens: usageMetadata.totalTokenCount || 0,
                projectId: projectId
            }).catch(err => console.error('Usage log error:', err))
        }

        return {
            success: true,
            transcript: 'Direct generation',
            actions: [],
            message: response.text()
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
