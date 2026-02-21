"use client"

import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/modules/shared/ui/card"
import { useTranslations } from "next-intl"

interface ChartDataItem {
  city: string
  LOW: number
  MEDIUM: number
  HIGH: number
  CRITICAL: number
}

interface WeatherAlertsSeverityChartProps {
  chartData: ChartDataItem[]
  onSelectCity: (city: string) => void
  selectedCity: string | null
}

const SEVERITY_COLORS = {
  LOW: "hsl(210, 89%, 55%)",       // Azul
  MEDIUM: "hsl(45, 93%, 55%)",     // Amarillo
  HIGH: "hsl(25, 93%, 55%)",       // Naranja
  CRITICAL: "hsl(0, 84%, 60%)",    // Rojo
}

export function WeatherAlertsSeverityChart({ chartData, onSelectCity, selectedCity }: WeatherAlertsSeverityChartProps) {
  const t = useTranslations("atc")

  const height = Math.max(180, chartData.length * 50)

  return (
    <Card className="premium-card rounded-2xl border-none overflow-hidden h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold tracking-tight">{t("alertsBySeverity")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ left: 0, right: 12, top: 0, bottom: 0 }}
              barGap={4}
            >
              <defs>
                {Object.entries(SEVERITY_COLORS).map(([key, color]) => (
                  <linearGradient key={`grad-${key}`} id={`grad-${key}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }}
              />
              <YAxis
                dataKey="city"
                type="category"
                width={80}
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => (
                  <text
                    x={x}
                    y={y}
                    dy={4}
                    textAnchor="end"
                    fill="currentColor"
                    className="text-[11px] font-bold tracking-tight"
                    opacity={selectedCity && selectedCity !== payload.value ? 0.3 : 0.8}
                    style={{ cursor: "pointer" }}
                    onClick={() => onSelectCity(payload.value)}
                  >
                    {payload.value}
                  </text>
                )}
              />
              <Tooltip
                cursor={{ fill: "rgba(255, 255, 255, 0.05)", radius: 4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const data = payload[0]?.payload as ChartDataItem
                  if (!data) return null
                  const total = data.LOW + data.MEDIUM + data.HIGH + data.CRITICAL
                  return (
                    <div className="rounded-xl border border-white/10 bg-background/80 backdrop-blur-xl p-3 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                      <p className="font-bold text-sm tracking-tight mb-2">{data.city}</p>
                      <div className="space-y-1">
                        {data.CRITICAL > 0 && (
                          <div className="flex justify-between gap-6 text-xs">
                            <span className="text-muted-foreground">Critical</span>
                            <span className="font-bold text-red-400 tabular-nums">{data.CRITICAL}</span>
                          </div>
                        )}
                        {data.HIGH > 0 && (
                          <div className="flex justify-between gap-6 text-xs">
                            <span className="text-muted-foreground">High</span>
                            <span className="font-bold text-orange-400 tabular-nums">{data.HIGH}</span>
                          </div>
                        )}
                        {data.MEDIUM > 0 && (
                          <div className="flex justify-between gap-6 text-xs">
                            <span className="text-muted-foreground">Medium</span>
                            <span className="font-bold text-yellow-400 tabular-nums">{data.MEDIUM}</span>
                          </div>
                        )}
                        {data.LOW > 0 && (
                          <div className="flex justify-between gap-6 text-xs">
                            <span className="text-muted-foreground">Low</span>
                            <span className="font-bold text-blue-400 tabular-nums">{data.LOW}</span>
                          </div>
                        )}
                        <div className="border-t border-border/30 pt-1 mt-1 flex justify-between gap-6 text-xs">
                          <span className="text-muted-foreground font-semibold">Total</span>
                          <span className="font-black tabular-nums">{total}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="CRITICAL"
                stackId="a"
                fill="url(#grad-CRITICAL)"
                radius={[0, 0, 0, 0]}
                barSize={14}
                style={{ cursor: "pointer" }}
                onClick={(data) => data?.city && onSelectCity(data.city)}
              />
              <Bar
                dataKey="HIGH"
                stackId="a"
                fill="url(#grad-HIGH)"
                barSize={14}
                style={{ cursor: "pointer" }}
                onClick={(data) => data?.city && onSelectCity(data.city)}
              />
              <Bar
                dataKey="MEDIUM"
                stackId="a"
                fill="url(#grad-MEDIUM)"
                barSize={14}
                style={{ cursor: "pointer" }}
                onClick={(data) => data?.city && onSelectCity(data.city)}
              />
              <Bar
                dataKey="LOW"
                stackId="a"
                fill="url(#grad-LOW)"
                radius={[0, 4, 4, 0]}
                barSize={14}
                animationDuration={1200}
                animationEasing="ease-out"
                style={{ cursor: "pointer" }}
                onClick={(data) => data?.city && onSelectCity(data.city)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
