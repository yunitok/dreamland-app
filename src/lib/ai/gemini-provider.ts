
import { AIProvider, AIResponse } from './provider.interface'
import { genAI } from '@/lib/gemini'
import { SchemaType } from '@google/generative-ai'
import { getTaskLists, createTaskList, deleteTaskList } from '@/lib/actions/task-lists'
import { getTaskStatuses, createDefaultStatuses } from '@/lib/actions/task-statuses'
import { createTask, getTasks, deleteTask } from '@/lib/actions/tasks'
import { revalidatePath } from 'next/cache'
import { TaskList, TaskStatus } from '@prisma/client'
import { logAiUsage } from '@/lib/actions/ai-usage'

// Define the tools for Gemini (Existing Definition)
const toolsDef = {
  functionDeclarations: [
    {
      name: 'createTaskList',
      description: 'Create a new list (column) in the project board',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          name: {
            type: SchemaType.STRING,
            description: 'The name of the list (e.g., "Marketing", "Q1 Goals")',
          },
          description: {
            type: SchemaType.STRING,
            description: 'Optional description of the list',
          },
        },
        required: ['name'],
      },
    },
    {
      name: 'deleteTaskList',
      description: 'Delete a list (column) from the project board. List MUST be empty.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
            listId: {
                type: SchemaType.STRING,
                description: 'The ID of the list to delete.',
            },
        },
        required: ['listId'],
      },
    },
    {
      name: 'createTask',
      description: 'Create a new task in a specific list',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: 'The title of the task',
          },
          listId: {
            type: SchemaType.STRING,
            description: 'The ID of the list to add the task to. inferred from context.',
          },
          statusId: {
            type: SchemaType.STRING,
            description: 'The ID of the status (e.g., "To Do"). inferred from context.',
          },
          description: {
            type: SchemaType.STRING,
            description: 'Use this for extra details mentioned',
          },
          dueDate: {
            type: SchemaType.STRING,
            description: 'Due date in ISO format (YYYY-MM-DD)',
          },
        },
        required: ['title', 'listId', 'statusId'],
      },
    },
    {
      name: 'deleteTask',
      description: 'Delete a task from the project.',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          taskId: {
            type: SchemaType.STRING,
            description: 'The ID of the task to delete.',
          },
        },
        required: ['taskId'],
      },
    },
  ],
}

export class GeminiProvider implements AIProvider {
  async processCommand(projectId: string, userText: string): Promise<AIResponse> {
    try {
        if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('Missing Google API Key')
    
        // 1. Fetch Context (Lists, Statuses, Tasks)
        let [lists, statuses, tasks] = await Promise.all([
          getTaskLists(projectId),
          getTaskStatuses(projectId),
          getTasks(projectId)
        ]) as [TaskList[], TaskStatus[], any[]]
    
        // Auto-fix: If no statuses, create defaults
        if (statuses.length === 0) {
            statuses = await createDefaultStatuses(projectId)
        }
    
        const context = `
          Current Project ID: ${projectId}
          
          Available Lists (Columns):
          ${lists.map((l) => `- ${l.name} (ID: ${l.id})`).join('\n')}
          
          Available Statuses:
          ${statuses.map((s) => `- ${s.name} (ID: ${s.id})`).join('\n')}
    
          Existing Tasks:
          ${tasks.map((t) => `- "${t.title}" (ID: ${t.id}, List: ${t.list.name})`).join('\n')}
          
          IMPORTANT: 
          - If user says "Create list X and task Y", you must CALL createTaskList FIRST.
          - If list name matches an existing one, use its ID.
          - If list does not exist, use 'createTaskList'.
          - For tasks, you must provide a valid listId. If the list is new (created in this turn), YOU MUST USE "LATEST_CREATED" as the listId.
          - Default statusId: First available open status.
          - To DELETE a list, you must find its ID from the "Available Lists" context. If the user says "Delete Marketing list", look up the ID for "Marketing". Use 'deleteTaskList'. NOTE: Can only delete EMPTY lists.
          - To DELETE a task, find its ID from "Existing Tasks" context. Use 'deleteTask'.
          
          CRITICAL:
          - If the user provides a complex command (e.g. "Create list Tests and add tasks A, B, and C"), you MUST generate ALL necessary function calls in your response.
          - Do NOT stop after creating the list.
          - You should return a list of function calls: [createTaskList, createTask(A), createTask(B), createTask(C)].
        `
    
        // 2. Initialize Gemini Model
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-flash-latest',
          tools: [toolsDef as any]
        })
    
