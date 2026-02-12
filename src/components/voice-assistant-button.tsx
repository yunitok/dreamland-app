'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Loader2, StopCircle, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/modules/shared/ui/button'
import { processTextCommand } from '@/lib/actions/voice'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface VoiceAssistantButtonProps {
  projectId: string
  className?: string
}

export function VoiceAssistantButton({ projectId, className }: VoiceAssistantButtonProps) {
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [transcript, setTranscript] = useState('')
  const router = useRouter()
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finalTranscriptRef = useRef('') // Keep track of full text manually

  useEffect(() => {
    // Check browser support
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true // Keep listening even after pauses
        recognition.lang = 'es-ES'
        recognition.interimResults = true // Detect speech activity early
        recognition.maxAlternatives = 1

        recognition.onstart = () => {
          setIsListening(true)
          setTranscript('')
          finalTranscriptRef.current = ''
        }

        recognition.onend = () => {
          setIsListening(false)
          // Don't auto-process here because onend fires when we manually stop too.
          // Processing is handled by the silence timer or manual stop.
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          // Reset silence timer on any result
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

          let interimTranscript = ''
          let newFinalTranscript = ''

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              newFinalTranscript += event.results[i][0].transcript
            } else {
              interimTranscript += event.results[i][0].transcript
            }
          }
          
          if (newFinalTranscript) {
             finalTranscriptRef.current += ' ' + newFinalTranscript
          }

          setTranscript(finalTranscriptRef.current + (interimTranscript ? ' ' + interimTranscript : ''))

          // Set 1.5s timer to stop and process
          silenceTimerRef.current = setTimeout(() => {
             recognition.stop()
             const fullText = (finalTranscriptRef.current + ' ' + interimTranscript).trim()
             if (fullText) handleCommand(fullText)
          }, 1500) // 1.5 seconds of silence
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error)
          // Ignore frequent "no-speech" errors in continuous mode if we haven't started speaking
          if (event.error === 'no-speech') return 

          setIsListening(false)
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)

          let errorMessage = 'Error desconocido'
          if (event.error === 'not-allowed') errorMessage = 'Permiso denegado. Habilita el micrófono.'
          if (event.error === 'network') errorMessage = 'Error de conexión.'
          if (event.error === 'aborted') return
          
          toast.error('Error micrófono', { description: errorMessage })
        }

        recognitionRef.current = recognition
      }
    }
    
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (recognitionRef.current) recognitionRef.current.abort()
    }
  }, [projectId])

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error('Tu navegador no soporta reconocimiento de voz nativo.')
      return
    }

    if (isListening) {
      // Manual stop
      recognitionRef.current.stop()
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      
      // Process immediately what we have
      const text = finalTranscriptRef.current.trim()
      if (text) handleCommand(text)
    } else {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.error('Start error:', e)
        toast.info('Reiniciando micrófono...')
        recognitionRef.current.abort()
        setTimeout(() => {
             try { recognitionRef.current.start() } catch(err) { console.error(err) }
        }, 300)
      }
    }
  }

  const handleCommand = async (text: string) => {
    if (isProcessing) return
    
    setIsProcessing(true)
    setIsListening(false) // Visual update
    toast.info('Procesando...', { description: `"${text}"` })

    try {
      const result = await processTextCommand(projectId, text)

      if (result.success) {
        // Check shouldSpeak using optional chaining since error responses don't have it
        if ('shouldSpeak' in result && result.shouldSpeak && result.message) {
           speakText(result.message)
           toast.info('AI dice:', { description: result.message })
        } else {
           toast.success('Comando ejecutado', {
             description: result.message || 'Acción completada'
           })

           // Check for report
           if ('report' in result && result.report && result.report.redirectUrl) {
             toast.success('Reporte generado. Redirigiendo...')
             router.push(result.report.redirectUrl)
           }
        }
      } else {
        // Check for rate limiting
        if ('retryAfter' in result && result.retryAfter) {
          toast.warning('Límite de solicitudes', {
            description: `Por favor espera ${result.retryAfter} segundos`
          })
        } else {
          if ('debugStack' in result && result.debugStack) {
              console.error('[SERVER_ERROR_STACK]', result.debugStack)
          }
          toast.error('Error al procesar', {
            description: result.error || 'Inténtalo de nuevo'
          })
        }
      }
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Error de conexión')
    } finally {
      setIsProcessing(false)
      finalTranscriptRef.current = ''
      setTranscript('')
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
        <Mic className="h-5 w-5 animate-bounce" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
      
      {isListening && (
        <span className="absolute -inset-1 rounded-full border-2 border-red-500 opacity-75 animate-ping pointer-events-none"></span>
      )}

    </Button>
  )
}
