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
  priority: string
  type: string
  status: string
}

interface ProjectFiltersProps {
  departments: string[]
  onFiltersChange: (filters: FilterState) => void
  totalCount: number
  filteredCount: number
  className?: string
}

const PRIORITIES = ["High", "Medium", "Low"] as const
const TYPES = ["Problem", "Idea", "Opportunity"] as const
const STATUSES = ["Active", "Pending", "Done"] as const

export function ProjectFilters({
  departments,
  onFiltersChange,
  totalCount,
  filteredCount,
  className,
}: ProjectFiltersProps) {
  const t = useTranslations("projects")
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

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      High: t("high"),
      Medium: t("medium"),
      Low: t("low"),
    }
    return labels[priority] || priority
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      Problem: t("problem"),
      Idea: t("idea"),
      Opportunity: t("opportunity"),
    }
    return labels[type] || type
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      Active: t("active"),
      Pending: t("pending"),
      Done: t("done"),
    }
    return labels[status] || status
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

      {/* Search and Filters */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-3">
        {/* Search Bar - Full width on mobile */}
        <div className="col-span-2 md:w-auto md:min-w-[250px]">
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
        <div className="col-span-2 xs:col-span-1 md:w-auto">
          <Select value={filters.department} onValueChange={(v: string) => updateFilter("department", v)}>
            <SelectTrigger className="h-9 bg-background/50 w-full md:w-auto md:min-w-[160px]">
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

        {/* Priority */}
        <div className="col-span-2 xs:col-span-1 md:w-auto">
          <Select value={filters.priority} onValueChange={(v: string) => updateFilter("priority", v)}>
            <SelectTrigger className="h-9 bg-background/50 w-full md:w-auto md:min-w-[140px]">
              <SelectValue placeholder={t("allPriorities")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allPriorities")}</SelectItem>
              {PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {getPriorityLabel(priority)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Type */}
        <div className="col-span-2 xs:col-span-1 md:w-auto">
          <Select value={filters.type} onValueChange={(v: string) => updateFilter("type", v)}>
            <SelectTrigger className="h-9 bg-background/50 w-full md:w-auto md:min-w-[120px]">
              <SelectValue placeholder={t("allTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allTypes")}</SelectItem>
              {TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {getTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="col-span-2 xs:col-span-1 md:w-auto">
          <Select value={filters.status} onValueChange={(v: string) => updateFilter("status", v)}>
            <SelectTrigger className="h-9 bg-background/50 w-full md:w-auto md:min-w-[130px]">
              <SelectValue placeholder={t("allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
