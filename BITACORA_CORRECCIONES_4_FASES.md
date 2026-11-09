# Bitácora Técnica de Auditoría y Correcciones (Fases 1 a 4)

**Proyecto:** Bienestar Social y Salud — Red de Salud Huánuco  
**Fecha de cierre:** 2026-11-09  
**Línea base de datos preservada:** `1,620` trabajadores · `256` licencias reales · `85` establecimientos · `28` microredes  
**Estado final comprobado:** `npm run lint` (`0` errores) · `npx tsc --noEmit` (`0` errores) · `npm run build` (`0` errores, `43/43` páginas compiladas, `0` warnings Turbopack) · Smoke E2E sobre servidor de producción `next start` (`4/4 PASS`).

> **Propósito de este documento:** Servir como punto de partida técnico y mapa de diagnóstico ante cualquier incidencia futura. Para cada fase se detalla primero **qué estaba mal y su causa raíz**, y luego **qué se modificó exactamente, en qué archivos y cómo se probó**.

---

## Resumen Rápido por Fases

| Fase | Foco Principal | Qué resolvimos | Verificación superada |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Seguridad, RBAC y Archivos | Cierre de endpoints abiertos, control real en BD (`activo`, rol, permisos, `microredId`), bloqueo IDOR/XSS en uploads | `tsc` exit 0 · `8/8` suites HTTP en vivo (puerto 3099) |
| **Fase 2** | Reglas de Negocio (`SKILL.md`), Fechas y Reportes | Motor único calendario UTC/Lima (`T05:00:00Z`), reinicio anual de 20 días, separación `LEY_30012`/`PARTICULAR_PERDIDO`, fixes Excel/PDF/UI | `tsc` exit 0 · `7/7` suites funcionales + ExcelJS real |
| **Fase 3** | IA Gemini, OCR CITT, PDF Evidencias y ML Python | Modelos Gemini activos (`gemini-3.5-flash-lite`), OCR nativo para PDF, anexos PDF privados, datos reales sin `random`/`hash` en Python y segmentación ML por microred | `tsc` exit 0 · `6/6` suites reales (Gemini + `.venv` Python + PDF) |
| **Fase 4** | Calidad ESLint, React 19/Compiler y Build Producción | Ignores en `eslint.config.mjs`, eliminación de los 41 errores React/Hooks/TS en `src/`, fix `WordMovableController`, `next build` limpio | `npm run lint` (0 err) · `tsc` (0 err) · `npm run build` (0 err) · `4/4` E2E en `next start` |

---

## FASE 1 — Seguridad, Autenticación, RBAC y Subida Segura de Archivos

### 1.1 Qué estaba mal antes (Errores detectados)

1. **Middleware con exclusiones abiertas (`src/proxy.ts`) y rutas `/api/*` sin validación de sesión:**
   - `src/proxy.ts` excluía expresamente `/api` y `/uploads` en el `matcher`.
   - Múltiples endpoints de lectura, creación, edición, borrado y exportación masiva no invocaban `getServerSession` ni verificaban rol/permisos ni `microredId`:
     - Lectura y CRUD: `GET/POST /api/licencias`, `PUT/DELETE /api/licencias/[id]`, `GET /api/filtros`, `POST /api/importar-excel`, `POST /api/generar-informe`.
     - Exportaciones individuales y masivas: `GET /api/salud/excel/[id]`, `GET /api/salud/personal-pdf/[id]`, `GET /api/salud/excel-masivo`, `GET /api/salud/rango-pdf`, `GET /api/maternidad/excel/[id]`, `GET /api/maternidad/excel-masivo`, `GET /api/paternidad/excel-masivo` (entre otros).
   - En `PUT/DELETE /api/licencias/[id]` solo se comprobaba si existía `session.user?.id`, permitiendo que cualquier usuario autenticado (`TRABAJADOR`, `VISUALIZADOR` o `SEDE_ADMIN` de otra microred) modificara o borrara licencias ajenas.
   - En `POST /api/licencias`, el chequeo de `microredId` solo se ejecutaba si `userMicroredId` era *truthy*, dejando pasar a un `TRABAJADOR` o usuario sin microred asignada (fallo *fail-open*).

2. **Permisos de `permisos.ts` desalineados respecto al backend y roles inconsistentes:**
   - Rutas como `ml/route.ts` y `MLDashboardCard.tsx` verificaban el string `'ADMIN'` (inexistente en base de datos), mientras otras ignoraban el catálogo de permisos granulares definido en `src/shared/utils/permisos.ts`.
   - Usuarios desactivados en PostgreSQL (`activo = false`) seguían operando con su cookie JWT vigente hasta que expirara el token.
   - `GET /api/me`, `GET /api/usuarios` y `PUT /api/usuarios/[id]` llegaban a exponer campos sensibles (`passwordHash`) o no restringían la escalada a `SUPER_ADMIN` ni impedían auto-desactivación.

3. **Autenticación insegura heredada y cambio de contraseña débil:**
   - `src/app/api/auth/[...nextauth]/route.ts` mantenía un fallback para aceptar contraseñas en texto plano almacenadas en BD.
   - `prisma/importar_excel.ts` generaba usuarios con contraseña en texto plano sin `bcryptjs`.
   - `src/app/api/trabajador/cambiar-password/route.ts` requería endurecimiento para limitar el autoservicio al rol `TRABAJADOR` y exigir validación estricta `bcrypt` de la contraseña actual.

4. **Subida arbitraria de archivos (Stored XSS) y exposición pública de evidencias (`public/uploads`):**
   - `POST /api/upload` no validaba sesión ni tamaño máximo, tomaba la extensión literal del nombre enviado (`file.name.split('.').pop()`) sin comprobar *magic bytes* ni formato real, y guardaba archivos directamente en `public/uploads/` (accesibles anónimamente por cualquier persona y propensos a servir `.svg` / `.html` / `.js` bajo el mismo origen).

5. **Path Traversal en ensamblador de PDF y fugas de microred en `/api/alertas` y chatbot:**
   - `src/features/reportes/services/ensambladorPdf.ts` concatenaba rutas relativas sin verificar que la ruta resuelta permaneciera confinada dentro de `storage_vol/evidencias/`.
   - El frontend (`DashboardLayout` y `inicio/page.tsx`) lanzaba peticiones administrativas cuando iniciaba sesión un `TRABAJADOR`, generando errores `403` innecesarios en consola.

