'use client'

import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Bot, Volume2, VolumeX } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'
import { MessageItem } from '@/components/chat/message-item'
import { ChatInput } from '@/components/chat/chat-input'
import { UIMessage } from '@/types/chat'

interface ChatPanelProps {
  projectId: string
  initialMessages?: any[]
}

export function ChatPanel({ projectId, initialMessages = [] }: ChatPanelProps) {
  const [autoRead, setAutoRead] = useState(true)

  const runTTS = (text: string) => {
    if (!autoRead || !text) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        // Ideally detect language, default to English for now
        utterance.lang = 'en-US' 
        window.speechSynthesis.speak(utterance)
    }
  }

  // Cast to any to bypass linter errors with @ai-sdk/react types
  // @ts-ignore
  // Cast to any to bypass linter errors with @ai-sdk/react types
  // @ts-ignore
  const chatHelpers = useChat({
    api: '/api/chat',
    body: { projectId },
    initialMessages: initialMessages.length > 0 ? initialMessages : [
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I can help you manage your project. Try saying "Create a Marketing list" or "Add a task".',
            toolInvocations: []
        }
    ],
    onFinish: ({ message }: { message: any }) => {
        // @ts-ignore - Bypass linter if message type is inferred wrong
        if (message.role === 'assistant' && message.content) {
            runTTS(message.content)
        }
    }
  } as any) as any
  
  const { messages, input, handleInputChange, handleSubmit, isLoading, stop, setInput } = chatHelpers

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 z-50 text-white" 
            size="icon"
        >
            <Bot className="h-7 w-7" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col h-full w-[400px] sm:w-[540px] p-0 gap-0">
        <SheetHeader className="p-4 border-b bg-muted/40 backdrop-blur-sm flex flex-row items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Dreamland Assistant
            </SheetTitle>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setAutoRead(!autoRead)}
                className="h-8 w-8 text-muted-foreground"
                title={autoRead ? "Mute Text-to-Speech" : "Enable Text-to-Speech"}
            >
                {autoRead ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
            {(messages as UIMessage[]).map(m => (
                <MessageItem key={m.id} message={m} />
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
                 <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-muted/50 border max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 ml-10">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="p-4 border-t bg-background">
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
      </SheetContent>
    </Sheet>
  )
}
