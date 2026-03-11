"use server"

import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/actions/rbac"
import type { Granularity } from "./cover-analytics"

// ─── Tipos de respuesta ────────────────────────────────────────

export interface SalesKpiData {
  totalRevenue: number
  avgDailyRevenue: number
  avgTicket: number
  avgSpendPerGuest: number
  totalGuests: number
  totalInvoices: number
  periodDays: number
  revenueDelta: number | null
  avgTicketDelta: number | null
  totalTips: number
  totalCashDifference: number
  totalVatAmount: number
  totalGrossAmount: number
  totalNetAmount: number
}

export interface SalesTrendPoint {
  period: string
  revenue: number
  invoices: number
  avgTicket: number
}

export interface FamilySalesPoint {
  familyName: string
  amount: number
  quantity: number
  percentage: number
}

export interface TopProductPoint {
  productName: string
  quantity: number
  amount: number
}

export interface PaymentSplitPoint {
  paymentMethodName: string
  amount: number
  tipAmount: number
  percentage: number
}

export interface HourlySalesPoint {
  hour: number
  totalAmount: number
  totalInvoices: number
}

export interface CashReconciliationData {
  totalExpected: number
  totalReal: number
  totalDifference: number
  daysWithDiscrepancy: number
  details: { date: string; locationName: string; expected: number; real: number; difference: number }[]
}

export interface TaxSummaryPoint {
  vatRate: number
  netAmount: number
  vatAmount: number
  surchargeAmount: number
}

export interface LocationRankingPoint {
  locationId: string
  locationName: string
  totalRevenue: number
  avgTicket: number
  totalGuests: number
  totalInvoices: number
  cashDifference: number | null
}

export interface LocationSalesTrendPoint {
  period: string
  [locationName: string]: number | string
}

// ─── Helpers ───────────────────────────────────────────────────

function shiftDateRange(
  start: string,
  end: string
): { prevStart: string; prevEnd: string } {
  const s = new Date(start)
  const e = new Date(end)
  const diffMs = e.getTime() - s.getTime()
  const prevEnd = new Date(s.getTime() - 1)
  const prevStart = new Date(prevEnd.getTime() - diffMs)
  return {
    prevStart: prevStart.toISOString().split("T")[0],
    prevEnd: prevEnd.toISOString().split("T")[0],
  }
}

function buildWhereClause(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
) {
  return {
    ...(locationIds.length > 0 && {
      restaurantLocationId: { in: locationIds },
    }),
    businessDay: {
      gte: new Date(dateStart + "T00:00:00Z"),
      lte: new Date(dateEnd + "T00:00:00Z"),
    },
  }
}

function formatPeriod(date: Date, granularity: Granularity): string {
  const iso = date.toISOString().split("T")[0]
  if (granularity === "day") return iso
  if (granularity === "month") return iso.slice(0, 7) // YYYY-MM

  // week: lunes de la semana
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1)
  d.setUTCDate(diff)
  return d.toISOString().split("T")[0]
}

// ─── Server Actions ────────────────────────────────────────────

