---
title: Parte Meteorológico y Alertas
description: Sistema de previsión meteorológica, generación automática de alertas, dashboard visual y configuración de umbrales
---

# Parte Meteorológico y Alertas

El sistema meteorológico consulta APIs externas (AEMET y OpenWeatherMap) para obtener previsiones por ciudad, evalúa umbrales configurables y genera alertas automáticas cuando se prevén condiciones adversas que puedan afectar al servicio de los restaurantes.

---

## Acceso

**Ruta:** `/atc/operations` → pestaña **Alertas Meteo**

**Permisos requeridos:**

| Operación | Rol mínimo |
|-----------|-----------|
| Ver alertas y previsiones | `ATC_VIEWER` (read:atc) |
| Consultar AEMET | `ATC_AGENT` (manage:atc) |
| Crear alerta manual | `ATC_AGENT` (manage:atc) |
| Monitorizar/resolver alertas | `ATC_AGENT` (manage:atc) |
| Configurar umbrales | `ATC_AGENT` (manage:atc) |

---

## Estructura de la Pestaña

La pestaña "Alertas Meteo" tiene tres secciones principales:

1. **Panel de Previsión** — Botón "Consultar AEMET" + tarjetas por ciudad con datos meteorológicos
2. **Dashboard de Alertas** — KPIs resumen, gráfico de barras por ciudad/severidad, tarjetas por ciudad con sparklines
3. **Tabla de Alertas** — Listado detallado con acciones por fila

En la cabecera de la página hay tres botones:
- **Nueva alerta meteo** — Crear una alerta manualmente
- **Configuración meteorológica** (icono engranaje) — Editar umbrales y franja horaria

---

## Consultar Previsión (AEMET / OpenWeatherMap)

### Cómo funciona

1. Haz clic en **"Consultar AEMET"** en el panel de previsión.
2. El sistema consulta las APIs externas para cada ciudad donde hay un restaurante activo.
3. Se muestran tarjetas por ciudad con la previsión de los próximos 2-3 días.
4. Si algún valor supera los umbrales configurados, se generan alertas automáticamente.

### Cascada de fuentes de datos

El sistema intenta obtener datos en este orden de prioridad:

| Prioridad | Fuente | API | Detalle |
|-----------|--------|-----|---------|
| 1 | **AEMET Horaria** | `prediccion/especifica/municipio/horaria/{id}` | Datos hora a hora para 48h. Permite filtrar temperaturas por franja de servicio. Es la fuente más precisa. |
| 2 | **AEMET Diaria** | `prediccion/especifica/municipio/diaria/{id}` | Fallback si la horaria falla. Datos por día completo para 3 días. No filtra por franja horaria. |
| 3 | **OpenWeatherMap** | `/data/2.5/forecast` (lat/lon) | Fallback final. Intervalos de 3 horas, agrupados por día. También filtra por franja de servicio. |
| — | `NONE` | — | Si todas las fuentes fallan, la tarjeta muestra "Sin datos" y no se generan alertas. |

### Tarjetas de ciudad

Cada tarjeta muestra:
- Nombre de la ciudad con icono de ubicación
- Temperatura min-max del día actual (grandes, en color)
- Probabilidad de lluvia (%) y acumulado (mm)
- Velocidad del viento / rachas (km/h)
- Tabla de previsión para los próximos días
- Badge con el número de alertas generadas (si las hay)
- Indicador de la fuente de datos (AEMET, OPENWEATHERMAP, NONE)

### Deduplicación de alertas

Al consultar la previsión, el sistema **no crea alertas duplicadas**. Antes de crear una alerta comprueba si ya existe una con la misma combinación de:
- `alertType` (tipo de alerta)
- `forecastDate` (fecha de previsión)
- `location` (ciudad)
- Estado `ACTIVE` o `MONITORING`

Si ya existe, no la duplica. Esto permite consultar AEMET repetidamente sin generar ruido.

---

## Franja Horaria de Servicio

### El problema

Los restaurantes operan aproximadamente de 12:00 a 00:00. La temperatura mínima del día suele darse de madrugada (4:00-6:00 AM). Una mínima de 4°C a las 5 de la mañana con 20°C a las 14:00 no debería generar una alerta de frío extremo, porque durante el servicio hace buen tiempo.

### La solución

El sistema filtra las temperaturas para considerar **solo las horas dentro de la franja de servicio**:

