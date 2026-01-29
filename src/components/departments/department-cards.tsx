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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {departments.map((dept) => (
        <Card key={dept.name} className="overflow-hidden border-border/50 hover:border-border transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold">{dept.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderKanban className="h-4 w-4" />
                <span>{t("projectsCount", { count: dept.projectCount })}</span>
              </div>
            </div>

            {dept.sentimentScore !== undefined && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>{t("sentiment")}</span>
                  </div>
                  <span className={cn("text-sm font-bold", getSentimentColor(dept.sentimentScore))}>
                    {dept.sentimentScore}/100
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                   <div 
                    className={cn("h-full transition-all", 
                      dept.sentimentScore < 40 ? "bg-red-500" : 
                      dept.sentimentScore < 60 ? "bg-amber-500" : 
                      dept.sentimentScore < 75 ? "bg-blue-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${dept.sentimentScore}%` }}
                  />
                </div>
                {dept.dominantEmotion && (
                  <p className="text-xs text-muted-foreground italic">
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
