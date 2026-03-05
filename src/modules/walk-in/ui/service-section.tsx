"use client"

import { useTranslations } from "next-intl"
import type { ServiceAvailability } from "../domain/types"
import { TimeSlotCard } from "./time-slot-card"
import { Users, UtensilsCrossed } from "lucide-react"

export function ServiceSection({ service }: { service: ServiceAvailability }) {
  const t = useTranslations("walkIn")
  const { occupancy } = service
  const hasSlots = service.slots.length > 0

  return (
    <div className="rounded-xl border bg-card p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold uppercase tracking-wider">
            {t(service.service)}
          </h3>
        </div>
        {occupancy.totalCapacity > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>
              {occupancy.covers}/{occupancy.totalCapacity} {t("covers")}
            </span>
            <span className="ml-1 font-medium">
              ({occupancy.percentage}%)
            </span>
          </div>
        )}
      </div>

      {/* Occupancy bar */}
      {occupancy.totalCapacity > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${
              occupancy.percentage >= 90
                ? "bg-red-500"
                : occupancy.percentage >= 70
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${Math.min(occupancy.percentage, 100)}%` }}
          />
        </div>
      )}

      {/* Slots */}
      {hasSlots ? (
        <div className="space-y-2">
          {service.slots.map((slot) => (
            <TimeSlotCard key={slot.time} slot={slot} />
          ))}
        </div>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t("noSlots")}
        </p>
      )}
    </div>
  )
}
