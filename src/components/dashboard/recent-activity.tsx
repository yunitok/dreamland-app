"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Project } from "@/generated/prisma/client"
import { useTranslations } from "next-intl"

interface RecentActivityProps {
  projects: Project[]
  className?: string
}

const priorityStyles = {
  High: "bg-red-500/10 text-red-500 border-red-500/20",
  Medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
}

const statusStyles = {
  Active: "bg-blue-500/10 text-blue-500",
  Pending: "bg-muted text-muted-foreground",
  Done: "bg-emerald-500/10 text-emerald-500",
}

export function RecentActivity({ projects, className }: RecentActivityProps) {
  const t = useTranslations("dashboard")
  const tProjects = useTranslations("projects")

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      High: tProjects("high"),
      Medium: tProjects("medium"),
      Low: tProjects("low"),
    }
    return labels[priority] || priority
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      Active: tProjects("active"),
      Pending: tProjects("pending"),
      Done: tProjects("done"),
    }
    return labels[status] || status
  }

  return (
    <Card className={cn("premium-card rounded-xl", className)}>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">{t("recentActivity")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {projects.map((project) => (
          <div 
            key={project.id}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{project.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {project.department} • {project.type}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge 
                variant="outline" 
                className={cn("text-xs", priorityStyles[project.priority as keyof typeof priorityStyles])}
              >
                {getPriorityLabel(project.priority)}
              </Badge>
              <Badge 
                variant="secondary"
                className={cn("text-xs", statusStyles[project.status as keyof typeof statusStyles])}
              >
                {getStatusLabel(project.status)}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
