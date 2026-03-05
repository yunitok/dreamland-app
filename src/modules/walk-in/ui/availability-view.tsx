"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { MapPin, RefreshCw, Info, CalendarDays } from "lucide-react"
import type { WalkInAvailability } from "../domain/types"
import { ServiceSection } from "./service-section"

const AUTO_REFRESH_MS = 45_000

interface AvailabilityViewProps {
  slug: string
  restaurantName: string
  restaurantAddress: string
  restaurantCity: string
}

export function AvailabilityView({
  slug,
  restaurantName,
  restaurantAddress,
  restaurantCity,
}: AvailabilityViewProps) {
  const t = useTranslations("walkIn")
  const [data, setData] = useState<WalkInAvailability | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedDate, setSelectedDate] = useState<"today" | "tomorrow">("today")

  const getDateString = useCallback((which: "today" | "tomorrow") => {
    const d = new Date()
    if (which === "tomorrow") d.setDate(d.getDate() + 1)
    return d.toISOString().split("T")[0]
  }, [])

  const fetchAvailability = useCallback(async () => {
    try {
      setError(false)
      const date = getDateString(selectedDate)
      const res = await fetch(`/api/walk-in/availability/${slug}?date=${date}`)
      if (!res.ok) throw new Error("fetch failed")
      const json: WalkInAvailability = await res.json()
      setData(json)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [slug, selectedDate, getDateString])

  // Initial fetch + auto-refresh
  useEffect(() => {
    setLoading(true)
    fetchAvailability()
    const interval = setInterval(fetchAvailability, AUTO_REFRESH_MS)
    return () => clearInterval(interval)
  }, [fetchAvailability])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00")
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }

  const hasLimitedSlots = data?.services.some((s) =>
    s.slots.some((slot) => slot.status === "limited")
  )

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      {/* Restaurant header */}
      <div className="border-b bg-card px-5 pb-5 pt-8">
        <h1 className="text-xl font-bold">{restaurantName}</h1>
        {(restaurantAddress || restaurantCity) && (
          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span>
              {[restaurantAddress, restaurantCity].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Date selector */}
      <div className="flex items-center gap-2 border-b bg-card px-5 py-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDate("today")}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              selectedDate === "today"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("today")}
          </button>
          <button
            onClick={() => setSelectedDate("tomorrow")}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              selectedDate === "tomorrow"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t("tomorrow")}
          </button>
        </div>
        {data && (
          <span className="ml-auto text-xs capitalize text-muted-foreground">
            {formatDate(data.date)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {loading && !data ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-sm text-red-700 dark:text-red-400">{t("error")}</p>
            <button
              onClick={fetchAvailability}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("refresh")}
            </button>
          </div>
        ) : data ? (
          <>
            {data.services.map((service) => (
              <ServiceSection key={service.service} service={service} />
            ))}

            {/* Short table hint */}
            {hasLimitedSlots && (
              <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {t("shortTableHint")}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="flex gap-2 rounded-xl border bg-muted/50 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
            </div>

            {/* Last updated */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" />
              <span>
                {t("autoRefresh")} &middot; {t("lastUpdated")}{" "}
                {new Date(data.lastUpdated).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border bg-card p-4">
          <div className="mb-3 h-4 w-24 rounded bg-muted" />
          <div className="mb-3 h-1.5 w-full rounded-full bg-muted" />
          <div className="space-y-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="h-12 rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
