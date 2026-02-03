'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Loader2, StopCircle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { processTextCommand } from '@/lib/actions/voice'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VoiceAssistantButtonProps {
  projectId: string
  className?: string
}

export function VoiceAssistantButton({ projectId, className }: VoiceAssistantButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    // Check browser support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.lang = 'es-ES' // Set to Spanish
        recognition.interimResults = false
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        recognition.onresult = async (event: any) => {
          const text = event.results[0][0].transcript
          console.log('Transcript:', text)
          
          if (text) {
             // Stop listening and process
            recognition.stop()
            await handleCommand(text)
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          setIsListening(false)
          
          let errorMessage = 'Error desconocido'
          if (event.error === 'not-allowed') errorMessage = 'Permiso denegado. Habilita el micrófono.'
          if (event.error === 'no-speech') errorMessage = 'No se detectó voz.'
          if (event.error === 'network') errorMessage = 'Error de conexión.'
          if (event.error === 'aborted') return // Ignore aborted
          
          toast.error('Error micrófono', { description: errorMessage })
        }

        recognitionRef.current = recognition
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [projectId])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta reconocimiento de voz nativo.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        // Reset language just in case
        recognitionRef.current.lang = 'es-ES'
        recognitionRef.current.start()
      } catch (e) {
        console.error('Start error:', e)
        // Usually throwing means it's already started or aborting
        // We can try to abort and restart, but safer to just notify
        toast.info('Reiniciando micrófono...')
        recognitionRef.current.abort()
        setTimeout(() => {
             try { recognitionRef.current.start() } catch(err) { console.error(err) }
        }, 300)
      }
    }
  }

  const handleCommand = async (text: string) => {
    setIsProcessing(true)
    toast.info('Procesando...', { description: `"${text}"` })

    try {
      const result = await processTextCommand(projectId, text)

      if (result.success) {
        // If the AI responded with a question/text (shouldSpeak), speak it
        if (result.shouldSpeak && result.message) {
           speakText(result.message)
           toast.info('AI dice:', { description: result.message })
        } else {
           toast.success('Comando ejecutado', {
             description: result.message
           })
        }
      } else {
        toast.error('Error al procesar', {
          description: result.error || 'Inténtalo de nuevo'
        })
      }
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Error de conexión')
    } finally {
      setIsProcessing(false)
    }
  }

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'es-ES'
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <Button
      variant={isListening ? "destructive" : "default"}
      size="icon"
      className={cn(
        "rounded-full shadow-lg transition-all duration-300 relative", 
        isListening && "animate-pulse scale-110",
        className
      )}
      onClick={isProcessing ? undefined : toggleListening}
      disabled={isProcessing}
    >
      {isProcessing ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isListening ? (
        <Mic className="h-5 w-5 animate-bounce" /> // Bounce when listening implies activity
      ) : (
        <Mic className="h-5 w-5" />
      )}
      
      {/* Ripple effect when recording */}
      {isListening && (
        <span className="absolute -inset-1 rounded-full border-2 border-red-500 opacity-75 animate-ping pointer-events-none"></span>
      )}
    </Button>
  )
}
