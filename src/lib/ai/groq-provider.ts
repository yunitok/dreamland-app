import { AIProvider, AIResponse } from './provider.interface'
import OpenAI from 'openai'
import { ChatCompletionTool } from 'openai/resources/chat/completions'
import { getTaskLists, createTaskList, deleteTaskList, updateTaskList } from '@/lib/actions/task-lists'
import { getTaskStatuses, createDefaultStatuses } from '@/lib/actions/task-statuses'
import { createTask, getTasks, deleteTask, updateTask } from '@/lib/actions/tasks'
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
      name: "updateTaskList",
      description: "Rename or update a list (column).",
      parameters: {
        type: "object",
        properties: {
          listId: {
            type: "string",
            description: "The ID of the list to update.",
          },
          name: {
            type: "string",
            description: "The new name of the list.",
          },
          description: {
            type: "string",
            description: "The new description of the list.",
          },
        },
        required: ["listId"],
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
      name: "updateTask",
      description: "Rename or update a task.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The ID of the task to update.",
          },
          title: {
            type: "string",
            description: "The new title of the task.",
          },
          description: {
            type: "string",
            description: "The new description of the task.",
          },
          dueDate: {
            type: "string",
            description: "New due date in ISO format (YYYY-MM-DD)",
          },
        },
        required: ["taskId"],
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

  async processCommand(projectId: string, userText: string, locale: string = 'en'): Promise<AIResponse> {
        // Load translations
        // We need to dynamically import getTranslations because it's a server action context
        const { getTranslations } = await import('next-intl/server');
        const t = await getTranslations({ locale, namespace: 'Voice' });

    try {
        if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY')

        // 1. Fetch Context
        const [lists, initialStatuses, tasks] = await Promise.all([
          getTaskLists(projectId),
          getTaskStatuses(),
          getTasks(projectId)
        ]) as [TaskList[], TaskStatus[], any[]]

        let finalStatuses = initialStatuses;
        if (finalStatuses.length === 0) {
            finalStatuses = await createDefaultStatuses()
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

        // 2. Call LLM with Retry Logic
        let completionResponse;
        let attempt = 0;
        const maxAttempts = 2;

        while (attempt < maxAttempts) {
            try {
                attempt++;
                completionResponse = await this.client.chat.completions.create({
                    model: "llama-3.3-70b-versatile", // Fast and capable model
                    messages: [
                        {
                            role: "system",
                            content: `You are a helpful project management assistant for "Dreamland".
                    CONTEXT:
                    ${context}
                    
                    RULES:
                    1. Execute commands using tools.
                    2. **VOICE RECOGNITION CORRECTION**: The input is a raw voice transcript and may contain phonetic errors.
                       - "dia" / "ella" usually means "IA" (Artificial Intelligence) in this context.
                       - "Miercoles de dia" -> "Miercoles de IA".
                       - Check if the input sounds like an existing List or Task in the CONTEXT. If it's a close phonetic match, USE THE EXISTING ID.
                    3. **PREFER EXISTING**: Before creating a NEW list/task, check if one with a very similar name already exists.
                    4. **AMBIGUITY CHECK**: If the user asks to create something that sounds very similar to an existing item but slightly wrong (e.g. "Buy Milk" vs "Buy Silk"), OR if the command is ambiguous, **ASK FOR CONFIRMATION** instead of executing.
                       - Example: "Did you mean 'Miercoles de IA'?"
                    5. If info missing (like Task Title), ask CLARIFYING QUESTIONS.
                    6. Do not guess IDs.
                    `
                        },
                        { role: "user", content: userText }
                    ],
                    tools: tools,
                    tool_choice: "auto"
                }).withResponse();
                
                // If successful, break loop
                break;
            } catch (err: any) {
                // Check if it's the specific "tool_use_failed" 400 error
                const isToolUseError = err?.status === 400 && err?.error?.code === 'tool_use_failed';
                
                if (isToolUseError && attempt < maxAttempts) {
                    console.warn(`[GroqProvider] Attempt ${attempt} failed with tool_use_failed. Retrying...`);
                    continue; // Retry
                }
                
                // Otherwise rethrow immediately
                throw err;
            }
        }

        if (!completionResponse) {
             throw new Error('Failed to get response from Groq after retries.');
        }

        const completion = completionResponse.data;
        const headers = completionResponse.response.headers;

        const remainingRequests = headers.get('x-ratelimit-remaining-requests');
        const remainingTokens = headers.get('x-ratelimit-remaining-tokens');

        const responseMessage = completion.choices[0].message;

        
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

        let toolCalls = responseMessage.tool_calls;
        
        // --- FALLBACK: Detect hallucinated tool calls in content ---
        if ((!toolCalls || toolCalls.length === 0) && responseMessage.content) {
            const content = responseMessage.content.trim();
            // Look for JSON-like structure that mentions our tool names
            // Simple heuristic: starts with { and contains "name" and one of our functions
            const knownTools = ['createTaskList', 'updateTaskList', 'deleteTaskList', 'createTask', 'updateTask', 'deleteTask'];
            
            if (content.startsWith('{') || content.startsWith('```json')) {
                try {
                    // Strip markdown if present
                    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleanContent);
                    
                    // Check if it matches expected single tool structure: { name: "...", arguments: {...} } or { function: { ... } }
                    // Common hallucination format 1: { "name": "updateTask", "parameters": { ... } }
                    // Common hallucination format 2: { "function": "updateTask", "arguments": ... }
                    
                    let functionName = parsed.name || (parsed.function && parsed.function.name);
                    let args = parsed.parameters || parsed.arguments || (parsed.function && parsed.function.arguments);

                    if (knownTools.includes(functionName)) {
                        console.log('Detected hallucinated tool call:', functionName);
                        
                        // normalize args to string if it's an object (as expected by SDK)
                        const argsString = typeof args === 'string' ? args : JSON.stringify(args);
                        
                        toolCalls = [{
                            id: 'fallback_call_' + Date.now(),
                            type: 'function',
                            function: {
                                name: functionName,
                                arguments: argsString
                            }
                        }];
                    }
                } catch (e) {
                    console.warn('Failed to parse fallback JSON content', e);
                }
            }
        }
        // -----------------------------------------------------------

        if (toolCalls && toolCalls.length > 0) {
            for (const toolCall of toolCalls) {
                // @ts-ignore - OpenAI SDK types union fix
                const functionCall = toolCall.function;
                if (!functionCall) continue;

                const args = JSON.parse(functionCall.arguments);
                const name = functionCall.name;

                if (name === 'createTaskList') {
                    const list = await createTaskList({ name: args.name, description: args.description, projectId });
                    lastCreatedListId = list.id;
                    executionResults.push(t('listCreated', { name: args.name }));
                }
                
                if (name === 'updateTaskList') {
                    const updated = await updateTaskList(args.listId, {
                        name: args.name,
                        description: args.description
                    });
                    executionResults.push(t('listUpdated', { name: updated.name || args.name }));
                }

                if (name === 'deleteTaskList') {
                    await deleteTaskList(args.listId);
                    executionResults.push(t('listDeleted'));
                }

                if (name === 'deleteTask') {
                    await deleteTask(args.taskId);
                    executionResults.push(t('taskDeleted'));
                }

                if (name === 'createTask') {
                    let targetListId = args.listId;
                    
                    if (targetListId === 'LATEST_CREATED' || targetListId === 'PENDING') {
                        if (lastCreatedListId) {
                            targetListId = lastCreatedListId;
                        } else {
                            console.warn('Task requested for LATEST_CREATED list but no list was created.');
                        }
                    }

                    // Validate statusId fallback
                    let targetStatusId = args.statusId;
                    const statusExists = finalStatuses.some((s) => s.id === targetStatusId);
                    if (!statusExists && finalStatuses.length > 0) {
                        targetStatusId = finalStatuses[0].id;
                    }

                    await createTask({
                        title: args.title,
                        description: args.description,
                        listId: targetListId,
                        statusId: targetStatusId,
                        dueDate: args.dueDate ? new Date(args.dueDate) : undefined
                    });
                    executionResults.push(t('taskCreated', { title: args.title }));
                }

                if (name === 'updateTask') {
                    const updated = await updateTask(args.taskId, {
                        title: args.title,
                        description: args.description,
                        dueDate: args.dueDate ? new Date(args.dueDate) : undefined
                    });
                    executionResults.push(t('taskUpdated', { title: updated.title || args.title }));
                }
            }
            
            revalidatePath(`/projects/${projectId}`);
            return {
                success: true,
                transcript: userText,
                actions: executionResults,
                message: t('executed', { actions: executionResults.join(', ') })
            }
        } 
        
        // No tools -> Text response
        return {
            success: true,
            transcript: userText,
            actions: [],
            message: responseMessage.content || t('didNotUnderstand'),
            shouldSpeak: true
        }

    } catch (error: any) {
        console.error('\n\n❌ [VOICE_CMD_ERROR] -----------------------------------------');
        console.error('Input:', userText);
        console.error('Error Message:', error.message);
        console.error('Stack:', error.stack);
        console.error('-------------------------------------------------------------\n\n');
        
        return {
            success: false,
            error: error.message || 'Unknown error',
            debugStack: error.stack,
            transcript: userText,
            actions: []
        }
    }
  }
}
