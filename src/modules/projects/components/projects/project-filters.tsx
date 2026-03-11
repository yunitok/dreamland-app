/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo } from "react"
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
  priority: string
  type: string
  status: string
}

interface ProjectFiltersProps {
  departments: string[]
  onFiltersChange: (filters: any) => void
  totalCount: number
  filteredCount: number
  className?: string
}

export function ProjectFilters({ departments, onFiltersChange, totalCount, filteredCount, className }: ProjectFiltersProps) {
  const t = useTranslations("projects")

  const priorities = [
    { value: "High", label: t("high") },
    { value: "Medium", label: t("medium") },
    { value: "Low", label: t("low") },
  ]

  const types = [
    { value: "Problem", label: t("problem") },
    { value: "Idea", label: t("idea") },
    { value: "Initiative", label: t("initiative") },
  ]

  const statuses = [
    { value: "Active", label: t("active") },
    { value: "Pending", label: t("pending") },
    { value: "Done", label: t("done") },
  ]

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    department: "all",
    priority: "all",
    type: "all",
    status: "all",
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
      priority: "all",
      type: "all",
      status: "all",
    }
    setFilters(defaultFilters)
    onFiltersChange(defaultFilters)
  }

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.department !== "all" ||
      filters.priority !== "all" ||
      filters.type !== "all" ||
      filters.status !== "all"
    )
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

        {/* Department */}
        <Select value={filters.department} onValueChange={(v) => updateFilter("department", v)}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
            <SelectValue placeholder={t("allDepartments")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allDepartments")}</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority */}
        <Select value={filters.priority} onValueChange={(v) => updateFilter("priority", v)}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
            <SelectValue placeholder={t("allPriorities")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allPriorities")}</SelectItem>
            {priorities.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type */}
        <Select value={filters.type} onValueChange={(v) => updateFilter("type", v)}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
            <SelectValue placeholder={t("allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTypes")}</SelectItem>
            {types.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-full sm:w-auto sm:min-w-[150px]">
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {statuses.map((status) => (
              <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Filter.Body>
    </Filter>
  )
}
