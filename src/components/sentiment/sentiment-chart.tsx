"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/modules/shared/ui/card"
import { useTranslations } from "next-intl"
import type { TeamMood } from "@prisma/client"

interface SentimentChartProps {
  moods: TeamMood[]
}

const getBarColor = (score: number) => {
  if (score < 50) return "hsl(0, 84%, 60%)" // Red (Critical)
  if (score < 75) return "hsl(200, 89%, 48%)" // Blue (Stable)
  return "hsl(142, 71%, 45%)" // Green (Healthy)
}

export function SentimentChart({ moods }: SentimentChartProps) {
  const t = useTranslations("sentiment")
  
  const chartData = moods.map(mood => ({
    name: mood.departmentName,
    score: mood.sentimentScore,
    emotion: mood.dominantEmotion,
  })).sort((a, b) => b.score - a.score)

  return (
    <Card className="premium-card rounded-2xl border-none overflow-hidden group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-black tracking-tight">{t("departmentWellnessScore")}</CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-wider opacity-60">
              {t("chartDescription")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={chartData} 
              layout="vertical" 
              margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
              barGap={8}
            >
              <defs>
                {chartData.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={getBarColor(entry.score)} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={getBarColor(entry.score)} stopOpacity={0.4} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis 
                type="number" 
                domain={[0, 100]} 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }} 
              />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={140}
                axisLine={false}
                tickLine={false}
                tick={({ x, y, payload }) => (
                  <text 
                    x={x} 
                    y={y} 
                    dy={4} 
                    textAnchor="end" 
                    fill="currentColor" 
                    className="text-[11px] font-bold tracking-tight opacity-70"
                  >
                    {payload.value}
                  </text>
                )}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255, 255, 255, 0.05)', radius: 4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-xl border border-white/10 bg-background/80 backdrop-blur-xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getBarColor(data.score) }} />
                        <p className="font-bold text-sm tracking-tight">{data.name}</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center gap-8">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Score</span>
                          <span className="text-base font-black tabular-nums" style={{ color: getBarColor(data.score) }}>{data.score}</span>
                        </div>
                        <div className="flex justify-between items-center gap-8">
                          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Emotion</span>
                          <span className="text-xs font-semibold">{data.emotion}</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar 
                dataKey="score" 
                radius={[0, 6, 6, 0]} 
                barSize={16}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#colorGradient-${index})`} className="transition-all duration-300 hover:opacity-100 opacity-80" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
