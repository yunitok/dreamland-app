"use client"

import { cn } from "@/lib/utils"
import type { TimeSlot } from "../domain/types"
import { useTranslations } from "next-intl"

const statusConfig = {
  available: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  limited: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  full: {
    dot: "bg-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    text: "text-red-700 dark:text-red-400",
  },
} as const

export function TimeSlotCard({ slot }: { slot: TimeSlot }) {
  const t = useTranslations("walkIn")
  const config = statusConfig[slot.status]

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3",
        config.bg
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn("h-2.5 w-2.5 rounded-full", config.dot)} />
        <span className="font-mono text-base font-medium">{slot.time}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-sm font-medium", config.text)}>
          {t(slot.status)}
        </span>
        {slot.maxPartySize > 0 && (
          <span className="text-xs text-muted-foreground">
            (≤{slot.maxPartySize} {t("people")})
          </span>
        )}
      </div>
    </div>
  )
}
