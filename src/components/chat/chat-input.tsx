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
    setInput?: (value: string | ((prev: string) => string)) => void;
}

export function ChatInput({ input, handleInputChange, handleSubmit, isLoading, stop, setInput }: ChatInputProps) {
    const [isListening, setIsListening] = useState(false)
    const recognitionRef = useRef<any>(null)

    // Improved Speech Recognition Logic
    const silenceTimerRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = true
                recognition.lang = 'es-ES'
                recognition.interimResults = true
                recognition.maxAlternatives = 1

                recognition.onstart = () => setIsListening(true)
                
                recognition.onend = () => {
                    setIsListening(false)
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
                }
                
                recognition.onresult = (event: any) => {
                    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

                    let interimTranscript = ''
                    let finalTranscript = ''

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript
                        } else {
                            interimTranscript += event.results[i][0].transcript
                        }
                    }
                    
                    if (setInput) {
                        setInput((prev) => {
                             return finalTranscript + interimTranscript
                        })
                    }

                    // Auto-stop after silence
                    silenceTimerRef.current = setTimeout(() => {
                        recognition.stop()
                    }, 1200)
                }
                
                recognition.onerror = (event: any) => {
                    // console.error('Speech recognition error', event.error)
                    if (event.error === 'no-speech') return 
                    setIsListening(false)
                    if (event.error === 'not-allowed') toast.error('Permiso de micrófono denegado.')
                }

                recognitionRef.current = recognition
            }
        }
        
        return () => {
             if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
             if (recognitionRef.current) recognitionRef.current.abort()
        }
    }, [setInput])

    const toggleListening = (e: React.MouseEvent) => {
        e.preventDefault()
        if (!recognitionRef.current) {
            toast.error('Reconocimiento de voz no soportado.')
            return
        }

        if (isListening) {
            recognitionRef.current.stop()
        } else {
            // Reset input if starting fresh? Or keep? 
            // setInput('') // Optional
            recognitionRef.current.start()
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-center relative">
            <div className="relative flex-1">
                <Input 
                    value={input} 
                    onChange={handleInputChange} 
                    placeholder={isListening ? "Escuchando..." : "Escribe un mensaje..."}
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
                    aria-label="Enviar mensaje"
                    disabled={!input?.trim() || isListening}
                    className="rounded-xl h-10 w-10"
                >
                    <Send className="h-4 w-4" />
                </Button>
            )}
        </form>
    )
}
