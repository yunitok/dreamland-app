import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { getTaskLists, createTaskList, deleteTaskList, updateTaskList } from '@/lib/actions/task-lists';
import { getTaskStatuses } from '@/lib/actions/task-statuses';
import { createTask, getTasks, deleteTask, updateTask } from '@/lib/actions/tasks';
import { getLocale } from 'next-intl/server';

export const maxDuration = 30;

import { getHistory, saveMessage } from '@/lib/actions/chat';

export async function POST(req: Request) {
  const { messages, projectId } = await req.json();
  const locale = await getLocale();

  // Save the user's latest message
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role === 'user') {
     await saveMessage(projectId, { 
        role: 'user', 
        content: lastMessage.content 
     });
  }

  // Get Context
  const [lists, statuses, tasks, history] = await Promise.all([
    getTaskLists(projectId),
    getTaskStatuses(),
    getTasks(projectId),
    getHistory(projectId) 
  ]);

  const context = `
    Project Context:
    - Lists: ${lists.map((l: { name: string; id: string }) => `${l.name} (ID: ${l.id})`).join(', ')}
    - Statuses: ${statuses.map((s: { name: string; id: string }) => `${s.name} (ID: ${s.id})`).join(', ')}
    - Tasks: ${tasks.map((t: { title: string; status: { name: string } }) => `${t.title} (${t.status.name})`).join(', ')}
    
    Current Locale: ${locale}
  `;
  
  const result = streamText({
    model: google('gemini-1.5-flash'),
    system: `You are a project management assistant. Use the following context to help the user manage their project.\n\n${context}`,
    messages, 
    // maxSteps/maxToolRoundtrips not supported in this version
    tools: {
      createTaskList: tool({
        description: 'Create a new list (column) in the project board',
        parameters: z.object({
          name: z.string().describe('The name of the list'),
          description: z.string().optional().describe('Description of the list'),
        }),
        execute: async ({ name, description }: { name: string, description?: string }) => {
          const list = await createTaskList({ name, description, projectId });
          return { success: true, listId: list.id, listName: list.name };
        },
      } as any),
      updateTaskList: tool({
        description: 'Rename or update a list (column)',
        parameters: z.object({
          listId: z.string().describe('The ID of the list to update'),
          name: z.string().optional().describe('The new name of the list'),
          description: z.string().optional().describe('The new description'),
        }),
        execute: async ({ listId, name, description }: { listId: string, name?: string, description?: string }) => {
          const list = await updateTaskList(listId, { name, description });
          return { success: true, listId: list.id, listName: list.name };
        },
      } as any),
      deleteTaskList: tool({
        description: 'Delete a list (column) from the project board. List MUST be empty.',
        parameters: z.object({
          listId: z.string().describe('The ID of the list to delete'),
        }),
        execute: async ({ listId }: { listId: string }) => {
          await deleteTaskList(listId);
          return { success: true, deletedListId: listId };
        },
      } as any),
      createTask: tool({
        description: 'Create a new task in a specific list',
        parameters: z.object({
          title: z.string().describe('The title of the task'),
          listId: z.string().describe('The ID of the list to add the task to'),
          statusId: z.string().describe('The ID of the status (column)'),
          description: z.string().optional().describe('Task description'),
          dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
        }),
        execute: async ({ title, listId, statusId, description, dueDate }: { title: string, listId: string, statusId: string, description?: string, dueDate?: string }) => {
          const task = await createTask({
            title,
            listId,
            statusId,
            description,
            dueDate: dueDate ? new Date(dueDate) : undefined,
          });
          return { success: true, taskId: task.id, taskTitle: task.title };
        },
      } as any),
      updateTask: tool({
        description: 'Update a task details',
        parameters: z.object({
          taskId: z.string().describe('The ID of the task to update'),
          title: z.string().optional(),
          description: z.string().optional(),
          dueDate: z.string().optional(),
        }),
        execute: async ({ taskId, title, description, dueDate }: { taskId: string, title?: string, description?: string, dueDate?: string }) => {
          const task = await updateTask(taskId, {
            title,
            description,
            dueDate: dueDate ? new Date(dueDate) : undefined,
          });
          return { success: true, taskId: task.id, taskTitle: task.title };
        },
      } as any),
      deleteTask: tool({
        description: 'Delete a task',
        parameters: z.object({
          taskId: z.string().describe('The ID of the task to delete'),
        }),
        execute: async ({ taskId }: { taskId: string }) => {
          await deleteTask(taskId);
          return { success: true, deletedTaskId: taskId };
        },
      } as any),
    },
    onFinish: async ({ response }) => {
        const content = response.messages.find(m => m.role === 'assistant')?.content;
        for (const msg of response.messages) {
             if (msg.role === 'assistant') {
                 let toolInvocations = undefined;
                 if (msg.content.length === 0 && 'toolCalls' in msg) {
                     // @ts-ignore
                      toolInvocations = msg.toolCalls;
                 }
                 
                 await saveMessage(projectId, { 
                    role: 'assistant', 
                    content: typeof msg.content === 'string' ? msg.content : '',
                    toolInvocations
                 });
             }
        }
    }
  });

  return result.toTextStreamResponse();
}
