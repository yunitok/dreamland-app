"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import type { TimeSlot } from "../domain/types"
import { useTranslations } from "next-intl"
import { ChevronDown, Clock, ArrowRight, Users, MapPin } from "lucide-react"

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

export function TimeSlotCard({
  slot,
  isAdmin,
}: {
  slot: TimeSlot
  isAdmin?: boolean
}) {
  const t = useTranslations("walkIn")
  const config = statusConfig[slot.status]
  const [expanded, setExpanded] = useState(false)

  return (
    <div>
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border px-4 py-3",
          config.bg,
          isAdmin && "cursor-pointer select-none"
        )}
        onClick={isAdmin ? () => setExpanded(!expanded) : undefined}
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
          {isAdmin && (
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
          )}
        </div>
      </div>

      {/* Debug panel */}
      {isAdmin && expanded && (
        <div className="ml-5 mt-1 space-y-1 rounded-b-lg border border-t-0 bg-muted/30 px-4 py-2.5 text-xs">
          {slot.availableMinutes != null && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span>
                <span className="font-medium">{slot.availableMinutes} min</span> disponibles
                {slot.availableMinutes >= 90 && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400">(reserva estándar)</span>
                )}
                {slot.availableMinutes >= 45 && slot.availableMinutes < 90 && (
                  <span className="ml-1 text-amber-600 dark:text-amber-400">(mesa corta)</span>
                )}
                {slot.availableMinutes < 45 && (
                  <span className="ml-1 text-red-600 dark:text-red-400">(insuficiente)</span>
                )}
              </span>
            </div>
          )}
          {slot.consecutiveUntil && (
            <div className="flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>
                Ventana: {slot.time} → {slot.consecutiveUntil}
              </span>
            </div>
          )}
          {slot.partySizes && slot.partySizes.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span>Grupos: {slot.partySizes.join(", ")} personas</span>
            </div>
          )}
          {/* Zonas disponibles */}
          {slot.zones && slot.zones.length > 0 && (
            <div className="mt-1.5 border-t border-border/50 pt-1.5">
              <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="font-medium">Zonas con disponibilidad:</span>
              </div>
              <div className="space-y-0.5 pl-4">
                {slot.zones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {zone.name}
                    </span>
                    {zone.tableCount > 0 && (
                      <span className="text-muted-foreground">
                        {zone.tableCount} mesas · {zone.minCapacity}-{zone.maxCapacity} pax
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
