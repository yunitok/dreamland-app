"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X, SlidersHorizontal, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

interface FilterState {
  search: string
  sentimentLevel: string
}

interface DepartmentFiltersProps {
  onFiltersChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
  className?: string
}

const SENTIMENT_LEVELS = [
  { value: "all", label: "allLevels" },
  { value: "critical", label: "critical" },
  { value: "atrisk", label: "atRisk" },
  { value: "neutral", label: "neutral" },
  { value: "healthy", label: "healthy" },
] as const

export function DepartmentFilters({
  onFiltersChange,
  totalCount,
  filteredCount,
  className,
}: DepartmentFiltersProps) {
  const t = useTranslations("departments")
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sentimentLevel: "all",
  })

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      sentimentLevel: "all",
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const hasActiveFilters = useMemo(() => {
    return filters.search !== "" || filters.sentimentLevel !== "all"
  }, [filters])

  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{t("filters")}</span>
          <span className="text-xs text-muted-foreground">
            ({filteredCount} {t("of")} {totalCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">{t("clearFilters")}</span>
              <span className="sm:hidden">Limpiar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative w-full sm:max-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9 h-9 bg-background/50"
          />
        </div>

        {/* Sentiment Level */}
        <div className="w-full sm:w-48">
          <Select value={filters.sentimentLevel} onValueChange={(v: string) => updateFilter("sentimentLevel", v)}>
            <SelectTrigger className="h-9 bg-background/50">
              <SelectValue placeholder={t("allLevels")} />
            </SelectTrigger>
            <SelectContent>
              {SENTIMENT_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {t(level.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
