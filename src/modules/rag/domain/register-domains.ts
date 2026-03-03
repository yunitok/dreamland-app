import { registerKBDomain } from "./domains"
import { createLookupReservationTool, createGetActiveIncidentsTool, createCheckWaitingListTool } from "@/app/api/atc/chat/tools"

// ─── Dominio ATC ─────────────────────────────────────────────────

registerKBDomain({
  id: "atc",
  label: "ATC - Atencion al Cliente",
  namespace: "atc",
  rbacResource: "atc",
  systemPrompt: `Eres el asistente de Atención al Cliente (ATC) de Dreamland Restaurant.
Ayudas al equipo de sala a responder consultas de clientes de forma rápida y precisa.

CAPACIDADES:
- Buscar información verificada sobre espacios, menús, alérgenos, horarios y servicios
- Consultar reservas existentes por nombre de cliente o fecha
- Ver incidencias activas y alertas operativas del restaurante
- Comprobar la lista de espera para una fecha concreta

REGLAS ESTRICTAS:
1. Para info de espacios/menús/alérgenos/horarios → usa SIEMPRE la herramienta searchKnowledgeBase
2. Para reservas de clientes → usa lookupReservation con el nombre o la fecha
3. NUNCA inventes datos. Si una herramienta no devuelve resultados → indícalo claramente
4. Responde en español, de forma profesional, concisa y amable
5. Cuando uses searchKnowledgeBase, cita la fuente: [Fuente: nombre]
6. Si no puedes ayudar con algo, indica qué información necesitarías para hacerlo`,
  hydePrompt:
    "Eres un experto en restaurantes. Dado una pregunta de cliente, " +
    "genera una respuesta hipotética breve y factual (2-3 frases) como si " +
    "fueras el restaurante respondiendo. No menciones el nombre del restaurante. " +
    "Responde en español.",
  toolsFactory: () => ({
    lookupReservation: createLookupReservationTool(),
    getActiveIncidents: createGetActiveIncidentsTool(),
    checkWaitingList: createCheckWaitingListTool(),
  }),
  suggestedQuestions: [
    "¿Qué espacios tiene el restaurante disponibles para celebraciones?",
    "¿El restaurante es accesible para personas con silla de ruedas?",
    "¿Cuál es el horario de apertura?",
    "¿Qué platos no contienen gluten?",
    "¿Tenéis terraza exterior?",
    "¿Cuál es el aforo máximo del salón principal?",
  ],
  revalidatePath: "/atc/knowledge-base",
  enableTracking: true,
})

// ─── Dominio Sherlock ────────────────────────────────────────────

registerKBDomain({
  id: "sherlock",
  label: "Sherlock - Cocina & Stock",
  namespace: "sherlock",
  rbacResource: "sherlock",
  systemPrompt: `Eres el asistente de cocina Sherlock de Dreamland Restaurant.
Ayudas al equipo de cocina con información sobre recetas, ingredientes, alérgenos y stock.

CAPACIDADES:
- Buscar recetas, fichas técnicas e información de alérgenos
- Consultar ingredientes, sub-recetas y escandallos

REGLAS:
1. Usa SIEMPRE searchKnowledgeBase para consultar información
2. NUNCA inventes datos sobre alérgenos o ingredientes — es información crítica de seguridad alimentaria
3. Responde en español, de forma concisa y técnica
4. Cita la fuente: [Fuente: nombre]`,
  hydePrompt:
    "Eres un chef profesional de restaurante. Dado una pregunta sobre cocina, " +
    "genera una respuesta hipotética breve (2-3 frases) sobre recetas, ingredientes o alérgenos. " +
    "Responde en español.",
  suggestedQuestions: [
    "¿Qué platos no contienen gluten?",
    "¿Cuáles son los alérgenos del risotto de setas?",
    "¿Qué ingredientes lleva la salsa Dreamland?",
    "¿Qué recetas usan langostinos?",
  ],
  revalidatePath: "/sherlock/knowledge-base",
  enableTracking: false,
})
