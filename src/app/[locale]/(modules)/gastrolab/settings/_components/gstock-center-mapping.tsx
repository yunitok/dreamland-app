"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/modules/shared/ui/input"
import { Button } from "@/modules/shared/ui/button"
import { Badge } from "@/modules/shared/ui/badge"
import { MapPin, Check, X } from "lucide-react"
import { updateGstockCenterMapping } from "@/modules/sherlock/actions/food-cost-sync"

interface Location {
  id: string
  name: string
  city: string
  gstockCenterId: number | null
}

interface Props {
  locations: Location[]
}

export function GstockCenterMapping({ locations }: Props) {
  const t = useTranslations("sherlock.settings")
  const [editing, setEditing] = useState<string | null>(null)
  const [value, setValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [localData, setLocalData] = useState(locations)

  const handleSave = async (locationId: string) => {
    setSaving(true)
    const centerId = value.trim() ? parseInt(value.trim()) : null
    if (value.trim() && isNaN(centerId!)) {
      setSaving(false)
      return
    }
    await updateGstockCenterMapping(locationId, centerId)
    setLocalData((prev) =>
      prev.map((l) =>
        l.id === locationId ? { ...l, gstockCenterId: centerId } : l
      )
    )
    setEditing(null)
    setSaving(false)
  }

  const mapped = localData.filter((l) => l.gstockCenterId !== null).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("centerMappingDesc")}
        </p>
        <Badge variant="secondary" className="text-xs">
          {mapped}/{localData.length}
        </Badge>
      </div>

      <div className="divide-y rounded-md border">
        {localData.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center justify-between px-3 py-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium truncate">{loc.name}</span>
              <span className="text-xs text-muted-foreground">{loc.city}</span>
            </div>

            {editing === loc.id ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="ID centro"
                  className="h-7 w-24 text-xs"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave(loc.id)
                    if (e.key === "Escape") setEditing(null)
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleSave(loc.id)}
                  disabled={saving}
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setEditing(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditing(loc.id)
                  setValue(loc.gstockCenterId?.toString() ?? "")
                }}
                className="text-xs tabular-nums hover:underline"
              >
                {loc.gstockCenterId ? (
                  <Badge variant="outline" className="text-xs font-mono">
                    #{loc.gstockCenterId}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">{t("notMapped")}</span>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
