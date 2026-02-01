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
  department: string
  zone: string
}

interface SentimentHistoryFiltersProps {
  departments: string[]
  onFiltersChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
  className?: string
}

const ZONES = ["critical", "stable", "healthy"] as const

export function SentimentHistoryFilters({
  departments,
  onFiltersChange,
  totalCount,
  filteredCount,
  className,
}: SentimentHistoryFiltersProps) {
  const t = useTranslations("sentiment")
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    department: "all",
    zone: "all",
  })

  const updateFilter = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const defaultFilters: FilterState = {
      search: "",
      department: "all",
      zone: "all",
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.department !== "all" ||
      filters.zone !== "all"
    )
  }, [filters])

  const getZoneLabel = (zone: string) => {
    const labels: Record<string, string> = {
      critical: t("criticalLabel"),
      stable: t("stableLabel"),
      healthy: t("healthyLabel"),
    }
    return labels[zone] || zone
  }

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

      {/* Search and Filters - All in one line */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="w-full sm:w-auto sm:min-w-[250px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-9 h-9 bg-background/50"
            />
          </div>
        </div>

        {/* Department */}
        <div className="w-auto">
          <Select value={filters.department} onValueChange={(v: string) => updateFilter("department", v)}>
            <SelectTrigger className="h-9 bg-background/50 w-auto min-w-[160px]">
              <SelectValue placeholder={t("allDepartments")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allDepartments")}</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Zone (Critical / Stable / Healthy) */}
        <div className="w-auto">
          <Select value={filters.zone} onValueChange={(v: string) => updateFilter("zone", v)}>
            <SelectTrigger className="h-9 bg-background/50 w-auto min-w-[140px]">
              <SelectValue placeholder={t("allZones")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allZones")}</SelectItem>
              {ZONES.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {getZoneLabel(zone)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