- **Por defecto:** 12:00 a 00:00 (medianoche)
- **Configurable** desde el dialog de configuración meteorológica
- La franja puede cruzar medianoche (ej: 20:00 a 04:00)

**Ejemplo práctico:**

Si la franja es 12:00-00:00 y las temperaturas del día son:

| Hora | Temp |
|------|------|
| 05:00 | 4°C |
| 08:00 | 10°C |
| 12:00 | 18°C |
| 15:00 | 22°C |
| 20:00 | 16°C |
| 23:00 | 12°C |

El sistema solo considera 18°C, 22°C, 16°C y 12°C. La mínima sería 12°C (no 4°C), así que con el umbral por defecto de 8°C **no se generaría alerta de frío**.

> **Nota:** El filtro de franja horaria solo aplica a temperaturas. La precipitación y el viento se evalúan sobre el día completo porque afectan igualmente a la logística aunque sea fuera de horario de servicio (montaje de terraza, preparación, etc.).

---

## Tipos de Alerta

| Tipo | Icono | Clave interna | Cuándo se genera |
|------|-------|--------------|-----------------|
| Lluvia | CloudRain | `RAIN` | Probabilidad > umbral O acumulado > umbral |
| Viento | Wind | `WIND` | Velocidad sostenida > umbral O rachas > umbral |
| Calor extremo | Thermometer | `TEMPERATURE_HIGH` | Máxima en franja de servicio > umbral |
| Frío extremo | Snowflake | `TEMPERATURE_LOW` | Mínima en franja de servicio < umbral |
| Tormenta | CloudLightning | `STORM` | Generación manual o futura integración |
| Nieve | CloudSnow | `SNOW` | Generación manual o futura integración |
| Granizo | CloudHail | `HAIL` | Generación manual o futura integración |
| Niebla | CloudFog | `FOG` | Generación manual o futura integración |

Los tipos STORM, SNOW, HAIL y FOG actualmente solo se generan manualmente. En el futuro pueden integrarse con alertas de AEMET.

---

## Severidad de las Alertas

La severidad se calcula automáticamente según la magnitud de la excedencia:

### Lluvia
| Condición | Severidad |
|-----------|-----------|
| Probabilidad > umbral (ej: >50%) | MEDIUM |
| Probabilidad > 70% O lluvia > 15mm | HIGH |
| Probabilidad > 70% Y lluvia > 15mm | CRITICAL |

### Viento
| Condición | Severidad |
|-----------|-----------|
| Velocidad > umbral (ej: >40 km/h) | MEDIUM |
| Rachas > 60 km/h | HIGH |
| Rachas > 80 km/h | CRITICAL |

### Temperatura
| Condición | Severidad |
|-----------|-----------|
| Mínima < umbral frío (ej: <8°C) | MEDIUM |
| Mínima < 3°C | HIGH |
| Máxima > umbral calor (ej: >36°C) | MEDIUM |
| Máxima > 40°C | HIGH |

---

## Estados de una Alerta y Ciclo de Vida

### Estados disponibles

| Estado | Badge | Significado |
|--------|-------|------------|
| **Activa** (`ACTIVE`) | Rojo | Alerta vigente que requiere atención |
| **Monitorizando** (`MONITORING`) | Amarillo | En seguimiento, sin acción inmediata requerida |
| **Resuelta** (`RESOLVED`) | Verde | Se han tomado las acciones necesarias |
| **Expirada** (`EXPIRED`) | Gris | La fecha de previsión ya pasó (asignada por sistema) |

### Diagrama de transiciones

```
                  ┌──────────────┐
     Creación ──→ │   ACTIVE     │
                  └──────┬───────┘
                         │
                   Monitorizar
                         │
                         ▼
                  ┌──────────────┐
                  │  MONITORING  │
                  └──────┬───────┘
                         │
                      Resolver
                         │
                         ▼
                  ┌──────────────┐
                  │   RESOLVED   │  ← También accesible directamente desde ACTIVE
                  └──────────────┘

                  ┌──────────────┐
                  │   EXPIRED    │  ← Asignado por el sistema
                  └──────────────┘
```

### Acciones disponibles por estado

| Estado actual | Monitorizar | Resolver | Ver reservas |
|---------------|:-----------:|:--------:|:------------:|
| **ACTIVE** | Si | Si | Si |
| **MONITORING** | No (ya está) | Si | Si |
| **RESOLVED** | No | No | Si |
| **EXPIRED** | No | No | Si |

