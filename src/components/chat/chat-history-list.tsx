'use client'

import React from 'react'
import { Plus, MessageSquare, Trash2, Clock } from 'lucide-react'
import { ScrollArea } from '@/modules/shared/ui/scroll-area'
import { Button } from '@/modules/shared/ui/button'
import { cn } from '@/lib/utils'

export interface ChatSession {
    id: string
    title: string | null
    updatedAt: Date
}

interface ChatHistoryListProps {
    sessions: ChatSession[]
    currentSessionId: string | null
    onSelectSession: (id: string) => void
    onCreateSession: () => void
    onDeleteSession: (id: string) => void
    isLoading?: boolean
}

export function ChatHistoryList({
    sessions,
    currentSessionId,
    onSelectSession,
    onCreateSession,
    onDeleteSession,
    isLoading
}: ChatHistoryListProps) {
    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-4 border-b flex items-center justify-between shrink-0 h-[60px]">
                <h3 className="text-sm font-medium">Historial</h3>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onCreateSession}
                    disabled={isLoading}
                    title="Nuevo Chat"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {!sessions || sessions.length === 0 ? (
                        <div className="text-center text-xs text-muted-foreground p-4">
                            No hay conversaciones previas.
                        </div>
                    ) : (
                        sessions.map((session) => (
                            <div 
                                key={session.id}
                                className={cn(
                                    "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer relative",
                                    currentSessionId === session.id ? "bg-accent/50 text-accent-foreground font-medium" : "text-muted-foreground"
                                )}
                                onClick={() => onSelectSession(session.id)}
                            >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                    <MessageSquare className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{session.title || 'Conversación sin título'}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive shrink-0"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onDeleteSession(session.id)
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
