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
  FileJson,
  Table2,
  Info,
  ShoppingCart,
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
import { AGORA_ENDPOINT_GROUPS, type AgoraEndpoint } from "@/lib/agora"
import { Input } from "@/modules/shared/ui/input"
import { Label } from "@/modules/shared/ui/label"
import { JsonViewer } from "./json-viewer"

interface ApiResult {
  data: unknown
  meta: {
    endpoint: string
    httpStatus: number
    responseTimeMs: number
    timestamp: string
    recordCount: number
    apiVersion?: string
  }
}

export function AgoraSandbox() {
  const t = useTranslations("gastrolab.sandbox")
  const [selectedEndpoint, setSelectedEndpoint] = useState<AgoraEndpoint | null>(null)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlParams, setUrlParams] = useState<Record<string, string>>({})
  const [bodyJson, setBodyJson] = useState<string>("")

  const executeRequest = useCallback(async (endpoint: AgoraEndpoint, params: Record<string, string>, body?: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let response: Response

      if (endpoint.method === "POST") {
        let parsedBody: unknown = null
        if (body?.trim()) {
          try {
            parsedBody = JSON.parse(body)
          } catch {
            setError("JSON del body invalido")
            setLoading(false)
            return
          }
        }

        response = await fetch("/api/gastrolab/agora", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: endpoint.path, body: parsedBody }),
        })
      } else {
        const searchParams = new URLSearchParams({ endpoint: endpoint.path })
        for (const [key, value] of Object.entries(params)) {
          if (value) searchParams.set(key, value)
        }
        response = await fetch(`/api/gastrolab/agora?${searchParams.toString()}`)
      }

      const json = await response.json()

      if (!response.ok) {
        setError(json.error || json.message || `HTTP ${response.status}`)
        return
      }

      const meta = json._meta || {}
      const recordCount = countRecords(json.data)

      setResult({
        data: json.data,
        meta: {
          endpoint: endpoint.path,
          httpStatus: meta.httpStatus || response.status,
          responseTimeMs: meta.responseTimeMs || 0,
          timestamp: meta.timestamp || new Date().toISOString(),
          recordCount,
          apiVersion: meta.apiVersion,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexion")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSelect = (endpoint: AgoraEndpoint) => {
    setSelectedEndpoint(endpoint)
    // Pre-rellenar placeholders como valores por defecto
    const defaults: Record<string, string> = {}
    for (const param of endpoint.urlParams ?? []) {
      if (param.placeholder && !param.optional) {
        defaults[param.name] = param.placeholder
      }
    }
    setUrlParams(defaults)
    setBodyJson(endpoint.bodyTemplate ?? "")
  }

  const handleParamChange = (name: string, value: string) => {
    setUrlParams(prev => ({ ...prev, [name]: value }))
  }

  const handleExecute = () => {
    if (selectedEndpoint) {
      executeRequest(selectedEndpoint, urlParams, bodyJson || undefined)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Panel izquierdo: Selector de endpoints */}
      <Card className="lg:h-[calc(100vh-240px)] lg:overflow-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Agora TPV API
          </CardTitle>
          <CardDescription className="text-xs">
            {t("selectEndpoint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {AGORA_ENDPOINT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${group.color}`}>
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.endpoints.map((endpoint) => {
                  const isSelected = selectedEndpoint?.label === endpoint.label
                  return (
                    <button
                      key={endpoint.label}
                      onClick={() => handleSelect(endpoint)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "hover:bg-accent/50 text-foreground/80"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{endpoint.label}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            endpoint.method === "POST" ? "border-amber-500/40 text-amber-600" : ""
                          }`}
                        >
                          {endpoint.method}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
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
        {/* Barra de ejecucion */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <Badge
                  variant="secondary"
                  className={`shrink-0 font-mono text-xs ${
                    selectedEndpoint?.method === "POST" ? "bg-amber-500/10 text-amber-600" : ""
                  }`}
                >
                  {selectedEndpoint?.method || "GET"}
                </Badge>
                <code className="text-sm text-muted-foreground truncate">
                  agora:8984/
                  <span className="text-foreground font-medium">
                    {selectedEndpoint?.path ?? "..."}
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

            {/* URL Params */}
            {selectedEndpoint?.urlParams && selectedEndpoint.urlParams.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Parametros</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {selectedEndpoint.urlParams.map((param) => (
                    <div key={param.name} className="space-y-1">
                      <Label htmlFor={`agora-${param.name}`} className="text-xs">
                        {param.label}
                        {param.optional && (
                          <span className="text-muted-foreground/60 ml-1 font-normal">(opcional)</span>
                        )}
                      </Label>
                      <Input
                        id={`agora-${param.name}`}
                        type={param.type === "date" ? "date" : param.type === "number" ? "number" : "text"}
                        placeholder={param.placeholder}
                        value={urlParams[param.name] || ""}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body JSON para POST */}
            {selectedEndpoint?.method === "POST" && (
              <div className="mt-3 pt-3 border-t">
                <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Request Body (JSON)
                </Label>
                <textarea
                  value={bodyJson}
                  onChange={(e) => setBodyJson(e.target.value)}
                  placeholder='{ "key": "value" }'
                  className="w-full h-32 rounded-md border bg-muted/30 p-3 font-mono text-xs resize-y focus:outline-none focus:ring-1 focus:ring-primary"
                  spellCheck={false}
                />
              </div>
            )}

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
                    {result.meta.apiVersion && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        v{result.meta.apiVersion}
                      </Badge>
                    )}
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
                    <MappedView data={result.data} />
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

// ─── Helpers ─────────────────────────────────────────────────────

function countRecords(data: unknown): number {
  if (Array.isArray(data)) return data.length
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    // Buscar arrays principales en la respuesta
    for (const key of Object.keys(obj)) {
      const val = obj[key]
      if (Array.isArray(val)) return val.length
    }
    return Object.keys(obj).length
  }
  return 0
}

function extractMainArrays(data: unknown): { key: string; items: unknown[] }[] {
  if (Array.isArray(data)) return [{ key: "root", items: data }]
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    return Object.entries(obj)
      .filter(([, val]) => Array.isArray(val) && (val as unknown[]).length > 0)
      .map(([key, val]) => ({ key, items: val as unknown[] }))
  }
  return []
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <ShoppingCart className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function EndpointInfo({ endpoint }: { endpoint: AgoraEndpoint }) {
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
          <p className="text-xs text-muted-foreground mb-1">Metodo</p>
          <code className="text-sm font-mono">{endpoint.method}</code>
        </div>
      </div>
      {endpoint.urlParams && endpoint.urlParams.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground mb-2">Parametros</p>
          <div className="space-y-1">
            {endpoint.urlParams.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <code className="font-mono text-foreground">{p.name}</code>
                <span className="text-muted-foreground">({p.type})</span>
                {p.optional && <Badge variant="outline" className="text-[9px] px-1 py-0">opcional</Badge>}
                {p.placeholder && <span className="text-muted-foreground/60">ej: {p.placeholder}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MappedView({ data }: { data: unknown }) {
  const arrays = extractMainArrays(data)

  if (arrays.length === 0) {
    if (data && typeof data === "object" && Object.keys(data as object).length > 0) {
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Respuesta no tabular — mostrando campos principales
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(data as Record<string, unknown>)
              .slice(0, 16)
              .map(([key, value]) => (
                <div key={key} className="p-2 rounded-lg bg-muted/30 border">
                  <p className="text-[10px] text-muted-foreground">{key}</p>
                  <p className="text-xs font-mono truncate">
                    {typeof value === "object" ? JSON.stringify(value).slice(0, 100) : String(value ?? "—")}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )
    }

    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No hay datos para mapear. Ejecuta la peticion primero.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {arrays.map(({ key, items }) => {
        const firstItem = items[0] as Record<string, unknown>
        const keys = Object.keys(firstItem)

        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px]">{key}</Badge>
              <span className="text-xs text-muted-foreground">{items.length} registros</span>
            </div>

            <div className="overflow-auto max-h-[500px] rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                    {keys.slice(0, 8).map((k) => (
                      <th key={k} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">
                        {k}
                      </th>
                    ))}
                    {keys.length > 8 && (
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        +{keys.length - 8} mas
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
                        {keys.slice(0, 8).map((k) => (
                          <td key={k} className="px-3 py-1.5 max-w-[200px] truncate">
                            {formatCellValue(row[k])}
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
      })}
    </div>
  )
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "✓" : "✗"
  if (typeof value === "object") return Array.isArray(value) ? `[${value.length}]` : "{...}"
  return String(value)
}
