import { AIProvider, AIResponse } from './provider.interface'
import OpenAI from 'openai'
import { ChatCompletionTool } from 'openai/resources/chat/completions'
import { getTaskLists, createTaskList, deleteTaskList } from '@/lib/actions/task-lists'
import { getTaskStatuses, createDefaultStatuses } from '@/lib/actions/task-statuses'
import { createTask, getTasks, deleteTask } from '@/lib/actions/tasks'
import { revalidatePath } from 'next/cache'
import { TaskList, TaskStatus, Task } from '@prisma/client'
import { logAiUsage } from '@/lib/actions/ai-usage'

// OpenAI Compatible Tools Definition
const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "createTaskList",
      description: "Create a new list (column) in the project board",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the list (e.g., 'Marketing', 'Q1 Goals')",
          },
          description: {
            type: "string",
            description: "Optional description of the list",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteTaskList",
      description: "Delete a list (column) from the project board. List MUST be empty.",
      parameters: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list to delete.",
          },
        },
        required: ["listId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createTask",
      description: "Create a new task in a specific list",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The title of the task",
          },
          listId: {
            type: "string",
            description: "The ID of the list to add the task to. inferred from context.",
          },
          statusId: {
            type: "string",
            description: "The ID of the status (e.g., 'To Do'). inferred from context.",
          },
          description: {
            type: "string",
            description: "Use this for extra details mentioned",
          },
          dueDate: {
            type: "string",
            description: "Due date in ISO format (YYYY-MM-DD)",
          },
        },
        required: ["title", "listId", "statusId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deleteTask",
      description: "Delete a task from the project.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The ID of the task to delete.",
          },
        },
        required: ["taskId"],
      },
    },
  },
];

export class GroqProvider implements AIProvider {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || 'dummy_key', // Avoid instantiation error if key missing, will fail on call
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async processCommand(projectId: string, userText: string): Promise<AIResponse> {
    try {
        if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY')

        // 1. Fetch Context
        const [lists, initialStatuses, tasks] = await Promise.all([
          getTaskLists(projectId),
          getTaskStatuses(projectId),
          getTasks(projectId)
        ]) as [TaskList[], TaskStatus[], any[]] // tasks might strictly be Task[] & { list: TaskList }... keeping any for now to avoid strict typing issues with includes

        let finalStatuses = initialStatuses;
        if (finalStatuses.length === 0) {
            finalStatuses = await createDefaultStatuses(projectId)
        }

        const context = `
          Current Project ID: ${projectId}
          
          Available Lists (Columns):
          ${lists.map((l) => `- ${l.name} (ID: ${l.id})`).join('\n')}
          
          Available Statuses:
          ${finalStatuses.map((s) => `- ${s.name} (ID: ${s.id})`).join('\n')}

          Existing Tasks:
          ${tasks.map((t) => `- "${t.title}" (ID: ${t.id}, List: ${t.list.name})`).join('\n')}
          
          IMPORTANT: 
          - If user says "Create list X and task Y", you must CALL createTaskList FIRST.
          - For tasks, you must provide a valid listId. If list is new (created in this turn), USE "LATEST_CREATED".
          - Use tools for any action. Respond with text ONLY for clarification.
        `

        // 2. Call LLM
        const completionResponse = await this.client.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Fast and capable model
            messages: [
                {
                    role: "system",
                    content: `You are a helpful project management assistant for "Dreamland".
                    CONTEXT:
                    ${context}
                    
                    RULES:
                    1. Execute commands using tools.
                    2. If info missing, ask CLARIFYING QUESTIONS.
                    3. Do not guess IDs.
                    `
                },
                { role: "user", content: userText }
            ],
            tools: tools,
            tool_choice: "auto"
        }).withResponse();

        const completion = completionResponse.data;
        const headers = completionResponse.response.headers;

        const remainingRequests = headers.get('x-ratelimit-remaining-requests');
        const remainingTokens = headers.get('x-ratelimit-remaining-tokens');

        const responseMessage = completion.choices[0].message;
        const toolCalls = responseMessage.tool_calls;
        
        const executionResults: string[] = []
        let lastCreatedListId: string | null = null

        // Log Usage
        const usage = completion.usage;
        if (usage) {
            logAiUsage({
                modelName: 'llama-3.3-70b-versatile',
                actionType: 'voice_command',
                promptTokens: usage.prompt_tokens,
                completionTokens: usage.completion_tokens,
                totalTokens: usage.total_tokens,
                projectId: projectId,
                remainingRequests: remainingRequests ? parseInt(remainingRequests) : undefined,
                remainingTokens: remainingTokens ? parseInt(remainingTokens) : undefined
            }).catch(e => console.error('Usage log error', e))
        }

        // Handle Tool Calls
        if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
                const args = JSON.parse(toolCall.function.arguments);
                const name = toolCall.function.name;

                if (name === 'createTaskList') {
                    const list = await createTaskList({ name: args.name, description: args.description, projectId });
                    lastCreatedListId = list.id;
                    executionResults.push(`List created: "${args.name}"`);
                }
                
                if (name === 'deleteTaskList') {
                    await deleteTaskList(args.listId);
                    executionResults.push(`List deleted.`);
                }

                if (name === 'deleteTask') {
                    await deleteTask(args.taskId);
                    executionResults.push(`Task deleted.`);
                }

                if (name === 'createTask') {
                    let targetListId = args.listId;
                    if (targetListId === 'LATEST_CREATED' || targetListId === 'PENDING') {
                        if (lastCreatedListId) targetListId = lastCreatedListId;
                    }

                    let targetStatusId = args.statusId
                    const statusExists = finalStatuses.some((s) => s.id === targetStatusId)
                    if (!statusExists && finalStatuses.length > 0) targetStatusId = finalStatuses[0].id;

                    await createTask({
                        title: args.title,
                        description: args.description,
                        listId: targetListId,
                        statusId: targetStatusId,
                        dueDate: args.dueDate ? new Date(args.dueDate) : undefined
                    })
                    executionResults.push(`Task created: "${args.title}"`);
                }
            }
            
            revalidatePath(`/projects/${projectId}`);
            return {
                success: true,
                transcript: userText,
                actions: executionResults,
                message: `Executed: ${executionResults.join(', ')}`
            }
        } 
        
        // No tools -> Text response
        return {
            success: true,
            transcript: userText,
            actions: [],
            message: responseMessage.content || "I didn't understand that.",
            shouldSpeak: true
        }

    } catch (error: any) {
        console.error('Groq Provider Error:', error)
        return {
            success: false,
            error: error.message || 'Unknown error',
            transcript: userText,
            actions: []
        }
    }
  }
}
