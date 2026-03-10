// ─── CoverManager API Client ────────────────────────────────────
// Autenticación: API key como parámetro URL (GET) o header (POST)
// Base URL: https://www.covermanager.com/api
// Docs: https://doc-api.covermanager.com/

export interface CoverManagerEndpointParam {
  name: string
  label: string
  type: "text" | "number" | "date"
  placeholder?: string
  optional?: boolean
}

export interface CoverManagerEndpoint {
  path: string
  label: string
  description: string
  method: "GET" | "POST"
  /** Parámetros de URL (se insertan en la ruta reemplazando :param) */
  urlParams?: CoverManagerEndpointParam[]
  /** Parámetros del body para POST */
  bodyParams?: CoverManagerEndpointParam[]
  /** JSON template editable en el sandbox para endpoints POST */
  bodyTemplate?: string
  /** Mapping a modelos ATC */
  atcMapping?: string
}

export interface CoverManagerEndpointGroup {
  label: string
  color: string
  endpoints: CoverManagerEndpoint[]
}

// Parámetros comunes reutilizables para body POST
const RESTAURANT_PARAM: CoverManagerEndpointParam = { name: "restaurant", label: "Restaurant slug", type: "text", placeholder: "restaurante-voltereta" }
const DATE_PARAM: CoverManagerEndpointParam = { name: "date", label: "Fecha", type: "date" }
const DATE_START_PARAM: CoverManagerEndpointParam = { name: "date_start", label: "Fecha inicio", type: "date" }
const DATE_END_PARAM: CoverManagerEndpointParam = { name: "date_end", label: "Fecha fin", type: "date" }
const PEOPLE_PARAM: CoverManagerEndpointParam = { name: "people", label: "Personas", type: "number", placeholder: "2" }
const HOUR_PARAM: CoverManagerEndpointParam = { name: "hour", label: "Hora", type: "text", placeholder: "20:30" }
const ID_RESERV_PARAM: CoverManagerEndpointParam = { name: "id_reserv", label: "ID Reserva", type: "text" }
const PAGE_PARAM: CoverManagerEndpointParam = { name: "page", label: "Página", type: "number", placeholder: "1", optional: true }

