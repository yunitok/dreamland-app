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
  CalendarRange,
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
import { COVERMANAGER_ENDPOINT_GROUPS, type CoverManagerEndpoint } from "@/lib/covermanager"
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
  }
}

export function CoverManagerSandbox() {
  const t = useTranslations("analytics.sandbox")
  const [selectedEndpoint, setSelectedEndpoint] = useState<CoverManagerEndpoint | null>(null)
  const [result, setResult] = useState<ApiResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlParams, setUrlParams] = useState<Record<string, string>>({})
  const [bodyJson, setBodyJson] = useState<string>("")

  const executeRequest = useCallback(async (endpoint: CoverManagerEndpoint, params: Record<string, string>, body?: string) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let response: Response

      if (endpoint.method === "POST") {
        // POST: endpoint path + body JSON
        let parsedBody: Record<string, unknown> = {}
        if (body?.trim()) {
          try {
            parsedBody = JSON.parse(body)
          } catch {
            setError("JSON del body inválido")
            setLoading(false)
            return
          }
        }

        // Construir el path con los URL params reemplazados
        const path = buildPath(endpoint.path, params)

        response = await fetch("/api/gastrolab/covermanager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: path, ...parsedBody }),
        })
      } else {
        // GET: construir el path con params
        const path = buildPath(endpoint.path, params)

        const searchParams = new URLSearchParams({ endpoint: path })
        response = await fetch(`/api/gastrolab/covermanager?${searchParams.toString()}`)
      }

      const json = await response.json()

      if (!response.ok) {
        setError(json.message || json.error || `HTTP ${response.status}`)
        return
      }

      const meta = json._meta || {}

      // CoverManager no siempre devuelve {data: []}; intentar contar registros
      const recordCount = countRecords(json)

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

  const handleSelect = (endpoint: CoverManagerEndpoint) => {
    setSelectedEndpoint(endpoint)
    setUrlParams({})
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
            <CalendarRange className="h-4 w-4" />
            CoverManager API
          </CardTitle>
          <CardDescription className="text-xs">
            {t("selectEndpoint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {COVERMANAGER_ENDPOINT_GROUPS.map((group) => (
            <div key={group.label}>
              <h3 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${group.color}`}>
                {group.label}
              </h3>
              <div className="space-y-1">
                {group.endpoints.map((endpoint) => {
                  const isSelected = selectedEndpoint?.path === endpoint.path && selectedEndpoint?.label === endpoint.label
                  return (
                    <button
                      key={`${endpoint.path}-${endpoint.label}`}
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
                        /{endpoint.path.replace(/:apikey\/?/g, "")}
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
                <Badge
                  variant="secondary"
                  className={`shrink-0 font-mono text-xs ${
                    selectedEndpoint?.method === "POST" ? "bg-amber-500/10 text-amber-600" : ""
                  }`}
                >
                  {selectedEndpoint?.method || "GET"}
                </Badge>
                <code className="text-sm text-muted-foreground truncate">
                  covermanager.com/api/
                  <span className="text-foreground font-medium">
                    {selectedEndpoint
                      ? buildPath(selectedEndpoint.path, urlParams)
                          .replace(/:apikey\/?/g, "****/")
                      : "..."}
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

            {/* URL Params para GET y POST (si tienen urlParams) */}
            {selectedEndpoint?.urlParams && selectedEndpoint.urlParams.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Parámetros URL</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {selectedEndpoint.urlParams.map((param) => (
                    <div key={param.name} className="space-y-1">
                      <Label htmlFor={`url-${param.name}`} className="text-xs">
                        {param.label}
                        {param.optional && (
                          <span className="text-muted-foreground/60 ml-1 font-normal">(opcional)</span>
                        )}
                      </Label>
                      <Input
                        id={`url-${param.name}`}
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

// ─── Helpers ─────────────────────────────────────────────────────

/** Reemplaza :params en la ruta y limpia los opcionales no rellenados.
 *  Preserva :apikey — lo reemplaza el proxy server-side. */
function buildPath(pathTemplate: string, params: Record<string, string>): string {
  let path = pathTemplate
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      path = path.replace(`:${key}`, encodeURIComponent(value))
    }
  }
  // Limpiar :params no reemplazados EXCEPTO :apikey (lo maneja el proxy)
  path = path.replace(/\/:(?!apikey\b)[a-zA-Z_]+/g, "").replace(/\/+$/, "")
  return path
}

/** CoverManager no tiene formato uniforme; intentar contar registros */
function countRecords(json: Record<string, unknown>): number {
  // Buscar arrays en las keys principales de la respuesta
  for (const key of ["restaurants", "reservs", "clients", "availability", "data", "pays", "refunds", "orders", "products"]) {
    const val = json[key]
    if (Array.isArray(val)) return val.length
    if (val && typeof val === "object") return 1
  }
  return json.resp === 1 ? 1 : 0
}

/** Intentar extraer array principal para tabla */
function extractMainArray(json: Record<string, unknown>): unknown[] {
  for (const key of ["restaurants", "reservs", "clients", "pays", "refunds", "orders", "products", "data"]) {
    const val = json[key]
    if (Array.isArray(val) && val.length > 0) return val
  }
  return []
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <CalendarRange className="h-10 w-10 mb-3 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

function EndpointInfo({ endpoint }: { endpoint: CoverManagerEndpoint }) {
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
      {endpoint.atcMapping && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
            <ArrowRight className="h-3 w-3" />
            Mapeo a ATC
          </p>
          <code className="text-sm font-mono text-primary">{endpoint.atcMapping}</code>
        </div>
      )}
      {endpoint.bodyParams && endpoint.bodyParams.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground mb-2">Parámetros del Body</p>
          <div className="space-y-1">
            {endpoint.bodyParams.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <code className="font-mono text-foreground">{p.name}</code>
                <span className="text-muted-foreground">({p.type})</span>
                {p.optional && <Badge variant="outline" className="text-[9px] px-1 py-0">opcional</Badge>}
              </div>
            ))}
          </div>
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
  endpoint: CoverManagerEndpoint
}) {
  const responseData = data as Record<string, unknown>
  const items = extractMainArray(responseData)

  if (items.length === 0) {
    // Para respuestas no-array (ej: availability), mostrar JSON directamente
    if (responseData && typeof responseData === "object" && Object.keys(responseData).length > 2) {
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Respuesta no tabular — mostrando campos principales
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.entries(responseData)
              .filter(([key]) => key !== "_meta")
              .slice(0, 12)
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
        No hay datos para mapear. Ejecuta la petición primero.
      </div>
    )
  }

  const firstItem = items[0] as Record<string, unknown>
  const keys = Object.keys(firstItem)

  return (
    <div className="space-y-3">
      {endpoint.atcMapping && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">CoverManager</Badge>
          <ArrowRight className="h-3 w-3" />
          <Badge variant="secondary" className="text-[10px]">{endpoint.atcMapping}</Badge>
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