---

### 1.2 Soluciones implementadas en la Fase 1

1. **Núcleo centralizado de autorización contra PostgreSQL (`src/core/auth/rbac.ts`):**
   - [`getAuthContext()`](src/core/auth/rbac.ts): consulta en vivo a PostgreSQL (`activo`, `rol.nombre`, `rol.permisos`, `permisosExtra`, `microredId`, `microred.nombre`). Si el usuario fue desactivado o eliminado, devuelve `null` (revocación inmediata incluso con JWT activo).
   - [`hasAnyPermission()`](src/core/auth/rbac.ts): valida permisos efectivos reales sobre `PERMISOS` (`SUPER_ADMIN` tiene paso directo).
   - [`canAccessWorkerMicrored()`](src/core/auth/rbac.ts): obliga coincidencia exacta de `microredId` para roles no-`SUPER_ADMIN`.
   - [`requireStaffAccess()`](src/core/auth/rbac.ts): política **fail-closed** uniforme: devuelve `401` si no hay sesión vigente, `403` automático si `rol === 'TRABAJADOR'` (incluso si tuviera `permisosExtra` inyectados en BD), `403` si faltan permisos/rol requerido y `403` si un rol no-`SUPER_ADMIN` carece de `microredId` (salvo `allowMissingMicrored: true` en auditoría autorizada).

2. **Endurecimiento de credenciales, sesión y rutas protegidas:**
   - `src/app/api/auth/[...nextauth]/route.ts`: exige hashes `bcrypt` (`$2a$`/`$2b$`), registra en auditoría intentos inválidos/fallidos, restringe `redirect` seguros manteniendo compatibilidad LAN/USB por HTTP y activa cookies seguras condicionadas a `https://`.
   - `src/proxy.ts`: matcher ampliado para cubrir todas las páginas y rutas privadas salvo exclusiones públicas explícitas (`/login`, `/api/auth`, activos estáticos).
   - `src/app/api/me/route.ts`: proyección estricta de campos sin exponer `passwordHash`.
   - `src/app/api/trabajador/cambiar-password/route.ts`: restringido estrictamente a `rol === 'TRABAJADOR'`, validando contraseña actual con `bcrypt.compare` y auditando fallos/cambios.
   - `prisma/importar_excel.ts`: hashea contraseñas con `bcryptjs` al crear cuentas.

3. **Blindaje de todos los endpoints `/api/*` y aislamiento por `microredId`:**
   - Se protegió con `requireStaffAccess` + filtro/validación por `microredId` (`canAccessWorkerMicrored` o filtro Prisma por `establecimiento.microredId`):
     - Licencias y carga: `src/app/api/licencias/route.ts`, `src/app/api/licencias/[id]/route.ts`, `src/app/api/licencias/escanear-citt/route.ts`, `src/app/api/licencias/importar-excel/route.ts`, `src/app/api/importar-excel/route.ts`, `src/app/api/generar-informe/route.ts`.
     - Consultas clínicas y analíticas: `src/app/api/salud/route.ts`, `src/app/api/maternidad/route.ts`, `src/app/api/paternidad/route.ts`, `src/app/api/dashboard/route.ts`, `src/app/api/alertas/route.ts`, `src/app/api/trabajadores/buscar/route.ts`, `src/app/api/filtros/route.ts`, `src/app/api/ml/route.ts`, `src/app/api/chat/route.ts`.
     - Todas las exportaciones Excel y PDF: `salud/excel/[id]`, `maternidad/excel/[id]`, `paternidad/excel/[id]`, `salud/personal-pdf/[id]`, `maternidad/personal-pdf/[id]`, `paternidad/personal-pdf/[id]`, `salud/rango-pdf`, `salud/excel-masivo`, `maternidad/excel-masivo`, `paternidad/excel-masivo`.
     - Administración: `usuarios/route.ts` y `usuarios/[id]/route.ts` (bloqueo de creación/edición de `SUPER_ADMIN` por terceros, sin `passwordHash` en `GET`/`PUT`), `roles/route.ts`, `roles/[id]/route.ts`, `auditoria/route.ts`, `logs/route.ts`, `sistema/salud/route.ts`.

4. **Almacenamiento privado y validación real de archivos (`upload` + `evidencias`):**
   - `src/app/api/upload/route.ts`: limitado a `15 MB`, valida firma binaria `%PDF-` o formato raster real vía `sharp(buffer).metadata()` dentro de `{ jpeg, png, webp, gif, heif, tiff }` (rechaza con `415` archivos `.svg`/`.html`/`.js` disfrazados), normaliza imágenes a `.webp` y las guarda en `storage_vol/evidencias/` (fuera de `public/`), devolviendo `/api/evidencias/evidencia-...`.
   - Nuevo endpoint protegido `src/app/api/evidencias/[filename]/route.ts`: valida `FILENAME_REGEX`, verifica sesión y pertenencia del archivo a un trabajador de la microred del usuario (o al propio `dni` si es `TRABAJADOR`), impide *path traversal* con `resolveInside` y sirve con `X-Content-Type-Options: nosniff`.
   - `src/shared/components/DetallesTrabajadorModal.tsx`, `src/app/(dashboard)/layout.tsx` y `src/app/(dashboard)/inicio/page.tsx`: adaptados para evitar llamadas administrativas cuando el rol es `TRABAJADOR` y mostrar evidencia autenticada segura.

---

### 1.3 Pruebas ejecutadas en Fase 1 (`8/8 PASS`)

