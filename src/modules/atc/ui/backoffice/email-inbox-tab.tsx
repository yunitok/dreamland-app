"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Button } from "@/modules/shared/ui/button"
import { Input } from "@/modules/shared/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import { ScrollArea, ScrollBar } from "@/modules/shared/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
import { Mail, MailOpen, MoreHorizontal, Search, Eye, Trash2, CalendarClock } from "lucide-react"
import { markEmailRead, deleteEmail } from "@/modules/atc/actions/backoffice"
import { toast } from "sonner"
import { EmailDetailDialog } from "./email-detail-dialog"

type CategoryInfo = {
  id: string
  name: string
  color: string
  icon: string | null
  slug: string
  parentId: string | null
}

export type EmailRow = {
  id: string
  messageId: string
  threadId: string | null
  fromEmail: string
  fromName: string | null
  subject: string
  body: string
  aiLabel: string | null
  aiPriority: number | null
  aiConfidenceScore: number | null
  aiSummary: string | null
  targetDate: Date | null
  isRead: boolean
  assignedTo: string | null
  categoryId: string | null
  actionRequired: boolean
  receivedAt: Date
  category: CategoryInfo | null
}

interface EmailInboxTabProps {
  emails: EmailRow[]
  categories: CategoryInfo[]
  canDelete?: boolean
}

const priorityLabels: Record<number, string> = {
  5: "Urgente",
  4: "Alta",
  3: "Media",
  2: "Baja",
  1: "Mínima",
}

