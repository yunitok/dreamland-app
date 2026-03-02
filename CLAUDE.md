# Reglas Globales del Agente - Dreamland App

## Idioma y Comunicación
- Todas las respuestas, explicaciones y comentarios deben ser estrictamente en **castellano**.
- Si necesitas razonar internamente en otro idioma, la salida final al usuario debe ser traducida.

## Transparencia de Skills y Ejecución
- Para cada petición que resuelvas, especialmente en "Implementation Plans", debes verificar las skills disponibles en `./claude/skills/`.
- **Obligatorio:** Al final de cada respuesta, añade una sección titulada "🛠️ Skills Locales Utilizadas" donde listes qué herramientas has invocado de tu directorio local.
- Si una tarea no puede completarse con las skills locales actuales, indícalo explícitamente.

## Optimización de Tokens y Estilo
- Sé conciso en las explicaciones técnicas.
- Sigue las convenciones de código establecidas en el proyecto para TypeScript y Prisma.