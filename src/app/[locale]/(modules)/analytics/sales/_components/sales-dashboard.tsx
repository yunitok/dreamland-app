"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { format, subMonths } from "date-fns"
import Link from "next/link"
import { BarChart3, Settings } from "lucide-react"
import { AnalyticsFilters, type FilterState } from "../../covers/_components/analytics-filters"
import { SalesKpiCards } from "./sales-kpi-cards"
import { SecondaryKpiCards } from "./secondary-kpi-cards"
import { SalesTrendChart } from "./sales-trend-chart"
import { FamilySalesChart } from "./family-sales-chart"
import { TopProductsTable } from "./top-products-table"
import { PaymentMethodChart } from "./payment-method-chart"
import { HourlySalesChart } from "./hourly-sales-chart"
import { CashReconciliationCard } from "./cash-reconciliation-card"
import { TaxBreakdownTable } from "./tax-breakdown-table"
import { LocationRankingTable } from "./location-ranking-table"
import { LocationSalesComparison } from "./location-sales-comparison"
import { Card } from "@/modules/shared/ui/card"
import { Button } from "@/modules/shared/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/modules/shared/ui/tabs"
import {
  getSalesKpis,
  getSalesTrend,
  getSalesByFamily,
  getTopProducts,
  getPaymentMethodSplit,
  getHourlySalesDistribution,
  getCashReconciliation,
  getTaxSummary,
  getLocationRanking,
  getLocationSalesTrend,
  type SalesKpiData,
  type SalesTrendPoint,
  type FamilySalesPoint,
  type TopProductPoint,
  type PaymentSplitPoint,
  type HourlySalesPoint,
  type CashReconciliationData,
  type TaxSummaryPoint,
  type LocationRankingPoint,
  type LocationSalesTrendPoint,
} from "@/modules/analytics/actions/agora-analytics"

interface Props {
  locations: { id: string; name: string; city: string; agoraPosId: number | null }[]
}