### Monitorizar una alerta

**Qué significa:** Poner una alerta en estado "Monitorizando" indica que el equipo es consciente de la situación pero no requiere acción inmediata. Por ejemplo, hay previsión de lluvia para dentro de 3 días y se decide esperar a ver cómo evoluciona.

**Cómo se hace:**
1. En la tabla de alertas, haz clic en el menú de acciones (`⋯`) de la alerta.
2. Selecciona **"Monitorizando"** (icono de reloj amarillo).
3. La alerta cambia a estado `MONITORING`.

**Limitaciones:**
- Solo se puede monitorizar una alerta que esté en estado `ACTIVE`. El botón aparece deshabilitado para cualquier otro estado.
- **No se puede volver de MONITORING a ACTIVE desde la interfaz.** Si se pone en monitoreo por error, las opciones son:
  - Resolver la alerta directamente (si ya no es relevante)
  - Corregirlo manualmente en base de datos

> **Nota técnica:** La server action `updateWeatherAlertStatus` sí soporta cambiar a cualquier estado (incluyendo volver a `ACTIVE`), pero la UI no ofrece esa opción. Esto se podría mejorar añadiendo un botón "Reactivar" en el menú para alertas en estado `MONITORING`.

### Resolver una alerta

**Cómo se hace:**
1. En la tabla de alertas, haz clic en el menú de acciones (`⋯`).
2. Selecciona **"Resolver alerta"** (icono de check verde).
3. Se abre un dialog que solicita:
   - **Acciones tomadas** (obligatorio, mínimo 5 caracteres) — Describe qué se hizo: "Se retiró mobiliario de terraza", "Se avisó a los clientes de terraza para reubicarlos en interior", etc.
   - **Resuelta por** (opcional) — Nombre del responsable que gestionó la situación.
4. Haz clic en **"Resolver alerta"**.

**Efectos de resolver:**
- Estado → `RESOLVED`
- `isActive` → `false`
- Se registra `resolvedAt` (timestamp) + `actionsTaken` + `resolvedBy`
- La alerta deja de contabilizar en los KPIs de "alertas activas"

**Limitaciones:**
- **No se puede revertir** una alerta resuelta. Una vez marcada como `RESOLVED`, no hay botón para volver a `ACTIVE` o `MONITORING`.
- El botón "Resolver" está deshabilitado para alertas que ya estén en `RESOLVED` o `EXPIRED`.

### Ver reservas afectadas

Desde cualquier alerta (independientemente de su estado):
1. Haz clic en el menú de acciones (`⋯`).
2. Selecciona **"Ver reservas afectadas"**.
3. Se abre un dialog con las reservas del día de la previsión que estén en estado `PENDING` o `CONFIRMED`.
4. La tabla muestra: nombre del cliente, hora, comensales, estado y canal de reserva.

Esto permite evaluar el impacto real de la alerta meteorológica antes de tomar una decisión.

---

## Dashboard de Alertas

### Barra de KPIs

4 indicadores en la parte superior:

| KPI | Descripción | Color |
|-----|-------------|-------|
| Alertas activas | Total de alertas en estado ACTIVE + MONITORING | Rojo si hay CRITICAL, ámbar si hay otras |
| Ciudades afectadas | Número de ciudades distintas con alertas | Azul |
| Alertas críticas | Suma de alertas con severidad HIGH + CRITICAL | Rojo si > 0 |
| Próxima previsión | Fecha más cercana con alerta activa | Neutral |

### Gráfico de barras por ciudad

Gráfico horizontal apilado que muestra, para cada ciudad, cuántas alertas tiene por nivel de severidad:

- **Rojo:** CRITICAL
- **Naranja:** HIGH
- **Amarillo:** MEDIUM
- **Azul:** LOW

Al hacer clic en una barra, la tabla inferior se filtra automáticamente por esa ciudad.

### Tarjetas por ciudad

Grid de tarjetas que agrupa todas las alertas por ciudad. Cada tarjeta muestra:
- Nombre de la ciudad
- Número de alertas activas (en grande)
- Barra de severidad proporcional (indica el % de cada nivel)
- Badges del tipo de alerta predominante (Lluvia, Frío, Viento...)
- Fechas de previsión afectadas
- Mini sparkline mostrando la evolución de severidad por fecha
- Botón "Ver detalle" que filtra la tabla por esa ciudad

### Filtro por ciudad