- `npx tsc --noEmit` -> **EXIT 0**.
- Suite HTTP en vivo contra Next.js aislado (puerto `3099`):
  1. `PASS`: **32 endpoints críticos devolvieron `401`** sin sesión autenticada.
  2. `PASS`: **Login rechazado** cuando un usuario tiene contraseña en texto plano sin prefijo bcrypt.
  3. `PASS`: **`TRABAJADOR` (aun con `permisosExtra` en BD)** accede solo a `/api/me` sin `passwordHash` y recibe `403` en rutas administrativas/exportación/upload.
  4. `PASS`: **`SEDE_ADMIN` opera (`200`)** dentro de su microred asignada (`22`) y recibe `403` al intentar cruzar a otra microred, bypass por `?microred=` o endpoints administrativos.
  5. `PASS`: **Fail-closed** — rol administrativo con `microredId = null` bloqueado (`403`).
  6. `PASS`: **`SUPER_ADMIN` conserva acceso total (`200`)** y `GET`/`PUT` `/api/usuarios` no devuelven `passwordHash`.
  7. `PASS`: **`POST /api/upload` rechaza SVG disfrazado de PNG (`415`)**, guarda PNG válido convertido a `.webp` en `storage_vol/evidencias/` (nada en `public/uploads/`) y `/api/evidencias/...` exige sesión y microred.
  8. `PASS`: **Revocación inmediata** — al cambiar `activo = false` en BD, la cookie JWT activa queda bloqueada (`401`/`403`) en la siguiente petición.

---

## FASE 2 — Reglas de Negocio (`SKILL.md`), Fechas UTC/Lima y Bugs Funcionales en Reportes/UI

### 2.1 Qué estaba mal antes (Errores detectados)

1. **Divergencia de reglas de cálculo de subsidios (20 días) entre rutas, UI y Excel:**
   - Según las reglas institucionales (`SKILL.md`), en **Salud** (`ENFERMEDAD_COMUN` + `ACCIDENTE_COMUN`) los primeros **20 días por año calendario** los asume la Red y desde el día **21** subsidia EsSalud (incluyendo tanto `ESSALUD_CITT` como `PARTICULAR`, excepto `PARTICULAR_PERDIDO` que vale `0`). Además, `LEY_30012` debe ir separada (100% Red, nunca consume la cuota de 20 días de enfermedad) y `MATERNIDAD` subsidia desde el día 1 en `ESSALUD_CITT` y `PARTICULAR`.
   - **Antes ocurría:**
     - `GET /api/salud` mezclaba `LEY_30012` en el acumulado de 20 días y **no** reiniciaba la cuota cada año calendario.
     - `GET /api/dashboard` calculaba `subsidiosPendientes` evaluando solo `ENFERMEDAD_COMUN` (ignorando `ACCIDENTE_COMUN`) y sin reinicio anual.
     - `src/features/licencias/services/calculoSubsidio.ts` y `formatearTrabajadorParaContexto` en `api/chat/route.ts` acumulaban todos los años sin corte del 1 de enero.
     - `GET /api/salud/rango-pdf`, cuando `tipoLicencia === '--TODOS--'`, metía `MATERNIDAD`, `PATERNIDAD` y `LEY_30012` dentro del acumulador de 20 días de Red.
     - `PrevisualizadorExcelModal.tsx` calculaba de forma inversa a `salud/excel/[id]` (usaba las licencias ordenadas `desc`, incluía `LEY_30012` y no reiniciaba por año), mostrando cifras en pantalla distintas al Excel descargado.
     - `GET /api/maternidad/excel-masivo` solo sumaba subsidios cuando `origen === 'ESSALUD_CITT'`, omitiendo `PARTICULAR` válido, y tanto `maternidad/excel-masivo` como `paternidad/excel-masivo` fijaban el año actual (`new Date().getFullYear()`) agrupando únicamente por índice de mes (`0..11`), mezclando registros de otros años.

2. **Desfase horario de `-1 día` (`UTC` vs `America/Lima`, `UTC-5`):**
   - `POST /api/licencias` y `PUT /api/licencias/[id]` guardaban `new Date("YYYY-MM-DD")` (medianoche UTC `T00:00:00Z` = `19:00` del día anterior en Perú), mientras `licencias/importar-excel` sumaba `+5h`.
   - Varias vistas y endpoints usaban `.getFullYear()`, `.getDate()` o `.toISOString().split('T')[0]` sin normalización de calendario, provocando desfases de `-1 día` o cambios de mes/año en límites (31 dic / 1 ene).
   - Al importar un Excel, la deduplicación no contemplaba simultáneamente registros legados `T00:00:00Z` y normalizados `T05:00:00Z`.

3. **Bugs funcionales concretos en reportes, filtros y pantallas:**
   - **Crash JSON en reporte detallado:** `src/app/(dashboard)/salud/reporte-detallado/[id]/page.tsx` llamaba a `fetch('/api/salud/excel/' + id)` y ejecutaba `res.json()`, fallando porque ese endpoint devolvía un archivo binario `.xlsx`.
   - **Campo incorrecto en encabezados PDF:** `salud/reporte/[id]/page.tsx` y `salud/reporte-detallado/[id]/page.tsx` mostraban `trabajador.cargo` bajo el título `CONDICIÓN LABORAL:`.
   - **Visor de logs inutilizable:** `src/app/(dashboard)/logs/page.tsx` ejecutaba `logs.split('\\n')` (doble barra literal) en vez de `'\n'`, colapsando todo el log en una sola línea.
   - **Estado erróneo en portal del trabajador:** `TrabajadorDashboard.tsx` leía `lic.estado === 'ACTIVA'` (campo inexistente en `schema.prisma`), pintando siempre `"CERRADA"`, y mostraba mal `PARTICULAR_PERDIDO`.
   - **Precedencia `OR` rota en auditoría:** `GET /api/auditoria` al combinar `tipo=ERRORES`/`ADVERTENCIAS` con `busqueda` inyectaba la búsqueda en el mismo array `where.OR`, devolviendo eventos normales que coincidieran con la búsqueda.
   - **Excel masivos y merges defectuosos:**
     - `salud/rango-pdf` creaba hojas (`addWorksheet`) antes de verificar si existían trabajadores en el rango, produciendo pestañas vacías (violando `SKILL.md`), realizaba merge `A:L` en tablas de `14` columnas (`A:N`), y filtraba por `year` fijo rompiendo rangos multi-año `desde`/`hasta`.
     - `paternidad/excel-masivo` realizaba merge `A1:L1` (12 columnas) sobre una tabla de `9` columnas (`A:I`), y `maternidad`/`paternidad` no devolvían licencias en orden cronológico ascendente ni generaban respaldo `SIN REGISTROS` coherente.
     - Nombres de pestañas Excel sin sanitizar caracteres prohibidos (`* ? : \ / [ ]`) o mayores a `31` caracteres.
   - **Filtros UI desincronizados:** `salud/page.tsx` deshabilitaba el selector de establecimiento en `Sede Administrativa` si `microred === 'Todas'`; `maternidad/page.tsx` y `paternidad/page.tsx` arrancaban con `ambito = 'Microred'` sin soportar `'Todos'` ni `'Sede Administrativa'`; `salud/reporte-rango/page.tsx` omitía `tipoLicencia` en dependencias de efecto; y botones `EXCEL`/`PDF` ocultaban acciones a roles con permiso válido en `permisos.ts`.

