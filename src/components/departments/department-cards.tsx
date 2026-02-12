"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Card } from "@/modules/shared/ui/card"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { FolderKanban, Sparkles, AlertTriangle, ThumbsUp, Meh, Pencil } from "lucide-react"
import { Button } from "@/modules/shared/ui/button"
import { DepartmentFilters } from "./department-filters"
import { DepartmentForm } from "./department-form"
import type { TeamMood } from "@prisma/client"

interface DepartmentInfo {
  id: string
  departmentName: string
  sentimentScore: number
  dominantEmotion: string
  keyConcerns?: string | null
  projectCount: number
}

interface DepartmentCardsProps {
  departments: DepartmentInfo[]
}

interface FilterState {
  search: string
  sentimentLevel: string
}

export function DepartmentCards({ departments }: DepartmentCardsProps) {
  const t = useTranslations("departments")
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sentimentLevel: "all",
  })
  const [selectedDepartment, setSelectedDepartment] = useState<TeamMood | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const handleCreateClick = () => {
    setSelectedDepartment(null)
    setFormMode("create")
    setIsFormOpen(true)
  }

  // Effect to check for new-department query param
  useEffect(() => {
    if (searchParams.get('new-department') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDepartment(null)
      setFormMode("create")
      setIsFormOpen(true)
    }
  }, [searchParams])

  const handleCloseForm = () => {
    setIsFormOpen(false)
    // Remove query param if it exists
    if (searchParams.get('new-department')) {
        router.replace(pathname)
    }
  }

  const getSentimentLevel = (score: number): string => {
    if (score < 40) return "critical"
    if (score < 60) return "atrisk"
    if (score < 75) return "neutral"
    return "healthy"
  }

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      // Search filter
      if (filters.search !== "") {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          dept.departmentName.toLowerCase().includes(searchLower) ||
          dept.dominantEmotion.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }
      // Sentiment level filter
      if (filters.sentimentLevel !== "all") {
        const level = getSentimentLevel(dept.sentimentScore)
        if (level !== filters.sentimentLevel) return false
      }
      return true
    })
  }, [departments, filters])

  const handleEditClick = (e: React.MouseEvent, dept: DepartmentInfo) => {
    e.stopPropagation()
    setSelectedDepartment({
      id: dept.id,
      departmentName: dept.departmentName,
      sentimentScore: dept.sentimentScore,
      dominantEmotion: dept.dominantEmotion,
      keyConcerns: dept.keyConcerns || null,
      detectedAt: new Date(),
    } as TeamMood)
    setFormMode("edit")
    setIsFormOpen(true)
  }

  const getSentimentConfig = (score: number) => {
    if (score < 40) return {
      color: "text-red-400",
      bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(239,68,68,0.15)_0%,_transparent_50%)]",
      border: "border-red-500/30",
      glow: "shadow-red-500/10",
      icon: AlertTriangle,
      label: "Crítico"
    }
    if (score < 60) return {
      color: "text-amber-400",
      bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(245,158,11,0.15)_0%,_transparent_50%)]",
      border: "border-amber-500/30",
      glow: "shadow-amber-500/10",
      icon: Meh,
      label: "En riesgo"
    }
    if (score < 75) return {
      color: "text-blue-400",
      bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(59,130,246,0.15)_0%,_transparent_50%)]",
      border: "border-blue-500/30",
      glow: "shadow-blue-500/10",
      icon: Sparkles,
      label: "Neutral"
    }
    return {
      color: "text-emerald-400",
      bg: "bg-[radial-gradient(ellipse_at_top_left,_rgba(16,185,129,0.15)_0%,_transparent_50%)]",
      border: "border-emerald-500/30",
      glow: "shadow-emerald-500/10",
      icon: ThumbsUp,
      label: "Saludable"
    }
  }

  if (departments.length === 0) {
    return (
      <>
        <DepartmentFilters
          onFiltersChange={setFilters}
          totalCount={0}
          filteredCount={0}
        />
        <div className="text-center py-12 text-muted-foreground">
          {t("noDepartments")}
        </div>
        <DepartmentForm
          department={selectedDepartment}
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          mode={formMode}
        />
      </>
    )
  }

  return (
    <>
      <DepartmentFilters
        onFiltersChange={setFilters}
        totalCount={departments.length}
        filteredCount={filteredDepartments.length}
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
        {filteredDepartments.map((dept) => {
          const config = getSentimentConfig(dept.sentimentScore)

          return (
            <Card 
              key={dept.id} 
              className={cn(
                "group relative overflow-hidden cursor-pointer",
                "border border-border/40 hover:border-primary/40",
                "bg-card/60 backdrop-blur-sm",
                "transition-all duration-300 ease-out",
                "hover:scale-[1.02] hover:shadow-xl",
                config?.glow && `hover:${config.glow}`
              )}
            >
              {/* Gradient overlay - subtle on mobile, hover on desktop */}
              <div className={cn(
                "absolute inset-0 opacity-30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500",
                config.bg
              )} />

              {/* Edit button - always visible on mobile, hover on desktop */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 bg-background/80 sm:bg-transparent"
                onClick={(e) => handleEditClick(e, dept)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              <div className="relative p-5 flex flex-col gap-4">
                {/* Header: Name + Status Icon */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-bold leading-tight group-hover:text-primary transition-colors flex-1 pr-8">
                    {dept.departmentName}
                  </h3>
                  <div className={cn(
                    "p-1.5 rounded-lg border transition-all duration-300",
                    "bg-background/50",
                    config.border,
                    "group-hover:scale-110"
                  )}>
                    <config.icon className={cn("h-4 w-4", config.color)} />
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="flex items-center gap-4">
                  {/* Sentiment Score - Main metric */}
                  <div className="flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn("text-3xl font-black tabular-nums tracking-tight", config.color)}>
                        {dept.sentimentScore}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">/100</span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-2 h-1 w-full rounded-full bg-secondary/30 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          dept.sentimentScore < 40 ? "bg-red-500" :
                          dept.sentimentScore < 60 ? "bg-amber-500" :
                          dept.sentimentScore < 75 ? "bg-blue-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${dept.sentimentScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Count - Secondary metric */}
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <FolderKanban className="h-3.5 w-3.5" />
                      <span className="text-lg font-bold tabular-nums text-foreground">
                        {dept.projectCount}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      proyectos
                    </span>
                  </div>
                </div>

                {/* Emotion Quote - Data storytelling */}
                {dept.dominantEmotion && (
                  <p className="text-xs text-muted-foreground/80 italic border-l-2 border-border/60 pl-3 py-1 line-clamp-2 leading-relaxed">
                    &quot;{dept.dominantEmotion}&quot;
                  </p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {filteredDepartments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {t("noResults")}
        </div>
      )}

      <DepartmentForm
        department={selectedDepartment}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        mode={formMode}
      />
    </>
  )
}
