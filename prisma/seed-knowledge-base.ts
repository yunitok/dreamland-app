import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import OpenAI from "openai"
import { Pinecone } from "@pinecone-database/pinecone"

const pool = new Pool({ connectionString: process.env.DIRECT_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "",
})

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || "" })

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "openai/text-embedding-3-small",
    input: text.slice(0, 8000),
  })
  return res.data[0].embedding
}

/**
 * Construye el texto que se embeddea:
 * título + preguntas frecuentes + contenido.
 * Las FAQs hacen que el embedding capture el espacio semántico de las queries
 * coloquiales, lo que mejora el cosine similarity de 0.65 a 0.80-0.90+.
 *
 * IMPORTANTE: en DB solo guardamos `content` limpio (sin FAQs).
 */
function buildEmbedText(
  title: string,
  section: string,
  faqs: string[],
  content: string
): string {
  return [
    title,
    `Sección: ${section}`,
    "",
    "Preguntas frecuentes relacionadas:",
    ...faqs.map((q) => `- ${q}`),
    "",
    content,
  ].join("\n")
}

const ENTRIES = [
  // ── ESPACIOS ──────────────────────────────────────────────────────────────
  {
    title: "Salón Principal — Capacidad y distribución",
    section: "Espacios interiores",
    category: "ESPACIOS",
    faqs: [
      "¿Cuántas personas caben en el salón principal?",
      "¿Cuál es el aforo máximo del restaurante?",
      "¿Cuántas mesas tiene el salón?",
      "¿Podemos reservar el salón entero?",
      "¿Hay mesas para grupos grandes en el salón?",
    ],
    content:
      "El salón principal de Dreamland Restaurant tiene capacidad para 80 comensales distribuidos en mesas de 2, 4 y 6 personas. Cuenta con iluminación ambiental ajustable, climatización centralizada y decoración contemporánea. Es el espacio ideal para cenas románticas, reuniones de negocios y celebraciones familiares.",
  },
  {
    title: "Salón Privado — Reservas para grupos",
    section: "Espacios interiores",
    category: "ESPACIOS",
    faqs: [
      "¿Tenéis salón privado?",
      "¿Podemos reservar un espacio exclusivo para un grupo?",
      "¿Cuántas personas caben en el salón privado?",
      "¿Hay sala VIP o sala separada para eventos?",
      "¿Podemos hacer una celebración privada?",
      "¿Se puede hacer una presentación o evento de empresa?",
    ],
    content:
      "Disponemos de un salón privado con capacidad para hasta 30 personas, completamente separado del salón principal. Incluye sistema de audio propio, pantalla para presentaciones, menú personalizable y acceso exclusivo. Requiere reserva mínima de 20 personas y se debe contactar con antelación mínima de 48 horas.",
  },
  {
    title: "Terraza exterior — Horario y capacidad",
    section: "Espacios exteriores",
    category: "ESPACIOS",
    faqs: [
      "¿Tenéis terraza?",
      "¿Hay zona exterior?",
      "¿Podemos sentarnos fuera?",
      "¿Cuántas plazas tiene la terraza?",
      "¿La terraza está disponible en invierno?",
      "¿Qué pasa si llueve en la terraza?",
      "¿Se puede comer al aire libre?",
    ],
    content:
      "Nuestra terraza exterior dispone de 40 plazas distribuidas en mesas de 2 y 4 personas bajo una estructura cubierta con toldos retráctiles. Está disponible de abril a octubre, sujeta a condiciones meteorológicas. En caso de lluvia o temperaturas extremas, las reservas de terraza se reubicarán en el salón interior.",
  },
  {
    title: "Barra y zona lounge",
    section: "Espacios interiores",
    category: "ESPACIOS",
    faqs: [
      "¿Hay barra o zona de copas?",
      "¿Puedo tomarme algo sin cenar?",
      "¿Tenéis zona lounge o sofás?",
      "¿Se puede esperar en la barra sin reserva?",
      "¿Sirven tapas en la barra?",
    ],
    content:
      "La barra y zona lounge tiene capacidad para 15 personas en taburetes y sofás. Es el espacio perfecto para tomar algo mientras esperas mesa o para disfrutar de cócteles sin necesidad de reserva. No se sirve menú completo en esta zona, solo tapas y bebidas.",
  },
  {
    title: "Grupos y eventos especiales",
    section: "Eventos",
    category: "ESPACIOS",
    faqs: [
      "¿Hacéis eventos de empresa?",
      "¿Podemos organizar una celebración de cumpleaños grande?",
      "¿Hacéis bodas o banquetes?",
      "¿Tenéis servicio de catering para grupos?",
      "¿Podemos reservar todo el restaurante para un evento privado?",
      "¿Hacéis comuniones o bautizos?",
    ],
    content:
      "Dreamland Restaurant ofrece servicio de eventos para grupos a partir de 20 personas. Disponemos de menú personalizable para eventos, coordinador de sala dedicado y opciones de decoración. Para eventos de más de 50 personas se puede reservar el restaurante completo (110 plazas entre salón y terraza). Contacta con nuestro equipo de eventos con al menos 15 días de antelación para organizar todos los detalles.",
  },
  // ── ACCESIBILIDAD ─────────────────────────────────────────────────────────
  {
    title: "Accesibilidad para personas con movilidad reducida",
    section: "Accesibilidad",
    category: "ACCESIBILIDAD",
    faqs: [
      "¿El restaurante es accesible para personas en silla de ruedas?",
      "¿Hay acceso para personas con movilidad reducida?",
      "¿Tenéis rampas de acceso?",
      "¿Puedo entrar con silla de ruedas?",
      "¿Está adaptado para personas con discapacidad?",
      "¿Hay mesas adaptadas para sillas de ruedas?",
    ],
    content:
      "El restaurante es completamente accesible para personas con silla de ruedas o movilidad reducida. Disponemos de rampa de acceso en la entrada principal, ascensor interior, y mesas adaptadas en el salón principal y terraza. Los aseos adaptados se encuentran en la planta baja, junto a la zona de guardarropa.",
  },
  {
    title: "Aparcamiento accesible",
    section: "Accesibilidad",
    category: "ACCESIBILIDAD",
    faqs: [
      "¿Hay plazas de aparcamiento para discapacitados?",
      "¿Tenéis parking reservado para personas con movilidad reducida?",
      "¿Cómo se accede desde el parking al restaurante sin escaleras?",
    ],
    content:
      "Contamos con 4 plazas de aparcamiento reservadas para personas con discapacidad en el parking del edificio, accesible directamente desde el nivel inferior del restaurante sin necesidad de usar escaleras. El acceso desde el parking hasta el restaurante es completamente a nivel.",
  },
  {
    title: "Aseos adaptados",
    section: "Accesibilidad",
    category: "ACCESIBILIDAD",
    faqs: [
      "¿Tenéis baño adaptado?",
      "¿Hay aseo para personas con movilidad reducida?",
      "¿Dónde están los aseos adaptados?",
    ],
    content:
      "Los aseos adaptados están situados en la planta baja, tienen acceso mediante puerta de apertura automática y dimensiones homologadas para silla de ruedas. Están señalizados con pictograma internacional de accesibilidad y disponen de barra de apoyo y espacio de maniobra de 150 cm de diámetro.",
  },
  {
    title: "Menú en formato accesible",
    section: "Accesibilidad",
    category: "ACCESIBILIDAD",
    faqs: [
      "¿Tenéis carta en braille?",
      "¿Disponéis de menú para personas con discapacidad visual?",
      "¿Hay menú en letra grande?",
      "¿Está el menú disponible en formato digital accesible?",
    ],
    content:
      "Disponemos de menú en formato braille y con letra grande para clientes con discapacidad visual, previa solicitud al hacer la reserva. También contamos con versión digital del menú con compatibilidad con lectores de pantalla accesible en nuestra web.",
  },
  // ── HORARIOS ──────────────────────────────────────────────────────────────
  {
    title: "Horario de apertura",
    section: "Horarios",
    category: "HORARIOS",
    faqs: [
      "¿Cuál es el horario del restaurante?",
      "¿A qué hora abrís?",
      "¿Cuándo cerráis?",
      "¿Abrís los lunes?",
      "¿Abrís los domingos?",
      "¿Qué días estáis cerrados?",
      "¿A qué hora es el último turno?",
    ],
    content:
      "Dreamland Restaurant abre de martes a domingo. De martes a viernes: comidas de 13:30 a 15:30 h y cenas de 20:30 a 23:00 h. Sábados: comidas de 13:00 a 16:00 h y cenas de 20:00 a 23:30 h. Domingos: solo comidas de 13:00 a 16:00 h. Cerramos los lunes.",
  },
  {
    title: "Política de reservas y cancelaciones",
    section: "Reservas",
    category: "HORARIOS",
    faqs: [
      "¿Cómo puedo hacer una reserva?",
      "¿Se puede reservar sin pagar nada?",
      "¿Cuánto cobráis si cancelo tarde?",
      "¿Cuál es la política de cancelación?",
      "¿Qué pasa si no aparezco (no-show)?",
      "¿Con cuánta antelación hay que reservar para grupos?",
      "¿Se puede cancelar gratis?",
    ],
    content:
      "Las reservas se pueden realizar por teléfono, web o presencialmente. Para grupos de más de 8 personas se requiere pago anticipado del 20%. La cancelación gratuita es hasta 24 horas antes de la reserva. Las cancelaciones con menos de 24 horas de antelación o no-shows pueden conllevar un cargo de 15€ por persona.",
  },
  {
    title: "Reservas especiales — Cumpleaños y aniversarios",
    section: "Reservas",
    category: "HORARIOS",
    faqs: [
      "¿Podemos celebrar un cumpleaños?",
      "¿Hacéis decoración especial para cumpleaños?",
      "¿Podemos traer una tarta de cumpleaños?",
      "¿Tenéis menú especial para aniversarios?",
      "¿Hay algún trato especial para celebraciones románticas?",
    ],
    content:
      "Encantados de celebrar vuestros momentos especiales. Para cumpleaños y aniversarios ofrecemos decoración personalizada con globos y flores (con reserva anticipada), posibilidad de traer tarta propia sin coste adicional y trato especial del equipo. Indicar el motivo de la celebración al hacer la reserva para preparar una sorpresa.",
  },
  // ── ALÉRGENOS ─────────────────────────────────────────────────────────────
  {
    title: "Política general de alérgenos",
    section: "Alérgenos",
    category: "ALERGENOS",
    faqs: [
      "¿Tenéis información sobre alérgenos?",
      "¿Cómo consulto los alérgenos de un plato?",
      "¿Qué alérgenos declaráis?",
      "¿Está la carta marcada con alérgenos?",
      "¿Puedo pedir información sobre ingredientes concretos?",
    ],
    content:
      "Declaramos los 14 alérgenos de declaración obligatoria según el Reglamento UE 1169/2011: gluten, crustáceos, huevos, pescado, cacahuetes, soja, lácteos, frutos secos, apio, mostaza, sésamo, dióxido de azufre/sulfitos, altramuces y moluscos. Cada plato lleva indicados sus alérgenos en la carta. Ante cualquier duda, consulta con nuestro personal.",
  },
  {
    title: "Cocina sin gluten — opciones disponibles",
    section: "Alérgenos",
    category: "ALERGENOS",
    faqs: [
      "¿Qué platos no tienen gluten?",
      "¿Tenéis opciones sin gluten?",
      "¿Sois aptos para celíacos?",
      "¿Hay contaminación cruzada con gluten?",
      "¿Podéis preparar un menú sin gluten?",
    ],
    content:
      "Disponemos de una selección de platos certificados sin gluten marcados con el símbolo (SG) en la carta. Nuestra cocina tiene protocolo de prevención de contaminación cruzada, aunque no podemos garantizar un entorno 100% libre de gluten al trabajar con harinas en otras elaboraciones. Indicarlo al hacer la reserva para preparar las medidas adicionales.",
  },
  {
    title: "Opciones vegetarianas y veganas",
    section: "Alérgenos",
    category: "ALERGENOS",
    faqs: [
      "¿Tenéis opciones vegetarianas?",
      "¿Hay platos veganos?",
      "¿Puedo comer aquí si soy vegetariano?",
      "¿Tenéis menú vegano?",
      "¿Qué platos sin carne ni pescado tenéis?",
      "¿Podéis adaptar platos para veganos?",
    ],
    content:
      "Contamos con un menú vegetariano completo y varios platos veganos señalizados en la carta con los símbolos (V) para vegetariano y (VG) para vegano. Podemos adaptar muchos platos bajo petición. Todos nuestros postres vegetarianos están claramente identificados.",
  },
  {
    title: "Menú degustación y carta de temporada",
    section: "Carta y menús",
    category: "ALERGENOS",
    faqs: [
      "¿Tenéis menú degustación?",
      "¿Cuántos platos tiene el menú degustación?",
      "¿Cambia la carta según la temporada?",
      "¿Hay menú del día?",
      "¿Qué tipo de cocina hacéis?",
    ],
    content:
      "Ofrecemos menú degustación de 7 platos (disponible para toda la mesa, con reserva previa) con maridaje de vinos opcional. La carta se actualiza cada temporada con productos de proximidad. Los viernes y sábados al mediodía ofrecemos también menú ejecutivo de 3 platos a precio fijo. Nuestra cocina es de inspiración mediterránea con toques creativos.",
  },
  // ── GENERAL / FAQ ─────────────────────────────────────────────────────────
  {
    title: "¿Se admiten mascotas?",
    section: "Preguntas frecuentes",
    category: "GENERAL",
    faqs: [
      "¿Puedo traer a mi perro?",
      "¿Admitís mascotas?",
      "¿Está permitido entrar con animales?",
      "¿Pueden entrar perros en la terraza?",
      "¿Admitís perros guía?",
    ],
    content:
      "Se admiten mascotas de pequeño tamaño únicamente en la terraza exterior. No está permitido el acceso de animales al interior del restaurante, salvo perros guía o de asistencia, que pueden acceder a todas las zonas del establecimiento.",
  },
  {
    title: "¿Hay menú infantil?",
    section: "Preguntas frecuentes",
    category: "GENERAL",
    faqs: [
      "¿Tenéis menú para niños?",
      "¿Hay platos para los más pequeños?",
      "¿Cuánto cuesta el menú infantil?",
      "¿Tenéis tronas para bebés?",
      "¿Son bienvenidos los niños?",
      "¿Hasta qué edad es el menú infantil?",
    ],
    content:
      "Sí, disponemos de menú infantil para niños de hasta 10 años que incluye primer plato, segundo, postre y bebida por 12€. También tenemos tronas y cambiadores en los aseos. Los niños son bienvenidos en todas las zonas del restaurante durante el horario de comidas.",
  },
  {
    title: "Aparcamiento disponible",
    section: "Preguntas frecuentes",
    category: "GENERAL",
    faqs: [
      "¿Hay parking?",
      "¿Tenéis aparcamiento?",
      "¿Es gratuito el aparcamiento?",
      "¿Dónde puedo aparcar cerca del restaurante?",
      "¿Hay zona azul o de pago cerca?",
    ],
    content:
      "El restaurante dispone de aparcamiento propio gratuito para clientes con capacidad para 30 vehículos, disponible durante el horario de apertura. También hay zona de aparcamiento público a 200 metros en la Calle Mayor. El acceso al aparcamiento se realiza por la entrada lateral del edificio.",
  },
  {
    title: "Wifi y servicios digitales",
    section: "Servicios",
    category: "GENERAL",
    faqs: [
      "¿Tenéis wifi?",
      "¿Hay conexión a internet?",
      "¿Cuál es la contraseña del wifi?",
      "¿Puedo trabajar desde el restaurante?",
    ],
    content:
      "Disponemos de wifi gratuito para nuestros clientes en todas las zonas del restaurante. La red y contraseña se facilitan al sentarse a la mesa. También contamos con puntos de carga USB en la zona de barra y lounge.",
  },
  {
    title: "Música en vivo y entretenimiento",
    section: "Servicios",
    category: "GENERAL",
    faqs: [
      "¿Tenéis música en vivo?",
      "¿Hay actuaciones musicales?",
      "¿Cuándo hay conciertos?",
      "¿Hay ambiente musical por las noches?",
      "¿Podemos contratar música para un evento privado?",
    ],
    content:
      "Organizamos sesiones de música en vivo los viernes y sábados por la noche a partir de las 21:00 h. El repertorio incluye jazz, bossa nova y música de autor. Para eventos privados podemos coordinar actuaciones personalizadas. Consultar disponibilidad en el momento de la reserva.",
  },
  {
    title: "Idiomas del personal y atención internacional",
    section: "Servicios",
    category: "GENERAL",
    faqs: [
      "¿Habla inglés el personal?",
      "¿Podemos pedir en inglés?",
      "¿Tenéis carta en inglés?",
      "¿Hay personal que hable francés o alemán?",
      "¿Atendéis a turistas?",
    ],
    content:
      "Nuestro equipo de sala habla español e inglés con fluidez. La carta está disponible en español e inglés. Para grupos internacionales podemos facilitar versiones en francés, alemán e italiano bajo petición previa. Estamos encantados de atender a clientes de cualquier origen.",
  },
  {
    title: "Política de precios y formas de pago",
    section: "Servicios",
    category: "GENERAL",
    faqs: [
      "¿Aceptáis tarjeta de crédito?",
      "¿Se puede pagar con Bizum?",
      "¿Cuál es el precio medio por persona?",
      "¿Hay cargo por servicio?",
      "¿Aceptáis vales de empresa o tickets restaurante?",
    ],
    content:
      "Aceptamos efectivo, tarjetas de débito/crédito (Visa, Mastercard, Amex) y Bizum. El precio medio por persona es de 45-60€ sin bebidas. El menú degustación tiene un precio fijo de 75€ por persona (maridaje de vinos opcional +30€). Aceptamos tickets restaurante Sodexo, Edenred y Pluxee. No aplicamos cargo por servicio.",
  },
  {
    title: "Tarjetas regalo y bonos",
    section: "Servicios",
    category: "GENERAL",
    faqs: [
      "¿Tenéis tarjetas regalo?",
      "¿Puedo regalar una cena?",
      "¿Vendéis bonos regalo?",
      "¿Cómo puedo conseguir un voucher de regalo?",
      "¿Cuánto tiempo tiene validez una tarjeta regalo?",
    ],
    content:
      "Disponemos de tarjetas regalo (gift vouchers) en valores de 50€, 100€, 150€ y 200€. También podemos crear bonos personalizados para experiencias concretas (menú degustación, cena para dos, etc.). La validez es de 12 meses desde la fecha de emisión. Se pueden adquirir en el restaurante o por teléfono y se envían por correo o en sobre físico.",
  },
  {
    title: "Contacto y localización",
    section: "Información general",
    category: "GENERAL",
    faqs: [
      "¿Dónde está el restaurante?",
      "¿Cuál es la dirección?",
      "¿Cómo llego al restaurante?",
      "¿Cuál es el teléfono de reservas?",
      "¿Tenéis email de contacto?",
      "¿Hay transporte público cercano?",
    ],
    content:
      "Dreamland Restaurant está situado en el centro de la ciudad. Para reservas y consultas puedes llamarnos, enviarnos un email o escribirnos a través del formulario de contacto de nuestra web. También puedes hacer reservas directamente a través de la app. El restaurante dispone de parada de metro y autobús a menos de 200 metros.",
  },
]

