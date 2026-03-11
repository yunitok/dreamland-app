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
        <Select value={filters.sentimentLevel} onValueChange={(v: string) => updateFilter("sentimentLevel", v)}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
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
      </Filter.Body>
    </Filter>
  )
}
