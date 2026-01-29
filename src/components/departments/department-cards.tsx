"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { FolderKanban, Heart } from "lucide-react"

interface DepartmentInfo {
  name: string
  projectCount: number
  sentimentScore?: number
  dominantEmotion?: string
}

interface DepartmentCardsProps {
  departments: DepartmentInfo[]
}

export function DepartmentCards({ departments }: DepartmentCardsProps) {
  const t = useTranslations("departments")

  const getSentimentColor = (score: number) => {
    if (score < 40) return "text-red-500"
    if (score < 60) return "text-amber-500"
    if (score < 75) return "text-blue-500"
    return "text-emerald-500"
  }

  const getSentimentBg = (score: number) => {
    if (score < 40) return "bg-red-500/10"
    if (score < 60) return "bg-amber-500/10"
    if (score < 75) return "bg-blue-500/10"
    return "bg-emerald-500/10"
  }

  if (departments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("noDepartments")}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {departments.map((dept) => (
        <Card key={dept.name} className="overflow-hidden border-border/40 hover:border-primary/30 transition-all duration-300 premium-card group">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{dept.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FolderKanban className="h-4 w-4" />
                </div>
                <span className="font-medium">{t("projectsCount", { count: dept.projectCount })}</span>
              </div>
            </div>

            {dept.sentimentScore !== undefined && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className={cn("p-2 rounded-lg", getSentimentBg(dept.sentimentScore))}>
                      <Heart className={cn("h-4 w-4", getSentimentColor(dept.sentimentScore))} />
                    </div>
                    <span className="font-medium">{t("sentiment")}</span>
                  </div>
                  <span className={cn("text-xl font-black tabular-nums", getSentimentColor(dept.sentimentScore))}>
                    {dept.sentimentScore}
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary/50">
                   <div 
                    className={cn("h-full transition-all duration-500 rounded-full", 
                      dept.sentimentScore < 40 ? "bg-red-500" : 
                      dept.sentimentScore < 60 ? "bg-amber-500" : 
                      dept.sentimentScore < 75 ? "bg-blue-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${dept.sentimentScore}%` }}
                  />
                </div>
                {dept.dominantEmotion && (
                  <p className="text-[10px] text-muted-foreground italic bg-muted/30 p-2 rounded-md border border-border/20">
                    "{dept.dominantEmotion}"
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