export const COVERMANAGER_ENDPOINT_GROUPS: CoverManagerEndpointGroup[] = [
  {
    label: "Restaurantes",
    color: "text-blue-500",
    endpoints: [
      {
        path: "restaurant/list/:apikey/:city",
        label: "Listar Restaurantes",
        description: "Lista de restaurantes accesibles con la API key. Opcionalmente filtrar por ciudad.",
        method: "GET",
        urlParams: [{ name: "city", label: "Ciudad", type: "text", placeholder: "Valencia", optional: true }],
      },
      {
        path: "restaurant/slug/:apikey/:slug",
        label: "Restaurante por Slug",
        description: "Obtener datos de un restaurante por su slug.",
        method: "GET",
        urlParams: [{ name: "slug", label: "Slug", type: "text", placeholder: "restaurante-voltereta" }],
      },
      {
        path: "restaurant/get_restaurant_by_name/:apikey",
        label: "Restaurante por Nombre",
        description: "Buscar restaurante por nombre.",
        method: "POST",
        bodyParams: [{ name: "name", label: "Nombre", type: "text", placeholder: "Voltereta" }],
        bodyTemplate: JSON.stringify({ name: "" }, null, 2),
      },
      {
        path: "restaurant/get_restaurant_by_place/:apikey",
        label: "Restaurante por Ubicación",
        description: "Buscar restaurantes por lugar o coordenadas.",
        method: "POST",
        bodyParams: [
          { name: "place", label: "Lugar", type: "text", placeholder: "Valencia", optional: true },
          { name: "latitude", label: "Latitud", type: "text", placeholder: "39.47", optional: true },
          { name: "longitude", label: "Longitud", type: "text", placeholder: "-0.37", optional: true },
        ],
        bodyTemplate: JSON.stringify({ place: "", latitude: "", longitude: "" }, null, 2),
      },
      {
        path: "restaurant/subgroups",
        label: "Subgrupos de Restaurantes",
        description: "Obtener subgrupos de una compañía.",
        method: "POST",
        bodyParams: [
          { name: "company", label: "Compañía", type: "text" },
          { name: "id_external", label: "ID Externo", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ company: "", id_external: "" }, null, 2),
      },
      {
        path: "restaurant/get_map/:apikey/:restaurant/:date/:luner",
        label: "Mapa de Mesas",
        description: "Mapa de mesas del restaurante para una fecha y servicio.",
        method: "GET",
        urlParams: [
          { name: "restaurant", label: "Restaurant slug", type: "text", placeholder: "restaurante-voltereta" },
          { name: "date", label: "Fecha", type: "date" },
          { name: "luner", label: "Servicio (1=comida, 2=cena)", type: "number", placeholder: "1", optional: true },
        ],
      },
      {
        path: "restaurant/table_availability/:apikey/:restaurant/:date",
        label: "Disponibilidad de Mesas",
        description: "Disponibilidad de mesas por restaurante y fecha.",
        method: "GET",
        urlParams: [
          { name: "restaurant", label: "Restaurant slug", type: "text", placeholder: "restaurante-voltereta" },
          { name: "date", label: "Fecha", type: "date" },
        ],
      },
    ],
  },
  {
    label: "Reservas",
    color: "text-emerald-500",
    endpoints: [
      {
        path: "restaurant/get_reservs/:apikey/:restaurant/:date_start/:date_end/:page/:table",
        label: "Listar Reservas (GET)",
        description: "Lista paginada de reservas por rango de fechas. table=0 para todas.",
        method: "GET",
        urlParams: [
          { name: "restaurant", label: "Restaurant slug", type: "text", placeholder: "restaurante-voltereta" },
          { name: "date_start", label: "Fecha inicio", type: "date" },
          { name: "date_end", label: "Fecha fin", type: "date" },
          { name: "page", label: "Página", type: "number", placeholder: "1", optional: true },
          { name: "table", label: "Mesa (0=todas)", type: "number", placeholder: "0", optional: true },
        ],
        atcMapping: "Reservation",
      },
      {
        path: "restaurant/get_reservs_basic",
        label: "Listar Reservas (POST)",
        description: "Lista de reservas con filtros por fecha, estado y grupo.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_START_PARAM, DATE_END_PARAM,
          { name: "status", label: "Estado", type: "text", placeholder: "confirmed", optional: true },
          { name: "group", label: "Grupo", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", date_start: "", date_end: "", status: "", group: "" }, null, 2),
        atcMapping: "Reservation",
      },
      {
        path: "restaurant/get_reserv/:apikey/:token",
        label: "Detalle de Reserva",
        description: "Obtener una reserva por su token.",
        method: "GET",
        urlParams: [{ name: "token", label: "Token reserva", type: "text" }],
        atcMapping: "Reservation",
      },
      {
        path: "reserv/reserv",
        label: "Crear Reserva",
        description: "Crear una nueva reserva.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "first_name", label: "Nombre", type: "text" },
          { name: "last_name", label: "Apellido", type: "text" },
          { name: "email", label: "Email", type: "text" },
          { name: "int_call_code", label: "Prefijo tel.", type: "text", placeholder: "+34", optional: true },
          { name: "phone", label: "Teléfono", type: "text" },
          { name: "source", label: "Fuente", type: "text", optional: true },
          { name: "commentary", label: "Comentario", type: "text", optional: true },
          { name: "language", label: "Idioma", type: "text", placeholder: "ES", optional: true },
          { name: "pending", label: "Pendiente", type: "text", optional: true },
          { name: "discount", label: "Descuento", type: "text", optional: true },
          { name: "not_notify", label: "No notificar", type: "text", optional: true },
          { name: "ref", label: "Referencia", type: "text", optional: true },
          { name: "tags_client", label: "Tags cliente", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({
          restaurant: "", date: "", hour: "", people: 2,
          first_name: "", last_name: "", email: "", int_call_code: "+34", phone: "",
          source: "", commentary: "", language: "ES",
        }, null, 2),
        atcMapping: "Reservation",
      },
      {
        path: "reserv/update_reserv",
        label: "Actualizar Reserva",
        description: "Actualizar fecha, hora, personas, mesas o comentario de una reserva.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, ID_RESERV_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "tables", label: "Mesas", type: "text", optional: true },
          { name: "commentary", label: "Comentario", type: "text", optional: true },
          { name: "not_notify", label: "No notificar", type: "text", optional: true },
          { name: "ref", label: "Referencia", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({
          restaurant: "", id_reserv: "", date: "", hour: "", people: 2, tables: "", commentary: "",
        }, null, 2),
        atcMapping: "Reservation",
      },
      {
        path: "reserv/reserv_force",
        label: "Forzar Reserva",
        description: "Crear reserva forzada (ignora restricciones de disponibilidad).",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "first_name", label: "Nombre", type: "text" },
          { name: "last_name", label: "Apellido", type: "text" },
          { name: "email", label: "Email", type: "text" },
          { name: "int_call_code", label: "Prefijo tel.", type: "text", optional: true },
          { name: "phone", label: "Teléfono", type: "text" },
          { name: "source", label: "Fuente", type: "text", optional: true },
          { name: "commentary", label: "Comentario", type: "text", optional: true },
          { name: "language", label: "Idioma", type: "text", optional: true },
          { name: "tables", label: "Mesas", type: "text", optional: true },
          { name: "pending", label: "Pendiente", type: "text", optional: true },
          { name: "discount", label: "Descuento", type: "text", optional: true },
          { name: "not_notify", label: "No notificar", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({
          restaurant: "", date: "", hour: "", people: 2,
          first_name: "", last_name: "", email: "", int_call_code: "+34", phone: "",
          source: "", commentary: "", language: "ES", tables: "",
        }, null, 2),
      },
      {
        path: "reserv/walk_in",
        label: "Walk-in",
        description: "Registrar un walk-in (cliente sin reserva).",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "id_table", label: "ID Mesa", type: "text" },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", hour: "", people: 2, id_table: "" }, null, 2),
      },
      {
        path: "reserv/waiting_list",
        label: "Lista de Espera",
        description: "Añadir a la lista de espera.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "first_name", label: "Nombre", type: "text" },
          { name: "last_name", label: "Apellido", type: "text" },
          { name: "email", label: "Email", type: "text" },
          { name: "int_call_code", label: "Prefijo tel.", type: "text", optional: true },
          { name: "phone", label: "Teléfono", type: "text" },
          { name: "commentary", label: "Comentario", type: "text", optional: true },
          { name: "language", label: "Idioma", type: "text", optional: true },
          { name: "not_notify", label: "No notificar", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({
          restaurant: "", date: "", hour: "", people: 2,
          first_name: "", last_name: "", email: "", int_call_code: "+34", phone: "",
          commentary: "", language: "ES",
        }, null, 2),
        atcMapping: "WaitingList",
      },
      {
        path: "reserv/cancel_client",
        label: "Cancelar Reserva",
        description: "Cancelar una reserva por ID.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM],
        bodyTemplate: JSON.stringify({ id_reserv: "" }, null, 2),
      },
    ],
  },
  {
    label: "Estado de Reservas",
    color: "text-amber-500",
    endpoints: [
      {
        path: "reserv/sit_client",
        label: "Sentar Cliente",
        description: "Marcar reserva como sentado (seated).",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM],
        bodyTemplate: JSON.stringify({ id_reserv: "" }, null, 2),
      },
      {
        path: "reserv/sit_client_pending",
        label: "Sentar Cliente (Pendiente)",
        description: "Marcar como sentado pendiente.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM],
        bodyTemplate: JSON.stringify({ id_reserv: "" }, null, 2),
      },
      {
        path: "reserv/undo_sit",
        label: "Deshacer Sentado",
        description: "Revertir estado de sentado.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM],
        bodyTemplate: JSON.stringify({ id_reserv: "" }, null, 2),
      },
      {
        path: "reserv/confirm_client",
        label: "Confirmar Reserva",
        description: "Marcar reserva como confirmada.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM],
        bodyTemplate: JSON.stringify({ id_reserv: "" }, null, 2),
      },
      {
        path: "reserv/revert_status_reserv",
        label: "Revertir Estado",
        description: "Revertir al estado anterior de la reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM],
        bodyTemplate: JSON.stringify({ id_reserv: "" }, null, 2),
      },
      {
        path: "reserv/update_table",
        label: "Asignar Mesas",
        description: "Asignar mesas a una reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM, { name: "tables", label: "Mesas (IDs)", type: "text" }],
        bodyTemplate: JSON.stringify({ id_reserv: "", tables: "" }, null, 2),
      },
      {
        path: "reserv/commentary_client",
        label: "Añadir Comentario",
        description: "Añadir comentario a la reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM, { name: "commentary_client", label: "Comentario", type: "text" }],
        bodyTemplate: JSON.stringify({ id_reserv: "", commentary_client: "" }, null, 2),
      },
      {
        path: "reserv/update_minimum_spend",
        label: "Actualizar Gasto Mínimo",
        description: "Actualizar gasto mínimo de una reserva.",
        method: "POST",
        bodyParams: [
          { name: "token", label: "Token Reserva", type: "text" },
          { name: "minimum_spend", label: "Gasto Mínimo", type: "number" },
        ],
        bodyTemplate: JSON.stringify({ token: "", minimum_spend: 0 }, null, 2),
      },
    ],
  },
  {
    label: "Disponibilidad",
    color: "text-cyan-500",
    endpoints: [
      {
        path: "reserv/availability",
        label: "Disponibilidad",
        description: "Horas disponibles para un restaurante y fecha.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM,
          { name: "discount", label: "Descuento", type: "text", optional: true },
          { name: "product_type", label: "Tipo producto", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", date: "" }, null, 2),
      },
      {
        path: "apiV2/availability_extended",
        label: "Disponibilidad Extendida",
        description: "Disponibilidad con zonas y IDs de zona.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM,
          { name: "discount", label: "Descuento", type: "text", optional: true },
          { name: "product_type", label: "Tipo producto", type: "text", optional: true },
          { name: "show_zones", label: "Mostrar zonas", type: "text", optional: true },
          { name: "show_zones_with_id", label: "Mostrar zonas con ID", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", date: "", show_zones: "1", show_zones_with_id: "1" }, null, 2),
      },
      {
        path: "reserv/availability_calendar",
        label: "Calendario Disponibilidad",
        description: "Calendario de días disponibles.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, PEOPLE_PARAM,
          { name: "discount", label: "Descuento", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", people: 2 }, null, 2),
      },
      {
        path: "reserv/availability_calendar_total",
        label: "Calendario Total",
        description: "Calendario con info de horas y personas por día.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "discount", label: "Descuento", type: "text", optional: true },
          { name: "product_type", label: "Tipo producto", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "" }, null, 2),
      },
      {
        path: "reserv/availability_total",
        label: "Disponibilidad Total",
        description: "Disponibilidad total para personas, hora y día específicos.",
        method: "POST",
        bodyParams: [PEOPLE_PARAM, HOUR_PARAM, { name: "day", label: "Día", type: "date" },
          { name: "discount", label: "Descuento", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ people: 2, hour: "", day: "" }, null, 2),
      },
      {
        path: "reserv/availability_message",
        label: "Mensaje Disponibilidad",
        description: "Mensaje de disponibilidad para personas, hora y fecha.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "language", label: "Idioma", type: "text", placeholder: "ES", optional: true },
          { name: "extra_zone", label: "Zona extra", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", date: "", hour: "", people: 2, language: "ES" }, null, 2),
      },
      {
        path: "reserv/is_reservable",
        label: "Es Reservable",
        description: "Verificar si es posible reservar para una combinación de parámetros.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "discount", label: "Descuento", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", date: "", hour: "", people: 2 }, null, 2),
      },
      {
        path: "reserv/get_zones",
        label: "Obtener Zonas",
        description: "Zonas disponibles para restaurante, fecha, hora y personas.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM],
        bodyTemplate: JSON.stringify({ restaurant: "", date: "", hour: "", people: 2 }, null, 2),
      },
      {
        path: "reserv/crosselling",
        label: "Cross-Selling",
        description: "Sugerencias de restaurantes cercanos del grupo.",
        method: "POST",
        bodyParams: [
          { name: "group_slug", label: "Slug grupo", type: "text" },
          { name: "latitude", label: "Latitud", type: "text", optional: true },
          { name: "longitude", label: "Longitud", type: "text", optional: true },
          DATE_PARAM, PEOPLE_PARAM,
          { name: "luner", label: "Servicio", type: "text", optional: true },
          { name: "limit_number_restaurant", label: "Límite restaurantes", type: "number", optional: true },
          { name: "limit_kilometer", label: "Límite km", type: "number", optional: true },
        ],
        bodyTemplate: JSON.stringify({
          group_slug: "", latitude: "", longitude: "", date: "", people: 2, luner: "", limit_number_restaurant: 5, limit_kilometer: 10,
        }, null, 2),
      },
      {
        path: "reserv/get_products_by_availability",
        label: "Productos por Disponibilidad",
        description: "Productos disponibles para una fecha, hora y zona.",
        method: "GET",
        urlParams: [],
        bodyParams: [RESTAURANT_PARAM, PEOPLE_PARAM, DATE_PARAM, HOUR_PARAM,
          { name: "id_zone", label: "ID Zona", type: "text", optional: true },
        ],
      },
    ],
  },
  {
    label: "Tickets & Pagos",
    color: "text-purple-500",
    endpoints: [
      {
        path: "reserv/set_ticket",
        label: "Establecer Ticket",
        description: "Asignar ticket/cuenta a una reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM,
          { name: "items", label: "Items", type: "text" },
          { name: "payments", label: "Pagos", type: "text" },
          { name: "printDate", label: "Fecha impresión", type: "text" },
          { name: "status", label: "Estado", type: "text" },
          { name: "total", label: "Total", type: "number" },
        ],
        bodyTemplate: JSON.stringify({
          id_reserv: "",
          items: [{ name: "", quantity: 1, price: 0 }],
          payments: [{ type: "", amount: 0 }],
          printDate: "", status: "", total: 0,
        }, null, 2),
      },
      {
        path: "reserv/set_card",
        label: "Establecer Método Pago",
        description: "Asignar método de pago a la reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM, { name: "payment_method", label: "Método", type: "text" }],
        bodyTemplate: JSON.stringify({ id_reserv: "", payment_method: "" }, null, 2),
      },
      {
        path: "reserv/add_external_payment",
        label: "Pago Externo",
        description: "Añadir pago externo a una reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM,
          { name: "amount", label: "Importe", type: "number" },
          { name: "payed", label: "Pagado", type: "text" },
          { name: "type", label: "Tipo", type: "text" },
          { name: "comments", label: "Comentarios", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ id_reserv: "", amount: 0, payed: "", type: "", comments: "" }, null, 2),
      },
      {
        path: "reserv/get_secure_payment_info",
        label: "Info Pago Seguro",
        description: "Obtener info de pago seguro de una reserva.",
        method: "GET",
        bodyParams: [ID_RESERV_PARAM],
      },
      {
        path: "reserv/get_tickets",
        label: "Listar Tickets",
        description: "Listar tickets de un restaurante por rango de fechas.",
        method: "GET",
        bodyParams: [RESTAURANT_PARAM, DATE_START_PARAM, DATE_END_PARAM],
      },
      {
        path: "apiV2/reserv/get_pay_url/:apikey/:restaurant/:id_reserv",
        label: "URL de Pago",
        description: "Obtener URL de pago seguro para una reserva.",
        method: "GET",
        urlParams: [
          { name: "restaurant", label: "Restaurant slug", type: "text", placeholder: "restaurante-voltereta" },
          { name: "id_reserv", label: "ID Reserva", type: "text" },
        ],
      },
    ],
  },
  {
    label: "Pagos Avanzados",
    color: "text-violet-500",
    endpoints: [
      {
        path: "pays/get_pays",
        label: "Listar Pagos",
        description: "Listar pagos por restaurante y rango de fechas.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "pay_date_start", label: "Fecha inicio", type: "date" },
          { name: "pay_date_end", label: "Fecha fin", type: "date" },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", pay_date_start: "", pay_date_end: "" }, null, 2),
        atcMapping: "PaymentRecovery",
      },
      {
        path: "pays/get_external_pays_types",
        label: "Tipos de Pago Externo",
        description: "Tipos de pago externo disponibles.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM],
        bodyTemplate: JSON.stringify({ restaurant: "" }, null, 2),
      },
      {
        path: "pays/get_refunds",
        label: "Listar Reembolsos",
        description: "Listar reembolsos por restaurante y rango de fechas.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "pay_date_start", label: "Fecha inicio", type: "date" },
          { name: "pay_date_end", label: "Fecha fin", type: "date" },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", pay_date_start: "", pay_date_end: "" }, null, 2),
      },
      {
        path: "pays/get_products",
        label: "Productos de Pago",
        description: "Productos asociados a pagos.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM],
        bodyTemplate: JSON.stringify({ restaurant: "" }, null, 2),
      },
    ],
  },
  {
    label: "Clientes",
    color: "text-orange-500",
    endpoints: [
      {
        path: "clients/clients_list",
        label: "Listar Clientes",
        description: "Lista paginada de clientes de un restaurante.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, PAGE_PARAM],
        bodyTemplate: JSON.stringify({ restaurant: "", page: 1 }, null, 2),
      },
      {
        path: "clients/add_client",
        label: "Crear Cliente",
        description: "Crear un nuevo cliente.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "first_name", label: "Nombre", type: "text" },
          { name: "last_name", label: "Apellido", type: "text" },
          { name: "email", label: "Email", type: "text" },
          { name: "int_call_code", label: "Prefijo tel.", type: "text", optional: true },
          { name: "phone", label: "Teléfono", type: "text" },
          { name: "subscribe_newsletter", label: "Newsletter", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({
          restaurant: "", first_name: "", last_name: "", email: "", int_call_code: "+34", phone: "", subscribe_newsletter: "",
        }, null, 2),
      },
      {
        path: "clients/get_client",
        label: "Obtener Cliente",
        description: "Obtener datos de un cliente por ID.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "id_client", label: "ID Cliente", type: "text" },
          { name: "invoice_data", label: "Datos facturación", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", id_client: "", invoice_data: "" }, null, 2),
      },
      {
        path: "clients/update_food_preference/:apikey",
        label: "Preferencia Alimentaria",
        description: "Actualizar preferencia alimentaria de un cliente.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "email", label: "Email", type: "text" },
          { name: "food_preference", label: "Preferencia", type: "text" },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", email: "", food_preference: "" }, null, 2),
      },
      {
        path: "clients/get_clients_reservs",
        label: "Reservas de Cliente",
        description: "Obtener reservas de un cliente por email o teléfono.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "user_email", label: "Email", type: "text", optional: true },
          { name: "user_phone", label: "Teléfono", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", user_email: "", user_phone: "" }, null, 2),
      },
      {
        path: "clients/send_manage_clients_reviews",
        label: "Gestionar Reseñas",
        description: "Gestionar reviews de clientes.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "group", label: "Grupo", type: "text", optional: true },
          { name: "user_email", label: "Email usuario", type: "text" },
          { name: "send_review", label: "Enviar reseña", type: "text" },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", group: "", user_email: "", send_review: "" }, null, 2),
      },
    ],
  },
  {
    label: "Informes & Satisfacción",
    color: "text-red-500",
    endpoints: [
      {
        path: "report/get_satisfaction/:apikey/:restaurant/:date_start/:date_end/:page",
        label: "Encuestas de Satisfacción",
        description: "Resultados de encuestas de satisfacción.",
        method: "GET",
        urlParams: [
          { name: "restaurant", label: "Restaurant slug", type: "text", placeholder: "restaurante-voltereta" },
          { name: "date_start", label: "Fecha inicio", type: "date" },
          { name: "date_end", label: "Fecha fin", type: "date" },
          { name: "page", label: "Página", type: "number", placeholder: "1", optional: true },
        ],
      },
      {
        path: "stats/get_resumen_date",
        label: "Resumen por Fecha",
        description: "Resumen estadístico del restaurante por fecha.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM],
        bodyTemplate: JSON.stringify({ restaurant: "", date: "" }, null, 2),
      },
      {
        path: "stats/make_survey",
        label: "Crear Encuesta",
        description: "Crear encuesta de satisfacción para una reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM,
          { name: "quality_food", label: "Calidad comida", type: "number" },
          { name: "attention", label: "Atención", type: "number" },
          { name: "environment", label: "Ambiente", type: "number" },
          { name: "opinion", label: "Opinión", type: "text", optional: true },
          { name: "more_questions", label: "Preguntas extra", type: "text", optional: true },
          { name: "data", label: "Datos extra", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ id_reserv: "", quality_food: 5, attention: 5, environment: 5, opinion: "" }, null, 2),
      },
    ],
  },
  {
    label: "Webhooks",
    color: "text-slate-500",
    endpoints: [
      {
        path: "webhooks/get_webhook_channel/:apikey",
        label: "Obtener Webhook Canal",
        description: "Obtener URL del webhook de canal configurado.",
        method: "GET",
      },
      {
        path: "webhooks/set_webhook_channel",
        label: "Configurar Webhook Canal",
        description: "Configurar URL del webhook de canal.",
        method: "POST",
        bodyParams: [{ name: "webhook_url", label: "URL Webhook", type: "text" }],
        bodyTemplate: JSON.stringify({ webhook_url: "" }, null, 2),
      },
      {
        path: "webhooks/set_webhook_tpv",
        label: "Configurar Webhook TPV",
        description: "Configurar URL del webhook del TPV.",
        method: "POST",
        bodyParams: [{ name: "webhook_url", label: "URL Webhook", type: "text" }],
        bodyTemplate: JSON.stringify({ webhook_url: "" }, null, 2),
      },
      {
        path: "restaurant/set_webhook_reservs",
        label: "Webhook Reservas",
        description: "Configurar webhook para notificaciones de reservas.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "url", label: "URL", type: "text" },
          { name: "key", label: "Key", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", url: "", key: "" }, null, 2),
      },
      {
        path: "reserv/set_webhook_url",
        label: "Webhook de Reserva",
        description: "Configurar webhook para una reserva específica.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM, { name: "webhook_url", label: "URL", type: "text" }],
        bodyTemplate: JSON.stringify({ id_reserv: "", webhook_url: "" }, null, 2),
      },
      {
        path: "reserv/set_confirm_url",
        label: "URL Confirmación",
        description: "Configurar URL de confirmación para una reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM, { name: "confirm_url", label: "URL Confirmación", type: "text" }],
        bodyTemplate: JSON.stringify({ id_reserv: "", confirm_url: "" }, null, 2),
      },
      {
        path: "reserv/set_cancel_url",
        label: "URL Cancelación",
        description: "Configurar URL de cancelación para una reserva.",
        method: "POST",
        bodyParams: [ID_RESERV_PARAM, { name: "cancel_url", label: "URL Cancelación", type: "text" }],
        bodyTemplate: JSON.stringify({ id_reserv: "", cancel_url: "" }, null, 2),
      },
    ],
  },
  {
    label: "Tags & Categorías",
    color: "text-teal-500",
    endpoints: [
      {
        path: "categories",
        label: "Crear Categoría",
        description: "Crear categoría de tags.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "category", label: "Categoría", type: "text" },
          { name: "language", label: "Idioma", type: "text", optional: true },
          { name: "headerFormat", label: "Formato header", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", category: "", language: "ES", headerFormat: "" }, null, 2),
      },
      {
        path: "categories/:id/tags",
        label: "Crear Tag",
        description: "Crear tag dentro de una categoría.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "tag", label: "Tag", type: "text" },
          { name: "headerFormat", label: "Formato header", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", tag: "", headerFormat: "" }, null, 2),
      },
      {
        path: "categories/:restaurant_slug/:category_id",
        label: "Tags por Categoría",
        description: "Listar tags de una categoría de un restaurante.",
        method: "POST",
        bodyParams: [],
      },
    ],
  },
  {
    label: "CoverAtHome",
    color: "text-pink-500",
    endpoints: [
      {
        path: "coverathome/get_orders/:apikey/:restaurant/:date",
        label: "Pedidos CoverAtHome",
        description: "Pedidos de delivery/takeaway para una fecha.",
        method: "GET",
        urlParams: [
          { name: "restaurant", label: "Restaurant slug", type: "text", placeholder: "restaurante-voltereta" },
          { name: "date", label: "Fecha", type: "date" },
        ],
      },
      {
        path: "coverathome/update_order_status",
        label: "Actualizar Estado Pedido",
        description: "Actualizar estado de un pedido CoverAtHome.",
        method: "POST",
        bodyParams: [
          { name: "order", label: "ID Pedido", type: "text" },
          { name: "status", label: "Estado", type: "text" },
        ],
        bodyTemplate: JSON.stringify({ order: "", status: "" }, null, 2),
      },
    ],
  },
  {
    label: "Códigos Promocionales",
    color: "text-lime-500",
    endpoints: [
      {
        path: "promotional_code/add_promotional_code",
        label: "Crear Código Promo",
        description: "Crear un código promocional.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "group", label: "Grupo", type: "text", optional: true },
          { name: "code", label: "Código", type: "text" },
          { name: "description", label: "Descripción", type: "text" },
          { name: "stock", label: "Stock", type: "number" },
          { name: "type", label: "Tipo", type: "text" },
          { name: "for_min", label: "Personas mín.", type: "number", optional: true },
          { name: "for_max", label: "Personas máx.", type: "number", optional: true },
          { name: "date_start", label: "Fecha inicio", type: "date" },
          { name: "date_end", label: "Fecha fin", type: "date" },
          { name: "luner", label: "Servicio", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({
          restaurant: "", code: "", description: "", stock: 100, type: "",
          for_min: 1, for_max: 10, date_start: "", date_end: "",
        }, null, 2),
      },
      {
        path: "promotional_code/update_promotional_code",
        label: "Actualizar Código Promo",
        description: "Actualizar un código promocional existente.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM,
          { name: "code", label: "Código", type: "text" },
          { name: "description", label: "Descripción", type: "text", optional: true },
          { name: "stock_sold", label: "Stock vendido", type: "number", optional: true },
          { name: "date_start", label: "Fecha inicio", type: "date", optional: true },
          { name: "date_end", label: "Fecha fin", type: "date", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", code: "", description: "", stock_sold: 0, date_start: "", date_end: "" }, null, 2),
      },
      {
        path: "promotional_code/delete_promotional_code",
        label: "Eliminar Código Promo",
        description: "Eliminar un código promocional.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, { name: "code", label: "Código", type: "text" }],
        bodyTemplate: JSON.stringify({ restaurant: "", code: "" }, null, 2),
      },
      {
        path: "reserv/check_code",
        label: "Verificar Código",
        description: "Verificar validez de un código promocional.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, DATE_PARAM, HOUR_PARAM, PEOPLE_PARAM,
          { name: "code", label: "Código", type: "text" },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", date: "", hour: "", people: 2, code: "" }, null, 2),
      },
    ],
  },
  {
    label: "Onthego (Lista Espera Virtual)",
    color: "text-indigo-500",
    endpoints: [
      {
        path: "onthego/create",
        label: "Crear Onthego",
        description: "Añadir a la lista de espera virtual.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, PEOPLE_PARAM,
          { name: "int_call_code", label: "Prefijo tel.", type: "text", optional: true },
          { name: "user_phone", label: "Teléfono", type: "text" },
          { name: "user_first_name", label: "Nombre", type: "text", optional: true },
          { name: "user_last_name", label: "Apellido", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ restaurant: "", int_call_code: "+34", user_phone: "", people: 2, user_first_name: "", user_last_name: "" }, null, 2),
      },
      {
        path: "onthego/list",
        label: "Listar Onthego",
        description: "Listar entradas de la lista de espera virtual.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, { name: "user_phone", label: "Teléfono", type: "text", optional: true }],
        bodyTemplate: JSON.stringify({ restaurant: "", user_phone: "" }, null, 2),
      },
      {
        path: "onthego/edit",
        label: "Editar Onthego",
        description: "Editar entrada de la lista de espera virtual.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, { name: "user_phone", label: "Teléfono", type: "text" }, PEOPLE_PARAM],
        bodyTemplate: JSON.stringify({ restaurant: "", user_phone: "", people: 2 }, null, 2),
      },
      {
        path: "onthego/delete",
        label: "Eliminar Onthego",
        description: "Eliminar de la lista de espera virtual.",
        method: "POST",
        bodyParams: [RESTAURANT_PARAM, { name: "user_phone", label: "Teléfono", type: "text" }],
        bodyTemplate: JSON.stringify({ restaurant: "", user_phone: "" }, null, 2),
      },
    ],
  },
  {
    label: "Multilicencias",
    color: "text-gray-500",
    endpoints: [
      {
        path: "multilicense/get_map",
        label: "Mapa Multilicencia",
        description: "Mapa de mesas de una multilicencia.",
        method: "POST",
        bodyParams: [
          { name: "multilicense", label: "Multilicencia", type: "text" },
          DATE_PARAM,
          { name: "luner", label: "Servicio", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ multilicense: "", date: "", luner: "" }, null, 2),
      },
      {
        path: "multilicense/walk_in",
        label: "Walk-in Multilicencia",
        description: "Walk-in en multilicencia.",
        method: "POST",
        bodyParams: [
          { name: "multilicense", label: "Multilicencia", type: "text" },
          HOUR_PARAM, PEOPLE_PARAM,
          { name: "id_table", label: "ID Mesa", type: "text" },
        ],
        bodyTemplate: JSON.stringify({ multilicense: "", hour: "", people: 2, id_table: "" }, null, 2),
      },
      {
        path: "multilicense/get_reserv",
        label: "Reserva Multilicencia",
        description: "Obtener reserva por token en multilicencia.",
        method: "POST",
        bodyParams: [
          { name: "multilicense", label: "Multilicencia", type: "text" },
          { name: "token", label: "Token", type: "text" },
        ],
        bodyTemplate: JSON.stringify({ multilicense: "", token: "" }, null, 2),
      },
      {
        path: "multilicense/get_pays",
        label: "Pagos Multilicencia",
        description: "Pagos de una multilicencia por rango de fechas.",
        method: "POST",
        bodyParams: [
          { name: "multilicense", label: "Multilicencia", type: "text" },
          { name: "pay_date_start", label: "Fecha inicio", type: "date" },
          { name: "pay_date_end", label: "Fecha fin", type: "date" },
          { name: "pay_type", label: "Tipo pago", type: "text", optional: true },
          { name: "pay_ref", label: "Referencia", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ multilicense: "", pay_date_start: "", pay_date_end: "" }, null, 2),
      },
      {
        path: "multilicense/get_refunds",
        label: "Reembolsos Multilicencia",
        description: "Reembolsos de una multilicencia.",
        method: "POST",
        bodyParams: [
          { name: "multilicense", label: "Multilicencia", type: "text" },
          { name: "refund_date_start", label: "Fecha inicio", type: "date" },
          { name: "refund_date_end", label: "Fecha fin", type: "date" },
          { name: "refund_ref", label: "Ref. reembolso", type: "text", optional: true },
          { name: "pay_type", label: "Tipo pago", type: "text", optional: true },
          { name: "pay_ref", label: "Ref. pago", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ multilicense: "", refund_date_start: "", refund_date_end: "" }, null, 2),
      },
      {
        path: "multilicense/get_external_pays",
        label: "Pagos Externos Multilicencia",
        description: "Pagos externos de una multilicencia.",
        method: "POST",
        bodyParams: [
          { name: "multilicense", label: "Multilicencia", type: "text" },
          { name: "pay_date_payment_start", label: "Pago desde", type: "date", optional: true },
          { name: "pay_date_payment_end", label: "Pago hasta", type: "date", optional: true },
          { name: "pay_date_created_start", label: "Creado desde", type: "date", optional: true },
          { name: "pay_date_created_end", label: "Creado hasta", type: "date", optional: true },
          { name: "reserv_token", label: "Token reserva", type: "text", optional: true },
          { name: "pay_ref", label: "Ref. pago", type: "text", optional: true },
          { name: "pay_type", label: "Tipo pago", type: "text", optional: true },
          { name: "pay_type_key", label: "Key tipo pago", type: "text", optional: true },
          { name: "pay_status", label: "Estado pago", type: "text", optional: true },
        ],
        bodyTemplate: JSON.stringify({ multilicense: "", pay_date_payment_start: "", pay_date_payment_end: "" }, null, 2),
      },
    ],
  },
]

// ─── Funciones de fetch ──────────────────────────────────────────

const COVERMANAGER_BASE_URL = "https://www.covermanager.com"

// ─── Rate Limiting Config ─────────────────────────────────────

export const COVERMANAGER_RATE_CONFIG = {
  /** Máximo de peticiones por minuto permitidas por la API */
  requestsPerMinute: parseInt(process.env.COVERMANAGER_RATE_RPM ?? "50"),
  /** Timeout para peticiones (ms) */
  defaultTimeout: parseInt(process.env.COVERMANAGER_TIMEOUT_MS ?? "15000"),
  /** Máximo reintentos por petición */
  maxRetries: parseInt(process.env.COVERMANAGER_MAX_RETRIES ?? "3"),
  /** Delay base para backoff exponencial (ms) */
  retryBaseDelay: 2000,
}

/** Timestamp de la última petición (throttle de intervalo mínimo) */
let _cmLastCall = 0

/** Espera el tiempo necesario para respetar el límite de RPM */
async function coverManagerThrottle(): Promise<void> {
  const minInterval = Math.ceil(60_000 / COVERMANAGER_RATE_CONFIG.requestsPerMinute)
  const wait = minInterval - (Date.now() - _cmLastCall)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  _cmLastCall = Date.now()
}

function isCmRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

async function cmFetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const { maxRetries, retryBaseDelay, defaultTimeout } = COVERMANAGER_RATE_CONFIG

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await coverManagerThrottle()
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(defaultTimeout),
      })
      if (isCmRetryable(response.status) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, retryBaseDelay * 2 ** attempt))
        continue
      }
      return response
    } catch (err) {
      if (attempt === maxRetries) throw err
    }
  }
  throw new Error("CoverManager: max retries exceeded")
}