export function SalesDashboard({ locations }: Props) {
  const [filters, setFilters] = useState<FilterState>({
    dateStart: format(subMonths(new Date(), 1), "yyyy-MM-dd"),
    dateEnd: format(new Date(), "yyyy-MM-dd"),
    locationIds: locations.map((l) => l.id),
    granularity: "day",
  })

  // Estado datos
  const [kpis, setKpis] = useState<SalesKpiData | null>(null)
  const [trend, setTrend] = useState<SalesTrendPoint[]>([])
  const [families, setFamilies] = useState<FamilySalesPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProductPoint[]>([])
  const [payments, setPayments] = useState<PaymentSplitPoint[]>([])
  const [hourly, setHourly] = useState<HourlySalesPoint[]>([])
  const [cashRecon, setCashRecon] = useState<CashReconciliationData | null>(null)
  const [taxSummary, setTaxSummary] = useState<TaxSummaryPoint[]>([])
  const [locationRanking, setLocationRanking] = useState<LocationRankingPoint[]>([])
  const [locationTrend, setLocationTrend] = useState<LocationSalesTrendPoint[]>([])
  const [isPending, startTransition] = useTransition()

  const hasMultipleLocations = filters.locationIds.length >= 2
  const hasCashData = cashRecon !== null && (cashRecon.totalExpected !== 0 || cashRecon.totalReal !== 0)

  const fetchData = useCallback(() => {
    startTransition(async () => {
      const { locationIds, dateStart, dateEnd, granularity } = filters
      if (locationIds.length === 0) return

      const promises: Promise<unknown>[] = [
        getSalesKpis(locationIds, dateStart, dateEnd),
        getSalesTrend(locationIds, dateStart, dateEnd, granularity),
        getSalesByFamily(locationIds, dateStart, dateEnd),
        getTopProducts(locationIds, dateStart, dateEnd, 20),
        getPaymentMethodSplit(locationIds, dateStart, dateEnd),
        getHourlySalesDistribution(locationIds, dateStart, dateEnd),
        getCashReconciliation(locationIds, dateStart, dateEnd),
        getTaxSummary(locationIds, dateStart, dateEnd),
      ]

      // Solo cargar datos por local si hay 2+ locales
      if (locationIds.length >= 2) {
        promises.push(
          getLocationRanking(locationIds, dateStart, dateEnd),
          getLocationSalesTrend(locationIds, dateStart, dateEnd, granularity)
        )
      }

      const results = await Promise.all(promises)

      setKpis(results[0] as SalesKpiData)
      setTrend(results[1] as SalesTrendPoint[])
      setFamilies(results[2] as FamilySalesPoint[])
      setTopProducts(results[3] as TopProductPoint[])
      setPayments(results[4] as PaymentSplitPoint[])
      setHourly(results[5] as HourlySalesPoint[])
      setCashRecon(results[6] as CashReconciliationData)
      setTaxSummary(results[7] as TaxSummaryPoint[])

      if (locationIds.length >= 2) {
        setLocationRanking(results[8] as LocationRankingPoint[])
        setLocationTrend(results[9] as LocationSalesTrendPoint[])
      } else {
        setLocationRanking([])
        setLocationTrend([])
      }
    })
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Empty state: no hay restaurantes vinculados a Agora
  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 max-w-md mx-auto text-center">
        <Card className="rounded-xl border p-10 w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-muted">
              <BarChart3 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">
              No hay datos de ventas
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para ver las analiticas de ventas, primero sincroniza los datos
              desde Agora TPV en la configuracion de GastroLab. Necesitas
              ejecutar al menos un sync de maestros para vincular los
              restaurantes.
            </p>
            <Button asChild className="mt-2">
              <Link href="/gastrolab/settings">
                <Settings className="mr-2 h-4 w-4" />
                Ir a configuracion
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Empty state: hay locales pero los datos estan vacios
  const hasNoData = !isPending && kpis && kpis.totalInvoices === 0 && kpis.totalRevenue === 0

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto">
      {/* Filtros */}
      <AnalyticsFilters
        locations={locations}
        filters={filters}
        onChange={setFilters}
        isPending={isPending}
      />

      {hasNoData ? (
        <Card className="rounded-xl border p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 rounded-full bg-muted">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              Sin datos en el periodo seleccionado
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              No se encontraron ventas para las fechas y locales seleccionados.
              Sincroniza mas dias desde la configuracion de GastroLab o ajusta
              los filtros.
            </p>
            <Button variant="outline" asChild size="sm">
              <Link href="/gastrolab/settings">
                <Settings className="mr-2 h-4 w-4" />
                Configuracion de sync
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* KPIs principales */}
          <SalesKpiCards data={kpis} isPending={isPending} />

          {/* KPIs secundarios */}
          <SecondaryKpiCards data={kpis} isPending={isPending} />

          {/* Tabs */}
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="locales" disabled={!hasMultipleLocations}>
                Por Local
              </TabsTrigger>
              <TabsTrigger value="fiscal">
                {hasCashData ? "Caja y Fiscal" : "Fiscal"}
              </TabsTrigger>
            </TabsList>

            {/* Tab General */}
            <TabsContent value="general" className="mt-4 space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <SalesTrendChart
                  data={trend}
                  granularity={filters.granularity}
                  className="lg:col-span-2"
                />
                <FamilySalesChart data={families} />
                <PaymentMethodChart data={payments} />
                <HourlySalesChart data={hourly} />
                <TopProductsTable data={topProducts} />
              </div>
            </TabsContent>

            {/* Tab Por Local */}
            <TabsContent value="locales" className="mt-4 space-y-6">
              <LocationSalesComparison
                data={locationTrend}
                locations={locations.filter((l) =>
                  filters.locationIds.includes(l.id)
                )}
              />
              <LocationRankingTable data={locationRanking} />
            </TabsContent>

            {/* Tab Caja & Fiscal */}
            <TabsContent value="fiscal" className="mt-4">
              <div className={hasCashData ? "grid gap-6 lg:grid-cols-2" : ""}>
                {hasCashData && <CashReconciliationCard data={cashRecon} />}
                <TaxBreakdownTable data={taxSummary} />
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
