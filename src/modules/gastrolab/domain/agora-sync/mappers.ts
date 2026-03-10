import type {
  AgoraInvoiceExport,
  AgoraInvoiceLineExport,
  AgoraPaymentExport,
  AgoraPosCloseOutExport,
  AgoraProductExport,
  AgoraFamilyExport,
} from "@/lib/agora"
import type {
  SnapshotAggregate,
  SalesByFamilyEntry,
  SalesByPaymentEntry,
  SalesByHourEntry,
  TopProductEntry,
  TaxBreakdownEntry,
} from "./types"

// ─── Agregar facturas del día en un snapshot ───────────────────

export function aggregateInvoicesToSnapshot(
  invoices: AgoraInvoiceExport[],
  closeOuts: AgoraPosCloseOutExport[],
  familyMap: Map<number, string>
): SnapshotAggregate {
  if (invoices.length === 0) {
    return emptySnapshot(closeOuts)
  }

  const totalInvoices = invoices.length
  let totalGrossAmount = 0
  let totalNetAmount = 0
  let totalAmount = 0
  let totalGuests = 0

  // Acumuladores
  const familyAcc = new Map<number, { name: string; amount: number; quantity: number }>()
  const paymentAcc = new Map<number, { name: string; amount: number; tipAmount: number }>()
  const hourAcc = new Map<number, { amount: number; invoices: number }>()
  const productAcc = new Map<number, { name: string; quantity: number; amount: number }>()
  const taxAcc = new Map<number, { netAmount: number; vatAmount: number; surchargeAmount: number }>()

  for (const inv of invoices) {
    totalGrossAmount += inv.GrossAmount ?? 0
    totalNetAmount += inv.NetAmount ?? 0
    totalAmount += inv.TotalAmount ?? 0
    totalGuests += inv.Guests ?? 0

    // Hora de la factura
    const hour = extractHour(inv.Date)
    if (hour !== null) {
      const h = hourAcc.get(hour) ?? { amount: 0, invoices: 0 }
      h.amount += inv.TotalAmount ?? 0
      h.invoices += 1
      hourAcc.set(hour, h)
    }

    // Líneas → familias y productos
    for (const line of inv.Lines ?? []) {
      accumulateLine(line, familyMap, familyAcc, productAcc)
    }

    // Pagos
    for (const pay of inv.Payments ?? []) {
      accumulatePayment(pay, paymentAcc)
    }

    // Impuestos
    for (const tax of inv.Taxes ?? []) {
      const vatKey = Math.round((tax.VatRate ?? 0) * 10000) // Key sin decimales
      const t = taxAcc.get(vatKey) ?? { netAmount: 0, vatAmount: 0, surchargeAmount: 0 }
      t.netAmount += tax.NetAmount ?? 0
      t.vatAmount += tax.VatAmount ?? 0
      t.surchargeAmount += tax.SurchargeAmount ?? 0
      taxAcc.set(vatKey, t)
    }
  }

  const avgTicket = totalInvoices > 0 ? round2(totalAmount / totalInvoices) : 0
  const avgSpendPerGuest = totalGuests > 0 ? round2(totalAmount / totalGuests) : 0

  // Cierre de caja
  const { cashExpected, cashReal, cashDifference } = aggregateCloseOuts(closeOuts)

  return {
    totalInvoices,
    totalGrossAmount: round2(totalGrossAmount),
    totalNetAmount: round2(totalNetAmount),
    totalAmount: round2(totalAmount),
    totalGuests,
    avgTicket,
    avgSpendPerGuest,
    salesByFamily: mapToSortedArray(familyAcc, (id, v) => ({
      familyId: id,
      familyName: v.name,
      amount: round2(v.amount),
      quantity: round2(v.quantity),
    })).sort((a, b) => b.amount - a.amount),
    salesByPaymentMethod: mapToSortedArray(paymentAcc, (id, v) => ({
      paymentMethodId: id,
      paymentMethodName: v.name,
      amount: round2(v.amount),
      tipAmount: round2(v.tipAmount),
    })).sort((a, b) => b.amount - a.amount),
    salesByHour: mapToSortedArray(hourAcc, (hour, v) => ({
      hour,
      amount: round2(v.amount),
      invoices: v.invoices,
    })).sort((a, b) => a.hour - b.hour),
    topProducts: mapToSortedArray(productAcc, (id, v) => ({
      productId: id,
      productName: v.name,
      quantity: round2(v.quantity),
      amount: round2(v.amount),
    }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 30),
    taxBreakdown: mapToSortedArray(taxAcc, (vatKey, v) => ({
      vatRate: vatKey / 10000,
      netAmount: round2(v.netAmount),
      vatAmount: round2(v.vatAmount),
      surchargeAmount: round2(v.surchargeAmount),
    })).sort((a, b) => a.vatRate - b.vatRate),
    cashExpected,
    cashReal,
    cashDifference,
  }
}

// ─── Mapear producto Ágora → modelo Prisma ─────────────────────

export function mapAgoraProduct(
  raw: AgoraProductExport,
  families: AgoraFamilyExport[]
) {
  const family = raw.FamilyId
    ? families.find((f) => f.Id === raw.FamilyId)
    : undefined

  // Primer precio disponible como precio principal
  const firstPrice = raw.Prices?.[0]
  const mainPrice =
    firstPrice?.MainPrice ?? firstPrice?.Price ?? null

  // Primer barcode
  const barcode =
    raw.Barcode ??
    raw.Barcodes?.[0]?.BarcodeValue ??
    raw.Barcodes?.[0]?.Value ??
    null

  // Precio de coste: global o primer almacén
  const costPrice =
    raw.CostPrice ?? raw.CostPrices?.[0]?.CostPrice ?? null

  return {
    agoraId: raw.Id,
    name: raw.Name,
    familyId: raw.FamilyId ?? null,
    familyName: family?.Name ?? null,
    vatRate: null as number | null, // Se podría enriquecer con Vats
    mainPrice,
    costPrice,
    barcode,
    isActive: !raw.DeletionDate,
  }
}

// ─── Build family map ──────────────────────────────────────────

export function buildFamilyMap(
  families: AgoraFamilyExport[]
): Map<number, string> {
  const map = new Map<number, string>()
  for (const f of families) {
    if (!f.DeletionDate) {
      map.set(f.Id, f.Name)
    }
  }
  return map
}

// ─── Helpers ───────────────────────────────────────────────────

function accumulateLine(
  line: AgoraInvoiceLineExport,
  familyMap: Map<number, string>,
  familyAcc: Map<number, { name: string; amount: number; quantity: number }>,
  productAcc: Map<number, { name: string; quantity: number; amount: number }>
) {
  // Familia
  const familyId = line.FamilyId ?? 0
  const familyName = line.FamilyName ?? familyMap.get(familyId) ?? "Sin familia"
  const fam = familyAcc.get(familyId) ?? { name: familyName, amount: 0, quantity: 0 }
  fam.amount += line.GrossAmount ?? 0
  fam.quantity += line.Quantity ?? 0
  familyAcc.set(familyId, fam)

  // Producto
  const prod = productAcc.get(line.ProductId) ?? {
    name: line.ProductName ?? `#${line.ProductId}`,
    quantity: 0,
    amount: 0,
  }
  prod.quantity += line.Quantity ?? 0
  prod.amount += line.GrossAmount ?? 0
  productAcc.set(line.ProductId, prod)
}

function accumulatePayment(
  pay: AgoraPaymentExport,
  paymentAcc: Map<number, { name: string; amount: number; tipAmount: number }>
) {
  const entry = paymentAcc.get(pay.PaymentMethodId) ?? {
    name: pay.PaymentMethodName ?? `Método #${pay.PaymentMethodId}`,
    amount: 0,
    tipAmount: 0,
  }
  entry.amount += pay.Amount ?? 0
  entry.tipAmount += pay.TipAmount ?? 0
  paymentAcc.set(pay.PaymentMethodId, entry)
}

function aggregateCloseOuts(closeOuts: AgoraPosCloseOutExport[]) {
  if (!closeOuts || closeOuts.length === 0) {
    return { cashExpected: null, cashReal: null, cashDifference: null }
  }

  // Buscar forma de pago "Efectivo" (PaymentMethodId = 1 en Ágora)
  let cashExpected = 0
  let cashReal = 0
  let cashDifference = 0
  let found = false

  for (const co of closeOuts) {
    for (const bal of co.PaymentMethodBalances ?? []) {
      if (bal.PaymentMethodId === 1) {
        found = true
        cashExpected += bal.Amount ?? 0
        cashReal += bal.RealAmount ?? bal.Amount ?? 0
        cashDifference += bal.Difference ?? 0
      }
    }
  }

  if (!found) return { cashExpected: null, cashReal: null, cashDifference: null }

  return {
    cashExpected: round2(cashExpected),
    cashReal: round2(cashReal),
    cashDifference: round2(cashDifference),
  }
}

function extractHour(dateStr: string): number | null {
  if (!dateStr) return null
  // Formato: 2024-01-15T21:30:54
  const match = dateStr.match(/T(\d{2}):/)
  if (!match) return null
  return parseInt(match[1], 10)
}

function emptySnapshot(closeOuts: AgoraPosCloseOutExport[]): SnapshotAggregate {
  const { cashExpected, cashReal, cashDifference } = aggregateCloseOuts(closeOuts)
  return {
    totalInvoices: 0,
    totalGrossAmount: 0,
    totalNetAmount: 0,
    totalAmount: 0,
    totalGuests: 0,
    avgTicket: 0,
    avgSpendPerGuest: 0,
    salesByFamily: [],
    salesByPaymentMethod: [],
    salesByHour: [],
    topProducts: [],
    taxBreakdown: [],
    cashExpected,
    cashReal,
    cashDifference,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function mapToSortedArray<K, V, R>(
  map: Map<K, V>,
  transform: (key: K, value: V) => R
): R[] {
  return Array.from(map.entries()).map(([k, v]) => transform(k, v))
}