---

### 2.2 Soluciones implementadas en la Fase 2

1. **Motor único calendario y reglas de negocio (`src/core/licencias/calculoSubsidios.ts`):**
   - **Normalización de fechas calendario sin corrimiento horario:**
     - [`getCalendarDateStr()`](src/core/licencias/calculoSubsidios.ts): extrae `'YYYY-MM-DD'` exacto sin importar si viene como `'YYYY-MM-DD'`, `'T00:00:00.000Z'` o `'T05:00:00.000Z'`.
     - [`parseNormalizedCalendarDate()`](src/core/licencias/calculoSubsidios.ts): valida calendario real (incluyendo años bisiestos) y guarda a las `05:00:00 UTC` (medianoche Lima) para que UTC y `America/Lima` coincidan siempre en año/mes/día.
     - [`formatCalendarDateDMY()`](src/core/licencias/calculoSubsidios.ts), [`addDaysToCalendarDate()`](src/core/licencias/calculoSubsidios.ts) y [`splitIntoMonthsCalendar()`](src/core/licencias/calculoSubsidios.ts): aritmética UTC pura por meses y días.
     - [`buildUniqueSheetName()`](src/core/licencias/calculoSubsidios.ts): limpia caracteres inválidos de Excel, acota estrictamente a `<= 31` chars y desduplica sufijos `(2)`, `(3)`.
   - **Motor único de cálculo de días y subsidios:**
     - [`calcularResumenSaludTrabajador()`](src/core/licencias/calculoSubsidios.ts), [`calcularHistorialDetalladoSalud()`](src/core/licencias/calculoSubsidios.ts) y [`calcularChunksReportes()`](src/core/licencias/calculoSubsidios.ts):
       - Acumulan `ENFERMEDAD_COMUN` + `ACCIDENTE_COMUN` con **reinicio anual estricto de los primeros 20 días** cada año calendario (`ESSALUD_CITT` y `PARTICULAR`).
       - Separan `LEY_30012` (100% Red, 0 impacto en cuota de 20 días de enfermedad ni subsidio EsSalud).
       - Anulan `PARTICULAR_PERDIDO` (`0` Red y `0` Subsidio en Salud, Maternidad y Paternidad).

2. **Ingesta, endpoints API, auditoría y exportaciones Excel/PDF unificadas:**
   - **Alta, edición e importación Excel:** `api/licencias/route.ts`, `api/licencias/[id]/route.ts` y `api/licencias/importar-excel/route.ts` normalizan todas las fechas a `T05:00:00.000Z`; la importación deduplica consultando el rango UTC completo del día (`00:00:00Z`..`23:59:59.999Z`) para reconocer registros antiguos y nuevos por igual.
   - **Paridad total en APIs:** `api/salud/route.ts`, `api/dashboard/route.ts`, `features/licencias/services/calculoSubsidio.ts` y `api/chat/route.ts` utilizan la lógica anual unificada de `calculoSubsidios.ts` (el KPI `subsidiosPendientes` coincide exactamente con los trabajadores con subsidio Salud > 0).
   - **Reportes Excel y PDF:**
     - `api/salud/excel/[id]/route.ts`: soporta `?preview=true` (JSON para el reporte detallado) y descarga `.xlsx` binario con cálculo calendario idéntico.
     - `api/salud/rango-pdf/route.ts`, `api/salud/excel-masivo/route.ts`, `api/maternidad/excel-masivo/route.ts`, `api/paternidad/excel-masivo/route.ts`: eliminan creación de hojas vacías, añaden hoja única `SIN REGISTROS` cuando el filtro resulta vacío, corrigen merges (`A1:N1` en rango Salud, `A1:I1` en Paternidad), incluyen `PARTICULAR` en subsidios de Maternidad, respetan rangos multi-año (`desde`/`hasta` sin `year` impuesto) y excluyen `PARTICULAR_PERDIDO`.
     - `api/maternidad/route.ts` y `api/paternidad/route.ts`: devuelven licencias en orden cronológico ascendente.
   - **Auditoría:** `api/auditoria/route.ts` construye `where = { AND: andConditions }` para que `modulo`, `tipo` (`ERRORES`/`ADVERTENCIAS`/`AUDITORIA`) y `busqueda` nunca se pisen en el mismo `OR`.

3. **Correcciones de interfaz y subrutas (`UI`):**
   - `salud/reporte-detallado/[id]/page.tsx`: consume `/api/salud/excel/${id}?preview=true` en vez de intentar parsear el `.xlsx` binario como JSON.
   - `salud/reporte/[id]/page.tsx` y `salud/reporte-detallado/[id]/page.tsx`: muestran `trabajador.condicionLaboral` (con fallback controlado) en `CONDICIÓN LABORAL:`.
   - `logs/page.tsx`: corrige el separador a `logs.split('\n')`.
   - `TrabajadorDashboard.tsx`: muestra el origen/estado real (`EN CURSO` / `FINALIZADA` por fecha calendario + etiqueta de `PARTICULAR_PERDIDO`).
   - `PrevisualizadorExcelModal.tsx`, `PrevisualizadorExcelMaternidadModal.tsx`, `PrevisualizadorExcelPaternidadModal.tsx`, `DetallesTrabajadorModal.tsx`, `NuevoCittModal.tsx`: sincronizados con fechas calendario y reglas de `calculoSubsidios.ts`.
   - `salud/page.tsx`, `maternidad/page.tsx`, `paternidad/page.tsx` y `salud/reporte-rango/page.tsx`: filtros consistentes (`Todos` / `Microred` / `Sede Administrativa`), ordenamiento real y reenvío completo de filtros y permisos a exportación/PDF.

---

### 2.3 Pruebas ejecutadas en Fase 2 (`7/7 PASS`)

