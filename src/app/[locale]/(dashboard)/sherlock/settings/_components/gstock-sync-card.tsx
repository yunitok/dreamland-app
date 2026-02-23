"use client"

import { useState } from "react"
import { RefreshCw, Database, CheckCircle, AlertTriangle, Clock, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/modules/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { Switch } from "@/modules/shared/ui/switch"
import { Label } from "@/modules/shared/ui/label"
import { Badge } from "@/modules/shared/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/modules/shared/ui/alert-dialog"
import { runGstockSync, resetGstockData } from "@/modules/sherlock/actions/gstock-sync"
import type { SyncReport } from "@/modules/sherlock/domain/gstock-sync/types"

interface GstockSyncCardProps {
  lastSync: Date | null
  totalEntries: number
  isSuperAdmin: boolean
}

function formatDate(date: Date | null): string {
  if (!date) return "Nunca"
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function SyncResultBadge({ report }: { report: SyncReport }) {
  const totalErrors = report.errors.length
  const totalCreated = report.phases.reduce((sum, p) => sum + p.created, 0)
  const totalUpdated = report.phases.reduce((sum, p) => sum + p.updated, 0)

  if (totalErrors > 0) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{totalErrors} error(es) — {totalCreated} creados, {totalUpdated} actualizados</span>
        </div>
        {report.errors.map((err, i) => (
          <p key={i} className="text-xs text-muted-foreground bg-muted rounded px-2 py-1 font-mono break-all">
            {err}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-green-600">
      <CheckCircle className="h-4 w-4" />
      <span>{totalCreated} creados · {totalUpdated} actualizados · {report.kbEntries} entries RAG</span>
    </div>
  )
}

export function GstockSyncCard({ lastSync, totalEntries, isSuperAdmin }: GstockSyncCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [includeKB, setIncludeKB] = useState(true)
  const [lastResult, setLastResult] = useState<SyncReport | null>(null)

  async function handleSync() {
    setIsLoading(true)
    setLastResult(null)
    try {
      const report = await runGstockSync({ skipKB: !includeKB })
      setLastResult(report)

      const hasErrors = report.errors.length > 0
      if (hasErrors) {
        toast.warning(`Sync con ${report.errors.length} error(es)`, {
          description: report.errors[0] ?? "Revisa los detalles en el card",
        })
      } else {
        toast.success("Sync completado correctamente", {
          description: `${report.phases.reduce((s, p) => s + p.created + p.updated, 0)} registros sincronizados en ${(report.durationMs / 1000).toFixed(1)}s`,
        })
      }
    } catch (err) {
      toast.error("Error al sincronizar con GStock", {
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleReset() {
    setIsResetting(true)
    try {
      const result = await resetGstockData()
      const total = Object.values(result).reduce((a, b) => a + b, 0)
      toast.success("Datos GStock eliminados", {
        description: `${result.recipes} recetas · ${result.ingredients} ingredientes · ${result.kbEntries} entries RAG · ${total} registros en total`,
      })
      setLastResult(null)
    } catch (err) {
      toast.error("Error al eliminar datos GStock", {
        description: err instanceof Error ? err.message : "Error desconocido",
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-500" />
            Sincronización GStock
          </CardTitle>
          <CardDescription>
            Importa recetas, ingredientes y datos de catálogo desde GStock.
          </CardDescription>
        </div>
        <Badge variant="outline" className="text-xs">
          {totalEntries > 0 ? `${totalEntries} entries RAG` : "Sin datos"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estado del último sync */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Última sincronización: {formatDate(lastSync)}</span>
        </div>

        {/* Resultado del último sync en esta sesión */}
        {lastResult && <SyncResultBadge report={lastResult} />}

        {/* Opciones */}
        <div className="flex items-center gap-3">
          <Switch
            id="include-kb"
            checked={includeKB}
            onCheckedChange={setIncludeKB}
            disabled={isLoading}
          />
          <Label htmlFor="include-kb" className="cursor-pointer">
            Incluir generación KB para chatbot
          </Label>
        </div>

        {/* Botón de sync */}
        <Button
          onClick={handleSync}
          disabled={isLoading || isResetting}
          className="w-full"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Sincronizando..." : "Sincronizar con GStock"}
        </Button>

        {/* Botón de reset — solo SUPER_ADMIN */}
        {isSuperAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isLoading || isResetting}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isResetting ? "Eliminando datos..." : "Borrar todos los datos de GStock"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Borrar todos los datos de GStock?</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p>
                      Esta acción eliminará permanentemente <strong>todos los registros importados desde GStock</strong>:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Recetas e ingredientes de receta</li>
                      <li>Ingredientes (productos de compra)</li>
                      <li>Categorías, familias y proveedores</li>
                      <li>Unidades de medida</li>
                      <li>Entries del chatbot RAG (gstock-recipes)</li>
                    </ul>
                    <p className="font-medium text-destructive">
                      Esta operación no se puede deshacer. Necesitarás volver a sincronizar desde GStock.
                    </p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sí, borrar todo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  )
}
