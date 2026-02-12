/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { UIMessage } from 'ai'
import { User, Check, Loader2, Sparkles } from 'lucide-react'
import { memo } from 'react'

interface MessageItemProps {
    message: UIMessage
    isActiveMessage?: boolean
}

const TOOL_LABELS: Record<string, { label: string; working: string }> = {
    createTaskList:  { label: 'Crear lista',       working: 'Creando lista...' },
    updateTaskList:  { label: 'Actualizar lista',   working: 'Actualizando lista...' },
    deleteTaskList:  { label: 'Eliminar lista',     working: 'Eliminando lista...' },
    createTask:      { label: 'Crear tarea',        working: 'Creando tarea...' },
    updateTask:      { label: 'Actualizar tarea',   working: 'Actualizando tarea...' },
    deleteTask:      { label: 'Eliminar tarea',     working: 'Eliminando tarea...' },
    generateReport:  { label: 'Generar informe',    working: 'Generando informe...' },
}

function ToolCall({ toolName, state, result }: any) {
    const isCompleted = state === 'result'
    const meta = TOOL_LABELS[toolName]
    const label = meta?.label ?? toolName

    return (
        <div className={`mt-2 mb-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
            isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-violet-500/5 border-violet-500/20'
        }`}>
            <div className="flex items-center gap-2">
                {isCompleted ? (
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                    <span className="flex gap-0.5 shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce" />
                    </span>
                )}
                <span className={`font-medium ${isCompleted ? 'text-green-700 dark:text-green-400' : 'text-violet-700 dark:text-violet-400'}`}>
                    {isCompleted ? label : (meta?.working ?? `${label}...`)}
                </span>
            </div>
        </div>
    )
}

export const MessageItem = memo(({ message, isActiveMessage }: MessageItemProps) => {
    const isUser = message.role === 'user'
    const isTool = message.role === 'assistant' && message.parts?.some(p => p.type === 'tool-invocation')
    
    if (message.role === 'system') return null;

    // Extraer texto de forma robusta (soporta String o Array de partes en v6)
    const rawContent = (message as any).content;
    let textContent = '';
    
    // 1. Intentar sacar texto directo si es string
    if (typeof rawContent === 'string' && rawContent.length > 0) {
        textContent = rawContent;
    } 
    // 2. Si es array en 'content' (algunos proveedores nuevos)
    else if (Array.isArray(rawContent)) {
        textContent = rawContent
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('');
    }
    
    // 3. Si sigue vacío, buscar en 'parts' (formato estándar AI SDK)
    if (!textContent && message.parts && message.parts.length > 0) {
        textContent = message.parts
            .filter(p => p.type === 'text')
            .map(p => (p as any).text || '')
            .join('');
    }

    const toolInvocations = (message as any).toolInvocations || 
                            message.parts?.filter(p => p.type === 'tool-invocation').map(p => (p as any).toolInvocation) || 
                            []

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex max-w-[85%] sm:max-w-[75%] gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-linear-to-tr from-violet-600 to-indigo-600 text-white shadow-sm'
                }`}>
                    {isUser ? <User className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                </div>

                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-3 shadow-sm text-sm overflow-hidden ${
                    isUser 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted/50 border rounded-tl-none'
                }`}>
                    {/* Tool Invocations */}
                    {toolInvocations.length > 0 && (
                        <div className="mb-2 space-y-2">
                             {toolInvocations.map((toolInv: any) => (
                                <ToolCall key={toolInv.toolCallId} {...toolInv} />
                             ))}
                        </div>
                    )}

                    {/* Waiting dots: shown when this is the active streaming message but no text yet */}
                    {!isUser && isActiveMessage && !textContent && (
                        <div className="flex items-center gap-1.5 py-1">
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" />
                        </div>
                    )}

                    {/* Content Markdown */}
                    {textContent && (
                        <div className={`prose prose-sm max-w-none wrap-break-word ${
                            isUser ? 'prose-invert' : 'dark:prose-invert'
                        }`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                {textContent}
                            </ReactMarkdown>
                        </div>
                    )}
                    
                    {/* Timestamp? Optional */}
                </div>
            </div>
        </div>
    )
})

MessageItem.displayName = 'MessageItem'
