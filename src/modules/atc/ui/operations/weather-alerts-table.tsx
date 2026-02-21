"use client"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/modules/shared/ui/data-table"
import { Button } from "@/modules/shared/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/modules/shared/ui/dropdown-menu"
import {
  MoreHorizontal,
  CheckCircle,
  Eye,
  CloudRain,
  Wind,
  Thermometer,
  Snowflake,
  CloudLightning,
  CloudSnow,
  CloudHail,
  CloudFog,
  Clock,
  MapPin,
} from "lucide-react"
import {
  WeatherAlertType,
  WeatherAlertSeverity,
  WeatherAlertStatus,
} from "@prisma/client"
import { updateWeatherAlertStatus } from "@/modules/atc/actions/operations"
import { toast } from "sonner"
import { useState, useMemo } from "react"
import { ResolveAlertDialog } from "./resolve-alert-dialog"
import { AffectedReservationsDialog } from "./affected-reservations-dialog"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"

type WeatherAlertRow = {
  id: string
  alertType: WeatherAlertType
  severity: WeatherAlertSeverity
  status: WeatherAlertStatus
  description: string
  location: string
  forecastDate: Date
  precipitationMm: number | null
  windSpeedKmh: number | null
  temperatureC: number | null
  actionsTaken: string | null
  resolvedBy: string | null
  createdAt: Date
}

const severityColors: Record<WeatherAlertSeverity, string> = {
  LOW:      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  MEDIUM:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  HIGH:     "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

const statusColors: Record<WeatherAlertStatus, string> = {
  ACTIVE:     "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  MONITORING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  RESOLVED:   "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  EXPIRED:    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

const alertTypeIcons: Record<WeatherAlertType, React.ElementType> = {
  RAIN:             CloudRain,
  WIND:             Wind,
  TEMPERATURE_HIGH: Thermometer,
  TEMPERATURE_LOW:  Snowflake,
  STORM:            CloudLightning,
  SNOW:             CloudSnow,
  HAIL:             CloudHail,
  FOG:              CloudFog,
}

function AlertTypeCell({ type, t }: { type: WeatherAlertType; t: (key: string) => string }) {
  const Icon = alertTypeIcons[type]
  const labelMap: Record<WeatherAlertType, string> = {
    RAIN:             t("rain"),
    WIND:             t("wind"),
    TEMPERATURE_HIGH: t("temperatureHigh"),
    TEMPERATURE_LOW:  t("temperatureLow"),
    STORM:            t("storm"),
    SNOW:             t("snow"),
    HAIL:             t("hail"),
    FOG:              t("fog"),
  }
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{labelMap[type]}</span>
    </div>
  )
}

function ActionsCell({ row }: { row: { original: WeatherAlertRow } }) {
  const alert = row.original
  const t = useTranslations("atc")
  const [resolveOpen, setResolveOpen] = useState(false)
  const [reservationsOpen, setReservationsOpen] = useState(false)

  async function handleStatusChange(status: WeatherAlertStatus) {
    const result = await updateWeatherAlertStatus(alert.id, status)
    if (result.success) {
      toast.success(t("weatherAlertResolved"))
    } else {
      toast.error(result.error)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
            <span className="sr-only">{t("actions")}</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setReservationsOpen(true)}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            {t("viewAffectedReservations")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleStatusChange("MONITORING")}
            disabled={alert.status !== "ACTIVE"}
            className="cursor-pointer"
          >
            <Clock className="mr-2 h-4 w-4 text-yellow-500" />
            {t("monitoring")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setResolveOpen(true)}
            disabled={alert.status === "RESOLVED" || alert.status === "EXPIRED"}
            className="cursor-pointer"
          >
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            {t("resolveAlert")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResolveAlertDialog
        alertId={alert.id}
        open={resolveOpen}
        onOpenChange={setResolveOpen}
      />
      <AffectedReservationsDialog
        forecastDate={alert.forecastDate}
        open={reservationsOpen}
        onOpenChange={setReservationsOpen}
      />
    </>
  )
}

function useColumns(): ColumnDef<WeatherAlertRow>[] {
  const t = useTranslations("atc")

  const severityLabels: Record<WeatherAlertSeverity, string> = {
    LOW: t("low"), MEDIUM: t("medium"), HIGH: t("high"), CRITICAL: t("critical"),
  }

  const statusLabels: Record<WeatherAlertStatus, string> = {
    ACTIVE: t("active"), MONITORING: t("monitoring"),
    RESOLVED: t("resolved"), EXPIRED: t("expired"),
  }

  return [
    {
      accessorKey: "alertType",
      header: t("alertType"),
      cell: ({ row }) => (
        <AlertTypeCell type={row.getValue("alertType")} t={t} />
      ),
    },
    {
      accessorKey: "location",
      header: t("location"),
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">{row.getValue("location")}</span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Descripción",
      cell: ({ row }) => (
        <div className="max-w-xs truncate text-sm">{row.getValue("description")}</div>
      ),
    },
    {
      accessorKey: "severity",
      header: t("severity"),
      cell: ({ row }) => {
        const severity = row.getValue("severity") as WeatherAlertSeverity
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${severityColors[severity]}`}>
            {severityLabels[severity]}
          </span>
        )
      },
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as WeatherAlertStatus
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[status]}`}>
            {statusLabels[status]}
          </span>
        )
      },
    },
    {
      accessorKey: "forecastDate",
      header: t("forecastDate"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("forecastDate"))
        return (
          <span className="text-xs text-muted-foreground">
            {date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: t("date"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return (
          <span className="text-xs text-muted-foreground">
            {date.toLocaleDateString("es-ES")}
          </span>
        )
      },
    },
    {
      id: "actions",
      enableSorting: false,
      cell: ({ row }) => <ActionsCell row={row} />,
    },
  ]
}

interface WeatherAlertsTableProps {
  data: WeatherAlertRow[]
  selectedCity?: string | null
  onClearFilter?: () => void
}

export function WeatherAlertsTable({ data, selectedCity, onClearFilter }: WeatherAlertsTableProps) {
  const t = useTranslations("atc")
  const columns = useColumns()

  const filteredData = useMemo(() => {
    if (!selectedCity) return data
    return data.filter(a => a.location === selectedCity)
  }, [data, selectedCity])

  return (
    <div>
      {selectedCity && (
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-medium text-primary">
            <MapPin className="h-3 w-3" />
            {t("filteringBy")}: {selectedCity}
            <button
              onClick={onClearFilter}
              className="ml-1 hover:bg-primary/20 rounded-full p-0.5 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        </div>
      )}
      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="description"
        searchPlaceholder="Buscar alerta..."
      />
    </div>
  )
}