function getCoverManagerConfig() {
  const apiKey = process.env.COVERMANAGER_API_KEY

  if (!apiKey) {
    throw new Error("COVERMANAGER_API_KEY must be set in environment variables")
  }

  return { baseUrl: COVERMANAGER_BASE_URL, apiKey }
}

/**
 * Fetch genérico GET — la API key se inyecta en la URL reemplazando `:apikey`
 */
export async function fetchCoverManagerGet<T = unknown>(
  pathTemplate: string,
  params?: Record<string, string>
): Promise<T> {
  const { baseUrl, apiKey } = getCoverManagerConfig()

  // Reemplazar :apikey y otros params de la URL
  let path = pathTemplate.replace(":apikey", apiKey)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(value))
    }
  }

  // Limpiar parámetros no reemplazados (opcionales)
  path = path.replace(/\/:[a-zA-Z_]+/g, "")

  const url = `${baseUrl}/api/${path}`

  const response = await cmFetchWithRetry(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`CoverManager API HTTP ${response.status}: ${response.statusText} — ${text.slice(0, 200)}`)
  }

  return response.json()
}

/**
 * Fetch genérico POST — la API key se envía como header `apikey`
 */
export async function fetchCoverManagerPost<T = unknown>(
  pathTemplate: string,
  body: Record<string, unknown>
): Promise<T> {
  const { baseUrl, apiKey } = getCoverManagerConfig()

  // Algunos endpoints POST tienen :apikey en la URL
  const path = pathTemplate.replace(":apikey", apiKey)

  // Determinar si usa /api/ o /apiV2/
  const isV2 = path.startsWith("apiV2/")
  const url = isV2 ? `${baseUrl}/${path}` : `${baseUrl}/api/${path}`

  const response = await cmFetchWithRetry(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => "")
    throw new Error(`CoverManager API HTTP ${response.status}: ${response.statusText} — ${text.slice(0, 200)}`)
  }

  return response.json()
}