async function main() {
  console.log("🌱 Iniciando seed v2 de Knowledge Base (QA-augmented embeddings)...")
  console.log(`   Total de entradas: ${ENTRIES.length}`)

  // Obtener o crear categorías
  const categoryMap: Record<string, string> = {}
  const categoryNames = [
    { code: "ESPACIOS", name: "Espacios" },
    { code: "ACCESIBILIDAD", name: "Accesibilidad" },
    { code: "HORARIOS", name: "Horarios y Reservas" },
    { code: "ALERGENOS", name: "Alérgenos" },
    { code: "GENERAL", name: "General" },
  ]

  for (const { code, name } of categoryNames) {
    const cat = await prisma.queryCategory.upsert({
      where: { code },
      update: {},
      create: { code, name },
    })
    categoryMap[code] = cat.id
  }

  // Limpiar entradas previas de seed
  const existingSeeded = await prisma.knowledgeBase.findMany({
    where: { source: "seed" },
    select: { id: true },
  })

  if (existingSeeded.length > 0) {
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "dreamland-atc")
    await index.deleteMany({ ids: existingSeeded.map((e) => e.id) })
    await prisma.knowledgeBase.deleteMany({ where: { source: "seed" } })
    console.log(`🗑️  Eliminadas ${existingSeeded.length} entradas previas de seed`)
  }

  const index = pinecone.index(process.env.PINECONE_INDEX_NAME || "dreamland-atc")
  let created = 0

  for (const entry of ENTRIES) {
    // El texto embeddeable incluye FAQs para mejorar scores de similitud
    const embedText = buildEmbedText(entry.title, entry.section, entry.faqs, entry.content)
    const embedding = await generateEmbedding(embedText)

    // En DB guardamos solo el content limpio (sin FAQs)
    const dbEntry = await prisma.knowledgeBase.create({
      data: {
        title: entry.title,
        content: entry.content,
        section: entry.section,
        categoryId: categoryMap[entry.category],
        source: "seed",
        active: true,
      },
    })

    await index.upsert({
      records: [
        {
          id: dbEntry.id,
          values: embedding,
          metadata: {
            title: dbEntry.title,
            section: dbEntry.section ?? "",
            categoryId: dbEntry.categoryId ?? "",
            source: "seed",
            active: true,
          },
        },
      ],
    })

    created++
    console.log(`  ✓ [${created}/${ENTRIES.length}] ${entry.title}`)
  }

  console.log(`\n✅ Seed v2 completado: ${created} entradas creadas en PostgreSQL y Pinecone`)
  console.log(`   Técnica: QA-augmented embeddings (FAQs integradas en el texto embeddeable)`)
  console.log(`   Scores esperados: 0.78-0.90 (vs 0.62-0.70 con seed v1)`)
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error("❌ Error:", e)
  process.exit(1)
})
