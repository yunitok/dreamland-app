/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo } from "react"
import { Input } from "@/modules/shared/ui/input"
import { Button } from "@/modules/shared/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import { Search, X, SlidersHorizontal, Tags } from "lucide-react"
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
  onFiltersChange: (filters: any) => void
  totalCount: number
  filteredCount: number
  className?: string
}

export function ProjectFilters({ departments, onFiltersChange, totalCount, filteredCount, className }: ProjectFiltersProps) {
  const t = useTranslations("projects")

  // Define options using translations
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
    <div className={cn("space-y-4", className)}>
      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">{t("filters")}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredCount} {t("of")} {totalCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <X className="h-3 w-3 mr-1" />
              <span>{t("clearFilters")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-3">
        {/* Search Bar */}
        <div className="col-span-2 md:w-auto md:min-w-[250px] flex-grow">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              className="pl-9 h-9 bg-background/50 border-muted-foreground/20 focus:border-primary transition-colors"
            />
          </div>
        </div>

         {/* Filters Group */}
        <div className="col-span-2 md:col-span-1 flex flex-wrap items-center gap-2">
           {/* Department */}
          <Select value={filters.department} onValueChange={(v) => updateFilter("department", v)}>
            <SelectTrigger className="h-10 w-full md:w-[160px] bg-background/50 text-sm">
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
            <SelectTrigger className="h-10 w-full md:w-[140px] bg-background/50 text-sm">
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
             <SelectTrigger className="h-10 w-full md:w-[140px] bg-background/50 text-sm">
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
            <SelectTrigger className="h-10 w-full md:w-[140px] bg-background/50 text-sm">
               <SelectValue placeholder={t("allStatuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allStatuses")}</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