- `npx tsc --noEmit` -> **EXIT 0**.
- Suite en vivo (`verify_fase2.mjs`) contra PostgreSQL real + `ExcelJS` (`7/7 PASS`):
  1. `PASS`: Motor puro — años bisiestos (`2024-02-28`..`2024-03-02`), nombres Excel `<= 31` chars únicos sin caracteres inválidos, reinicio anual de 20 días (`2025` vs `2026`), `LEY_30012` y `PARTICULAR_PERDIDO`.
  2. `PASS`: Paridad matemática real en BD entre `/api/salud`, `/api/dashboard`, `/api/salud/personal-pdf/[id]` y `/api/salud/excel/[id]?preview=true` (verificado trabajador `46251634` con reinicio multianual).
  3. `PASS`: `POST /api/licencias` persiste `T05:00:00.000Z` y registros tanto `T05:00Z` como legados `T00:00Z` muestran fechas exactas sin corrimiento `-1` en PDF, Excel y preview.
  4. `PASS`: Reglas por tipo y origen en Salud, Maternidad (`PARTICULAR` subsidia, `PARTICULAR_PERDIDO = 0`) y Paternidad (`excel-masivo` con merge `A1:I1`).
  5. `PASS`: Rango multi-año (`2025-12-01`..`2026-02-28` sin `year`) conserva 2025; rangos sin datos (`2099`) devuelven `sheets: []` en preview y 1 hoja `SIN REGISTROS` en `.xlsx`.
  6. `PASS`: `GET /api/auditoria?tipo=ERRORES&busqueda=...` aplica `AND` estricto y `/api/licencias/importar-excel` deduplica `T00:00Z` vs `T05:00Z`.
  7. `PASS`: `/api/maternidad` y `/api/paternidad` ordenan cronológicamente ascendente.

---

## FASE 3 — IA Google Gemini, Escáner OCR, Ensamblador PDF y Machine Learning Real

### 3.1 Qué estaba mal antes (Errores detectados)

1. **Integración Gemini desactualizada y errores de formato de historial:**
   - Las rutas de chat y OCR probaban primero modelos retirados o con errores `404` (`gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`) provocando caídas o latencia en cascada antes de responder, y `api/sistema/salud` seguía reportando configuración obsoleta.
   - En `/api/chat`, cuando el usuario enviaba el mensaje inicial junto al saludo pre-cargado del asistente (`remitente: 'asistente'`), Gemini recibía `contents` comenzando por el rol `model` (rechazado por la API con error 400). Además, la búsqueda de trabajadores y bloqueo por microred/rol necesitaban endurecimiento para no filtrar datos a `SEDE_ADMIN` fuera de jurisdicción o formatos JSON a `TRABAJADOR`.

2. **Fallo del escáner OCR con archivos PDF y falta de control por microred:**
   - `POST /api/licencias/escanear-citt` enviaba cualquier archivo (incluyendo `.pdf`) a `sharp(buffer)`, lanzando excepción al intentar decodificar un PDF como imagen rasterizada.
   - Si un `SEDE_ADMIN` escaneaba un certificado cuyo DNI pertenecía a un trabajador de otra microred, el endpoint no aplicaba bloqueo jurisdiccional.
   - Archivos corruptos/binarios inválidos podían provocar respuestas `500` en lugar de `400` limpio.

3. **Ensamblador PDF (`ensambladorPdf.ts`) roto con las rutas privadas de Fase 1:**
   - Tras mover las evidencias a `/api/evidencias/[filename]` (almacenadas en `storage_vol/evidencias/`), `ensambladorPdf.ts` seguía resolviendo rutas antiguas de `public/uploads/` o no reconocía el prefijo `/api/evidencias/`, fallando al adjuntar anexos en `POST /api/generar-informe`. Tampoco protegía de forma estricta contra *path traversal* (`../../.env`).

4. **Pipeline Machine Learning (`ml_engine/`, `/api/ml`, `MLDashboardCard.tsx`, `MLMiniCard.tsx`) con datos ficticios y contrato roto:**
   - **Contrato roto en `/api/ml`:** `train_all_models.py` exportaba `modelo1_forecasting.proyeccionesProximosMeses`, mientras `GET /api/ml` buscaba `data.modelo1_proyeccion?.proyeccionProximosMeses`; el prorrateo nunca se ejecutaba y `SEDE_ADMIN` recibía totales provinciales completos (e incluso detalles de otras microredes).
   - **Datos sintéticos / falsos en Python (`train_all_models.py`):**
     - Modelo 1 reemplazaba históricos `<12` meses con `np.random` y estimaba subsidios con tasa fija `0.58` en lugar de calcular la regla real de los 20 días.
     - Modelo 2 y Modelo 3 recortaban listas a Top-6 (`head(6)`) y Top-8 (`[:8]`), y Modelo 3 calculaba `dias_transcurridos = abs(hash(id + dni)) % 26 + 3` con muestras logísticas sintéticas.
     - Modelo 5 contaba `PARTICULAR_PERDIDO` como EsSalud y asignaba porcentajes inventados o pisos falsos a establecimientos sin licencias (`0` registros).
   - **Gráficas y métricas hardcodeadas en UI (`MLDashboardCard.tsx` y `MLMiniCard.tsx`):**
     - Mostraban cifras estáticas escritas a mano (`"1,620 servidores"`, `Ene: 88 ... Oct: 105`, `1510 / 61 / 35 / 14`, escalas fijas, pisos `Math.max(1, ...)`, doble multiplicación por cuota al combinar servidor + cliente, y validación errónea de rol `'ADMIN'`).

---

### 3.2 Soluciones implementadas en la Fase 3

1. **Cliente resiliente unificado para Google Gemini (`src/core/ai/gemini.ts`):**
   - Configurada la cadena de modelos activos verificados (`GEMINI_ACTIVE_CHAT_MODELS` y `GEMINI_ACTIVE_OCR_MODELS`): `'gemini-3.5-flash-lite'` (recomendado), `'gemini-3.1-flash-lite'`, `'gemini-flash-lite-latest'`, `'gemini-3.6-flash'`, `'gemini-3.5-flash'`.
   - Implementada rotación automática de claves configuradas (`getConfiguredGeminiKeys`), timeouts diferenciados (`15s` Lite / `22s` Flash), salto inmediato ante `404` sin desperdiciar claves, y [`extractGeminiText()`](src/core/ai/gemini.ts) filtrando partes internas `thought`.
   - Actualizado `src/app/api/sistema/salud/route.ts` para reportar el estado real de Gemini (`gemini-3.5-flash-lite`, número de claves válidas configuradas y lista de respaldos activos) restringido a `SUPER_ADMIN`.

