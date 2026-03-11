// ─── Tipos internos para sincronización Ágora ──────────────────

// ─── Sync Options & Report ─────────────────────────────────────

export type AgoraSyncType = "sales" | "master" | "full"

export interface AgoraSyncOptions {
  syncType: AgoraSyncType
  /** Rango de fechas para sync de ventas (YYYY-MM-DD) */
  dateStart?: string
  dateEnd?: string
  dryRun?: boolean
  verbose?: boolean
  onProgress?: (phase: string, detail: string) => void
}

export interface AgoraSyncPhase {
  name: string
  duration: number
  detail: string
}

export interface AgoraSyncReport {
  syncType: AgoraSyncType
  phases: AgoraSyncPhase[]
  snapshotsCreated: number
  snapshotsUpdated: number
  productsCreated: number
  productsUpdated: number
  familiesSynced: number
  saleCentersSynced: number
  matchedRecipes: number
  errors: string[]
  durationMs: number
}

// ─── Agregados para Snapshot ───────────────────────────────────

export interface SalesByFamilyEntry {
  familyId: number
  familyName: string
  amount: number
  quantity: number
}

export interface SalesByPaymentEntry {
  paymentMethodId: number
  paymentMethodName: string
  amount: number
  tipAmount: number
}

export interface SalesByHourEntry {
  hour: number
  amount: number
  invoices: number
}

export interface TopProductEntry {
  productId: number
  productName: string
  quantity: number
  amount: number
}

export interface TaxBreakdownEntry {
  vatRate: number
  netAmount: number
  vatAmount: number
  surchargeAmount: number
}

export interface SnapshotAggregate {
  totalInvoices: number
  totalGrossAmount: number
  totalNetAmount: number
  totalAmount: number
  totalGuests: number
  avgTicket: number
  avgSpendPerGuest: number
  salesByFamily: SalesByFamilyEntry[]
  salesByPaymentMethod: SalesByPaymentEntry[]
  salesByHour: SalesByHourEntry[]
  topProducts: TopProductEntry[]
  taxBreakdown: TaxBreakdownEntry[]
  cashExpected: number | null
  cashReal: number | null
  cashDifference: number | null
}
