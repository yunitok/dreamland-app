# Reglas Globales del Agente - Dreamland App

## Idioma y Comunicación
- Todas las respuestas, explicaciones y comentarios deben ser estrictamente en **castellano**.
- Si necesitas razonar internamente en otro idioma, la salida final al usuario debe ser traducida.

## Uso Proactivo de Skills (OBLIGATORIO)
- **ANTES de escribir código o diseñar una solución**, revisa la lista de skills disponibles en el system prompt y determina cuáles son relevantes para la tarea.
- **INVOCA la herramienta `Skill`** para cada skill cuyo trigger coincida con la tarea. Ejemplo: si vas a diseñar un schema Prisma, invoca `prisma-expert`; si vas a crear UI con Tailwind, invoca `tailwind-patterns`; si vas a hacer una server action, invoca `api-design-principles`.
- Puedes invocar múltiples skills en una misma tarea si son relevantes.
- **Al final de cada respuesta**, añade una sección "🛠️ Skills Locales Utilizadas" listando las skills invocadas. Si ninguna aplica, indícalo explícitamente con justificación.
- **NO te limites a "conocer" las skills** — debes ejecutarlas activamente con la herramienta Skill para que sus instrucciones se carguen en contexto.

## Optimización de Tokens y Estilo
- Sé conciso en las explicaciones técnicas.
- Sigue las convenciones de código establecidas en el proyecto para TypeScript y Prisma.