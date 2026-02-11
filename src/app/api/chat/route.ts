import { google } from '@ai-sdk/google';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getTaskLists, createTaskList, deleteTaskList, updateTaskList } from '@/lib/actions/task-lists';
import { getTaskStatuses } from '@/lib/actions/task-statuses';
import { createTask, getTasks, deleteTask, updateTask } from '@/lib/actions/tasks';
import { getProjects } from '@/lib/actions/projects';
import { generateProjectReport } from '@/app/actions/report-actions';
import { getLocale } from 'next-intl/server';
import { getHistory, saveMessage } from '@/lib/actions/chat';
import fs from 'fs';
import path from 'path';

export const maxDuration = 60;

function logToDebugFile(message: string, data?: any) {
    const logPath = path.join(process.cwd(), 'chat-debug.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n${data ? JSON.stringify(data, null, 2) : ''}\n\n`;
    try {
        fs.appendFileSync(logPath, logEntry);
    } catch (e) { /* ignore */ }
}

export async function POST(req: Request) {
  try {
    const { messages, projectId, sessionId } = await req.json();
    logToDebugFile(`[${sessionId}] Chat Request Received`, { projectId, sessionId, messageCount: messages?.length });
    
    const locale = await getLocale().catch(() => 'es');
    
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const host = req.headers.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    logToDebugFile(`[${sessionId}] Context`, { projectId, locale, baseUrl });
    
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
    
    logToDebugFile(`[${sessionId}] Normalized Messages`, normalizedMessages);
    
    let fullText = '';

    const result = streamText({
      model: google('gemini-1.5-flash-latest') as any,
      system: `Eres el Asistente Especializado de Dreamland.
      
      IDIOMA: Responde SIEMPRE en Castellano (Español).
      
      ID PROYECTO ACTUAL: ${projectId}
      BASE_URL: ${baseUrl}
      
      CONTEXTO DEL PROYECTO ACTUAL (Úsalo para IDs):
      - Listas (Columnas): ${currentLists.map(l => `"${l.name}" [ID: ${l.id}]`).join(', ')}
      - Estados: ${currentStatuses.map(s => `"${s.name}" [ID: ${s.id}]`).join(', ')}
      
      REGLAS CRÍTICAS:
      1. Para crear una lista: usa 'createlist' con el campo 'name'. Ej: createlist({ name: "Testing" })
      2. Para crear una tarea: usa 'createtask' con 'title' y 'listId'. Ej: createtask({ title: "Fix bug", listId: "..." })
      
      EJEMPLO DE USO:
      - Usuario: "crea una lista llamada Prueba"
      - Acción: Llamar a 'createlist' con name="Prueba"
      
      REGLA DE RESPUESTA:
      - Tras usar herramientas, SIEMPRE escribe una respuesta final en texto confirmando el resultado o explicando errores.`,
      messages: normalizedMessages,
      stopWhen: stepCountIs(5),
      tools: {
        generate_report: (tool as any)({
          description: 'Genera un informe detallado del proyecto actual o uno específico.',
          parameters: z.object({
            query: z.string().describe('Nombre o ID del proyecto'),
          }),
          execute: async ({ query }: { query: string }) => {
            console.log(`[AI] Tool: generate_report (${query})`);
            logToDebugFile(`[${sessionId}] Tool: generate_report`, { query });
            try {
              const searchTerm = query?.trim() || projectId;
              const match = allProjects.find((p: any) => 
                p.id === searchTerm || (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase()))
              );
              if (!match) return { success: false, error: `Proyecto "${searchTerm}" no encontrado.` };
              const report = await generateProjectReport(match.id);
              return { success: true, url: `/reports/${report.id}`, message: `Ok.` };
            } catch (err: any) {
              return { success: false, error: err.message };
            }
          }
        }),

        createlist: (tool as any)({
          description: 'Crea una nueva lista de tareas. REQUIERE el parámetro "name".',
          parameters: z.object({
            name: z.string().min(1).describe('Nombre de la lista'),
          }),
          execute: async ({ name }: { name: string }) => {
            console.log(`[AI] Tool: createlist (${name})`);
            logToDebugFile(`[${sessionId}] Tool: createlist`, { name });
            try {
              const newList = await createTaskList({ name, projectId });
              return { success: true, message: `Lista "${name}" creada.`, listId: newList.id };
            } catch (err: any) {
              return { success: false, error: err.message };
            }
          }
        }),

        createtask: (tool as any)({
          description: 'Crea una nueva tarea en una lista específica.',
          parameters: z.object({
            title: z.string().min(1).describe('Título de la tarea'),
            listId: z.string().min(1).describe('ID de la lista'),
          }),
          execute: async ({ title, listId }: { title: string, listId: string }) => {
            console.log(`[AI] Tool: createtask (${title})`);
            logToDebugFile(`[${sessionId}] Tool: createtask`, { title, listId });
            try {
              const task = await createTask({ title, listId, statusId: currentStatuses[0]?.id || '' });
              return { success: true, message: `Tarea creada.`, taskId: task.id };
            } catch (err: any) {
              return { success: false, error: err.message };
            }
          }
        }),

        deletetask: (tool as any)({
          description: 'Elimina una tarea por su ID.',
          parameters: z.object({
            taskId: z.string().min(1).describe('ID de la tarea'),
          }),
          execute: async ({ taskId }: { taskId: string }) => {
            console.log(`[AI] Tool: deletetask (${taskId})`);
            logToDebugFile(`[${sessionId}] Tool: deletetask`, { taskId });
            try {
              await deleteTask(taskId);
              return { success: true, message: "Ok." };
            } catch (err: any) {
              return { success: false, error: err.message };
            }
          }
        })
      } as any,

      onStepFinish: async (step: any) => {
        try {
          const { text, toolCalls } = step;
          logToDebugFile(`[${sessionId}] Step Finish`, { 
              text: text?.slice(0, 100), 
              tools: toolCalls?.map((c: any) => c.toolName) 
          });
          if (text) fullText += text;
        } catch (e) {}
      },
      onFinish: async (event: any) => {
        try {
          const { text } = event;
          const finalContent = text || fullText;
          if (finalContent?.trim()) {
             await saveMessage(projectId, { role: 'assistant', content: finalContent }, sessionId);
          }
          logToDebugFile(`[${sessionId}] Chat End`, { finalContent: finalContent?.slice(0, 100) });
        } catch (e) {}
      }
    } as any);

    return result.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error('CRITICAL POST ERROR:', error);
    logToDebugFile('CRITICAL POST ERROR', { error: error.message, stack: error.stack });
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
