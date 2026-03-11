"use client"

import { Minus, Plus, Users, X } from "lucide-react"
import { useTranslations } from "next-intl"

interface PartySizePickerProps {
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
}

export function PartySizePicker({
  value,
  onChange,
  min = 1,
  max = 12,
}: PartySizePickerProps) {
  const t = useTranslations("walkIn")

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      {value === null ? (
        <button
          onClick={() => onChange(2)}
          className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80"
        >
          {t("partySizeAll")}
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChange(value <= min ? null : value - 1)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
            aria-label={t("partySizeDecrease")}
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
            {value} {t("people")}
          </span>
          <button
            onClick={() => onChange(Math.min(value + 1, max))}
            disabled={value >= max}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 disabled:opacity-40"
            aria-label={t("partySizeIncrease")}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onChange(null)}
            className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/80"
            aria-label={t("partySizeClear")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
