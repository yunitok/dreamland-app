"use client"

import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import { useState } from "react"
import { Button } from "@/modules/shared/ui/button"
import { Calendar as CalendarComponent } from "@/modules/shared/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/modules/shared/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/modules/shared/ui/popover"
import { Checkbox } from "@/modules/shared/ui/checkbox"
import { Filter as FilterIcon, MapPin, Loader2, Calendar } from "lucide-react"
import { Label } from "@/modules/shared/ui/label"
import { format, subMonths, subYears, parseISO, type Locale } from "date-fns"
import { es, enUS, de, fr, it, ru } from "date-fns/locale"
import { Filter } from "@/modules/shared/ui/filter-toolbar"
import { cn } from "@/lib/utils"
import type { Granularity } from "@/modules/analytics/actions/cover-analytics"

export interface FilterState {
  dateStart: string
  dateEnd: string
  locationIds: string[]
  granularity: Granularity
}

interface Props {
  locations: { id: string; name: string; city: string }[]
  filters: FilterState
  onChange: (filters: FilterState) => void
  isPending: boolean
  trailing?: React.ReactNode
}

const DATE_LOCALES: Record<string, Locale> = { es, en: enUS, de, fr, it, ru }

const PRESETS = [
  { label: "1 mes", months: 1 },
  { label: "3 meses", months: 3 },
  { label: "1 año", months: 12 },
  { label: "3 años", months: 36 },
] as const

export function AnalyticsFilters({
  locations,
  filters,
  onChange,
  isPending,
  trailing,
}: Props) {
  const t = useTranslations("analytics.covers.filters")
  const locale = useLocale()
  const dateFnsLocale = DATE_LOCALES[locale] || es

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd MMM yyyy", { locale: dateFnsLocale })
    } catch {
      return dateStr
    }
  }

  const [activeCalendar, setActiveCalendar] = useState<"from" | "to">("from")

  const startDate = parseISO(filters.dateStart)
  const endDate = parseISO(filters.dateEnd)

  const selectedCount = filters.locationIds.length
  const allSelected = selectedCount === locations.length

  const toggleLocation = (id: string) => {
    const ids = filters.locationIds.includes(id)
      ? filters.locationIds.filter((i) => i !== id)
      : [...filters.locationIds, id]
    onChange({ ...filters, locationIds: ids })
  }

  const toggleAll = () => {
    onChange({
      ...filters,
      locationIds: allSelected ? [] : locations.map((l) => l.id),
    })
  }

  const applyPreset = (months: number) => {
    onChange({
      ...filters,
      dateStart: format(
        months >= 12 ? subYears(new Date(), months / 12) : subMonths(new Date(), months),
        "yyyy-MM-dd"
      ),
      dateEnd: format(new Date(), "yyyy-MM-dd"),
    })
  }

  return (
    <Filter className="flex-1">
      <Filter.Body>
        {/* Date range popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-1.5 text-sm">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(filters.dateStart)}</span>
              <span className="text-muted-foreground">→</span>
              <span>{formatDate(filters.dateEnd)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
            {/* Tab selector: Desde / Hasta */}
            <div className="grid grid-cols-2 border-b">
              <button
                type="button"
                onClick={() => setActiveCalendar("from")}
                className={cn(
                  "px-4 py-2.5 text-xs font-medium transition-colors text-center",
                  activeCalendar === "from"
                    ? "text-foreground border-b-2 border-primary bg-muted/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                )}
              >
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t("from")}</span>
                {formatDate(filters.dateStart)}
              </button>
              <button
                type="button"
                onClick={() => setActiveCalendar("to")}
                className={cn(
                  "px-4 py-2.5 text-xs font-medium transition-colors text-center",
                  activeCalendar === "to"
                    ? "text-foreground border-b-2 border-primary bg-muted/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                )}
              >
                <span className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t("to")}</span>
                {formatDate(filters.dateEnd)}
              </button>
            </div>

            {/* Calendar */}
            <div className="flex items-center justify-center">
              <CalendarComponent
                mode="single"
                selected={activeCalendar === "from" ? startDate : endDate}
                onSelect={(date) => {
                  if (!date) return
                  const formatted = format(date, "yyyy-MM-dd")
                  if (activeCalendar === "from") {
                    onChange({ ...filters, dateStart: formatted })
                    setActiveCalendar("to")
                  } else {
                    onChange({ ...filters, dateEnd: formatted })
                  }
                }}
                locale={dateFnsLocale}
                defaultMonth={activeCalendar === "from" ? startDate : endDate}
              />
            </div>

            {/* Presets */}
            <div className="border-t px-3 py-2.5">
              <div className="grid grid-cols-4 gap-1.5">
                {PRESETS.map((p) => (
                  <Button
                    key={p.label}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => applyPreset(p.months)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Locations multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {allSelected
                  ? t("allLocations")
                  : `${selectedCount} ${selectedCount === 1 ? "local" : "locales"}`}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  id="all-locations"
                />
                <Label htmlFor="all-locations" className="text-sm font-medium">
                  {t("allLocations")}
                </Label>
              </div>
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={filters.locationIds.includes(loc.id)}
                    onCheckedChange={() => toggleLocation(loc.id)}
                    id={`loc-${loc.id}`}
                  />
                  <Label
                    htmlFor={`loc-${loc.id}`}
                    className="text-sm leading-tight"
                  >
                    {loc.name}
                    <span className="text-xs text-muted-foreground ml-1">
                      {loc.city}
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Granularity */}
        <Select
          value={filters.granularity}
          onValueChange={(v) =>
            onChange({ ...filters, granularity: v as Granularity })
          }
        >
          <SelectTrigger className="w-[110px]">
            <FilterIcon className="h-4 w-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t("day")}</SelectItem>
            <SelectItem value="week">{t("week")}</SelectItem>
            <SelectItem value="month">{t("month")}</SelectItem>
          </SelectContent>
        </Select>

        {/* Loading indicator */}
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {/* Trailing slot (sync status, etc.) */}
        {trailing}
      </Filter.Body>
    </Filter>
  )
}
