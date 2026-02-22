"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, ArrowRight, AlertTriangle, Info, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/modules/shared/ui/card"
import { Badge } from "@/modules/shared/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import { HealthScoreRing } from "./health-score-ring"
import { FieldIssuesTable } from "./field-issues-table"
import type { EndpointAuditResult } from "@/modules/sherlock/domain/data-quality/types"

interface EndpointCardProps {
  result: EndpointAuditResult
}

export function EndpointCard({ result }: EndpointCardProps) {
  const [expanded, setExpanded] = useState(false)

  const { summary } = result
  const fieldsWithIssues = result.fields.filter((f) => f.issues.length > 0)
  const hasIssues = summary.totalIssues > 0

  return (
    <Card className={`transition-all ${hasIssues ? "border-l-4" : ""} ${
      summary.healthScore >= 80
        ? "border-l-emerald-400"
        : summary.healthScore >= 50
        ? "border-l-amber-400"
        : "border-l-red-400"
    }`}>
      <CardHeader
        className="py-3 px-4 cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {/* Health ring */}
          <HealthScoreRing score={result.error ? 0 : summary.healthScore} size={48} />

          {/* Endpoint info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{result.label}</span>
              {result.sherlockMapping && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowRight className="h-3 w-3" />
                  {result.sherlockMapping}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <code className="text-[10px] text-muted-foreground">{result.endpoint}</code>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{result.recordCount} registros</span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{result.fetchTimeMs}ms</span>
            </div>
          </div>

          {/* Badges de issues */}
          <div className="flex items-center gap-1.5 shrink-0">
            {result.error ? (
              <Badge variant="destructive" className="text-[10px]">Error</Badge>
            ) : (
              <>
                {summary.criticalCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                    <XCircle className="h-3 w-3" />
                    {summary.criticalCount}
                  </span>
                )}
                {summary.warningCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    {summary.warningCount}
                  </span>
                )}
                {summary.infoCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                    <Info className="h-3 w-3" />
                    {summary.infoCount}
                  </span>
                )}
                {!hasIssues && (
                  <span className="text-[10px] font-medium text-emerald-600">✓ OK</span>
                )}
              </>
            )}
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-4">
          {result.error ? (
            <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {result.error}
            </div>
          ) : fieldsWithIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Todos los campos están correctamente normalizados.
            </p>
          ) : (
            <Tabs defaultValue={fieldsWithIssues[0]?.fieldName}>
              <TabsList variant="line" className="flex-wrap h-auto gap-1">
                {fieldsWithIssues.map((field) => (
                  <TabsTrigger key={field.fieldName} value={field.fieldName} className="text-xs">
                    {field.fieldName}
                    <span className={`ml-1.5 text-[10px] font-medium px-1 rounded-full ${
                      field.issues.some((i) => i.severity === "critical")
                        ? "bg-red-500/20 text-red-600"
                        : field.issues.some((i) => i.severity === "warning")
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-blue-500/20 text-blue-600"
                    }`}>
                      {field.issues.length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {fieldsWithIssues.map((field) => (
                <TabsContent key={field.fieldName} value={field.fieldName} className="mt-3">
                  <div className="flex gap-4 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span>{field.totalValues} valores</span>
                    <span>{field.uniqueValues} únicos</span>
                    {field.nullCount > 0 && <span className="text-amber-600">{field.nullCount} nulos</span>}
                    {field.emptyCount > 0 && <span className="text-blue-600">{field.emptyCount} vacíos</span>}
                    <span>Case: {formatCaseDistribution(field.caseDistribution)}</span>
                  </div>
                  <FieldIssuesTable field={field} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function formatCaseDistribution(dist: EndpointAuditResult["fields"][0]["caseDistribution"]) {
  const parts: string[] = []
  const total = dist.allUpper + dist.allLower + dist.titleCase + dist.mixed
  if (total === 0) return "—"
  const pct = (n: number) => Math.round((n / total) * 100) + "%"
  if (dist.allUpper > 0) parts.push("UPPER " + pct(dist.allUpper))
  if (dist.titleCase > 0) parts.push("Title " + pct(dist.titleCase))
  if (dist.allLower > 0) parts.push("lower " + pct(dist.allLower))
  if (dist.mixed > 0) parts.push("mixed " + pct(dist.mixed))
  return parts.join(" · ")
}
