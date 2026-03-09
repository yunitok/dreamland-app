// ─── Ágora TPV API Client ──────────────────────────────────────
// Autenticación: Header Api-Token
// Base URL: http://{server}:8984
// Docs: Guía del Integrador v8.6.1

// ─── Types ─────────────────────────────────────────────────────

export interface AgoraApiResponse<T = unknown> {
  data: T
  httpStatus: number
  apiVersion?: string
}

// ─── Rate Limiting Config ─────────────────────────────────────

export const AGORA_RATE_CONFIG = {
  /** Delay entre llamadas API secuenciales (ms) */
  delayBetweenCalls: parseInt(process.env.AGORA_RATE_DELAY_MS ?? "1500"),
  /** Timeout para exportación de ventas (ms) — respuestas grandes */
  salesTimeout: parseInt(process.env.AGORA_SALES_TIMEOUT_MS ?? "30000"),
  /** Timeout para peticiones generales (ms) */
  defaultTimeout: parseInt(process.env.AGORA_DEFAULT_TIMEOUT_MS ?? "15000"),
  /** Máximo reintentos por petición */
  maxRetries: parseInt(process.env.AGORA_MAX_RETRIES ?? "3"),
  /** Delay base para backoff exponencial (ms) */
  retryBaseDelay: 2000,
}

/** Aplica el delay configurado entre llamadas API */
export function agoraDelay(): Promise<void> {
  return new Promise((r) => setTimeout(r, AGORA_RATE_CONFIG.delayBetweenCalls))
}

// ─── Config ────────────────────────────────────────────────────

function getAgoraConfig() {
  const baseUrl = process.env.AGORA_API_URL
  const apiToken = process.env.AGORA_API_TOKEN

  if (!baseUrl || !apiToken) {
    throw new Error(
      "AGORA_API_URL and AGORA_API_TOKEN must be set in environment variables"
    )
  }

  // Quitar trailing slash si lo tiene
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiToken }
}

// ─── Retry con Backoff ────────────────────────────────────────

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes("timeout") ||
      msg.includes("abort") ||
      msg.includes("econnreset") ||
      msg.includes("econnrefused") ||
      msg.includes("fetch failed")
    )
  }
  return false
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const { maxRetries, retryBaseDelay } = AGORA_RATE_CONFIG

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok && isRetryableStatus(response.status) && attempt < maxRetries) {
        const delay = retryBaseDelay * Math.pow(2, attempt)
        console.warn(
          `[agora] HTTP ${response.status} en ${url} — reintento ${attempt + 1}/${maxRetries} en ${delay}ms`
        )
        await new Promise((r) => setTimeout(r, delay))
        continue
      }

      return response
    } catch (err) {
      if (isRetryableError(err) && attempt < maxRetries) {
        const delay = retryBaseDelay * Math.pow(2, attempt)
        console.warn(
          `[agora] Error de red en ${url} — reintento ${attempt + 1}/${maxRetries} en ${delay}ms: ${err instanceof Error ? err.message : err}`
        )
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }

  throw new Error(`[agora] Todos los reintentos agotados para ${url}`)
}

// ─── Fetch Helpers ─────────────────────────────────────────────

export async function fetchAgora<T = unknown>(
  endpoint: string,
  params?: Record<string, string>,
  options?: { timeout?: number }
): Promise<AgoraApiResponse<T>> {
  const { baseUrl, apiToken } = getAgoraConfig()
  const timeoutMs = options?.timeout ?? AGORA_RATE_CONFIG.defaultTimeout

  const url = new URL(`${baseUrl}/${endpoint}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value)
      }
    }
  }

  const response = await fetchWithRetry(
    url.toString(),
    {
      method: "GET",
      headers: {
        "Api-Token": apiToken,
        Accept: "application/json",
      },
    },
    timeoutMs
  )

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Ágora API HTTP ${response.status}: ${response.statusText}${body ? ` — ${body.slice(0, 200)}` : ""}`
    )
  }

  const data = (await response.json()) as T
  const apiVersion = response.headers.get("Api-Version") ?? undefined

  return { data, httpStatus: response.status, apiVersion }
}

export async function postAgora<T = unknown>(
  endpoint: string,
  body: unknown,
  options?: { timeout?: number }
): Promise<AgoraApiResponse<T>> {
  const { baseUrl, apiToken } = getAgoraConfig()
  const timeoutMs = options?.timeout ?? AGORA_RATE_CONFIG.defaultTimeout

  const response = await fetchWithRetry(
    `${baseUrl}/${endpoint}`,
    {
      method: "POST",
      headers: {
        "Api-Token": apiToken,
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(body),
    },
    timeoutMs
  )

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(
      `Ágora API POST ${response.status}: ${response.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`
    )
  }

  const data = (await response.json()) as T
  const apiVersion = response.headers.get("Api-Version") ?? undefined

  return { data, httpStatus: response.status, apiVersion }
}

