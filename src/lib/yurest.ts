export interface YurestEndpoint {
  path: string
  label: string
  description: string
  method: "GET" | "POST"
  sherlockMapping?: string
}

export interface YurestEndpointGroup {
  label: string
  color: string
  endpoints: YurestEndpoint[]
}

export const YUREST_ENDPOINT_GROUPS: YurestEndpointGroup[] = [
  {
    label: "Compras & Productos",
    color: "text-blue-500",
    endpoints: [
      {
        path: "products",
        label: "Productos",
        description: "Listado completo de productos/ingredientes con precios, IVA, unidades y proveedores.",
        method: "GET",
        sherlockMapping: "Ingredient",
      },
      {
        path: "product-data-sheets",
        label: "Fichas de Producto",
        description: "Fichas técnicas detalladas con información nutricional y trazabilidad.",
        method: "GET",
        sherlockMapping: "Ingredient (campos extendidos)",
      },
      {
        path: "unities",
        label: "Unidades de Medida",
        description: "Unidades disponibles en el sistema (Kg, L, Unidad, etc.).",
        method: "GET",
        sherlockMapping: "MeasureUnit",
      },
      {
        path: "family_buys",
        label: "Familias de Producto",
        description: "Categorías/familias para agrupar productos.",
        method: "GET",
        sherlockMapping: "Category",
      },
      {
        path: "providers",
        label: "Proveedores",
        description: "Listado de proveedores con datos de contacto.",
        method: "GET",
        sherlockMapping: "Supplier",
      },
      {
        path: "provider_products",
        label: "Productos por Proveedor",
        description: "Relación entre proveedores y sus productos ofertados.",
        method: "GET",
      },
    ],
  },
  {
    label: "Almacén & Stock",
    color: "text-purple-500",
    endpoints: [
      {
        path: "stock",
        label: "Stock Actual",
        description: "Niveles de stock en tiempo real por producto.",
        method: "GET",
        sherlockMapping: "Ingredient.currentStock",
      },
      {
        path: "stock_details",
        label: "Movimientos de Stock",
        description: "Historial detallado de entradas, salidas y ajustes de inventario.",
        method: "GET",
        sherlockMapping: "InventoryRecord",
      },
      {
        path: "storage_location",
        label: "Ubicaciones de Almacén",
        description: "Localizaciones físicas de almacenamiento (cámaras, almacén seco, etc.).",
        method: "GET",
      },
      {
        path: "stores/warehouse-locations/inventories",
        label: "Inventarios",
        description: "Registros de conteo de inventario por ubicación.",
        method: "GET",
        sherlockMapping: "InventoryRecord",
      },
    ],
  },
  {
    label: "Cocina & Recetas",
    color: "text-emerald-500",
    endpoints: [
      {
        path: "recipes",
        label: "Recetas",
        description: "Recetario completo con ingredientes, pasos, tiempos y costes.",
        method: "GET",
        sherlockMapping: "Recipe + RecipeIngredient",
      },
      {
        path: "menus",
        label: "Menús",
        description: "Menús del restaurante con relación a recetas.",
        method: "GET",
      },
    ],
  },
  {
    label: "Ventas",
    color: "text-amber-500",
    endpoints: [
      {
        path: "sales",
        label: "Ventas",
        description: "Registro de transacciones de venta.",
        method: "GET",
      },
      {
        path: "sales_lines",
        label: "Líneas de Venta",
        description: "Detalle de productos vendidos por transacción.",
        method: "GET",
      },
    ],
  },
  {
    label: "Tareas & Auditorías",
    color: "text-red-500",
    endpoints: [
      {
        path: "checklists",
        label: "Checklists",
        description: "Listas de verificación y tareas programadas.",
        method: "GET",
      },
      {
        path: "audits",
        label: "Auditorías",
        description: "Registros de auditoría del sistema.",
        method: "GET",
      },
      {
        path: "apccs",
        label: "APPCC",
        description: "Registros de cumplimiento de seguridad alimentaria.",
        method: "GET",
      },
    ],
  },
  {
    label: "Informes",
    color: "text-cyan-500",
    endpoints: [
      {
        path: "ebita",
        label: "EBITDA",
        description: "Resumen financiero con notas de entrega, gastos y ventas.",
        method: "GET",
      },
      {
        path: "delivery_note",
        label: "Albaranes",
        description: "Listado de albaranes de entrega.",
        method: "GET",
      },
      {
        path: "bill",
        label: "Facturas",
        description: "Listado de facturas recibidas.",
        method: "GET",
      },
    ],
  },
  {
    label: "Sistema",
    color: "text-slate-500",
    endpoints: [
      {
        path: "stores",
        label: "Tiendas/Locales",
        description: "Locales del negocio registrados en Yurest.",
        method: "GET",
      },
      {
        path: "users",
        label: "Usuarios",
        description: "Usuarios del sistema con roles asignados.",
        method: "GET",
      },
      {
        path: "roles",
        label: "Roles",
        description: "Niveles de permisos disponibles.",
        method: "GET",
      },
    ],
  },
]

export interface YurestApiResponse<T = unknown> {
  status: 0 | 1
  message: string
  data: T[]
}

export async function fetchYurest<T = unknown>(endpoint: string): Promise<YurestApiResponse<T>> {
  const baseUrl = process.env.YUREST_API_URL
  const token = process.env.YUREST_TOKEN

  if (!baseUrl || !token) {
    throw new Error("YUREST_API_URL and YUREST_TOKEN must be set in environment variables")
  }

  const url = `${baseUrl}/${token}/${endpoint}`

  const response = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Yurest API HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}
