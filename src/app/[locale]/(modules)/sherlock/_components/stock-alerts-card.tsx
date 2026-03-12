"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle, PackageMinus, Clock, PackageX } from "lucide-react"
import { Badge } from "@/modules/shared/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/shared/ui/card"
import {
  getStockAlerts,
  type StockAlertsSummary,
} from "@/modules/sherlock/actions/stock-alerts"
import { cn } from "@/lib/utils"

interface Props {
  title: string
  description: string
}

export function StockAlertsCard({ title, description }: Props) {
  const t = useTranslations("sherlock.alerts")
  const [data, setData] = useState<StockAlertsSummary | null>(null)

  useEffect(() => {
    getStockAlerts(7).then(setData)
  }, [])

  const hasAlerts = data && data.totalAlerts > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          {title}
          {data && (
            <Badge
              variant={hasAlerts ? "destructive" : "secondary"}
              className="ml-auto text-xs"
            >
              {data.totalAlerts}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {!data ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        ) : !hasAlerts ? (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            {t("noAlerts")}
          </div>
        ) : (
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {/* Sin Stock */}
            {data.outOfStock.length > 0 && (
              <AlertSection
                icon={PackageX}
                label={t("outOfStock")}
                count={data.outOfStock.length}
                variant="destructive"
              >
                {data.outOfStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                  >
                    <span className="font-medium truncate mr-2">
                      {item.name}
                    </span>
                    <span className="text-xs text-red-600 font-medium whitespace-nowrap">
                      0 {item.unitAbbreviation}
                    </span>
                  </div>
                ))}
              </AlertSection>
            )}

            {/* Bajo Mínimo */}
            {data.lowStock.length > 0 && (
              <AlertSection
                icon={PackageMinus}
                label={t("lowStock")}
                count={data.lowStock.length}
                variant="warning"
              >
                {data.lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                  >
                    <span className="truncate mr-2">{item.name}</span>
                    <div className="flex items-center gap-2 whitespace-nowrap text-xs">
                      <span className="text-amber-600 font-medium">
                        {item.currentStock} / {item.minStock}{" "}
                        {item.unitAbbreviation}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1 py-0 text-red-600 border-red-200"
                      >
                        -{item.deficit.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </AlertSection>
            )}

            {/* Próximos a Caducar */}
            {data.expiringItems.length > 0 && (
              <AlertSection
                icon={Clock}
                label={t("expiringSoon")}
                count={data.expiringItems.length}
                variant="warning"
              >
                {data.expiringItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm py-1.5 border-b last:border-0"
                  >
                    <div className="truncate mr-2">
                      <span>{item.ingredientName}</span>
                      {item.lotNumber && (
                        <span className="text-xs text-muted-foreground ml-1">
                          #{item.lotNumber}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 whitespace-nowrap text-xs">
                      <span className="text-muted-foreground">
                        {item.quantity} {item.unitAbbreviation}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1 py-0",
                          item.daysLeft <= 2
                            ? "text-red-600 border-red-200"
                            : "text-amber-600 border-amber-200"
                        )}
                      >
                        {item.daysLeft}d
                      </Badge>
                    </div>
                  </div>
                ))}
              </AlertSection>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AlertSection({
  icon: Icon,
  label,
  count,
  variant,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  variant: "destructive" | "warning"
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon
          className={cn(
            "h-3.5 w-3.5",
            variant === "destructive" ? "text-red-500" : "text-amber-500"
          )}
        />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Badge
          variant="secondary"
          className="text-[10px] px-1 py-0 ml-auto"
        >
          {count}
        </Badge>
      </div>
      {children}
    </div>
  )
}