// ─── Funciones Específicas ─────────────────────────────────────

/** Exportar ventas de un día de negocio (facturas, cierres, pedidos, albaranes) */
export async function fetchAgoraSales(
  businessDay: string,
  filter?: string,
  options?: { includeProcessed?: boolean; workplaces?: string }
) {
  const params: Record<string, string> = {
    "business-day": businessDay,
  }
  if (filter) params.filter = filter
  if (options?.includeProcessed) params["include-processed"] = "true"
  if (options?.workplaces) params.workplaces = options.workplaces

  return fetchAgora<AgoraExportResponse>("api/export/", params, {
    timeout: AGORA_RATE_CONFIG.salesTimeout,
  })
}

/** Exportar datos maestros (productos, familias, centros de venta, stocks…) */
export async function fetchAgoraMaster(filter?: string) {
  const params: Record<string, string> = {}
  if (filter) params.filter = filter

  return fetchAgora<AgoraMasterResponse>("api/export-master/", params)
}

/** Exportar tickets abiertos */
export async function fetchAgoraOpenTickets(params?: {
  saleCenterId?: number
  saleLocationName?: string
  ticketGlobalId?: string
  ticketBarcode?: string
}) {
  const queryParams: Record<string, string> = {}
  if (params?.saleCenterId)
    queryParams["sale-center-id"] = String(params.saleCenterId)
  if (params?.saleLocationName)
    queryParams["sale-location-name"] = params.saleLocationName
  if (params?.ticketGlobalId)
    queryParams["ticket-global-id"] = params.ticketGlobalId
  if (params?.ticketBarcode)
    queryParams["ticket-barcode"] = params.ticketBarcode

  return fetchAgora<AgoraTicket[]>("api/export/tickets/", queryParams)
}

/** Marcar documentos como procesados */
export async function markAgoraDocProcessed(
  docs: { Serie: string; Number: number }[]
) {
  return postAgora<void>("api/doc/processed", docs)
}

/** Obtener imágenes de productos (máx 20 IDs) */
export async function fetchAgoraProductImages(productIds: number[]) {
  if (productIds.length > 20) {
    throw new Error("Ágora: máximo 20 productos por petición de imágenes")
  }
  return fetchAgora<AgoraProductImage[]>(
    `api/export-master/product-images/`,
    { products: JSON.stringify(productIds) }
  )
}

