'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { UIMessage, ToolInvocation } from '@/types/chat'
import { Bot, User, Check, Loader2, Terminal } from 'lucide-react'
import { memo } from 'react'

interface MessageItemProps {
    message: UIMessage
}

function ToolCall({ toolName, state, result }: ToolInvocation) {
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
    const isTool = message.role === 'data' // Sometimes tools come as data? No, Vercel AI SDK embeds them in 'assistant' usually.
    
    if (message.role === 'system') return null;

    return (
        <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2`}>
            <div className={`flex max-w-[85%] sm:max-w-[75%] gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    isUser 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm'
                }`}>
                    {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
                </div>

                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-3 shadow-sm text-sm overflow-hidden ${
                    isUser 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted/50 border rounded-tl-none'
                }`}>
                    {/* Tool Invocations (Rendered above text usually, or mixed? SDK usually puts them at the end or checks for 'stop reason') */}
                    {message.toolInvocations?.length! > 0 && (
                        <div className="mb-2 space-y-2">
                             {message.toolInvocations?.map((toolInv) => (
                                <ToolCall key={toolInv.toolCallId} {...toolInv} />
                             ))}
                        </div>
                    )}

                    {/* Content Markdown */}
                    {message.content && (
                        <div className={`prose prose-sm max-w-none break-words ${
                            isUser ? 'prose-invert' : 'dark:prose-invert'
                        }`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
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
