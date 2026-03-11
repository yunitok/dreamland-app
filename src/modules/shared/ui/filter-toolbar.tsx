"use client"

import * as React from "react"
import { Search, SlidersHorizontal, X, Calendar, Loader2 } from "lucide-react"
import { Input } from "@/modules/shared/ui/input"
import { Button } from "@/modules/shared/ui/button"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  FilterToolbar — compound component for unified filter bars        */
/* ------------------------------------------------------------------ */

function FilterToolbar({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("space-y-3", className)}>{children}</div>
}

/* ---- Header ---- */

interface FilterHeaderProps {
  filteredCount?: number
  totalCount?: number
  hasActiveFilters: boolean
  onClear: () => void
  isPending?: boolean
  className?: string
}

function FilterHeader({
  filteredCount,
  totalCount,
  hasActiveFilters,
  onClear,
  isPending,
  className,
}: FilterHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Filtros</span>
        {filteredCount !== undefined && totalCount !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {filteredCount} / {totalCount}
          </span>
        )}
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <X className="h-3 w-3 mr-1" />
          Limpiar
        </Button>
      )}
    </div>
  )
}

/* ---- Body ---- */

function FilterBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {children}
    </div>
  )
}

/* ---- Search ---- */

interface FilterSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

function FilterSearch({
  value,
  onChange,
  placeholder = "Buscar...",
  className,
}: FilterSearchProps) {
  return (
    <div className={cn("relative w-full sm:w-auto sm:min-w-[220px]", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}

/* ---- DateRange ---- */

interface FilterDateRangeProps {
  startDate: string
  endDate: string
  onStartChange: (date: string) => void
  onEndChange: (date: string) => void
  className?: string
}

function FilterDateRange({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  className,
}: FilterDateRangeProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
      <Input
        type="date"
        value={startDate}
        onChange={(e) => onStartChange(e.target.value)}
        className="h-9 w-[130px] text-sm"
      />
      <span className="text-muted-foreground text-xs">→</span>
      <Input
        type="date"
        value={endDate}
        onChange={(e) => onEndChange(e.target.value)}
        className="h-9 w-[130px] text-sm"
      />
    </div>
  )
}

/* ---- Presets ---- */

interface FilterPresetsProps {
  presets: Array<{ label: string; onClick: () => void }>
  className?: string
}

function FilterPresets({ presets, className }: FilterPresetsProps) {
  return (
    <div className={cn("flex gap-1", className)}>
      {presets.map((p) => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          onClick={p.onClick}
          className="h-8 text-xs px-2"
        >
          {p.label}
        </Button>
      ))}
    </div>
  )
}

/* ---- Actions ---- */

function FilterActions({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("ml-auto flex items-center gap-2", className)}>
      {children}
    </div>
  )
}

/* ---- Compound export ---- */

export const Filter = Object.assign(FilterToolbar, {
  Header: FilterHeader,
  Body: FilterBody,
  Search: FilterSearch,
  DateRange: FilterDateRange,
  Presets: FilterPresets,
  Actions: FilterActions,
})