export async function getSalesKpis(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<SalesKpiData> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: {
      businessDay: true,
      totalAmount: true,
      totalGrossAmount: true,
      totalNetAmount: true,
      totalInvoices: true,
      totalGuests: true,
      avgTicket: true,
      cashDifference: true,
      salesByPaymentMethod: true,
      taxBreakdown: true,
    },
  })

  const periodDays = snapshots.length
  const totalRevenue = snapshots.reduce((s, r) => s + r.totalAmount, 0)
  const totalInvoices = snapshots.reduce((s, r) => s + r.totalInvoices, 0)
  const totalGuests = snapshots.reduce((s, r) => s + r.totalGuests, 0)
  const totalGrossAmount = snapshots.reduce((s, r) => s + r.totalGrossAmount, 0)
  const totalNetAmount = snapshots.reduce((s, r) => s + r.totalNetAmount, 0)
  const avgDailyRevenue = periodDays > 0 ? totalRevenue / periodDays : 0
  const avgTicket = totalInvoices > 0 ? totalRevenue / totalInvoices : 0
  const avgSpendPerGuest = totalGuests > 0 ? totalRevenue / totalGuests : 0

  // Propinas
  let totalTips = 0
  for (const s of snapshots) {
    const payments = s.salesByPaymentMethod as { tipAmount?: number }[] | null
    if (!payments) continue
    for (const p of payments) totalTips += p.tipAmount ?? 0
  }

  // Descuadre de caja
  const totalCashDifference = snapshots.reduce((s, r) => s + (r.cashDifference ?? 0), 0)

  // IVA
  let totalVatAmount = 0
  for (const s of snapshots) {
    const taxes = s.taxBreakdown as { vatAmount?: number }[] | null
    if (!taxes) continue
    for (const t of taxes) totalVatAmount += t.vatAmount ?? 0
  }

  // Deltas vs periodo anterior
  let revenueDelta: number | null = null
  let avgTicketDelta: number | null = null

  const { prevStart, prevEnd } = shiftDateRange(dateStart, dateEnd)
  const prevWhere = buildWhereClause(locationIds, prevStart, prevEnd)
  const prevSnapshots = await prisma.agoraSalesSnapshot.findMany({
    where: prevWhere,
    select: { totalAmount: true, totalInvoices: true },
  })

  if (prevSnapshots.length > 0) {
    const prevRevenue = prevSnapshots.reduce((s, r) => s + r.totalAmount, 0)
    const prevTotalInvoices = prevSnapshots.reduce((s, r) => s + r.totalInvoices, 0)
    const prevAvgTicket = prevTotalInvoices > 0 ? prevRevenue / prevTotalInvoices : 0

    if (prevRevenue > 0) {
      revenueDelta = ((totalRevenue - prevRevenue) / prevRevenue) * 100
    }
    if (prevAvgTicket > 0) {
      avgTicketDelta = ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100
    }
  }

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgDailyRevenue: Math.round(avgDailyRevenue * 100) / 100,
    avgTicket: Math.round(avgTicket * 100) / 100,
    avgSpendPerGuest: Math.round(avgSpendPerGuest * 100) / 100,
    totalGuests,
    totalInvoices,
    periodDays,
    revenueDelta: revenueDelta !== null ? Math.round(revenueDelta * 10) / 10 : null,
    avgTicketDelta: avgTicketDelta !== null ? Math.round(avgTicketDelta * 10) / 10 : null,
    totalTips: Math.round(totalTips * 100) / 100,
    totalCashDifference: Math.round(totalCashDifference * 100) / 100,
    totalVatAmount: Math.round(totalVatAmount * 100) / 100,
    totalGrossAmount: Math.round(totalGrossAmount * 100) / 100,
    totalNetAmount: Math.round(totalNetAmount * 100) / 100,
  }
}

