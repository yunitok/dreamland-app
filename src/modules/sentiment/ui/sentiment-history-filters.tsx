"use client"

import { useState, useMemo } from "react"
import { Button } from "@/modules/shared/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Filter } from "@/modules/shared/ui/filter-toolbar"

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
    <Filter className={cn(className)}>
      <Filter.Header
        filteredCount={filteredCount}
        totalCount={totalCount}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />
      <Filter.Body>
        <Filter.Search
          value={filters.search}
          onChange={(v) => updateFilter("search", v)}
          placeholder={t("searchPlaceholder")}
        />
        <Select value={filters.department} onValueChange={(v: string) => updateFilter("department", v)}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
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
        <Select value={filters.zone} onValueChange={(v: string) => updateFilter("zone", v)}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
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
      </Filter.Body>
    </Filter>
  )
}