2. **Chatbot institucional y Escáner OCR CITT (`chat/route.ts` y `escanear-citt/route.ts`):**
   - `src/app/api/chat/route.ts`: elimina mensajes iniciales del rol `model` para garantizar que `contents` inicie en `user`, reporta `modeloUsado` real, refuerza aislamiento jurisdiccional para `SEDE_ADMIN` y bloqueo de privacidad/JSON para `TRABAJADOR`.
   - `src/app/api/licencias/escanear-citt/route.ts`: detecta PDFs por MIME/extensión/firma `%PDF` y los envía nativamente como `application/pdf` a Gemini Vision (sin pasar por `sharp`); aplica `sharp` con realce de contraste solo a imágenes válidas (respondiendo `HTTP 400` ante binarios inválidos), corrige regex base64, usa cálculo `Date.UTC` y aplica bloqueo fail-closed (`bloqueadoPorMicrored: true`) si el trabajador detectado pertenece a otra microred distinta a la del `SEDE_ADMIN`.

3. **Ensamblador de Expedientes PDF (`src/features/reportes/services/ensambladorPdf.ts` y `/api/generar-informe`):**
   - Resuelve correctamente rutas `/api/evidencias/<archivo>` y `/uploads/<archivo>` hacia `storage_vol/evidencias/` verificando prefijos con `path.resolve` (rechazando cualquier intento de *path traversal* como `../../.env`).
   - Fusiona páginas de anexos PDF nativos y convierte imágenes (PNG/JPG/WEBP) vía `sharp` incrustadas a escala dentro de páginas A4; `POST /api/generar-informe` valida autorización de microred (`403`).

4. **Pipeline Real de Machine Learning + API `/api/ml` + UI (`ml_engine/`, `src/app/api/ml/route.ts`, `MLDashboardCard.tsx`, `MLMiniCard.tsx`):**
   - `ml_engine/extract_from_db.js` y `ml_engine/train_all_models.py`:
     - Eliminados datos sintéticos aleatorios, fórmulas `hash % 26` y tasas fijas `0.58`/`0.55`.
     - Cálculo exacto de días de subsidio (>20 días por año calendario vía `compute_exact_license_subsidies`), preservación de los **85 establecimientos** y 28 microredes normalizadas, historial real de meses (`historialMensual` + `historialPorMicrored`), exclusión de `PARTICULAR_PERDIDO` en EsSalud, y estado `'Sin registros en periodo'` con `0%`/`0%` para establecimientos sin licencias.
     - Entrenamiento sin recortes ocultos Top-6/Top-8 (M1 ganador `Ridge Temporal Regularizado`, M2 `1,620` analizados y `51` casos atípicos reales, M3 `94` particulares reales).
   - `src/app/api/ml/route.ts`:
     - Corregido el contrato hacia `modelo1_forecasting`, segmenta correctamente proyecciones, anomalías, certificados de riesgo, clustering y establecimientos por microred usando `yaSegmentadoPorServidor = true`, impide a `SEDE_ADMIN` saltarse su microred vía `?microred=` y oculta `historialPorMicrored` / datos de otras jurisdicciones.
     - `POST /api/ml` restringido a `SUPER_ADMIN`, ejecuta extracción + entrenamiento `.venv` con `PYTHONIOENCODING='utf-8'` y `PYTHONUTF8='1'` (y fallback multiplataforma `python`).
   - `MLDashboardCard.tsx`, `MLMiniCard.tsx` y `analisis/page.tsx`:
     - Conectados a métricas reales del JSON (sin textos ni histogramas inventados), eliminación de doble multiplicación gracias a `!data.yaSegmentadoPorServidor`, escalas dinámicas en los 5 tabs, pesos reales del Random Forest en Tab 3, badge `'Todos'` exacto en Tab 5 y chequeo estricto `rol === 'SUPER_ADMIN'`.

---

### 3.3 Pruebas ejecutadas en Fase 3 (`6/6 PASS`)

- `npx tsc --noEmit` -> **EXIT 0**.
- Suite en vivo (`verify_fase3.mjs`) contra servidor activo, PostgreSQL, `.venv\Scripts\python.exe` y Gemini API real (`6/6 PASS`):
  1. `PASS`: `GET /api/sistema/salud` reportó `gemini-3.5-flash-lite`, `3` claves activas, cero modelos obsoletos, `401`/`403` RBAC.
  2. `PASS`: `POST /api/chat` respondió con Gemini real (`modeloUsado=gemini-3.5-flash-lite`) limpiando saludo inicial `asistente` y bloqueando consultas cross-microred o JSON.
  3. `PASS`: `POST /api/licencias/escanear-citt` procesó tanto **PNG** (`FormData`) como **PDF nativo** (`application/pdf` JSON base64) con Gemini Vision, bloqueó cross-microred a `SEDE_ADMIN` y devolvió `400` ante archivo corrupto.
  4. `PASS`: `POST /api/generar-informe` resolvió `/api/evidencias/` y `/uploads/`, ensambló carátula + PNG + PDF anexo (`3` páginas verificadas), ignoró `../../.env` y bloqueó `403` cross-microred.
  5. `PASS`: `GET/POST /api/ml` entregó métricas reales (`85` establecimientos, `1,620` trabajadores, agosto 2026 = `212` días subsidio), aisló `SEDE_ADMIN` ignorando `?microred=CHURUBAMBA` y re-entrenó de extremo a extremo vía `.venv`.
  6. `PASS`: SSR `/analisis` y `/auditoria` devolvieron `HTTP 200` sin excepciones.

---

## FASE 4 — ESLint, React 19 / Compiler, TypeScript y Build de Producción

### 4.1 Qué estaba mal antes (Errores detectados)

1. **`npm run lint` rotos por configuración incompleta (`eslint.config.mjs`):**
   - No se ignoraban carpetas externas o generadas (`.venv/**` con JS interno de scikit-learn, `android/**` con artefactos de Gradle/Capacitor, `ml_engine/**`, `storage_vol/**`, `prisma/*.js`, `seed_workers.js`), produciendo cientos de falsos errores externos.

