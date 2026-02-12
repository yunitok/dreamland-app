import { SchemaType } from '@google/generative-ai'
import { ChatCompletionTool } from 'openai/resources/chat/completions'

export const AI_TOOLS_REGISTRY = {
  createTaskList: {
    description: 'Create a new list (column) in the project board',
    parameters: {
      name: {
        type: 'string',
        description: 'The name of the list (e.g., "Marketing", "Q1 Goals")',
        required: true
      },
      description: {
        type: 'string',
        description: 'Optional description of the list',
        required: false
      }
    }
  },
  updateTaskList: {
    description: 'Rename or update a list (column).',
    parameters: {
      listId: {
        type: 'string',
        description: 'The ID of the list to update.',
        required: true
      },
      name: {
        type: 'string',
        description: 'The new name of the list.',
        required: false
      },
      description: {
        type: 'string',
        description: 'The new description of the list.',
        required: false
      }
    }
  },
  deleteTaskList: {
    description: 'Delete a list (column) from the project board. List MUST be empty.',
    parameters: {
      listId: {
        type: 'string',
        description: 'The ID of the list to delete.',
        required: true
      }
    }
  },
  createTask: {
    description: 'Create a new task in a specific list',
    parameters: {
      title: {
        type: 'string',
        description: 'The title of the task',
        required: true
      },
      listId: {
        type: 'string',
        description: 'The ID of the list to add the task to. Inferred from context.',
        required: true
      },
      statusId: {
        type: 'string',
        description: 'The ID of the status (e.g., "To Do"). Inferred from context.',
        required: true
      },
      description: {
        type: 'string',
        description: 'Use this for extra details mentioned',
        required: false
      },
      dueDate: {
        type: 'string',
        description: 'Due date in ISO format (YYYY-MM-DD)',
        required: false
      }
    }
  },
  updateTask: {
    description: 'Rename or update a task.',
    parameters: {
      taskId: {
        type: 'string',
        description: 'The ID of the task to update.',
        required: true
      },
      title: {
        type: 'string',
        description: 'The new title of the task.',
        required: false
      },
      description: {
        type: 'string',
        description: 'The new description of the task.',
        required: false
      },
      dueDate: {
        type: 'string',
        description: 'New due date in ISO format (YYYY-MM-DD)',
        required: false
      }
    }
  },
  deleteTask: {
    description: 'Delete a task from the project.',
    parameters: {
      taskId: {
        type: 'string',
        description: 'The ID of the task to delete.',
        required: true
      }
    }
  },
  generateReport: {
    description: 'Generate, create, make, or draft a comprehensive status report for a specific project. Use this when the user asks for a "report", "summary", or "update" for ANY project listed in the context (not just the active one).',
    parameters: {
      projectId: {
        type: 'string',
        description: 'The ID of the project to report on.',
        required: true
      }
    }
  }
}

/**
 * Transforms the central registry into Gemini FunctionDeclarations
 */
export function getGeminiTools() {
  return {
    functionDeclarations: Object.entries(AI_TOOLS_REGISTRY).map(([name, tool]) => ({
      name,
      description: tool.description,
      parameters: {
        type: SchemaType.OBJECT,
        properties: Object.entries(tool.parameters).reduce((acc, [propName, prop]) => {
          acc[propName] = {
            type: prop.type === 'string' ? SchemaType.STRING : SchemaType.OBJECT,
            description: prop.description
          }
          return acc
        }, {} as any),
        required: Object.entries(tool.parameters)
          .filter(([_, prop]) => prop.required)
          .map(([propName]) => propName)
      }
    }))
  }
}

/**
 * Transforms the central registry into OpenAI-compatible ChatCompletionTools.
 * Works with OpenRouter, Groq, and any OpenAI-compatible API.
 */
export function getOpenAIFormatTools(): ChatCompletionTool[] {
  return Object.entries(AI_TOOLS_REGISTRY).map(([name, tool]) => ({
    type: 'function' as const,
    function: {
      name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.entries(tool.parameters).reduce((acc, [propName, prop]) => {
          acc[propName] = {
            type: prop.type,
            description: prop.description
          }
          return acc
        }, {} as any),
        required: Object.entries(tool.parameters)
          .filter(([_, prop]) => prop.required)
          .map(([propName]) => propName)
      }
    }
  }))
}

/** @deprecated Use getOpenAIFormatTools instead */
export const getGroqTools = getOpenAIFormatTools