/** Test de conexión: obtiene series (lightweight) */
export async function testAgoraConnection(): Promise<{
  ok: boolean
  error?: string
  apiVersion?: string
}> {
  try {
    const result = await fetchAgoraMaster("Series")
    return { ok: true, apiVersion: result.apiVersion }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// ─── Response Types ────────────────────────────────────────────
// Tipos simplificados de las respuestas de Ágora.
// Los tipos completos están en domain/agora-sync/types.ts

export interface AgoraExportResponse {
  Invoices?: AgoraInvoiceExport[]
  DeliveryNotes?: unknown[]
  SalesOrders?: unknown[]
  PosCloseOuts?: AgoraPosCloseOutExport[]
  SystemCloseOuts?: unknown[]
  CashTransactions?: unknown[]
  PurchaseOrders?: unknown[]
  IncomingDeliveryNotes?: unknown[]
  PurchaseInvoices?: unknown[]
}

export interface AgoraMasterResponse {
  Series?: unknown
  Customers?: unknown[]
  Users?: unknown[]
  Vats?: unknown[]
  PaymentMethods?: unknown[]
  PriceLists?: unknown[]
  SaleCenters?: AgoraSaleCenterExport[]
  Families?: AgoraFamilyExport[]
  Products?: AgoraProductExport[]
  Menus?: unknown[]
  Offers?: unknown[]
  Suppliers?: unknown[]
  Warehouses?: unknown[]
  Stocks?: AgoraStockExport[]
  PredefinedNotes?: unknown[]
  WorkplacesSummary?: AgoraWorkplaceExport[]
}

// ─── Export-level Types (respuestas directas de la API) ────────

export interface AgoraFamilyExport {
  Id: number
  Name: string
  ParentFamilyId?: number | null
  Color?: string
  ButtonText?: string
  Order?: number
  ShowInPos?: boolean | string
  DeletionDate?: string
}

export interface AgoraProductExport {
  Id: number
  Name: string
  BaseSaleFormatId?: number
  FamilyId?: number | null
  VatId: number
  ButtonText?: string
  Color?: string
  Barcode?: string
  PLU?: string
  Order?: number
  UseAsDirectSale?: boolean
  SaleableAsMain?: boolean
  SaleableAsAddin?: boolean
  IsSoldByWeight?: boolean
  CostPrice?: number
  PreparationTypeId?: number | null
  PreparationOrderId?: number | null
  IsMenu?: boolean
  DeletionDate?: string
  Barcodes?: { BarcodeValue?: string; Value?: string }[]
  Prices?: {
    PriceListId: number
    Price?: number
    MainPrice?: number
    AddinPrice?: number | null
    MenuItemPrice?: number
  }[]
  CostPrices?: { WarehouseId: number; CostPrice: number }[]
  StorageOptions?: {
    WarehouseId: number
    Location?: string
    MinStock?: number
    MaxStock?: number
  }[]
}

export interface AgoraSaleCenterExport {
  Id: number
  Name: string
  PriceListId: number
  CurrentPriceListId?: number
  VatIncluded: boolean
  ButtonText?: string
  Color?: string
  Priority?: number
  StartTakeOutOrder?: boolean
  WhenAskForGuests?: string
  WhenAskForFriendlyName?: string
  SaleLocations: { Name: string }[]
  DeletionDate?: string
}

export interface AgoraInvoiceExport {
  Serie: string
  Number: number
  GlobalId: string
  Date: string
  BusinessDay: string
  PosId: number
  PosName?: string
  UserId: number
  UserName?: string
  CustomerId?: number | null
  CustomerName?: string
  SaleCenterId: number
  SaleCenterName?: string
  SaleLocationName?: string
  Guests?: number
  GrossAmount: number
  NetAmount: number
  TotalAmount: number
  ServiceCharge?: { GrossAmount: number; NetAmount: number }
  ProcessedDate?: string | null
  Lines: AgoraInvoiceLineExport[]
  Payments: AgoraPaymentExport[]
  Taxes: AgoraTaxExport[]
  /** Workplace.Id del restaurante (inyectado por normalizeAgoraInvoices) */
  WorkplaceId?: number
  WorkplaceName?: string
}

export interface AgoraInvoiceLineExport {
  ProductId: number
  ProductName: string
  SaleFormatId?: number
  SaleFormatName?: string
  FamilyId?: number
  FamilyName?: string
  Quantity: number
  UnitPrice: number
  GrossAmount: number
  NetAmount: number
  DiscountRate?: number
  VatRate?: number
  PreparationNotes?: string
  PreparationOrderId?: number
  PreparationOrderName?: string
  IsAddin?: boolean
  ParentLineId?: number
  PriceListId?: number
  SizeId?: number
  ColorId?: number
  RemovedIngredients?: { Id: number; Name: string }[]
}

export interface AgoraPaymentExport {
  PaymentMethodId: number
  PaymentMethodName: string
  Amount: number
  PaidAmount?: number
  ChangeAmount?: number
  TipAmount?: number
  ExtraInformation?: string
  IsPrepayment?: boolean
}

export interface AgoraTaxExport {
  VatRate: number
  NetAmount: number
  VatAmount: number
  SurchargeAmount?: number
  GrossAmount?: number
}

export interface AgoraPosCloseOutExport {
  PosId: number
  PosName: string
  BusinessDay: string
  Date: string
  PaymentMethodBalances?: {
    PaymentMethodId: number
    PaymentMethodName: string
    Amount: number
    TipAmount: number
    RealAmount?: number
    Difference?: number
  }[]
}

export interface AgoraStockExport {
  ProductId: number
  ProductName?: string
  WarehouseId: number
  WarehouseName?: string
  CurrentStock: number
  MinStock?: number
  MaxStock?: number
}

export interface AgoraTicket {
  GlobalId: string
  PosId: number
  PosName?: string
  SaleCenterId: number
  SaleCenterName?: string
  SaleLocationName?: string
  UserId: number
  UserName?: string
  Date: string
  Guests?: number
  Lines?: AgoraInvoiceLineExport[]
  Payments?: AgoraPaymentExport[]
  TotalAmount?: number
}

export interface AgoraProductImage {
  ProductId: number
  Image?: string // Base64
}

export interface AgoraWorkplaceExport {
  Id: number
  Name: string
  PosGroups: {
    Id: number
    Name: string
    PointsOfSale: {
      Id: number
      Name: string
      DeletionDate?: string
    }[]
  }[]
  Warehouses?: { Id: number; Name: string; DeletionDate?: string }[]
}

// ─── Normalización de respuestas API ──────────────────────
// La API de Agora devuelve una estructura anidada diferente a la plana
// que nuestros mappers esperan. Esta función normaliza.

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Normaliza facturas de la API de Agora (estructura anidada) al formato
 * plano que usan nuestros mappers.
 *
 * Estructura real de Agora:
 *   { Pos: {Id,Name}, Workplace: {Id,Name}, InvoiceItems: [{Lines,Payments,Totals,Guests,SaleCenter}], Totals: {GrossAmount,...}, Payments: [...] }
 *
 * Formato plano esperado:
 *   { PosId, WorkplaceId, GrossAmount, Lines: [...], Payments: [...], Taxes: [...], Guests }
 */
export function normalizeAgoraInvoices(raw: any[]): AgoraInvoiceExport[] {
  return raw.map((inv) => {
    // Detectar si ya está en formato plano (tiene PosId directo)
    if (typeof inv.PosId === "number") return inv as AgoraInvoiceExport

    const items: any[] = inv.InvoiceItems ?? []

    // Flatten Lines de todos los InvoiceItems
    const lines: AgoraInvoiceLineExport[] = []
    let guests = 0
    for (const item of items) {
      guests += item.Guests ?? 0
      for (const line of item.Lines ?? []) {
        lines.push({
          ProductId: line.ProductId,
          ProductName: line.ProductName ?? "",
          SaleFormatId: line.SaleFormatId,
          SaleFormatName: line.SaleFormatName,
          FamilyId: line.FamilyId,
          FamilyName: line.FamilyName,
          Quantity: line.Quantity ?? 0,
          UnitPrice: line.UnitPrice ?? 0,
          // La API usa TotalAmount en lines, no GrossAmount
          GrossAmount: line.TotalAmount ?? line.GrossAmount ?? 0,
          NetAmount: line.NetAmount ?? 0,
          DiscountRate: line.DiscountRate,
          VatRate: line.VatRate,
          IsAddin: line.IsAddin,
        })
      }
    }

    // Payments a nivel de factura
    const payments: AgoraPaymentExport[] = (inv.Payments ?? []).map((p: any) => ({
      PaymentMethodId: p.PaymentMethodId ?? p.PaymentMethod?.Id ?? 0,
      PaymentMethodName: p.PaymentMethodName ?? p.PaymentMethod?.Name ?? "",
      Amount: p.Amount ?? 0,
      PaidAmount: p.PaidAmount,
      ChangeAmount: p.ChangeAmount,
      TipAmount: p.TipAmount ?? 0,
      ExtraInformation: p.ExtraInformation,
      IsPrepayment: p.IsPrepayment,
    }))

    // Taxes desde Totals
    const totals = inv.Totals ?? {}
    const taxes: AgoraTaxExport[] = (totals.Taxes ?? []).map((t: any) => ({
      VatRate: t.VatRate ?? 0,
      NetAmount: t.NetAmount ?? 0,
      VatAmount: t.VatAmount ?? 0,
      SurchargeAmount: t.SurchargeAmount ?? 0,
      GrossAmount: t.GrossAmount,
    }))

    return {
      Serie: inv.Serie ?? "",
      Number: inv.Number ?? 0,
      GlobalId: inv.GlobalId ?? "",
      Date: inv.Date ?? inv.BusinessDay ?? "",
      BusinessDay: inv.BusinessDay ?? "",
      PosId: inv.Pos?.Id ?? 0,
      PosName: inv.Pos?.Name,
      UserId: inv.User?.Id ?? inv.UserId ?? 0,
      UserName: inv.User?.Name ?? inv.UserName,
      CustomerId: inv.Customer?.Id ?? inv.CustomerId,
      CustomerName: inv.Customer?.Name ?? inv.CustomerName,
      SaleCenterId: items[0]?.SaleCenter?.Id ?? 0,
      SaleCenterName: items[0]?.SaleCenter?.Name,
      SaleLocationName: items[0]?.SaleCenter?.Location,
      Guests: guests,
      GrossAmount: totals.GrossAmount ?? 0,
      NetAmount: totals.NetAmount ?? 0,
      TotalAmount: totals.GrossAmount ?? 0,
      ProcessedDate: inv.ProcessedDate,
      Lines: lines,
      Payments: payments,
      Taxes: taxes,
      WorkplaceId: inv.Workplace?.Id,
      WorkplaceName: inv.Workplace?.Name,
    } as AgoraInvoiceExport
  })
}

/**
 * Normaliza cierres de caja de la API de Agora.
 * La API puede devolver Pos como objeto anidado.
 */
export function normalizeAgoraPosCloseOuts(raw: any[]): AgoraPosCloseOutExport[] {
  return raw.map((co) => {
    if (typeof co.PosId === "number") return co as AgoraPosCloseOutExport

    return {
      PosId: co.Pos?.Id ?? 0,
      PosName: co.Pos?.Name ?? "",
      BusinessDay: co.BusinessDay ?? "",
      Date: co.Date ?? "",
      PaymentMethodBalances: co.PaymentMethodBalances,
    } as AgoraPosCloseOutExport
  })
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Endpoint Groups (para Sandbox UI) ────────────────────────

export interface AgoraEndpointParam {
  name: string
  label: string
  type: "text" | "date" | "number"
  placeholder?: string
  optional?: boolean
}

export interface AgoraEndpoint {
  label: string
  description: string
  method: "GET" | "POST"
  path: string
  urlParams?: AgoraEndpointParam[]
  bodyTemplate?: string
}

export interface AgoraEndpointGroup {
  label: string
  color: string
  endpoints: AgoraEndpoint[]
}

export const AGORA_ENDPOINT_GROUPS: AgoraEndpointGroup[] = [
  {
    label: "Ventas / Exportacion",
    color: "text-blue-600",
    endpoints: [
      {
        label: "Exportar ventas del dia",
        description: "Facturas, cierres de caja, albaranes y pedidos de un dia de negocio.",
        method: "GET",
        path: "api/export/",
        urlParams: [
          { name: "business-day", label: "Dia de negocio", type: "date", placeholder: "2026-03-06" },
          { name: "filter", label: "Filtro", type: "text", placeholder: "Invoices,PosCloseOuts", optional: true },
          { name: "include-processed", label: "Incluir procesados", type: "text", placeholder: "true", optional: true },
        ],
      },
      {
        label: "Tickets abiertos",
        description: "Tickets/cuentas actualmente abiertas en el TPV.",
        method: "GET",
        path: "api/export/tickets/",
        urlParams: [
          { name: "sale-center-id", label: "Centro de venta", type: "number", optional: true },
          { name: "sale-location-name", label: "Nombre ubicacion", type: "text", optional: true },
        ],
      },
      {
        label: "Marcar como procesado",
        description: "Marca documentos (facturas/albaranes) como procesados.",
        method: "POST",
        path: "api/doc/processed",
        bodyTemplate: JSON.stringify([{ Serie: "A", Number: 1 }], null, 2),
      },
    ],
  },
  {
    label: "Maestros",
    color: "text-emerald-600",
    endpoints: [
      {
        label: "Todos los maestros",
        description: "Productos, familias, centros de venta, stocks, usuarios, IVA, etc.",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "Products,Families,SaleCenters" },
        ],
      },
      {
        label: "Familias",
        description: "Arbol de familias de producto.",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "Families" },
        ],
      },
      {
        label: "Productos",
        description: "Catalogo completo de productos con precios y barcodes.",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "Products" },
        ],
      },
      {
        label: "Centros de Venta",
        description: "Puntos de venta y ubicaciones (mesas, barras, etc.).",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "SaleCenters" },
        ],
      },
      {
        label: "Stocks",
        description: "Stock actual por producto y almacen.",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "Stocks" },
        ],
      },
      {
        label: "Imagenes de productos",
        description: "Obtener imagenes (base64) de hasta 20 productos.",
        method: "GET",
        path: "api/export-master/product-images/",
        urlParams: [
          { name: "products", label: "IDs (JSON array)", type: "text", placeholder: "[1,2,3]" },
        ],
      },
      {
        label: "Series",
        description: "Series de facturacion configuradas.",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "Series" },
        ],
      },
      {
        label: "Usuarios",
        description: "Usuarios/camareros del sistema.",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "Users" },
        ],
      },
      {
        label: "Metodos de Pago",
        description: "Formas de pago configuradas (efectivo, tarjeta, etc.).",
        method: "GET",
        path: "api/export-master/",
        urlParams: [
          { name: "filter", label: "Filtro", type: "text", placeholder: "PaymentMethods" },
        ],
      },
    ],
  },
  {
    label: "Importacion",
    color: "text-amber-600",
    endpoints: [
      {
        label: "Importar datos",
        description: "Importa/actualiza productos, familias, clientes, etc. en Agora.",
        method: "POST",
        path: "api/import/",
        bodyTemplate: JSON.stringify({
          Products: [{ Id: 0, Name: "Test", FamilyId: 1, VatId: 1, Prices: [{ PriceListId: 1, MainPrice: 10 }] }],
        }, null, 2),
      },
    ],
  },
]