2. **41 errores reales de React 19 / React Compiler / TS dentro de `src/` (+1 en `prisma/importar_excel.ts`):**
   - **10 errores `react-hooks/immutability` + `set-state-in-effect` en `WordMovableController.tsx`:** guardaba el nodo DOM real (`selectedEl`) en estado React y luego mutaba directamente `selectedEl.style.left/top/width/...`, violando la inmutabilidad del React Compiler y arriesgando fallos de renderizado en producción.
   - **16 errores `react-hooks/set-state-in-effect` y 1 `react-hooks/purity` en componentes y páginas del dashboard:**
     - `ChatbotAsistente.tsx` llamaba `setPosicionBurbuja`/`setMensajes` sincrónicamente al montar y llamaba `Date.now()` antes de `await` dentro de una función referenciada en render.
     - `NuevoCittModal.tsx` reseteaba 18 estados mediante un gran `useEffect` al abrir el modal en lugar de remontar limpio por props/`key`.
     - `MLDashboardCard.tsx` y `VisorDocumentoA4.tsx` sincronizaban valores derivados en `useEffect`.
     - `DetallesTrabajadorModal.tsx`, `inicio/page.tsx`, `personal/page.tsx`, `layout.tsx`, `auditoria/page.tsx`, `logs/page.tsx`, `maternidad/page.tsx`, `paternidad/page.tsx`, `roles/page.tsx`, `salud/page.tsx` y `usuarios/page.tsx` disparaban `setState` síncronos en efectos o llamaban helpers async de componente directamente desde `useEffect`.
   - **10 errores `react/no-unescaped-entities`:** comillas dobles sin escapar en JSX dentro de las vistas de reportes y `ReporteMensualTemplate.tsx`.
   - **4 errores `prefer-const`:** variables reasignables declaradas con `let` sin mutación posterior (`chat/route.ts`, `importar-excel/route.ts`, `calculoSubsidios.ts`, `prisma/importar_excel.ts`).
   - **6 advertencias `react-hooks/exhaustive-deps` en `MLDashboardCard.tsx`:** la función pura `matchMr` declarada dentro del componente cambiaba de identidad en cada render.
   - **1 advertencia de trazado completo en Turbopack (`next build`):** `readFile(candidate)` en `api/evidencias/[filename]/route.ts` forzaba a Turbopack a trazar todo el árbol del proyecto al compilar.

---

### 4.2 Soluciones implementadas en la Fase 4