        const chat = model.startChat({
          history: [
            {
              role: 'user',
              parts: [{ text: `
    SYSTEM PROMPT: 
    You are a helpful project management assistant attached to a software called "Dreamland".
    Your job is to execute User Commands using the available tools.
    
    CONTEXT:
    ${context}
    
    RULES:
    1. If the user's command is complete and clear, CALL the appropriate function/tool.
    2. If the user's command is VAGUE or MISSING CRITICAL INFO (like Task Title, or which List to use), **DO NOT GUESS**. instead, **RESPOND WITH A TEXT QUESTION** asking for the missing info.
       - Example 1: User: "Create a task." -> You: "What is the title of the task?"
       - Example 2: User: "Add 'Buy Milk'." -> You: "Which list should I add 'Buy Milk' to?"
    3. If the user asks to create a task in a list that doesn't exist, you should CALL 'createTaskList' first.
    4. Keep your text responses (questions) short and natural (in Spanish if the user speaks Spanish).
    ` }],
            },
            {
              role: 'model',
              parts: [{ text: 'Understood. I will execute tools or ask for clarification if needed.' }],
            }
          ],
        })
    
        // 3. Send Message
        const result = await chat.sendMessage(userText)
        const response = result.response
        const functionCalls = response.functionCalls()
    
        const executionResults: string[] = []
        let lastCreatedListId: string | null = null
    
        if (functionCalls && functionCalls.length > 0) {
          for (const call of functionCalls) {
            // Define a generic type for args to avoid 'any'
            const args = call.args as Record<string, any>
    
            if (call.name === 'createTaskList') {
              const list = await createTaskList({
                name: args.name,
                description: args.description,
                projectId
              })
              lastCreatedListId = list.id
              executionResults.push(`List created: "${args.name}"`)
            }
            
            if (call.name === 'deleteTaskList') {
                await deleteTaskList(args.listId)
                executionResults.push(`List deleted. ID: "${args.listId}"`)
            }
    
            if (call.name === 'deleteTask') {
                await deleteTask(args.taskId)
                executionResults.push(`Task deleted. ID: "${args.taskId}"`)
            }
            
            if (call.name === 'createTask') {
              let targetListId = args.listId
              
              // Handle dynamic list creation in same turn
              if (targetListId === 'LATEST_CREATED' || targetListId === 'PENDING') {
                  if (lastCreatedListId) {
                      targetListId = lastCreatedListId
                  } else {
                      console.warn('Task requested for LATEST_CREATED list but no list was created.')
                  }
              }
    
              // Validate statusId
              let targetStatusId = args.statusId
              const statusExists = statuses.some((s) => s.id === targetStatusId)
              if (!statusExists) {
                console.warn(`Invalid statusId "${targetStatusId}" provided by AI. Falling back to default.`)
                if (statuses.length > 0) {
                  targetStatusId = statuses[0].id
                } else {
                   // Should not happen if project has statuses, but just in case
                   throw new Error('No statuses available in project')
                }
              }
    
              await createTask({
                title: args.title,
                description: args.description,
                listId: targetListId,
                statusId: targetStatusId,
                dueDate: args.dueDate ? new Date(args.dueDate) : undefined
              })
              executionResults.push(`Task created: "${args.title}"`)
            }
          }
        } 
        
        // If NO function calls, it means the model is asking a question or chatting
        const textResponse = response.text()
        if (!functionCalls || functionCalls.length === 0) {
          return {
            success: true, 
            transcript: userText,
            actions: [],
            message: textResponse, 
            shouldSpeak: true 
          }
        }
    
        revalidatePath(`/projects/${projectId}`)
        
        // Log AI Usage asynchronously
        const usageMetadata = response.usageMetadata
        
        if (usageMetadata) {
            // Fire and forget
            logAiUsage({
                modelName: 'gemini-flash-latest',
                actionType: 'voice_command',
                promptTokens: usageMetadata.promptTokenCount || 0,
                completionTokens: usageMetadata.candidatesTokenCount || 0,
                totalTokens: usageMetadata.totalTokenCount || 0,
                projectId: projectId
            }).catch(err => console.error('Background usage log error:', err))
        }
    
        return {
          success: true,
          transcript: userText,
          actions: executionResults,
          message: executionResults.length > 0 ? `Executed: ${executionResults.join(', ')}` : 'I heard you, but didn\'t trigger any actions.',
        }

    } catch (error: any) {
        console.error('Gemini Provider Error:', error)
        return {
            success: false,
            error: error.message,
            transcript: userText,
            actions: []
        }
    }
  }
}
