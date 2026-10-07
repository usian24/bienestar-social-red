---
name: bienestar-social-reglas
description: Reglas de negocio críticas y patrones de arquitectura para el módulo de Bienestar Social / Salud (Red de Salud Huánuco). Úsalo antes de modificar reportes, lógica de licencias o cálculos de subsidios.
---

# Reglas Críticas del Módulo de Bienestar Social / Salud

El sistema administra licencias por enfermedad, accidentes y otras contingencias. Debido a múltiples revisiones con el usuario, hemos establecido reglas de negocio muy estrictas que **NO DEBEN ROMPERSE** al generar reportes (PDF/Excel) o al procesar datos.

## 1. Agrupación y Tipos de Licencia (El Caso "Salud")
- Los tipos `ENFERMEDAD_COMUN` y `ACCIDENTE_COMUN` se agrupan SIEMPRE bajo el paraguas de **"SALUD"** para los filtros, reportes y Excel.
- `MATERNIDAD`, `PATERNIDAD`, `LEY_30012` son categorías independientes.
- **Dato importante:** Si un certificado médico abarca más de 100 días pero en el texto NO dice textualmente "Maternidad" o "Paternidad", se asume obligatoriamente como `ENFERMEDAD_COMUN`. ¡No intentes adivinar ni cambiar registros en la base de datos basándote en la cantidad de días!

## 2. La Regla de los 20 Días (Cálculo de Subsidios)
La ley y contabilidad interna establecen lo siguiente:
- La Red de Salud (empleador) paga **SOLO los primeros 20 días** de enfermedad en el **AÑO**.
- A partir del día 21, TODO lo demás se considera "Días de Subsidio".
- El contador de 20 días (`diasRedRestantes = 20`) se reinicia a 20 cuando el año del inicio de la licencia (`fechaInicio.getFullYear()`) cambia.
- Al procesar el historial cronológico de un trabajador, se deben evaluar **TODAS** sus licencias desde el 1 de enero para restar correctamente los `diasRedRestantes`.
- **Días de Subsidios en Reportes:** Para la columna "TOTAL DE DÍAS DE SUBSIDIO", se suman todos los días que pasen el límite de 20, **sin importar el origen del certificado** (no discriminar si es `ESSALUD_CITT` o `PARTICULAR`). Se suman todos los que sobrepasen la regla.

## 3. División en "Chunks" (Por Meses)
Las licencias pueden cruzar meses (ej. del 20 de agosto al 10 de septiembre). Para que los reportes cuadren por mes:
- Siempre utiliza la función `splitIntoMonths(inicio, fin)` (ya definida en el código) para separar la licencia en bloques que respeten los límites de inicio y fin de mes.
- Cada "chunk" mantiene cuántos días de ese bloque fueron pagados por la Red (`redDaysInChunk`) y cuántos por subsidio (`subsidioDaysInChunk`).

## 4. Estrictez en Reportes (Fechas y Pestañas Vacías)
- **Filtros "Desde" / "Hasta":** Cuando el usuario solicita un Excel Masivo o un PDF con rango de fechas, **los chunks resultantes DEBEN filtrarse estrictamente**. Si un chunk histórico (ej. marzo) se usó para calcular los 20 días, NO DEBE incluirse en el render final si el usuario pidió el reporte de "Septiembre". Omite lo que esté fuera del rango.
- **Pestañas y Hojas Vacías:** El sistema genera reportes agrupados por `Microred`. Si después de filtrar las fechas resulta que una Microred **no tiene trabajadores** con licencias válidas en ese periodo, **SE DEBE OMITIR COMPLETAMENTE** esa Microred del PDF o Excel. No crear pestañas (tabs) vacías en el modal de UI ni hojas de Excel (`worksheet`) sin datos.

## 5. React Hooks y Modales (UI)
- Para la previsualización, si un modal usa un objeto de filtros anidado (ej. `filters={{ desde, hasta }}`), pásalo al `useEffect` usando `JSON.stringify(filters)` para evitar renders infinitos si el componente padre actualiza las referencias del objeto en cada refetch.

## Origen de Certificados (Prisma)
- El modelo Prisma usa `enum OrigenCertificado { ESSALUD_CITT, PARTICULAR, PARTICULAR_PERDIDO }`. No uses `OrigenLicencia`. 
- **NO restrinjas** el cálculo de días subsidiados únicamente a `ESSALUD_CITT`.

Respeta siempre estas directrices y verifica tu lógica de procesamiento de arrays (`historyChunks`, `allChunks`, etc.) antes de confirmar un cambio.