Cuando se selecciona una ciudad (desde el gráfico, una tarjeta o el botón "Ver detalle"):
- La tabla se filtra automáticamente por esa ciudad
- Aparece un chip con el nombre de la ciudad y un botón `X` para limpiar el filtro
- La vista hace scroll suave hacia la tabla

El filtro es un toggle: si haces clic en la misma ciudad, se desactiva.

---

## Crear una Alerta Manual

Para situaciones no cubiertas por la generación automática (tormentas localizadas, granizo puntual, etc.):

1. Haz clic en **"Nueva alerta meteo"** en la cabecera.
2. Rellena el formulario:

| Campo | Obligatorio | Detalle |
|-------|------------|---------|
| Tipo de alerta | Si | RAIN, WIND, TEMPERATURE_HIGH, TEMPERATURE_LOW, STORM, SNOW, HAIL, FOG |
| Severidad | Si | LOW, MEDIUM, HIGH, CRITICAL |
| Ubicación | Si | Selector con las ciudades donde hay restaurantes activos |
| Fecha previsión | Si | Fecha para la que se prevé la condición adversa |
| Descripción | Si | Mínimo 10 caracteres describiendo la situación |
| Precipitación (mm) | No | Dato numérico opcional |
| Viento (km/h) | No | Dato numérico opcional |
| Temperatura (°C) | No | Dato numérico opcional |

3. Haz clic en **"Registrar"**.
4. La alerta se crea con `source: "MANUAL"` y estado `ACTIVE`.

---

## Configuración de Umbrales

### Acceso

Haz clic en el botón **engranaje** (⚙️) en la cabecera de la página de operaciones.

### Parámetros configurables

| Sección | Parámetro | Valor por defecto | Descripción |
|---------|-----------|-------------------|-------------|
| **Precipitación** | Probabilidad (%) | 50% | Umbral de probabilidad de lluvia para generar alerta |
| **Precipitación** | Acumulado (mm) | 5 mm | Umbral de milímetros acumulados |
| **Viento** | Velocidad sostenida (km/h) | 40 km/h | Umbral de viento sostenido |
| **Viento** | Rachas (km/h) | 60 km/h | Umbral de rachas de viento |
| **Temperatura** | Umbral frío (°C) | 8°C | Por debajo de este valor se genera alerta TEMPERATURE_LOW |
| **Temperatura** | Umbral calor (°C) | 36°C | Por encima de este valor se genera alerta TEMPERATURE_HIGH |
| **Horario de servicio** | Hora inicio | 12:00 | Hora a partir de la cual se evalúan temperaturas |
| **Horario de servicio** | Hora fin | 00:00 | Hora hasta la que se evalúan temperaturas (0 = medianoche) |

### Cómo se aplican

Los umbrales se aplican **en la próxima consulta de previsión**. Al cambiarlos:
1. Edita los valores en el dialog.
2. Haz clic en **"Guardar"**.
3. Haz clic en **"Consultar AEMET"** para que el sistema reevalúe con los nuevos umbrales.

Las alertas ya existentes no se recalculan automáticamente al cambiar los umbrales.

---

## Tabla de Alertas

### Columnas

| Columna | Contenido |
|---------|----------|
| Tipo de alerta | Icono + nombre (Lluvia, Viento, Frío extremo, etc.) |
| Ubicación | Icono de pin + nombre de la ciudad |
| Descripción | Texto truncado con el detalle de la alerta |
| Severidad | Badge coloreado (Baja, Media, Alta, Crítica) |
| Estado | Badge coloreado (Activa, Monitorizando, Resuelta, Expirada) |
| Fecha previsión | Formato "lun, 21 feb" |
| Fecha creación | Formato "dd/mm/aaaa" |
| Acciones | Menú desplegable |

### Búsqueda

La tabla incluye un buscador por descripción en la parte superior.

---

## Preguntas Frecuentes

### Si pongo una alerta en "Monitorizando" por error, ¿puedo volver atrás?

Actualmente **no desde la interfaz**. El botón "Monitorizar" desaparece una vez que la alerta está en estado MONITORING. Las opciones son:
- **Resolver la alerta** si ya no es relevante.
- **Contactar con un administrador** para cambiar el estado directamente en base de datos.

> La server action `updateWeatherAlertStatus` soporta técnicamente la vuelta a `ACTIVE`, pero la UI no expone esta opción. Es una mejora pendiente.

### ¿Las alertas se generan automáticamente sin intervención?

