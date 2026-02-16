"use client"

import { useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import {
  Play,
  Loader2,
  Clock,
  Database,
  Wifi,
  WifiOff,
  ArrowRight,
  FileJson,
  Table2,
  Info,
} from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { Badge } from "@/modules/shared/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { GSTOCK_ENDPOINT_GROUPS, type GstockEndpoint } from "@/lib/gstock"
import { JsonViewer } from "./json-viewer"

interface ApiResult {
  data: unknown
  meta: {
    endpoint: string
    httpStatus: number
    responseTimeMs: number
    timestamp: string
    recordCount: number
  }
}

export function GstockSandbox() {
  const t = useTranslations("sherlock.sandbox")
  const [selectedEndpoint, setSelectedEndpoint] = useState<GstockEndpoint | null>(null)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeRequest = useCallback(async (endpoint: GstockEndpoint) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/sherlock/gstock?endpoint=${encodeURIComponent(endpoint.path)}`)
      const json = await response.json()

      if (!response.ok) {
        setError(json.message || json.error || `HTTP ${response.status}`)
        return
      }

      const meta = json._meta || {}
      const recordCount = Array.isArray(json.data) ? json.data.length : json.data ? 1 : 0

      setResult({
        data: json,
        meta: {
          endpoint: endpoint.path,
          httpStatus: meta.httpStatus || response.status,
          responseTimeMs: meta.responseTimeMs || 0,
          timestamp: meta.timestamp || new Date().toISOString(),
          recordCount,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelect = (endpoint: GstockEndpoint) => {
    setSelectedEndpoint(endpoint)
  }

  const handleExecute = () => {
    if (selectedEndpoint) {
      executeRequest(selectedEndpoint)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Panel izquierdo: Selector de endpoints */}
      <Card className="lg:h-[calc(100vh-240px)] lg:overflow-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            GStock API
          </CardTitle>
          <CardDescription className="text-xs">
            {t("selectEndpoint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {GSTOCK_ENDPOINT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${group.color}`}>
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.endpoints.map((endpoint) => {
                  const isSelected = selectedEndpoint?.path === endpoint.path
                  return (
                    <button
                      key={endpoint.path}
                      onClick={() => handleSelect(endpoint)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-accent/50 text-foreground/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{endpoint.label}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {endpoint.method}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                        /{endpoint.path}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Panel derecho: Resultados */}
      <div className="flex flex-col gap-4">
        {/* Barra de ejecución */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                  GET
                </Badge>
                <code className="text-sm text-muted-foreground truncate">
                  interface.g-stock.net/external/api/
                  <span className="text-foreground font-medium">
                    {selectedEndpoint?.path || "..."}
                  </span>
                </code>
              </div>
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={!selectedEndpoint || loading}
                className="shrink-0 gap-1.5"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {t("execute")}
              </Button>
            </div>

            {/* Status bar */}
            {(result || error) && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                {error ? (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <WifiOff className="h-3 w-3" />
                    {error}
                  </span>
                ) : result ? (
                  <>
                    <span className="flex items-center gap-1.5">
                      <Wifi className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {result.meta.httpStatus}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {result.meta.responseTimeMs}ms
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Database className="h-3 w-3" />
                      {result.meta.recordCount} registros
                    </span>
                    <span className="ml-auto text-[10px]">
                      {new Date(result.meta.timestamp).toLocaleTimeString()}
                    </span>
                  </>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs de resultado */}
        {selectedEndpoint && (
          <Card className="flex-1">
            <Tabs defaultValue="raw" className="h-full">
              <CardHeader className="pb-0 pt-3 px-4">
                <TabsList variant="line">
                  <TabsTrigger value="raw">
                    <FileJson className="h-3.5 w-3.5 mr-1.5" />
                    {t("rawResponse")}
                  </TabsTrigger>
                  <TabsTrigger value="mapped">
                    <Table2 className="h-3.5 w-3.5 mr-1.5" />
                    {t("mappedView")}
                  </TabsTrigger>
                  <TabsTrigger value="info">
                    <Info className="h-3.5 w-3.5 mr-1.5" />
                    {t("info")}
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="pt-4 px-4 pb-4">
                <TabsContent value="raw">
                  {result ? (
                    <JsonViewer data={result.data} />
                  ) : (
                    <EmptyState message={t("noData")} />
                  )}
                </TabsContent>

                <TabsContent value="mapped">
                  {result ? (
                    <MappedView
                      data={result.data}
                      endpoint={selectedEndpoint}
                    />
                  ) : (
                    <EmptyState message={t("noData")} />
                  )}
                </TabsContent>

                <TabsContent value="info">
                  <EndpointInfo endpoint={selectedEndpoint} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        )}

        {!selectedEndpoint && (
          <Card className="flex-1">
            <CardContent className="flex items-center justify-center h-[300px]">
              <EmptyState message={t("selectEndpointHint")} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Database className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function EndpointInfo({ endpoint }: { endpoint: GstockEndpoint }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-1">{endpoint.label}</h4>
        <p className="text-sm text-muted-foreground">{endpoint.description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="p-3 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground mb-1">Endpoint</p>
          <code className="text-sm font-mono">/{endpoint.path}</code>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground mb-1">Método</p>
          <code className="text-sm font-mono">{endpoint.method}</code>
        </div>
      </div>
      {endpoint.sherlockMapping && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3" />
            Mapeo a Sherlock
          </p>
          <code className="text-sm font-mono text-primary">{endpoint.sherlockMapping}</code>
        </div>
      )}
    </div>
  )
}

function MappedView({
  data,
  endpoint,
}: {
  data: unknown
  endpoint: GstockEndpoint
}) {
  const responseData = data as Record<string, unknown>
  const items = Array.isArray(responseData?.data) ? responseData.data : []

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No hay datos para mapear. Ejecuta la petición primero.
      </div>
    )
  }

  const firstItem = items[0] as Record<string, unknown>
  const keys = Object.keys(firstItem)

  return (
    <div className="space-y-3">
      {endpoint.sherlockMapping && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">GStock</Badge>
          <ArrowRight className="h-3 w-3" />
          <Badge variant="secondary" className="text-[10px]">{endpoint.sherlockMapping}</Badge>
          <span className="ml-auto">{items.length} registros</span>
        </div>
      )}

      <div className="overflow-auto max-h-[500px] rounded-lg border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
              {keys.slice(0, 8).map((key) => (
                <th key={key} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                  {key}
                </th>
              ))}
              {keys.length > 8 && (
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  +{keys.length - 8} más
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.slice(0, 50).map((item, i) => {
              const row = item as Record<string, unknown>
              return (
                <tr key={i} className="hover:bg-accent/30">
                  <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                  {keys.slice(0, 8).map((key) => (
                    <td key={key} className="px-3 py-1.5 max-w-[200px] truncate">
                      {formatCellValue(row[key])}
                    </td>
                  ))}
                  {keys.length > 8 && (
                    <td className="px-3 py-1.5 text-muted-foreground">...</td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {items.length > 50 && (
          <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
            Mostrando 50 de {items.length} registros
          </div>
        )}
      </div>
    </div>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "✓" : "✗"
  if (typeof value === "object") return Array.isArray(value) ? `[${value.length}]` : "{...}"
  return String(value)
}