// ─── Funciones de conveniencia ──────────────────────────────────

/** Listar todos los restaurantes accesibles */
export async function getRestaurants(city?: string) {
  return fetchCoverManagerGet<{ resp: number; restaurants: CoverManagerRestaurant[] }>(
    "restaurant/list/:apikey/:city",
    city ? { city } : undefined
  )
}

/** Obtener reservas de un restaurante por rango de fechas */
export async function getReservations(
  restaurant: string,
  dateStart: string,
  dateEnd: string,
  page = 1,
  table = 0
) {
  return fetchCoverManagerGet<{ resp: number; reservs: unknown[]; page: number }>(
    "restaurant/get_reservs/:apikey/:restaurant/:date_start/:date_end/:page/:table",
    { restaurant, date_start: dateStart, date_end: dateEnd, page: String(page), table: String(table) }
  )
}

/** Obtener disponibilidad de un restaurante para una fecha */
export async function getAvailability(restaurant: string, date: string) {
  return fetchCoverManagerPost<{ availability: unknown }>(
    "reserv/availability",
    { restaurant, date }
  )
}

/** Listar clientes paginados */
export async function getClients(restaurant: string, page = 1) {
  return fetchCoverManagerPost<{ resp: number; clients: unknown[] }>(
    "clients/clients_list",
    { restaurant, page }
  )
}

// ─── Tipos de respuesta ─────────────────────────────────────────

export interface CoverManagerRestaurant {
  restaurant: string
  name: string
  logo: string
  address: string
  city: string
  phone: string
  waiting_list: string
  currency: string
  timezone: string
  neighbourhood_restaurant: string
  google_place_id: string
  iframe: string
  iframe_iso_languages: Record<string, string>
  latitude: string
  longitude: string
  locality: string
  province: string
  country: string
  postal_code_restaurant: string
  perm: string
  cusine_type?: string
  price_range?: string
  menu?: string
  average_rating?: number
  food?: number
  service?: number
  environment?: number
  tags?: string[]
  images: string[]
}
