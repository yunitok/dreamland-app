"use client"

import { Bar, BarChart, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { TeamMood } from "@/generated/prisma/client"

interface SentimentChartProps {
  moods: TeamMood[]
}

const getBarColor = (score: number) => {
  if (score < 40) return "hsl(0, 84%, 60%)" // Red
  if (score < 60) return "hsl(45, 93%, 47%)" // Amber
  if (score < 75) return "hsl(200, 89%, 48%)" // Blue
  return "hsl(142, 71%, 45%)" // Green
}

export function SentimentChart({ moods }: SentimentChartProps) {
  const chartData = moods.map(mood => ({
    name: mood.departmentName,
    score: mood.sentimentScore,
    emotion: mood.dominantEmotion,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Wellness Score</CardTitle>
        <CardDescription>
          Sentiment analysis by department (0 = High Stress, 100 = Optimal)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={120}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const data = payload[0].payload
                  return (
                    <div className="rounded-lg border bg-popover p-3 shadow-lg">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Score: <span className="font-semibold">{data.score}/100</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Emotion: {data.emotion}
                      </p>
                    </div>
                  )
                }}
              />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
