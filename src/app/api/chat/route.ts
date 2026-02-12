import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getChatLanguageModel } from '@/lib/ai/config';
import { getTaskLists, createTaskList, deleteTaskList, updateTaskList } from '@/lib/actions/task-lists';
import { getTaskStatuses } from '@/lib/actions/task-statuses';
import { createTask, getTasks, deleteTask, updateTask } from '@/lib/actions/tasks';
import { getProjects } from '@/lib/actions/projects';
import { generateProjectReport } from '@/app/actions/report-actions';
import { getLocale } from 'next-intl/server';
import { getHistory, saveMessage } from '@/lib/actions/chat';
import * as fs from 'fs';
import * as path from 'path';

function writeLog(data: any) {
  try {
    const logPath = path.join(process.cwd(), 'ai_debug.log');
    const entry = `\n[CHAT_API] --- ${new Date().toISOString()} ---\n${JSON.stringify(data, null, 2)}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {}
}

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, projectId, sessionId } = body;
    const locale = await getLocale().catch(() => 'es');

    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Guardar mensaje del usuario
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
       const content = lastMessage.content ||
                      lastMessage.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ||
                      '';
       await saveMessage(projectId, { role: 'user', content }, sessionId);
    }

    // Contexto Global de Proyectos
    const allProjects = await getProjects();

    // Contexto Específico del Proyecto Actual
    const [currentLists, currentStatuses] = await Promise.all([
      getTaskLists(projectId),
      getTaskStatuses()
    ]);

    const normalizedMessages = messages.map((m: any) => {
      let textContent = m.content || '';
      if (!textContent && m.parts) {
        textContent = m.parts
          .filter((p: any) => p.type === 'text')
          .map((p: any) => p.text)
          .join('');
      }
      return {
        role: m.role,
        content: textContent,
        ...(m.toolInvocations ? { toolInvocations: m.toolInvocations } : {})
      };
    });

    const model = getChatLanguageModel();
    let result;

    try {
      result = streamText({
        model,
        system: `Eres el Asistente de Proyectos de Dreamland. Tu objetivo es ayudar al usuario a gestionar su tablero de forma eficiente.
        
        REGLAS DE ORO:
        1. ERES UNA IA DE ACCIÓN: Si el usuario te pide crear, borrar o modificar algo, SIEMPRE usa la herramienta correspondiente.
        2. PARÁMETROS OBLIGATORIOS: Todas las herramientas requieren parámetros. Nunca llames a una herramienta con un objeto vacío {}.
        3. CONFIRMACIÓN: Tras ejecutar una herramienta con éxito, confirma la acción al usuario de forma breve y natural en castellano.
        
        EJEMPLOS DE LLAMADAS CORRECTAS:
        - "Crea una lista llamada Tareas" -> createlist({ name: "Tareas" })
        - "Añade la tarea Comprar pan a la lista Compra" -> createtask({ title: "Comprar pan", listId: "id_lista" })
        
        ID PROYECTO ACTUAL: ${projectId}
        BASE_URL: ${baseUrl}`,
        messages: normalizedMessages,
        stopWhen: stepCountIs(5),
        tools: {
          generate_report: tool({
            description: 'Genera un informe detallado del proyecto',
            parameters: z.object({
              projectId: z.string().describe('ID único del proyecto'),
            }),
            execute: async ({ projectId: id }: { projectId: string }) => {
              try {
                const report = await generateProjectReport(id || projectId);
                return { success: true, url: `/reports/${report.id}`, message: `Ok.` };
              } catch (err: any) {
                return { success: false, error: err.message };
              }
            }
          }),
          createlist: tool({
            description: 'Crea una nueva lista (columna) en el tablero.',
            parameters: z.object({
              name: z.string().min(1).describe('Nombre de la lista a crear'),
            }),
            execute: async ({ name }: { name: string }) => {
              try {
                const newList = await createTaskList({ name, projectId });
                return { success: true, message: `Lista "${name}" creada.`, listId: newList.id };
              } catch (err: any) {
                return { success: false, error: err.message };
              }
            }
          }),
          createtask: tool({
            description: 'Crea una nueva tarea en una lista específica.',
            parameters: z.object({
              title: z.string().min(1).describe('Título de la tarea'),
              listId: z.string().min(1).describe('ID de la lista donde se creará'),
            }),
            execute: async ({ title, listId }: { title: string; listId: string }) => {
              try {
                const task = await createTask({ title, listId, statusId: currentStatuses[0]?.id || '' });
                return { success: true, message: `Tarea creada.`, taskId: task.id };
              } catch (err: any) {
                return { success: false, error: err.message };
              }
            }
          }),
          deletetask: tool({
            description: 'Elimina una tarea por su ID.',
            parameters: z.object({
              taskId: z.string().min(1).describe('ID de la tarea a eliminar'),
            }),
            execute: async ({ taskId }: { taskId: string }) => {
              try {
                await deleteTask(taskId);
                return { success: true, message: "Ok." };
              } catch (err: any) {
                return { success: false, error: err.message };
              }
            }
          })
        } as any,
        onFinish: async (event) => {
          try {
            const { text } = event;
            if (text?.trim()) {
               await saveMessage(projectId, { role: 'assistant', content: text }, sessionId);
            }
          } catch (e: any) {}
        }
      });
    } catch (createError: any) {
      throw createError;
    }

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('CRITICAL POST ERROR:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
