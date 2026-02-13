import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { getChatLanguageModel } from '@/lib/ai/config';
import { getTaskLists, createTaskList, deleteTaskList, updateTaskList } from '@/modules/projects/actions/task-lists';
import { getTaskStatuses } from '@/modules/projects/actions/task-statuses';
import { createTask, getTasks, deleteTask, updateTask } from '@/modules/projects/actions/tasks';
import { getProjects, getProjectById } from '@/modules/projects/actions/projects';
import { generateProjectReport } from '@/modules/reports/actions/report-actions';
import { getLocale } from 'next-intl/server';
import { getHistory, saveMessage } from '@/lib/actions/chat';
import * as fs from 'fs';
import * as path from 'path';

type MessagePart = { type: string; text?: string }
type ChatMessage = { role: string; content?: string; parts?: MessagePart[]; toolInvocations?: unknown }

function writeLog(data: unknown) {
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
                      lastMessage.parts?.filter((p: MessagePart) => p.type === 'text').map((p: MessagePart) => p.text).join('') ||
                      '';
       await saveMessage(projectId, { role: 'user', content }, sessionId);
    }

    // Contexto Global + Proyecto Actual
    const [allProjects, currentProject, currentLists, currentStatuses] = await Promise.all([
      getProjects(),
      getProjectById(projectId),
      getTaskLists(projectId),
      getTaskStatuses()
    ]);

    const normalizedMessages = (messages as ChatMessage[]).map((m) => {
      let textContent = m.content || '';
      if (!textContent && m.parts) {
        textContent = m.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text ?? '')
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
      const projectListContext = (allProjects as { id: string; title: string }[]).map((p) => `- "${p.title}" (ID: ${p.id})`).join('\n');
      const currentProjectName = (currentProject as { title?: string } | null)?.title || 'Desconocido';
      const listsContext = (currentLists as { id: string; name: string }[]).map((l) => `- ${l.name} (ID: ${l.id})`).join('\n');
      const statusesContext = (currentStatuses as { id: string; name: string }[]).map((s) => `- ${s.name} (ID: ${s.id})`).join('\n');

      result = streamText({
        model,
        system: `Eres el Asistente de Proyectos de Dreamland. Tu objetivo es ayudar al usuario a gestionar sus proyectos de forma eficiente.

REGLAS DE ORO:
1. ERES UNA IA DE ACCIÓN: Si el usuario te pide crear, borrar o modificar algo, SIEMPRE usa la herramienta correspondiente.
2. PARÁMETROS OBLIGATORIOS: Todas las herramientas requieren parámetros. Nunca llames a una herramienta con un objeto vacío {}.
3. CONFIRMACIÓN: Tras ejecutar una herramienta con éxito, confirma la acción al usuario de forma breve y natural en castellano.
4. FORMATO DE ENLACES: Cuando menciones la URL de un informe, NUNCA muestres la URL en bruto. Usa SIEMPRE el formato markdown: [**aquí**](url). Ejemplo: "Puedes verlo [**aquí**](/reports/abc123)."

PROYECTO ACTIVO: "${currentProjectName}" (ID: ${projectId})
BASE_URL: ${baseUrl}

LISTA COMPLETA DE PROYECTOS:
${projectListContext}

PROYECTO ACTUAL - LISTAS:
${listsContext || '(sin listas)'}

PROYECTO ACTUAL - ESTADOS:
${statusesContext || '(sin estados)'}

REGLAS PARA OPERACIONES CROSS-PROJECT:
1. El usuario puede pedir acciones sobre CUALQUIER proyecto, no solo el activo.
2. Si el usuario nombra un proyecto diferente al activo (ej: "hazme un informe de Atención al Cliente"), BUSCA en la LISTA COMPLETA DE PROYECTOS el que mejor coincida por nombre.
3. USA FUZZY MATCHING: "atención al cliente" coincide con "Atención al Cliente: Mejora del Servicio", "sherlock" coincide con "Sherlock: Desviación de Costes", etc.
4. Para generate_report: usa SIEMPRE el projectId del proyecto que el usuario ha nombrado, NO el del proyecto activo (a menos que no especifique otro).
5. Si no encuentras coincidencia clara, pregunta al usuario cuál proyecto se refiere.

EJEMPLOS:
- Usuario en Sherlock dice "genera un informe de atención al cliente" -> Buscar en la lista el proyecto que contenga "atención al cliente" y usar su ID.
- Usuario dice "genera un informe" (sin especificar proyecto) -> Usar el proyecto activo (${projectId}).
- "Crea una lista llamada Tareas" -> createlist({ name: "Tareas" }) (se crea en el proyecto activo)`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages: normalizedMessages as any[],
        stopWhen: stepCountIs(5),
        tools: {
          generate_report: tool({
            description: 'Genera un informe detallado de CUALQUIER proyecto. Si el usuario nombra un proyecto específico (ej: "atención al cliente"), busca su ID en la LISTA COMPLETA DE PROYECTOS y úsalo. Solo usa el proyecto activo si el usuario no especifica otro.',
            inputSchema: z.object({
              projectId: z.string().describe('ID del proyecto objetivo. IMPORTANTE: Buscar en la LISTA COMPLETA DE PROYECTOS por nombre usando fuzzy matching. NO usar siempre el proyecto activo.'),
            }),
            execute: async ({ projectId: id }: { projectId: string }) => {
              try {
                const report = await generateProjectReport(id || projectId);
                return { success: true, url: `/reports/${report.id}`, message: `Ok.` };
              } catch (err: unknown) {
                return { success: false, error: err instanceof Error ? err.message : String(err) };
              }
            }
          }),
          createlist: tool({
            description: 'Crea una nueva lista (columna) en el tablero.',
            inputSchema: z.object({
              name: z.string().min(1).describe('Nombre de la lista a crear'),
            }),
            execute: async ({ name }: { name: string }) => {
              try {
                const newList = await createTaskList({ name, projectId });
                return { success: true, message: `Lista "${name}" creada.`, listId: newList.id };
              } catch (err: unknown) {
                return { success: false, error: err instanceof Error ? err.message : String(err) };
              }
            }
          }),
          createtask: tool({
            description: 'Crea una nueva tarea en una lista específica.',
            inputSchema: z.object({
              title: z.string().min(1).describe('Título de la tarea'),
              listId: z.string().min(1).describe('ID de la lista donde se creará'),
            }),
            execute: async ({ title, listId }: { title: string; listId: string }) => {
              try {
                const task = await createTask({ title, listId, statusId: currentStatuses[0]?.id || '' });
                return { success: true, message: `Tarea creada.`, taskId: task.id };
              } catch (err: unknown) {
                return { success: false, error: err instanceof Error ? err.message : String(err) };
              }
            }
          }),
          deletetask: tool({
            description: 'Elimina una tarea por su ID.',
            inputSchema: z.object({
              taskId: z.string().min(1).describe('ID de la tarea a eliminar'),
            }),
            execute: async ({ taskId }: { taskId: string }) => {
              try {
                await deleteTask(taskId);
                return { success: true, message: "Ok." };
              } catch (err: unknown) {
                return { success: false, error: err instanceof Error ? err.message : String(err) };
              }
            }
          })
        },
        onFinish: async (event) => {
          try {
            const { text } = event;
            if (text?.trim()) {
               await saveMessage(projectId, { role: 'assistant', content: text }, sessionId);
            }
          } catch (_e: unknown) {}
        }
      });
    } catch (createError: unknown) {
      throw createError;
    }

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error('CRITICAL POST ERROR:', error);
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
