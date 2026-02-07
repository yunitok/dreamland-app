'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mic, Send, Loader2, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner' // Assuming sonner is used

interface ChatInputProps {
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    stop?: () => void;
    setInput?: (value: string) => void;
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading, stop, setInput }: ChatInputProps) {
    const [isListening, setIsListening] = useState(false)
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = false // Stop after one sentence for specific command vs continuous dictation? 
                // For chat, continuous is better until user stops? Or single shot?
                // Let's use single shot to populate input, user clicks send.
                recognition.interimResults = true
                recognition.lang = 'en-US' // Default to English for now? Or dynamic?

                recognition.onstart = () => setIsListening(true)
                recognition.onend = () => setIsListening(false)
                
                recognition.onresult = (event: any) => {
                    const transcript = Array.from(event.results)
                        .map((result: any) => result[0].transcript)
                        .join('')
                    
                    if (setInput) {
                        setInput(transcript)
                    }
                }
                
                recognitionRef.current = recognition
            }
        }
    }, [setInput])

    const toggleListening = (e: React.MouseEvent) => {
        e.preventDefault()
        if (!recognitionRef.current) {
            toast.error('Voice recognition not supported in this browser.')
            return
        }

        if (isListening) {
            recognitionRef.current.stop()
        } else {
            recognitionRef.current.start()
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center relative">
            <div className="relative flex-1">
                <Input 
                    value={input} 
                    onChange={handleInputChange} 
                    placeholder={isListening ? "Listening..." : "Type a message..."}
                    className={cn("pr-10", isListening && "placeholder:animate-pulse placeholder:text-red-500")}
                    disabled={isLoading && !stop}
                    autoFocus
                />
                {/* Voice Toggle */}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground",
                        isListening && "text-red-500 hover:text-red-600 animate-pulse bg-red-50"
                    )}
                    onClick={toggleListening}
                    disabled={isLoading}
                >
                    {isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
            </div>

            {isLoading ? (
                 <Button 
                    type="button" 
                    size="icon" 
                    variant="destructive"
                    onClick={stop}
                    className="rounded-xl h-10 w-10"
                >
                    <Square className="h-4 w-4 fill-current" />
                </Button>
            ) : (
                <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!input.trim() || isListening}
                    className="rounded-xl h-10 w-10"
                >
                    <Send className="h-4 w-4" />
                </Button>
            )}
        </form>
    )
}
