'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Sparkles, History } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'
import { MessageItem } from '@/components/chat/message-item'
import { ChatInput } from '@/components/chat/chat-input'
import { saveMessage, getHistory, createChatSession, deleteChatSession } from '@/lib/actions/chat'
import { ChatHistoryList, ChatSession } from './chat-history-list'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { detectFinishedToolCalls } from '@/lib/ai/ai-utils'

interface ChatPanelProps {
  projectId: string
  initialSessions: ChatSession[]
}

export function ChatPanel({ projectId, initialSessions }: ChatPanelProps) {
   const [sessions, setSessions] = useState<ChatSession[]>(initialSessions)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const router = useRouter()
  
  // Ref to access current session in callbacks/closures without dependency issues
  const currentSessionIdRef = useRef<string | null>(null)
  
  useEffect(() => {
      currentSessionIdRef.current = currentSessionId
  }, [currentSessionId])

  // Select the latest session on mount if available
  useEffect(() => {
    if (initialSessions && initialSessions.length > 0) {
        // We don't automatically load history to save bandwidth/performance on initial load.
        // History is loaded when user opens the panel or selects session.
        setCurrentSessionId(initialSessions[0].id)
    }
  }, []) // Run once on mount

  const selectSession = async (sessionId: string) => {
      setCurrentSessionId(sessionId)
      setShowHistory(false)
      
      // Load history
      try {
        const history = await getHistory(projectId, sessionId)
        setMessages(history as any)
      } catch (error) {
          console.error("Failed to load history", error)
          toast.error("Error al cargar la conversación")
      }
  }

  const handleCreateSession = async () => {
      try {
          const newSession = await createChatSession(projectId)
          setSessions([newSession, ...sessions])
          selectSession(newSession.id)
          toast.success("Nueva conversación iniciada")
      } catch (error) {
          toast.error("Error al crear conversación")
      }
  }

  const handleDeleteSession = async (sessionId: string) => {
      try {
          await deleteChatSession(sessionId)
          const updatedSessions = sessions.filter(s => s.id !== sessionId)
          setSessions(updatedSessions)
          
          if (currentSessionId === sessionId) {
              if (updatedSessions.length > 0) {
                  selectSession(updatedSessions[0].id)
              } else {
                  setCurrentSessionId(null)
                  setMessages([])
              }
          }
          toast.success("Conversación eliminada")
      } catch (error) {
          toast.error("Error al eliminar conversación")
      }
  }

  // Cast to any to bypass linter errors with @ai-sdk/react types
  // @ts-ignore
  const [input, setInput] = useState('')

  const { 
    messages, 
    setMessages,
    sendMessage, 
    status, 
    stop 
  } = useChat({
    transport: new DefaultChatTransport({
        api: '/api/chat',
        body: { projectId, sessionId: currentSessionId }
    }),
    onFinish: async (result: any) => {
        const message = result.message;
        const text = message.content || message.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')

        // Ensure we have a valid session before saving (though backend should handle it)
        const activeSessionId = currentSessionIdRef.current
        
         // Guardar mensaje en BBDD (Persistencia desde cliente)
        if (message.role === 'assistant') {
             try {
                 await saveMessage(projectId, {
                     role: 'assistant',
                     content: text || '',
                     toolInvocations: message.toolInvocations
                 }, activeSessionId || undefined)
                 
                 // If this was a new session automagically created by backend (which we try to avoid by creating explicitly),
                 // we might want to refresh sessions list.
                 // But since we create session explicitly mostly, just refresh timestamp?
                 if (activeSessionId) {
                    // Update the timestamp in the local list to reflect activity
                    setSessions(prev => prev.map(s => 
                        s.id === activeSessionId ? { ...s, updatedAt: new Date() } : s
                    ).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()))
                 }
                 
             } catch (err) {
                 console.error('Failed to save message from client:', err)
             }
        }
    }
  })

  // Ref to track which tool calls we've already refreshed for
  const refreshedToolCallsRef = useRef<Set<string>>(new Set());

  // Silent real-time refresh: watch messages for completed tool calls
  useEffect(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    
    let needsRefresh = false;

    assistantMessages.forEach((m: any) => {
        const finishedIds = detectFinishedToolCalls(m);
        
        finishedIds.forEach(toolCallId => {
            if (!refreshedToolCallsRef.current.has(toolCallId)) {
                refreshedToolCallsRef.current.add(toolCallId);
                needsRefresh = true;
            }
        });
    });

    if (needsRefresh) {
        // Execute refresh silently after a short delay to ensure DB is written
        const timeoutId = setTimeout(() => {
            router.refresh();
        }, 500);
        
        return () => clearTimeout(timeoutId);
    }
  }, [messages, router]);

  // Set initial messages if provided (and we haven't loaded a session yet)
  // Removed optimizations

  const isLoading = status === 'submitted' || status === 'streaming'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault()
    if (isLoading) return
    
    let activeSessionId = currentSessionId
    
    // If no session selected, create one before sending
    if (!activeSessionId) {
        console.log('[ChatPanel] No active session, CALLING createChatSession...')
        try {
            const newSession = await createChatSession(projectId)
            console.log('[ChatPanel] createChatSession SUCCESS:', newSession?.id)
            if (!newSession) throw new Error("createChatSession returned null")
            
            setSessions([newSession, ...sessions])
            setCurrentSessionId(newSession.id)
            activeSessionId = newSession.id
        } catch (error: any) {
            console.log("[ChatPanel] createChatSession FAILED:", error)
            toast.error("Error al iniciar sesión de chat: " + error.message)
            return // Stop execution if we can't get a session
        }
    }
    
    // Send message with the (potentially new) session ID
    try {
      if (typeof sendMessage === 'function') {
        sendMessage({ text: input }, { body: { sessionId: activeSessionId } })
      }
    } catch (error: any) {
      toast.error("Error al enviar mensaje: " + error.message)
    }
    
    setInput('')
  }
  
  // Override local handleSubmit to ensure session creation
  // The ChatInput calls this.

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, showHistory])

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all duration-300 z-50 text-white border-2 border-white/20 hover:scale-110 hover:rotate-3 hover:shadow-indigo-500/50 ring-0 hover:ring-4 ring-indigo-500/20 group" 
            size="icon"
        >
            <div className="absolute inset-0 bg-white/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <Sparkles className="h-8 w-8 relative z-10" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className={cn(
            "p-0 border-l transition-all duration-300 ease-in-out block overflow-hidden",
            showHistory ? "w-[100vw] sm:w-[1150px]" : "w-[100vw] sm:w-[900px]",
            "max-w-[100vw] sm:max-w-[1150px]"
        )}
      >
        
        {/* Left Sidebar (History) */}
        <div 
            className={cn(
                "h-full bg-muted/10 border-r absolute left-0 top-0 transition-opacity duration-300",
                showHistory ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            style={{ width: '250px' }}
        >
            <ChatHistoryList 
                sessions={sessions}
                currentSessionId={currentSessionId}
                onSelectSession={selectSession}
                onCreateSession={handleCreateSession}
                onDeleteSession={handleDeleteSession}
                isLoading={isLoading}
            />
        </div>

        {/* Main Chat Area */}
        <div 
            className="flex flex-col h-full bg-background border-l shadow-2xl absolute top-0 right-0 transition-all duration-300"
            style={{ 
                width: '100%', 
                maxWidth: '900px'
            }}
        >
            <SheetHeader className="p-4 border-b bg-muted/40 backdrop-blur-sm flex flex-row items-center justify-between shrink-0 space-y-0">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowHistory(!showHistory)}
                        className={cn("h-8 w-8", showHistory && "bg-accent")}
                        title={showHistory ? "Ocultar historial" : "Mostrar historial"}
                    >
                        <History className="h-4 w-4" />
                    </Button>
                    <SheetTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Dreamland Assistant
                    </SheetTitle>
                </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
                {messages.length === 0 && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center text-sm">
                        <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                        <p>¡Hola! Soy tu asistente de proyecto.</p>
                        <p>Puedo ayudarte a gestionar tareas, listas y más.</p>
                    </div>
                )}
                
                {messages.map((m: any) => (
                    <MessageItem key={(m as any).id} message={m} />
                ))}
            </div>

            <div className="p-4 border-t bg-background shrink-0 relative z-30">
                <ChatInput 
                    input={input}
                    handleInputChange={handleInputChange}
                    handleSubmit={handleSubmit}
                    isLoading={isLoading}
                    stop={stop}
                    setInput={setInput}
                />
                <div className="text-[10px] text-center text-muted-foreground mt-2">
                    Powered by Vercel AI SDK • Web Speech API
                </div>
            </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
