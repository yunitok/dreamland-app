"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import type { ServiceAvailability } from "../domain/types"
import { TimeSlotCard } from "./time-slot-card"
import {
  Users,
  UtensilsCrossed,
  LayoutGrid,
  ChevronDown,
  Armchair,
  Footprints,
  XCircle,
  UserX,
  Unlock,
  Clock,
  ListTodo,
} from "lucide-react"
import { cn } from "@/lib/utils"

export function ServiceSection({
  service,
  isAdmin,
}: {
  service: ServiceAvailability
  isAdmin?: boolean
}) {
  const t = useTranslations("walkIn")
  const { occupancy } = service
  const hasSlots = service.slots.length > 0
  const [zonesOpen, setZonesOpen] = useState(false)

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
            {isAdmin && occupancy.totalTables > 0 && (
              <span className="ml-1">
                · {occupancy.tables}/{occupancy.totalTables} mesas
              </span>
            )}
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

      {/* Admin: reservation stats */}
      {isAdmin && service.stats && (
        <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { icon: Armchair, label: "Sentados", value: service.stats.seated, color: "text-emerald-600 dark:text-emerald-400" },
            { icon: Footprints, label: "Walk-in", value: service.stats.walkin, color: "text-blue-600 dark:text-blue-400" },
            { icon: Clock, label: "Pendientes", value: service.stats.pending, color: "text-amber-600 dark:text-amber-400" },
            { icon: ListTodo, label: "Lista espera", value: service.stats.waitingList, color: "text-violet-600 dark:text-violet-400" },
            { icon: XCircle, label: "Cancelados", value: service.stats.cancelled, color: "text-red-600 dark:text-red-400" },
            { icon: UserX, label: "No-show", value: service.stats.noshow, color: "text-red-600 dark:text-red-400" },
            { icon: Unlock, label: "Liberados", value: service.stats.released, color: "text-muted-foreground" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/40 px-2 py-1.5 text-xs"
            >
              <Icon className={cn("h-3.5 w-3.5", color)} />
              <span className={cn("font-mono text-sm font-semibold", color)}>{value}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Admin: table zones summary */}
      {isAdmin && service.tableZones && service.tableZones.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setZonesOpen(!zonesOpen)}
            className="flex w-full items-center gap-1.5 rounded-lg bg-violet-500/5 px-3 py-1.5 text-xs text-violet-600 transition-colors hover:bg-violet-500/10 dark:text-violet-400"
          >
            <LayoutGrid className="h-3 w-3" />
            <span className="font-medium">
              {service.tableZones.reduce((sum, z) => sum + z.tableCount, 0)} mesas en{" "}
              {service.tableZones.length} zona{service.tableZones.length > 1 ? "s" : ""}
            </span>
            <ChevronDown
              className={cn(
                "ml-auto h-3 w-3 transition-transform",
                zonesOpen && "rotate-180"
              )}
            />
          </button>
          {zonesOpen && (
            <div className="mt-1.5 space-y-1 pl-1">
              {service.tableZones.map((zone) => (
                <div
                  key={zone.floor}
                  className="flex items-center justify-between rounded bg-muted/40 px-3 py-1 text-xs"
                >
                  <span className="truncate text-muted-foreground">{zone.floor}</span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {zone.tableCount} mesas · {zone.minCapacity}-{zone.maxCapacity} pax
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Slots */}
      {hasSlots ? (
        <div className="space-y-2">
          {service.slots.map((slot) => (
            <TimeSlotCard key={slot.time} slot={slot} isAdmin={isAdmin} />
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