Solo cuando alguien hace clic en "Consultar AEMET". No hay un cron automático configurado actualmente. Si se implementase un cron que llame a `checkWeatherNow()`, las alertas se generarían periódicamente sin intervención.

### ¿Qué pasa si consulto AEMET varias veces?

No se duplican alertas. El sistema verifica si ya existe una alerta con el mismo tipo, fecha y ciudad en estado ACTIVE o MONITORING antes de crear una nueva.

### ¿Las alertas expiran solas?

El estado `EXPIRED` existe en el modelo pero actualmente no hay un proceso automático que lo asigne. Es un estado reservado para un futuro cron que marque como expiradas las alertas cuya `forecastDate` ya pasó.

### ¿Puedo crear una alerta de tipo que no esté en la lista?

No. Los tipos están fijos en el enum de Prisma: RAIN, WIND, TEMPERATURE_HIGH, TEMPERATURE_LOW, STORM, SNOW, HAIL, FOG. Si se necesitara un nuevo tipo habría que modificar el schema de la base de datos.

### ¿Qué reservas se muestran como "afectadas"?

Solo las reservas con estado `PENDING` o `CONFIRMED` cuya fecha coincida con la `forecastDate` de la alerta. No se muestran reservas canceladas, completadas o no-show.

---

## Modelo de Datos

### WeatherAlert

```prisma
model WeatherAlert {
  id               String               @id @default(cuid())
  alertType        WeatherAlertType
  severity         WeatherAlertSeverity  @default(MEDIUM)
  status           WeatherAlertStatus    @default(ACTIVE)
  source           WeatherAlertSource    @default(MANUAL)
  description      String
  forecastDate     DateTime
  location         String
  precipitationMm  Float?
  windSpeedKmh     Float?
  temperatureC     Float?
  threshold        Float?
  isActive         Boolean               @default(true)
  action           String                @default("NOTIFY")
  actionsTaken     String?
  triggeredAt      DateTime?
  resolvedAt       DateTime?
  resolvedBy       String?
  rawForecastData  Json?
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
}
```

### WeatherConfig

```prisma
model WeatherConfig {
  id                 String   @id @default("default")
  rainProbability    Float    @default(50)
  rainMm             Float    @default(5)
  windSpeed          Float    @default(40)
  windGust           Float    @default(60)
  temperatureLow     Float    @default(8)
  temperatureHigh    Float    @default(36)
  serviceHoursStart  Int      @default(12)
  serviceHoursEnd    Int      @default(0)
  updatedAt          DateTime @updatedAt
}
```

---

## Archivos Principales

| Archivo | Descripción |
|---------|-------------|
| `src/lib/weather.ts` | Lógica de consulta AEMET/OWM, evaluación de umbrales, filtro de franja horaria |
| `src/modules/atc/actions/operations.ts` | Server actions: `getWeatherAlerts`, `createWeatherAlert`, `updateWeatherAlertStatus`, `resolveWeatherAlert`, `getAffectedReservations`, `getWeatherConfig`, `updateWeatherConfig`, `checkWeatherNow` |
| `src/modules/atc/ui/operations/weather-forecast-panel.tsx` | Panel de previsión con botón "Consultar AEMET" y tarjetas por ciudad |
| `src/modules/atc/ui/operations/weather-alerts-dashboard.tsx` | Dashboard orquestador: KPIs + gráfico + tarjetas + tabla |
| `src/modules/atc/ui/operations/weather-alerts-chart.tsx` | Gráfico de barras apiladas por ciudad/severidad (Recharts) |
| `src/modules/atc/ui/operations/weather-city-alert-cards.tsx` | Tarjetas por ciudad con sparklines |
| `src/modules/atc/ui/operations/weather-alerts-table.tsx` | Tabla de alertas con filtro por ciudad y acciones |
| `src/modules/atc/ui/operations/weather-alert-dialog.tsx` | Dialog de creación de alerta manual |
| `src/modules/atc/ui/operations/weather-config-dialog.tsx` | Dialog de configuración de umbrales |
| `src/modules/atc/ui/operations/resolve-alert-dialog.tsx` | Dialog de resolución (acciones tomadas + responsable) |
| `src/modules/atc/ui/operations/affected-reservations-dialog.tsx` | Dialog de reservas afectadas por fecha |
| `src/modules/atc/domain/schemas.ts` | Schemas Zod: `weatherAlertSchema`, `resolveWeatherAlertSchema` |