1. **Actualización limpia de `eslint.config.mjs`:**
   - Agregados `globalIgnores`: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`, `.venv/**`, `android/**`, `ml_engine/**`, `storage_vol/**`, `prisma/*.js`, `seed_workers.js`.
   - Configurado `"@typescript-eslint/no-explicit-any": "warn"` para conservar intacta la lógica existente manteniendo activas como `error` todas las reglas de React 19, Hooks, Core Web Vitals y JS/TS.

2. **Refactorización segura de componentes y páginas (sin alterar lógica de negocio):**
   - `src/shared/components/WordMovableController.tsx`: reemplazo de estado DOM por `selectedElRef = useRef<HTMLElement | null>(null)` + estado mínimo `selectedMeta` (`{ tick, tagLabel }`) para re-enlazar `ResizeObserver` y calcular límites sin mutar estado React.
   - `src/shared/components/ChatbotAsistente.tsx`: `mensajesMostrados` derivado con `useMemo`, lectura perezosa de `getBoundingClientRect()` al iniciar el arrastre de burbuja y `msgSeqRef` para IDs únicos en mensajes.
   - `src/shared/components/NuevoCittModal.tsx`: dividido en wrapper condicional (`if (!props.isOpen) return null`) + `<NuevoCittModalInner key={modalKey} ... />` inicializado directamente desde props con limpieza segura de `ObjectURL` al desmontar.
   - `src/shared/components/MLDashboardCard.tsx`: `normalizeMr` y `matchMr` movidas fuera del componente (eliminando los 6 `exhaustive-deps`), `filtroMicrored` y `activeTab` derivados por rol y carga inicial mediante IIFE asíncrona con flag `active`.
   - `src/shared/components/VisorDocumentoA4.tsx` y `DetallesTrabajadorModal.tsx`: inicialización dentro de callback `ResizeObserver` / IIFE con cancelación `active`.
   - Páginas del dashboard (`inicio`, `personal`, `layout`, `auditoria`, `logs`, `maternidad`, `paternidad`, `roles`, `salud`, `usuarios`): efectos convertidos a cadenas de promesas `.then/.catch/.finally` con `let active = true` o manejo directo en `onChange`, eliminando los 16 errores de `set-state-in-effect`.
   - `maternidad/reporte/[id]/page.tsx`, `paternidad/reporte/[id]/page.tsx`, `salud/reporte/[id]/page.tsx`, `salud/reporte-detallado/[id]/page.tsx` y `ReporteMensualTemplate.tsx`: comillas escapadas con `&quot;`.
   - `prefer-const` corregido en `api/chat/route.ts`, `api/licencias/importar-excel/route.ts`, `calculoSubsidios.ts` y `prisma/importar_excel.ts`.

3. **Optimización de compilación Turbopack:**
   - `src/app/api/evidencias/[filename]/route.ts`: añadido `/*turbopackIgnore: true*/` en `readFile(/*turbopackIgnore: true*/ candidate)` tras la validación estricta `resolveInside(...)`.

---

### 4.3 Pruebas ejecutadas en Fase 4 (Validación Final en Producción)

1. **`npm run lint`:** `EXIT 0` (`0` errores; `382` warnings informativos de `any`, `<img>`, variables no usadas y redirecciones Android WebView conservadas intencionalmente).
2. **`npx tsc --noEmit`:** `EXIT 0` (`0` errores).
3. **`npm run build` (`next build` + Turbopack):** `EXIT 0` — compilado en ~4s, `43/43` páginas generadas, `0` errores, `0` warnings.
4. **Suite E2E sobre servidor de producción compilado (`npx next start -p 3102`) — `4/4 PASS`:**
   - **Prueba 1 (Producción SSR):** 18 rutas (`/login`, `/inicio`, `/salud`, `/maternidad`, `/paternidad`, `/personal`, `/reportes`, `/analisis`, `/auditoria`, `/logs`, `/roles`, `/usuarios`, `/archivo`, `/salud/reporte-rango` y las 4 vistas `/reporte/[id]`) devolvieron `HTTP 200` sin excepciones SSR.
   - **Prueba 2 (Seguridad Fase 1 en producción):** `401` sin sesión, `/api/me` sin `passwordHash`, `403` para `TRABAJADOR`, bloqueo cross-microred de `SEDE_ADMIN`.
   - **Prueba 3 (Negocio Fase 2 en producción):** Paridad real (`1,620` trabajadores, `subsidiosPendientes` igual entre `/api/dashboard` y `/api/salud`, coincidencia PDF/ExcelJS sin corrimiento de días).
   - **Prueba 4 (IA/ML/PDF Fase 3 en producción):** `/api/sistema/salud` activo, `/api/ml` con `85` establecimientos / `1,620` trabajadores y aislamiento `AMARILIS` para `SEDE_ADMIN`, `/api/generar-informe` generando PDF válido e ignorando `../../.env`, y `/api/licencias/escanear-citt` devolviendo `400` limpio ante binario corrupto.
5. **Integridad de BD tras todas las pruebas:** `trabajadores: 1620 -> 1620`, `licencias: 256 -> 256`, carpeta `storage_vol/evidencias/` libre de temporales.

---

## Guía Rápida de Diagnóstico (Si algo falla después)

| Si falla esto... | Revisar primero estos archivos / puntos | Posible causa común |
| :--- | :--- | :--- |
| **Error `401` / `403` inesperado en alguna ruta** | `src/core/auth/rbac.ts`, `src/shared/utils/permisos.ts`, `src/proxy.ts` | El usuario no tiene `activo=true`, le falta un permiso en BD (`Rol.permisos` / `permisosExtra`), o un usuario no-`SUPER_ADMIN` tiene `microredId = null`. |
| **No cargan imágenes o PDFs subidos** | `src/app/api/upload/route.ts`, `src/app/api/evidencias/[filename]/route.ts`, `storage_vol/evidencias/` | El archivo está corrupto/no es imagen o PDF real, el usuario pertenece a otra microred, o falta el archivo físico en `storage_vol/evidencias/`. |
| **Fechas corridas por `-1 día` o días de subsidio no cuadran** | `src/core/licencias/calculoSubsidios.ts`, `src/app/api/licencias/route.ts`, `src/app/api/salud/excel/[id]/route.ts` | Algún reporte nuevo leyó `.getDate()`/`.getFullYear()` local en lugar de usar `getCalendarDateStr()`, `parseNormalizedCalendarDate()` o `calcularResumenSaludTrabajador()`. |
| **Excel falla al abrir o muestra columnas corridas** | `buildUniqueSheetName` en `calculoSubsidios.ts`, rutas `excel-masivo` / `rango-pdf` | Nombre de hoja >31 chars o rango de `.mergeCells()` distinto al ancho real de columnas. |
| **Chatbot o Escáner OCR fallan con Gemini** | `.env` (`GEMINI_API_KEY*`), `src/core/ai/gemini.ts`, `/api/sistema/salud` | Cuota agotada en todas las claves, modelo retirado en API `v1beta` de Google, o sin salida a `generativelanguage.googleapis.com`. |
| **Falla el re-entrenamiento ML (`POST /api/ml`)** | `src/app/api/ml/route.ts`, `ml_engine/extract_from_db.js`, `ml_engine/train_all_models.py`, `.venv/` | En despliegue Linux donde no exista `.venv/Scripts/python.exe`, asegurar `python` en PATH con `pandas`, `numpy`, `scikit-learn` y `joblib` instalados. |
| **Falla `npm run build` tras cambios futuros** | Ejecutar en orden: `npm run lint`, `npx tsc --noEmit`, `npm run build` | Nuevo `useEffect` con `setState` síncrono o mutación de estado React detectada por React Compiler. |
| **En desarrollo por IP LAN el login recarga `GET /login?` y no funcionan botones React (ej. "ojito")** | `next.config.ts` (`allowedDevOrigins`), consola del servidor (`Blocked cross-origin request ...`) | Next.js 16 bloqueó `/_next/hmr` o chunks JS desde una IP LAN no permitida (`403`). Verificar `getLocalDevOrigins()` y reiniciar `npm run dev`. |

### Ajuste Posterior al Cierre (Acceso por IP LAN en Desarrollo)

- **Problema detectado:** Al abrir el servidor de desarrollo desde una nueva IP LAN asignada por Wi-Fi/Hotspot (`192.168.137.19`), Next.js 16 bloqueaba `/_next/hmr`, `/__nextjs_font/geist-latin.woff2` y chunks de cliente (`403 Forbidden`), impidiendo la hidratación de React en `/login` (botón "ojito" inactivo y envío nativo `GET /login?`).
- **Solución en `next.config.ts`:** Se reemplazó la lista estática por `getLocalDevOrigins()`, combinando rangos privados RFC 1918 (`192.168.*.*`, `10.*.*.*`, `172.16.*.*`–`172.31.*.*`), detección automática de interfaces IPv4 locales (`os.networkInterfaces()`) y los hosts locales explícitos.

### Aspectos intencionalmente conservados (para no romper lógica existente)

1. **`@next/next/no-img-element` (`<img>`) y `window.location.href`:** Se conservaron en `login/page.tsx`, `layout.tsx`, encabezados de impresión A4 y previsualizadores para garantizar el funcionamiento de cookies en WebView Android/Capacitor y compatibilidad CSS de impresión (`react-to-print`).
2. **Semáforo `/api/alertas` basado en `creadoEn`:** Se mantuvo el comportamiento original de alertas sobre registros `PARTICULAR` (pendientes de canje a 30 días desde su registro en sistema), añadiendo únicamente el aislamiento obligatorio por `microredId`.
3. **Plantilla institucional `ReporteMensualTemplate.tsx`:** Se preservó la redacción, firmantes y estructura A4 solicitada por la oficina, corrigiendo solo el escapado JSX requerido por ESLint.
4. **Advertencias `@typescript-eslint/no-explicit-any` (`warn`):** Permanecen como advertencia no bloqueante para refactorización progresiva sin introducir riesgos en componentes que ya operan en producción.

