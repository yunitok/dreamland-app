"use client"

import { useRef, useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  Send,
  Loader2,
  Bot,
  User,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  Search,
  CalendarDays,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { Textarea } from "@/modules/shared/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import { toast } from "sonner"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import type { QueryCategory } from "@prisma/client"
import { submitChatFeedback } from "@/modules/atc/actions/queries"

interface RAGSource {
  id: string
  title: string
  section: string | null
}

// Extraer fuentes de los tool parts del mensaje (AI SDK v6)
// En v6: type = "tool-{toolName}", state = "output-available", output = result
function extractSourcesFromParts(parts: unknown[]): RAGSource[] {
  if (!Array.isArray(parts)) return []
  const sources: RAGSource[] = []
  for (const part of parts) {
    const p = part as {
      type?: string
      state?: string
      output?: { found?: boolean; entries?: RAGSource[] }
    }
    if (
      p.type === "tool-searchKnowledgeBase" &&
      p.state === "output-available" &&
      p.output?.found
    ) {
      sources.push(...(p.output.entries ?? []))
    }
  }
  // Deduplicar por id
  const seen = new Set<string>()
  return sources.filter(s => !seen.has(s.id) && seen.add(s.id))
}

// Detectar qué tools se usaron para mostrar badges informativos (AI SDK v6)
function getUsedTools(parts: unknown[]): Set<string> {
  const tools = new Set<string>()
  if (!Array.isArray(parts)) return tools
  for (const part of parts) {
    const p = part as { type?: string; state?: string }
    if (
      typeof p.type === "string" &&
      p.type.startsWith("tool-") &&
      p.state === "output-available"
    ) {
      tools.add(p.type.slice(5)) // quitar prefijo "tool-"
    }
  }
  return tools
}

const SUGGESTED_QUESTIONS = [
  "¿Qué espacios tiene el restaurante disponibles para celebraciones?",
  "¿El restaurante es accesible para personas con silla de ruedas?",
  "¿Cuál es el horario de apertura?",
  "¿Qué platos no contienen gluten?",
  "¿Tenéis terraza exterior?",
  "¿Cuál es el aforo máximo del salón principal?",
]

interface RagChatProps {
  categories: QueryCategory[]
  isAdmin?: boolean
}

export function RagChat({ categories, isAdmin }: RagChatProps) {
  const [categoryId, setCategoryId] = useState<string>("")
  const [inputValue, setInputValue] = useState("")
  const [feedbacks, setFeedbacks] = useState<Record<string, 1 | -1>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/atc/chat",
    }),
    onError: () => toast.error("Error al conectar con el asistente"),
  })

  const isLoading = status === "submitted" || status === "streaming"
  const lastMessage = messages[messages.length - 1]
  const isThinking = isLoading && (messages.length === 0 || lastMessage?.role === "user")

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (inputValue.trim() && !isLoading) {
        handleSend()
      }
    }
  }

  function handleSend() {
    if (!inputValue.trim() || isLoading) return
    sendMessage(
      { text: inputValue },
      { body: { categoryId: categoryId || undefined } }
    )
    setInputValue("")
  }

  async function handleFeedback(msgId: string, value: 1 | -1) {
    // Toggle: si ya tiene el mismo voto, revertir
    if (feedbacks[msgId] === value) {
      setFeedbacks(prev => {
        const next = { ...prev }
        delete next[msgId]
        return next
      })
      return
    }

    // Buscar el mensaje de usuario previo al del asistente
    const msgIndex = messages.findIndex(m => m.id === msgId)
    const userMsg = messages.slice(0, msgIndex).reverse().find(m => m.role === "user")
    if (!userMsg) return

    const userText = userMsg.parts
      .filter(p => p.type === "text")
      .map(p => (p as { type: "text"; text: string }).text)
      .join("")

    setFeedbacks(prev => ({ ...prev, [msgId]: value }))

    const result = await submitChatFeedback(userText, value)
    if (result.success) {
      toast.success(value === 1 ? "Gracias por tu valoración positiva" : "Gracias por tu feedback")
    } else {
      // Revertir en caso de error
      setFeedbacks(prev => {
        const next = { ...prev }
        delete next[msgId]
        return next
      })
      toast.error(result.error ?? "Error al enviar feedback")
    }
  }

  return (
    <div className="flex flex-col h-150 rounded-lg border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-medium text-sm">Agente ATC</span>
          <span className="text-xs text-muted-foreground">
            — KB · Reservas · Incidencias · Lista de espera
          </span>
        </div>
        <Select value={categoryId || "all"} onValueChange={v => setCategoryId(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44 h-7 text-xs">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center pt-4">
              Haz una pregunta sobre espacios, accesibilidad, alérgenos, horarios o consulta una reserva.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInputValue(q)}
                  className="cursor-pointer text-left text-xs p-2.5 rounded-lg border border-dashed hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const textContent = msg.parts
            .filter(p => p.type === "text")
            .map(p => (p as { type: "text"; text: string }).text)
            .join("")
          const sources = msg.role === "assistant" ? extractSourcesFromParts(msg.parts) : []
          const usedTools = msg.role === "assistant" ? getUsedTools(msg.parts) : new Set<string>()

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.role === "assistant" && !textContent ? (
                    <div className="flex items-center gap-1.5 py-0.5">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
                    </div>
                  ) : msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none wrap-break-word dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                        {textContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    textContent
                  )}
                </div>

                {/* Badges de tools usadas (solo admin) */}
                {isAdmin && msg.role === "assistant" && usedTools.size > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {usedTools.has("searchKnowledgeBase") && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs border border-blue-200">
                        <Search className="h-3 w-3" />
                        Base de conocimiento
                      </span>
                    )}
                    {usedTools.has("lookupReservation") && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs border border-green-200">
                        <CalendarDays className="h-3 w-3" />
                        Reservas
                      </span>
                    )}
                    {usedTools.has("getActiveIncidents") && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 text-xs border border-orange-200">
                        <AlertTriangle className="h-3 w-3" />
                        Incidencias
                      </span>
                    )}
                    {usedTools.has("checkWaitingList") && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-xs border border-purple-200">
                        <CalendarDays className="h-3 w-3" />
                        Lista de espera
                      </span>
                    )}
                  </div>
                )}

                {/* Fuentes de la KB (solo admin) */}
                {isAdmin && msg.role === "assistant" && sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {sources.map(source => (
                      <span
                        key={source.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs"
                      >
                        <BookOpen className="h-3 w-3" />
                        {source.section ? `${source.title} › ${source.section}` : source.title}
                      </span>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                {msg.role === "assistant" && textContent && (
                  <div className="flex gap-1">
                    <button
                      aria-label="Respuesta útil"
                      onClick={() => handleFeedback(msg.id, 1)}
                      className={`cursor-pointer transition-all active:scale-95 ${
                        feedbacks[msg.id] === 1
                          ? "text-green-600"
                          : feedbacks[msg.id] === -1
                            ? "hidden"
                            : "text-muted-foreground hover:text-green-600"
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Respuesta no útil"
                      onClick={() => handleFeedback(msg.id, -1)}
                      className={`cursor-pointer transition-all active:scale-95 ${
                        feedbacks[msg.id] === -1
                          ? "text-red-500"
                          : feedbacks[msg.id] === 1
                            ? "hidden"
                            : "text-muted-foreground hover:text-red-500"
                      }`}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          )
        })}

        {/* Thinking bubble: shown while waiting for first assistant chunk */}
        {isThinking && (
          <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-muted flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={`p-4 border-t flex gap-2 items-end transition-opacity ${isLoading ? "opacity-50" : ""}`}>
        <Textarea
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? "Esperando respuesta del agente..." : "Escribe tu consulta... (Enter para enviar)"}
          rows={2}
          className="flex-1 resize-none text-sm"
          disabled={isLoading}
        />
        <Button
          onClick={handleSend}
          size="icon"
          disabled={isLoading || !inputValue.trim()}
          className="h-10 w-10 shrink-0"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
