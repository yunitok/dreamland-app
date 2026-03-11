"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCw,
  ShoppingCart,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wifi,
  WifiOff,
  Package,
  BarChart3,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/modules/shared/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import {
  runAgoraSync,
  testAgoraConnectionAction,
} from "@/modules/analytics/actions/agora-sync"
import type { AgoraSyncReport } from "@/modules/analytics/domain/agora-sync/types"

interface AgoraSyncCardProps {
  lastSync: {
    syncType: string
    status: string
    startedAt: Date
    finishedAt: Date | null
    snapshotsCreated: number
    snapshotsUpdated: number
    productsCreated: number
    productsUpdated: number
    errors: unknown
    durationMs: number | null
  } | null
  stats: {
    totalProducts: number
    matchedProducts: number
    totalSnapshots: number
  }
  isSuperAdmin: boolean
}

function formatDate(date: Date | null): string {
  if (!date) return "Nunca"
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

function SyncResultBadge({ report }: { report: AgoraSyncReport }) {
  const hasErrors = report.errors.length > 0

  if (hasErrors) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {report.errors.length} error(es) — {report.snapshotsCreated}{" "}
            snapshots, {report.productsCreated} productos
          </span>
        </div>
        {report.errors.slice(0, 3).map((err, i) => (
          <p
            key={i}
            className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 font-mono break-all"
          >
            {err}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span>
        {report.snapshotsCreated + report.snapshotsUpdated} snapshots ·{" "}
        {report.productsCreated + report.productsUpdated} productos ·{" "}
        {report.matchedRecipes} recetas vinculadas ·{" "}
        {((report.durationMs ?? 0) / 1000).toFixed(1)}s
      </span>
    </div>
  )
}

export function AgoraSyncCard({
  lastSync,
  stats,
  isSuperAdmin,
}: AgoraSyncCardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null)
  const [lastResult, setLastResult] = useState<AgoraSyncReport | null>(null)
  const [syncAction, setSyncAction] = useState("")

  async function handleTestConnection() {
    setIsTesting(true)
    setConnectionOk(null)
    try {
      const result = await testAgoraConnectionAction()
      setConnectionOk(result.ok)
      if (result.ok) {
        toast.success("Conexion con Agora OK")
      } else {
        toast.error("Error de conexion con Agora", {
          description: result.error,
        })
      }
    } catch (err) {
      setConnectionOk(false)
      toast.error("Error al probar conexion", {
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleSync(
    syncType: "master" | "sales" | "full",
    label: string
  ) {
    setIsLoading(true)
    setSyncAction(label)
    setLastResult(null)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const result = await runAgoraSync({
        syncType,
        ...(syncType !== "master" && {
          dateStart: startDate.toISOString().slice(0, 10),
          dateEnd: endDate.toISOString().slice(0, 10),
        }),
      })

      if (!result.success) {
        toast.error("No se pudo iniciar la sincronizacion", {
          description: result.error,
        })
        return
      }

      const report = result.report
      setLastResult(report)
      const hasErrors = report.errors.length > 0
      if (hasErrors) {
        toast.warning(`Sync con ${report.errors.length} error(es)`, {
          description: report.errors[0],
        })
      } else {
        toast.success("Sync Agora completado", {
          description: `${report.snapshotsCreated + report.snapshotsUpdated} snapshots · ${report.productsCreated + report.productsUpdated} productos · ${((report.durationMs ?? 0) / 1000).toFixed(1)}s`,
        })
      }
    } catch (err) {
      toast.error("Error al sincronizar con Agora", {
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setIsLoading(false)
      setSyncAction("")
      router.refresh()
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
            Sincronizacion Agora TPV
          </CardTitle>
          <CardDescription>
            Importa ventas, productos y datos de facturacion desde el TPV Agora.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {stats.totalProducts > 0 && (
            <Badge variant="outline" className="text-xs">
              <Package className="mr-1 h-3 w-3" />
              {stats.totalProducts} productos
              {stats.matchedProducts > 0 &&
                ` (${stats.matchedProducts} vinculados)`}
            </Badge>
          )}
          {stats.totalSnapshots > 0 && (
            <Badge variant="outline" className="text-xs">
              <BarChart3 className="mr-1 h-3 w-3" />
              {stats.totalSnapshots} snapshots
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado del ultimo sync */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Ultima sincronizacion: {formatDate(lastSync?.startedAt ?? null)}</span>
          {lastSync && (
            <Badge
              variant={lastSync.status === "SUCCESS" ? "default" : "destructive"}
              className="text-xs"
            >
              {lastSync.syncType}
            </Badge>
          )}
        </div>

        {/* Resultado del ultimo sync en esta sesion */}
        {lastResult && <SyncResultBadge report={lastResult} />}

        {/* Test conexion */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestConnection}
          disabled={isTesting || isLoading}
          className="w-full"
        >
          {connectionOk === true ? (
            <Wifi className="mr-2 h-4 w-4 text-green-500" />
          ) : connectionOk === false ? (
            <WifiOff className="mr-2 h-4 w-4 text-red-500" />
          ) : (
            <Wifi className="mr-2 h-4 w-4" />
          )}
          {isTesting ? "Probando conexion..." : "Test conexion Agora"}
        </Button>

        {/* Botones de sync */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outline"
            onClick={() => handleSync("master", "Maestros")}
            disabled={isLoading}
          >
            <Package
              className={`mr-2 h-4 w-4 ${isLoading && syncAction === "Maestros" ? "animate-spin" : ""}`}
            />
            {isLoading && syncAction === "Maestros"
              ? "Sincronizando..."
              : "Maestros"}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleSync("sales", "Ventas")}
            disabled={isLoading}
          >
            <BarChart3
              className={`mr-2 h-4 w-4 ${isLoading && syncAction === "Ventas" ? "animate-spin" : ""}`}
            />
            {isLoading && syncAction === "Ventas"
              ? "Sincronizando..."
              : "Ventas 30d"}
          </Button>

          <Button
            onClick={() => handleSync("full", "Completo")}
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading && syncAction === "Completo" ? "animate-spin" : ""}`}
            />
            {isLoading && syncAction === "Completo"
              ? "Sincronizando..."
              : "Sync completo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
