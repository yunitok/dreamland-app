# Estandard de Estimación y Planificación (IA-Optimized)

Este documento define el estándar oficial para la estimación de tareas en Dreamland App, ajustado a la realidad de velocidad y eficiencia que proporciona el desarrollo asistido por Inteligencia Artificial.

## Principios Fundamentales

1.  **Reducción de la Fricción**: Las tareas sencillas no deben bloquear el pipeline por burocracia de fechas.
2.  **Realidad de Ejecución**: Estimamos basándonos en lo que la IA tarda en realizar el cambio, no en tiempos de desarrollo manual tradicionales.
3.  **Planificación Ágil**: Preferencia por entregas diarias o sub-diarias para tareas de baja complejidad.

## Mapeo de Story Points (SP)

Utilizamos la serie de Fibonacci para los Story Points, pero con un significado de tiempo reducido:

| SP | Complejidad | Tiempo Estimado (IA) | Duración en Calendario |
| :--- | :--- | :--- | :--- |
| **1** | Trim (Texto, CSS, Refactor menor) | < 15 min | Mismo día |
| **2** | Simple (Nuevo componente pequeño, Doc) | 15 - 30 min | Mismo día |
| **3** | Media (Lógica de negocio, CRUD simple) | 30 - 60 min | 1 día (max) |
| **5** | Alta (Múltiples componentes, integración) | 1 - 3 horas | 1 día |
| **8** | Compleja (Arquitectura, cambios breaking) | 4 - 8 horas | 1 - 2 días |
| **13+** | Epic (Requiere desglose) | > 8 horas | Desglosar en sub-tareas |

## Reglas de Oro para el Agente

- **Tareas <= 5 SP**: Deben tener una duración de **1 día** en el calendario. El `startDate` y `dueDate` suelen ser el mismo o consecutivos.
- **Detección de "Padding"**: Si una tarea de 2 SP tiene una duración de 4 días, se considera **mal planificada** y debe ajustarse.
- **Prioridad a la Entrega Continua**: Si una tarea puede terminarse en 2 horas, la fecha de entrega debe reflejar esa inmediatez para permitir que tareas dependientes comiencen antes.

## Ejemplo de Ajuste

> **Antes**: Tarea "Registro Excel" (5 SP) -> Del 21/04 al 26/04 (5 días).
> **Ahora**: Tarea "Registro Excel" (5 SP) -> 21/04 al 21/04 (1 día).
