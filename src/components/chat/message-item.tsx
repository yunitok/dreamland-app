'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { UIMessage } from 'ai'
import { User, Check, Loader2, Sparkles } from 'lucide-react'
import { memo } from 'react'

interface MessageItemProps {
    message: UIMessage
}

function ToolCall({ toolName, state, result }: any) {
    const isCompleted = state === 'result'
    
    return (
        <div className="mt-2 mb-2 rounded-md border bg-muted/30 p-2 text-xs font-mono">
            <div className="flex items-center gap-2 mb-1">
                {isCompleted ? (
                    <Check className="h-3 w-3 text-green-500" />
                ) : (
                    <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                )}
                <span className="font-semibold">{toolName}</span>
                <span className="text-muted-foreground ml-auto uppercase tracking-tighter text-[10px]">
                    {state}
                </span>
            </div>
            {isCompleted && result && (
                <div className="mt-1 border-t pt-1 text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                   Result: {typeof result === 'string' ? result : JSON.stringify(result)}
                </div>
            )}
        </div>
    )
}

export const MessageItem = memo(({ message }: MessageItemProps) => {
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
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    isUser 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-sm'
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

                    {/* Content Markdown */}
                    {textContent && (
                        <div className={`prose prose-sm max-w-none break-words ${
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
