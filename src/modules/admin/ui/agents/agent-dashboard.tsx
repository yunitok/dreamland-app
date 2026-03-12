"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import {
  Bot,
  RefreshCw,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Clock,
  Coins,
  Activity,
  Lightbulb,
  Radio,
} from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Progress } from "@/modules/shared/ui/progress"
import type { AgentDashboardData } from "@/modules/admin/actions/agents"
import { cn } from "@/lib/utils"

// ─── Status badge ────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  COMPLETED: { label: "Completado", variant: "default", icon: CheckCircle2 },
  FAILED: { label: "Fallido", variant: "destructive", icon: XCircle },
  ESCALATED: { label: "Escalado", variant: "secondary", icon: ArrowUpCircle },
  QUEUED: { label: "En cola", variant: "outline", icon: Clock },
  THINKING: { label: "Pensando", variant: "outline", icon: Activity },
  ACTING: { label: "Actuando", variant: "outline", icon: Zap },
  OBSERVING: { label: "Observando", variant: "outline", icon: Activity },
  CANCELLED: { label: "Cancelado", variant: "secondary", icon: XCircle },
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">Sin ejecuciones</Badge>
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const, icon: Activity }
  const Icon = config.icon
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

// ─── Agent Card ─────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentDashboardData["agents"][0] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-violet-500" />
            <CardTitle className="text-base">{agent.name}</CardTitle>
          </div>
          <StatusBadge status={agent.lastStatus} />
        </div>
        <CardDescription className="text-xs line-clamp-2">
          {agent.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Stats hoy */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-semibold">{agent.runsToday}</p>
            <p className="text-[10px] text-muted-foreground">Runs</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-green-600">{agent.completedToday}</p>
            <p className="text-[10px] text-muted-foreground">OK</p>
          </div>
          <div>
            <p className={cn("text-lg font-semibold", agent.failedToday > 0 && "text-red-500")}>
              {agent.failedToday}
            </p>
            <p className="text-[10px] text-muted-foreground">Fail</p>
          </div>
          <div>
            <p className={cn("text-lg font-semibold", agent.escalatedToday > 0 && "text-amber-500")}>
              {agent.escalatedToday}
            </p>
            <p className="text-[10px] text-muted-foreground">Esc.</p>
          </div>
        </div>

        {/* Tokens y coste */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {agent.tokensToday.toLocaleString()} tokens
          </span>
          <span>${agent.costToday.toFixed(4)}</span>
        </div>

        {/* Triggers */}
        <div className="flex flex-wrap gap-1">
          {agent.triggers.map((t, i) => (
            <Badge key={i} variant="outline" className="text-[10px]">
              {t.type}: {t.config ?? "—"}
            </Badge>
          ))}
        </div>

        {/* Último run */}
        {agent.lastRunAt && (
          <p className="text-[10px] text-muted-foreground">
            Último run: {formatDistanceToNow(new Date(agent.lastRunAt), { addSuffix: true, locale: es })}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Dashboard principal ────────────────────────────────────

interface AgentDashboardProps {
  initialData: AgentDashboardData
}

export function AgentDashboard({ initialData }: AgentDashboardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleRefresh = () => {
    startTransition(() => router.refresh())
  }

  const { agents, budget, pendingEvents, recentInsights, recentEvents } = initialData

  return (
    <div className="space-y-6">
      {/* ── KPIs globales ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-xs text-muted-foreground">Agentes activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{budget.used.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Tokens hoy</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {budget.percentUsed}%
              </span>
            </div>
            <Progress value={budget.percentUsed} className="h-1.5" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{pendingEvents}</p>
                <p className="text-xs text-muted-foreground">Eventos pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{recentInsights.length}</p>
                <p className="text-xs text-muted-foreground">Insights recientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Refresh ── */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isPending && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* ── Grid de agentes ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Agentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* ── Insights + Eventos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              Insights Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInsights.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin insights todavía.</p>
            ) : (
              <div className="space-y-3">
                {recentInsights.map((insight) => (
                  <div key={insight.id} className="border-l-2 border-yellow-400 pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">{insight.agentId}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(insight.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                    <p className="text-sm">{insight.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4 text-blue-500" />
              Cola de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos recientes.</p>
            ) : (
              <div className="space-y-2">
                {recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        event.processed ? "bg-green-500" : "bg-amber-500"
                      )} />
                      <span className="font-mono text-xs">{event.eventType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.targetAgent && (
                        <Badge variant="outline" className="text-[10px]">{event.targetAgent}</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true, locale: es })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