export async function getSalesTrend(
  locationIds: string[],
  dateStart: string,
  dateEnd: string,
  granularity: Granularity
): Promise<SalesTrendPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: {
      businessDay: true,
      totalAmount: true,
      totalInvoices: true,
    },
    orderBy: { businessDay: "asc" },
  })

  // Agrupar por periodo
  const periodMap = new Map<string, { revenue: number; invoices: number }>()

  for (const s of snapshots) {
    const period = formatPeriod(s.businessDay, granularity)
    const entry = periodMap.get(period) ?? { revenue: 0, invoices: 0 }
    entry.revenue += s.totalAmount
    entry.invoices += s.totalInvoices
    periodMap.set(period, entry)
  }

  return Array.from(periodMap.entries())
    .map(([period, v]) => ({
      period,
      revenue: Math.round(v.revenue * 100) / 100,
      invoices: v.invoices,
      avgTicket: v.invoices > 0 ? Math.round((v.revenue / v.invoices) * 100) / 100 : 0,
    }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

export async function getSalesByFamily(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<FamilySalesPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: { salesByFamily: true },
  })

  // Agregar todas las familias
  const familyAcc = new Map<string, { amount: number; quantity: number }>()

  for (const s of snapshots) {
    const families = s.salesByFamily as { familyName: string; amount: number; quantity: number }[] | null
    if (!families) continue
    for (const f of families) {
      const entry = familyAcc.get(f.familyName) ?? { amount: 0, quantity: 0 }
      entry.amount += f.amount
      entry.quantity += f.quantity
      familyAcc.set(f.familyName, entry)
    }
  }

  const totalAmount = Array.from(familyAcc.values()).reduce((s, v) => s + v.amount, 0)

  return Array.from(familyAcc.entries())
    .map(([familyName, v]) => ({
      familyName,
      amount: Math.round(v.amount * 100) / 100,
      quantity: Math.round(v.quantity * 100) / 100,
      percentage: totalAmount > 0 ? Math.round((v.amount / totalAmount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export async function getTopProducts(
  locationIds: string[],
  dateStart: string,
  dateEnd: string,
  limit = 20
): Promise<TopProductPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: { topProducts: true },
  })

  const productAcc = new Map<string, { quantity: number; amount: number }>()

  for (const s of snapshots) {
    const products = s.topProducts as { productName: string; quantity: number; amount: number }[] | null
    if (!products) continue
    for (const p of products) {
      const entry = productAcc.get(p.productName) ?? { quantity: 0, amount: 0 }
      entry.quantity += p.quantity
      entry.amount += p.amount
      productAcc.set(p.productName, entry)
    }
  }

  return Array.from(productAcc.entries())
    .map(([productName, v]) => ({
      productName,
      quantity: Math.round(v.quantity * 100) / 100,
      amount: Math.round(v.amount * 100) / 100,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit)
}

export async function getPaymentMethodSplit(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<PaymentSplitPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: { salesByPaymentMethod: true },
  })

  const paymentAcc = new Map<string, { amount: number; tipAmount: number }>()

  for (const s of snapshots) {
    const payments = s.salesByPaymentMethod as { paymentMethodName: string; amount: number; tipAmount?: number }[] | null
    if (!payments) continue
    for (const p of payments) {
      const entry = paymentAcc.get(p.paymentMethodName) ?? { amount: 0, tipAmount: 0 }
      entry.amount += p.amount
      entry.tipAmount += p.tipAmount ?? 0
      paymentAcc.set(p.paymentMethodName, entry)
    }
  }

  const totalAmount = Array.from(paymentAcc.values()).reduce((s, v) => s + v.amount, 0)

  return Array.from(paymentAcc.entries())
    .map(([paymentMethodName, v]) => ({
      paymentMethodName,
      amount: Math.round(v.amount * 100) / 100,
      tipAmount: Math.round(v.tipAmount * 100) / 100,
      percentage: totalAmount > 0 ? Math.round((v.amount / totalAmount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

// ─── Nuevas Server Actions v2 ─────────────────────────────────

export async function getHourlySalesDistribution(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<HourlySalesPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: { salesByHour: true },
  })

  const hourAcc = new Map<number, { amount: number; invoices: number }>()

  for (const s of snapshots) {
    const hours = s.salesByHour as { hour: number; amount: number; invoices: number }[] | null
    if (!hours) continue
    for (const h of hours) {
      const entry = hourAcc.get(h.hour) ?? { amount: 0, invoices: 0 }
      entry.amount += h.amount
      entry.invoices += h.invoices
      hourAcc.set(h.hour, entry)
    }
  }

  return Array.from(hourAcc.entries())
    .filter(([, v]) => v.amount > 0)
    .map(([hour, v]) => ({
      hour,
      totalAmount: Math.round(v.amount * 100) / 100,
      totalInvoices: v.invoices,
    }))
    .sort((a, b) => a.hour - b.hour)
}

export async function getCashReconciliation(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<CashReconciliationData> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where: { ...where, cashExpected: { not: null } },
    select: {
      businessDay: true,
      cashExpected: true,
      cashReal: true,
      cashDifference: true,
      restaurantLocation: { select: { name: true } },
    },
    orderBy: { businessDay: "desc" },
  })

  let totalExpected = 0
  let totalReal = 0
  let totalDifference = 0
  let daysWithDiscrepancy = 0
  const details: CashReconciliationData["details"] = []

  for (const s of snapshots) {
    const expected = s.cashExpected ?? 0
    const real = s.cashReal ?? 0
    const diff = s.cashDifference ?? 0
    totalExpected += expected
    totalReal += real
    totalDifference += diff
    if (Math.abs(diff) > 50) daysWithDiscrepancy++

    details.push({
      date: s.businessDay.toISOString().split("T")[0],
      locationName: s.restaurantLocation.name,
      expected: Math.round(expected * 100) / 100,
      real: Math.round(real * 100) / 100,
      difference: Math.round(diff * 100) / 100,
    })
  }

  // Top 10 peores descuadres
  const worstDetails = details
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, 10)

  return {
    totalExpected: Math.round(totalExpected * 100) / 100,
    totalReal: Math.round(totalReal * 100) / 100,
    totalDifference: Math.round(totalDifference * 100) / 100,
    daysWithDiscrepancy,
    details: worstDetails,
  }
}

export async function getTaxSummary(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<TaxSummaryPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: { taxBreakdown: true },
  })

  const taxAcc = new Map<number, { netAmount: number; vatAmount: number; surchargeAmount: number }>()

  for (const s of snapshots) {
    const taxes = s.taxBreakdown as { vatRate: number; netAmount: number; vatAmount: number; surchargeAmount: number }[] | null
    if (!taxes) continue
    for (const t of taxes) {
      const entry = taxAcc.get(t.vatRate) ?? { netAmount: 0, vatAmount: 0, surchargeAmount: 0 }
      entry.netAmount += t.netAmount
      entry.vatAmount += t.vatAmount
      entry.surchargeAmount += t.surchargeAmount
      taxAcc.set(t.vatRate, entry)
    }
  }

  return Array.from(taxAcc.entries())
    .map(([vatRate, v]) => ({
      vatRate,
      netAmount: Math.round(v.netAmount * 100) / 100,
      vatAmount: Math.round(v.vatAmount * 100) / 100,
      surchargeAmount: Math.round(v.surchargeAmount * 100) / 100,
    }))
    .sort((a, b) => a.vatRate - b.vatRate)
}

export async function getLocationRanking(
  locationIds: string[],
  dateStart: string,
  dateEnd: string
): Promise<LocationRankingPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: {
      restaurantLocationId: true,
      totalAmount: true,
      totalInvoices: true,
      totalGuests: true,
      cashDifference: true,
      restaurantLocation: { select: { name: true } },
    },
  })

  const locAcc = new Map<string, {
    name: string
    revenue: number
    invoices: number
    guests: number
    cashDiff: number
  }>()

  for (const s of snapshots) {
    const entry = locAcc.get(s.restaurantLocationId) ?? {
      name: s.restaurantLocation.name,
      revenue: 0,
      invoices: 0,
      guests: 0,
      cashDiff: 0,
    }
    entry.revenue += s.totalAmount
    entry.invoices += s.totalInvoices
    entry.guests += s.totalGuests
    entry.cashDiff += s.cashDifference ?? 0
    locAcc.set(s.restaurantLocationId, entry)
  }

  return Array.from(locAcc.entries())
    .map(([locationId, v]) => ({
      locationId,
      locationName: v.name,
      totalRevenue: Math.round(v.revenue * 100) / 100,
      avgTicket: v.invoices > 0 ? Math.round((v.revenue / v.invoices) * 100) / 100 : 0,
      totalGuests: v.guests,
      totalInvoices: v.invoices,
      cashDifference: Math.round(v.cashDiff * 100) / 100,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

export async function getLocationSalesTrend(
  locationIds: string[],
  dateStart: string,
  dateEnd: string,
  granularity: Granularity
): Promise<LocationSalesTrendPoint[]> {
  await requirePermission("analytics", "read")

  const where = buildWhereClause(locationIds, dateStart, dateEnd)

  const snapshots = await prisma.agoraSalesSnapshot.findMany({
    where,
    select: {
      businessDay: true,
      totalAmount: true,
      restaurantLocation: { select: { name: true } },
    },
    orderBy: { businessDay: "asc" },
  })

  const groups = new Map<string, Record<string, number>>()

  for (const s of snapshots) {
    const key = formatPeriod(s.businessDay, granularity)
    const existing = groups.get(key) || {}
    const name = s.restaurantLocation.name
    existing[name] = (existing[name] || 0) + Math.round(s.totalAmount * 100) / 100
    groups.set(key, existing)
  }

  return Array.from(groups.entries())
    .map(([period, data]) => ({ period, ...data }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

export async function getAgoraRestaurantLocations() {
  await requirePermission("analytics", "read")

  return prisma.restaurantLocation.findMany({
    where: { isActive: true, agoraPosId: { not: null } },
    select: { id: true, name: true, city: true, agoraPosId: true },
    orderBy: { name: "asc" },
  })
}