const priorityColors: Record<number, string> = {
  5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  1: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export function EmailInboxTab({ emails, categories, canDelete }: EmailInboxTabProps) {
  const [localEmails, setLocalEmails] = useState(emails)
  useEffect(() => { setLocalEmails(emails) }, [emails])
  const [showRead, setShowRead]       = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [search, setSearch]           = useState("")
  const [selectedEmail, setSelectedEmail] = useState<EmailRow | null>(null)
  const [, startTransition] = useTransition()

  // Categorías padre e hijos para la barra jerárquica
  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories])
  const childrenOf = useMemo(() => {
    const map: Record<string, CategoryInfo[]> = {}
    for (const cat of categories) {
      if (cat.parentId) {
        ;(map[cat.parentId] ??= []).push(cat)
      }
    }
    return map
  }, [categories])

  // Set de categoryIds que pasan el filtro (padre + hijos)
  const activeCategoryIds = useMemo(() => {
    if (categoryFilter === "all") return null
    const selected = categories.find(c => c.id === categoryFilter)
    if (!selected) return null
    // Si es padre, incluir el padre + todos sus hijos
    if (!selected.parentId) {
      const ids = new Set([selected.id])
      for (const child of childrenOf[selected.id] ?? []) ids.add(child.id)
      return ids
    }
    // Si es hijo, solo ese
    return new Set([selected.id])
  }, [categoryFilter, categories, childrenOf])

  const filtered = useMemo(() => {
    return localEmails.filter(email => {
      if (!showRead && email.isRead) return false
      if (activeCategoryIds && (!email.categoryId || !activeCategoryIds.has(email.categoryId))) return false
      if (priorityFilter !== "all" && String(email.aiPriority) !== priorityFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !email.fromEmail.toLowerCase().includes(q) &&
          !email.fromName?.toLowerCase().includes(q) &&
          !email.subject.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [localEmails, showRead, activeCategoryIds, priorityFilter, search])

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markEmailRead(id)
      if (result.success) {
        setLocalEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e))
        toast.success("Email marcado como leído")
      } else {
        toast.error("Error al marcar el email")
      }
    })
  }

  function handleDeleteEmail(id: string) {
    startTransition(async () => {
      const result = await deleteEmail(id)
      if (result.success) {
        setLocalEmails(prev => prev.filter(e => e.id !== id))
        toast.success("Email eliminado")
      } else {
        toast.error(result.error ?? "Error al eliminar el email")
      }
    })
  }

  const unreadCount = localEmails.filter(e => !e.isRead).length

  // Contadores: por categoría individual + agregados por padre
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const email of localEmails) {
      if (!email.isRead && email.categoryId) {
        counts[email.categoryId] = (counts[email.categoryId] ?? 0) + 1
      }
    }
    return counts
  }, [localEmails])

  const parentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const parent of parentCategories) {
      let total = categoryCounts[parent.id] ?? 0
      for (const child of childrenOf[parent.id] ?? []) {
        total += categoryCounts[child.id] ?? 0
      }
      counts[parent.id] = total
    }
    return counts
  }, [parentCategories, childrenOf, categoryCounts])

  // Detectar si el filtro activo es una categoría padre (para mostrar subcategorías)
  const activeParentId = useMemo(() => {
    if (categoryFilter === "all") return null
    const selected = categories.find(c => c.id === categoryFilter)
    if (!selected) return null
    return selected.parentId ?? selected.id
  }, [categoryFilter, categories])

  return (
    <div className="space-y-3">
      {/* Barra de categorías padre */}
      <div className="space-y-1.5">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-1.5 pb-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
                categoryFilter === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
              )}
            >
              Todas
              <span className="tabular-nums">{unreadCount}</span>
            </button>
            {parentCategories
              .filter(cat => (parentCounts[cat.id] ?? 0) > 0)
              .map(cat => {
                const isActive = activeParentId === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(isActive && categoryFilter === cat.id ? "all" : cat.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
                      isActive
                        ? "border-current"
                        : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    )}
                    style={isActive ? {
                      backgroundColor: cat.color + "22",
                      color: cat.color,
                      borderColor: cat.color + "44",
                    } : undefined}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                    <span className="tabular-nums">{parentCounts[cat.id]}</span>
                  </button>
                )
              })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Subcategorías (solo visibles al seleccionar un padre con hijos) */}
        {activeParentId && (childrenOf[activeParentId]?.length ?? 0) > 0 && (
          <div className="flex gap-1.5 pl-4">
            {childrenOf[activeParentId]!
              .filter(child => (categoryCounts[child.id] ?? 0) > 0)
              .map(child => {
                const isActive = categoryFilter === child.id
                const parent = parentCategories.find(p => p.id === activeParentId)
                const color = parent?.color ?? child.color
                return (
                  <button
                    key={child.id}
                    onClick={() => setCategoryFilter(isActive ? activeParentId : child.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer border",
                      isActive
                        ? "border-current"
                        : "bg-muted/60 text-muted-foreground border-transparent hover:bg-muted/80"
                    )}
                    style={isActive ? {
                      backgroundColor: color + "22",
                      color: color,
                      borderColor: color + "44",
                    } : undefined}
                  >
                    {child.name}
                    <span className="tabular-nums">{categoryCounts[child.id]}</span>
                  </button>
                )
              })}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por remitente o asunto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="5">5 — Urgente</SelectItem>
            <SelectItem value="4">4 — Alta</SelectItem>
            <SelectItem value="3">3 — Media</SelectItem>
            <SelectItem value="2">2 — Baja</SelectItem>
            <SelectItem value="1">1 — Mínima</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showRead ? "default" : "outline"}
          size="sm"
          onClick={() => setShowRead(v => !v)}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          {showRead ? "Ocultando leídos" : "Mostrar leídos"}
        </Button>

        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unreadCount} sin leer
          </Badge>
        )}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay emails que coincidan con los filtros
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(email => (
            <Card
              key={email.id}
              className={`transition-opacity cursor-pointer hover:shadow-md ${email.isRead ? "opacity-60" : ""}`}
              onClick={() => setSelectedEmail(email)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {email.isRead
                      ? <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <Mail className="h-4 w-4 text-primary shrink-0" />
                    }
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-medium truncate">{email.subject}</CardTitle>
                      <CardDescription className="text-xs truncate">
                        {email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Badge categoría */}
                    {email.category && (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{
                          backgroundColor: email.category.color + "22",
                          color: email.category.color,
                          border: `1px solid ${email.category.color}44`,
                        }}
                      >
                        {email.category.name}
                      </span>
                    )}
                    {/* Badge informativo (no requiere acción) */}
                    {!email.actionRequired && (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Informativo
                      </span>
                    )}
                    {/* Badge prioridad */}
                    {email.aiPriority != null && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[email.aiPriority] ?? ""}`}>
                        P{email.aiPriority} {priorityLabels[email.aiPriority]}
                      </span>
                    )}
                    {/* Badge fecha objetivo */}
                    {email.targetDate && (() => {
                      const target = new Date(email.targetDate)
                      const now = new Date()
                      now.setHours(0, 0, 0, 0)
                      const daysUntil = Math.round((target.getTime() - now.getTime()) / 86400000)
                      const colorClass = daysUntil <= 1
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                        : daysUntil <= 3
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                          <CalendarClock className="h-3 w-3" />
                          {target.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                        </span>
                      )
                    })()}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedEmail(email)}>
                          Ver detalle
                        </DropdownMenuItem>
                        {!email.isRead && (
                          <DropdownMenuItem onClick={() => handleMarkRead(email.id)}>
                            Marcar como leído
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => handleDeleteEmail(email.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {email.aiSummary ? (
                  <p className="text-xs text-muted-foreground italic mb-1">{email.aiSummary}</p>
                ) : null}
                <p className="text-sm text-muted-foreground line-clamp-2">{email.body}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(email.receivedAt).toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  {email.aiConfidenceScore != null && (
                    <span className="text-xs text-muted-foreground">
                      IA: {Math.round(email.aiConfidenceScore * 100)}% confianza
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de detalle */}
      <EmailDetailDialog
        email={selectedEmail}
        onClose={() => setSelectedEmail(null)}
        onMarkRead={handleMarkRead}
      />
    </div>
  )
}
