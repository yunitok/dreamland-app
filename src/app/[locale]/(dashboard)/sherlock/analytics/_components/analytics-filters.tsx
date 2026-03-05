"use client"

import { useTranslations } from "next-intl"
import { Button } from "@/modules/shared/ui/button"
import { Card } from "@/modules/shared/ui/card"
import { Input } from "@/modules/shared/ui/input"
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
import { Label } from "@/modules/shared/ui/label"
import { Calendar, MapPin, Filter, Loader2 } from "lucide-react"
import { format, subMonths, subYears } from "date-fns"
import type { Granularity } from "@/modules/sherlock/actions/cover-analytics"

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
}

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
}: Props) {
  const t = useTranslations("sherlock.analytics.filters")

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
    <Card className="flex-1 p-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={filters.dateStart}
              onChange={(e) =>
                onChange({ ...filters, dateStart: e.target.value })
              }
              className="h-8 w-[130px] text-xs"
            />
            <span className="text-muted-foreground text-xs">→</span>
            <Input
              type="date"
              value={filters.dateEnd}
              onChange={(e) =>
                onChange({ ...filters, dateEnd: e.target.value })
              }
              className="h-8 w-[130px] text-xs"
            />
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p.months}
              variant="outline"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => applyPreset(p.months)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {/* Locations multi-select */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-xs">
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
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <Filter className="h-3.5 w-3.5 mr-1" />
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
      </div>
    </Card>
  )
}
