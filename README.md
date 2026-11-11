<div align="center">

<img src="public/images/logo-red-huanuco.jpg" alt="Red de Salud Huánuco" width="110" />

# Bienestar Social Salud — Red de Salud Huánuco

**Plataforma Integral para la Gestión de Licencias Médicas, Control de Subsidios EsSalud, Analítica Predictiva (ML) y Asistencia Inteligente (IA)**

*Unidad de Bienestar Social · Oficina de Recursos Humanos · Red de Salud Huánuco (DIRESA / GOREHCO)*

<p>
  <img src="https://img.shields.io/badge/Next.js-16.3.4-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16.3.4" />
  <img src="https://img.shields.io/badge/React-19.2.8-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="React 19.2.8" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
  <img src="https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma 5" />
  <img src="https://img.shields.io/badge/Scikit--Learn-1.9-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-Learn" />
  <img src="https://img.shields.io/badge/Capacitor_Android-8.5-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Capacitor Android" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
</p>

</div>

---

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Capacidades Clave del Sistema](#capacidades-clave-del-sistema)
3. [Arquitectura General](#arquitectura-general)
4. [Stack Tecnológico](#stack-tecnológico)
5. [Estructura del Proyecto](#estructura-del-proyecto)
6. [Modelo de Datos y Almacenamiento Híbrido](#modelo-de-datos-y-almacenamiento-híbrido)
7. [Seguridad, RBAC y Reglas de Negocio](#seguridad-rbac-y-reglas-de-negocio)
8. [Instalación y Puesta en Marcha](#instalación-y-puesta-en-marcha)
9. [Motor de Machine Learning (`ml_engine`)](#motor-de-machine-learning-ml_engine)
10. [Aplicación Móvil Android (Capacitor)](#aplicación-móvil-android-capacitor)
11. [Traslado de Servidores y Respaldo](#traslado-de-servidores-y-respaldo)
12. [Documentación Complementaria](#documentación-complementaria)

---

## Descripción General

**Bienestar Social Salud** centraliza, audita y automatiza la administración de descansos médicos, licencias especiales y recupero de subsidios para los trabajadores asistenciales y administrativos de la **Red de Salud Huánuco** (Sede Central, Microredes y establecimientos IPRESS adscritos).

El sistema reemplaza consolidados manuales en hojas de cálculo por una arquitectura web y móvil trazable que:

- Calcula automáticamente los **primeros 20 días anuales asumidos por la institución** frente a los **días subsidiados por EsSalud**, cortando con precisión los periodos que cruzan límites mensuales.
- Controla los plazos de **canje de certificados médicos particulares ante EsSalud (30 días)** mediante alertas en semáforo para evitar prescripción y pérdida económica institucional.
- Incorpora **OCR multimodal con Gemini Vision** para digitalizar certificados CITT/particulares y un **asistente conversacional contextual (`BienestarBot`)** conectado en tiempo real a PostgreSQL.
- Ejecuta un pipeline propio de **Machine Learning en Python** (5 modelos entrenados sobre el padrón y licencias reales) para pronosticar demanda mensual de subsidios, detectar casos atípicos y priorizar riesgo de caducidad.

---

## Capacidades Clave del Sistema

| Dominio | Funcionalidad implementada |
| :--- | :--- |
| **Salud y Subsidios** | Gestión de `ENFERMEDAD_COMUN` y `ACCIDENTE_COMUN` agrupados bajo **Salud**, cálculo cronológico de la regla de los 20 días por año fiscal (`calculoSubsidio.ts`) y desglose mensual (`splitIntoMonths`). |
| **Licencias Especiales** | Módulos dedicados para **Maternidad** (Ley 26644), **Paternidad** (Ley 30807) y **Familiar Directo Grave/Terminal** (Ley 30012). |
| **Semáforo de Canjes** | Seguimiento automático del límite de 30 días para certificados `PARTICULAR` (Vencidos, Críticos, En Riesgo y marcado como `PARTICULAR_PERDIDO`). |
| **Escáner OCR con IA** | Extracción estructurada desde imágenes o PDFs de certificados (`/api/licencias/escanear-citt`) usando `sharp` y failover multi-modelo con Google Gemini. |
| **Asistente IA (`BienestarBot`)** | Chat contextual flotante con orbe generativo Canvas a 60 FPS (`NeuralOrb`), restringido por rol y microred mediante consultas en vivo y permiso `USAR_CHATBOT`. |
| **Analítica Predictiva (ML)** | Panel de inteligencia con 5 modelos en `ml_engine/` (Forecasting, Anomalías, Riesgo de Caducidad, Clustering Territorial y Procedencia de Canjes). |
| **Reportería Oficial** | Generación de reportes ejecutivos e individuales en **PDF** (`puppeteer`, `pdf-lib`, `react-to-print`) y exportación **Excel** individual o masiva por microred (`exceljs`, `xlsx`), más editor de documentos A4. |
| **Gestión Territorial y RBAC** | Administración multi-microred (28 microredes y 85 establecimientos), padrón nominal (1,600+ trabajadores), 17 permisos granulares, portal de autogestión `TRABAJADOR` y auditoría unificada. |
| **Soporte Móvil Android** | Contenedor nativo **Capacitor 8** con navegación Back nativa, descarga de reportes y visor de evidencias con gestos táctiles (*pan* y *pinch-to-zoom*). |

---

## Arquitectura General

```mermaid
flowchart TB
    subgraph Clientes ["Capa de Presentación"]
        WEB["Navegador Web (Desktop / Mobile)"]
        APK["App Android Nativa (Capacitor 8 WebView)"]
    end

    subgraph NextApp ["Next.js 16 App Router (Puerto 3000)"]
        AUTH["NextAuth v4 (JWT + Validación Activa en BD)"]
        RBAC["Control de Acceso RBAC (17 Permisos + Microred)"]
        UI["Módulos UI (Salud, Maternidad, Paternidad, Reportes, ML, Auditoría)"]
        API["Route Handlers (/api/*)"]
    end

    subgraph Persistencia ["Datos y Almacenamiento Persistente"]
        PG["PostgreSQL 16 (Prisma ORM 5.22)"]
        FS["storage_vol/evidencias/ (WebP / PDF Privado)"]
        LOG["storage_vol/logs/ + Tabla Auditoria"]
    end

    subgraph Inteligencia ["IA Generativa y Machine Learning"]
        GEM["Google Gemini API (OCR CITT + BienestarBot)"]
        ML["Pipeline Python ml_engine/ (5 Modelos Scikit-Learn)"]
    end

    WEB --> NextApp
    APK --> NextApp
    UI --> AUTH
    API --> RBAC
    RBAC --> PG
    API -->|"Sharp WebP / PDF max 15 MB"| FS
    API -->|"Bitácora CRUD y Errores"| LOG
    API -->|"Failover Multi-Modelo / Multi-Key"| GEM
    PG -->|"extract_from_db.js"| ML
    ML -->|"ml_insights.json"| API
```

---

## Stack Tecnológico

| Capa | Tecnologías y Librerías Principales |
| :--- | :--- |
| **Frontend & UI** | Next.js `16.3.4` (App Router), React `19.2.8`, TypeScript `5.x`, Tailwind CSS `4.x`, `lucide-react`, `clsx`, `tailwind-merge` |
| **Backend & Seguridad** | Next.js Route Handlers, NextAuth `4.24.15` (`CredentialsProvider` + JWT), `bcryptjs` (`$2a$` / `$2b$`), validación RBAC contra BD |
| **Base de Datos & ORM** | PostgreSQL `16-alpine` (Docker), Prisma `5.22.0` (`@prisma/client`) |
| **Documentos e Imágenes** | `sharp` `0.35.4` (compresión WebP y verificación de firma binaria), `exceljs` `4.4.0`, `xlsx` `0.18.5`, `pdf-lib` `1.17.1`, `puppeteer` `25.10.0`, `react-to-print` `3.3.0` |
| **Inteligencia Artificial** | Google Gemini REST API (`src/core/ai/gemini.ts`) con rotación automática de modelos y claves para OCR y Chatbot |
| **Machine Learning** | Python `.venv` — `scikit-learn` `1.9.1`, `pandas` `3.0.6`, `numpy` `2.5.4`, `scipy` `1.18.1`, `joblib` `1.6.0`, `openpyxl` `3.1.5` |
| **Móvil** | Capacitor `8.5.3` (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) |
| **Calidad** | ESLint `9` (`eslint-config-next`), TypeScript strict compiler (`tsc`) |

---

## Estructura del Proyecto

```text
bienestar-social-salud/
├── .agents/skills/                 # Conocimiento técnico versionado del sistema
│   ├── bienestar-social-bd/        # Esquema PostgreSQL, diagrama ER y guía de traslado
│   └── bienestar-social-reglas/    # Reglas de negocio de subsidios (20 días, chunks, reportes)
├── android/                        # Proyecto nativo Android (Gradle + Capacitor 8)
├── ml_engine/                      # Motor analítico Python + extractor Node.js
│   ├── data/                       # dataset.json generado desde PostgreSQL
│   ├── models/                     # Artefactos serializados (*.joblib)
│   ├── output/                     # ml_insights.json consumido por /api/ml
│   ├── extract_from_db.js          # Extractor ETL desde Prisma hacia dataset.json
│   └── train_all_models.py         # Entrenamiento de los 5 modelos ML
├── prisma/
│   ├── schema.prisma               # Definición canónica de tablas y ENUMs
│   ├── seed.ts / seed.js           # Semilla inicial de microredes, roles y usuarios base
│   ├── seedSuperAdmin.ts           # Creación/restauración de cuenta Super Admin
│   └── importar_excel.ts           # Utilidad de carga histórica desde Excel
├── public/
│   ├── images/                     # Activos gráficos institucionales y branding
│   ├── informe/                    # Cabeceras y pies oficiales de informes
│   ├── manuales/                   # Manuales de usuario PDF (Super Admin y Admin Microred)
│   └── changelog.json              # Historial de versiones visible en la plataforma
├── src/
│   ├── app/
│   │   ├── (auth)/login/           # Inicio de sesión institucional
│   │   ├── (dashboard)/            # Vistas protegidas (inicio, salud, maternidad, paternidad, personal, reportes, analisis, archivo, roles, usuarios, auditoria, logs)
│   │   ├── api/                    # Endpoints REST (auth, licencias, escanear-citt, salud, maternidad, paternidad, ml, chat, evidencias, upload, auditoria, logs, usuarios, roles)
│   │   └── not-found.tsx           # Página 404 personalizada con identidad institucional
│   ├── core/
│   │   ├── ai/                     # Cliente Gemini multi-modelo y failover de API keys
│   │   ├── auth/                   # Helpers RBAC (getAuthContext, requireStaffAccess)
│   │   ├── db/                     # Singleton PrismaClient
│   │   ├── licencias/              # Cálculo oficial de subsidios y partición por meses
│   │   └── logging/                # Logger resiliente unificado en BD (systemLogger.ts)
│   ├── features/                   # Lógica de dominio modular (autenticacion, licencias, reportes)
│   └── shared/                     # Componentes UI reutilizables (ChatbotAsistente, NeuralOrb, VisorEvidenciaModal, modales Excel/PDF), hooks y utilidades
├── storage_vol/                    # Almacenamiento privado persistente (evidencias WebP/PDF y logs)
├── capacitor.config.ts             # Configuración híbrida Android / WebView
├── docker-compose.yml              # Contenedor PostgreSQL 16 (servicio bienestar_db)
├── next.config.ts                  # Configuración Next.js y allowedDevOrigins para red LAN/USB
└── requirements.txt                # Dependencias Python del motor ML
```

---

## Modelo de Datos y Almacenamiento Híbrido

La base de datos `bienestar_social_db` en PostgreSQL 16 consta de **7 tablas base** y **2 tipos ENUM** (`TipoLicencia`, `OrigenCertificado`):

| Tabla | Rol en el sistema | Relaciones principales |
| :--- | :--- | :--- |
| **`Rol`** | Catálogo de roles (`SUPER_ADMIN`, `SEDE_ADMIN`, `VISUALIZADOR`, `TRABAJADOR`, personalizados) y su arreglo `text[]` de permisos. | `1:N` con `Usuario` |
| **`Usuario`** | Cuentas autenticables por DNI, hash `bcrypt`, `permisosExtra` y estado `activo`. | `N:1` con `Rol`, `N:1` opcional con `Microred` |
| **`Microred`** | Catálogo de jurisdicciones territoriales de la Red de Salud Huánuco. | `1:N` con `Establecimiento` y `Usuario` |
| **`Establecimiento`** | Centros y puestos de salud (IPRESS) con soporte de `codigoRenaes`. | `N:1` con `Microred`, `1:N` con `Trabajador` |
| **`Trabajador`** | Padrón nominal de personal (`NOMBRADO`, `CAS`, `CAS DIRESA`). | `N:1` con `Establecimiento`, `1:N` con `Licencia` |
| **`Licencia`** | Registro central de certificados, fechas, días otorgados, metadata OCR (`medico`, `colegiatura`, `diagnostico`) y `archivoRuta`. | `N:1` con `Trabajador`, `N:1` opcional con `Usuario` (`registradoPorId`) |
| **`Auditoria`** | Bitácora unificada de acciones CRUD de negocio y eventos/errores técnicos (`modulo`, `accion`, `detalles` JSON). | `N:1` opcional con `Usuario` |

> [!NOTE]
> Las evidencias escaneadas **no se guardan en PostgreSQL**, sino en disco bajo `storage_vol/evidencias/` (servidas mediante `/api/evidencias/[filename]` previa validación RBAC).  
> Puedes consultar el **Diagrama Entidad–Relación completo**, diccionario columna por columna y reglas referenciales en [`.agents/skills/bienestar-social-bd/references/diagrama_base_de_datos.md`](.agents/skills/bienestar-social-bd/references/diagrama_base_de_datos.md).

---

## Seguridad, RBAC y Reglas de Negocio

### Control de Acceso
- **Validación en vivo contra BD:** `getAuthContext()` en `src/core/auth/rbac.ts` consulta PostgreSQL en cada operación sensible para garantizar revocación inmediata si `Usuario.activo = false` y fusionar `Rol.permisos ∪ Usuario.permisosExtra`.
- **17 códigos de permisos (`src/shared/utils/permisos.ts`):** cubren Personal (`VER_TRABAJADORES`, `EDITAR_TRABAJADORES`, `EXPORTAR_EXCEL_PERSONAL`), Trámites (`VER_LICENCIAS`, `GESTIONAR_LICENCIAS`, `SUBIR_CITT`, `SUBIR_ARCHIVOS`, `EXPORTAR_PDF_TRAMITE`), Administración (`ADMINISTRAR_USUARIOS`, `VER_AUDITORIA`, `GESTIONAR_ESTABLECIMIENTOS`), Estadísticas (`VER_REPORTES`, `EXPORTAR_EXCEL_MASIVO`), Archivo Histórico (`VER_ARCHIVO_HISTORICO`, `ORDENAR_DOCUMENTOS`), Consola (`VER_LOGS`) e IA (`USAR_CHATBOT`).
- **Aislamiento territorial y de archivos:** los roles administrativos no `SUPER_ADMIN` solo acceden a trabajadores, evidencias y reportes dentro de su `microredId` asignada; el rol `TRABAJADOR` accede únicamente a su historial vinculado por `dni`. Las cargas de archivos validan *magic bytes* (`%PDF-` o firma raster real con `sharp`) y se almacenan fuera de `public/`.

### Reglas Contables Críticas
1. **Agrupación "SALUD":** `ENFERMEDAD_COMUN` y `ACCIDENTE_COMUN` siempre se consolidan juntos bajo la categoría **Salud** en filtros, dashboards, PDFs y Excels.
2. **Regla de los 20 días:** La Red asume únicamente los primeros **20 días calendario anuales** por trabajador (reiniciando cada `anioEjercicio`). A partir del día 21, todos los días se contabilizan como **Subsidio**, evaluando cronológicamente el historial completo del trabajador sin excluir certificados particulares en la suma total.
3. **Partición mensual (`splitIntoMonths`) y rangos estrictos:** Toda licencia que cruza meses se divide en bloques por mes; al exportar por rango de fechas, los meses fuera del rango y las microredes sin movimientos válidos se omiten automáticamente.

*(Detalle normativo interno en [`.agents/skills/bienestar-social-reglas/SKILL.md`](.agents/skills/bienestar-social-reglas/SKILL.md)).*

---

## Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** `20.x` o superior y `npm`
- **Docker Desktop** (o instancia PostgreSQL 16 accesible por red)
- **Python** `3.10+` (requerido únicamente para reentrenar modelos en `ml_engine/`)
- **Android Studio + ADB** (opcional, para compilar/depurar la app Android)

### 1. Clonar e instalar dependencias

```bash
git clone git@github.com:usian24/bienestar-social-red.git
cd bienestar-social-red
npm install
```

### 2. Configurar variables de entorno (`.env`)

Crea un archivo `.env` en la raíz del proyecto (no se versiona en Git) con la siguiente estructura:

```env
# Base de datos PostgreSQL 16 (debe coincidir con docker-compose.yml en local)
DATABASE_URL="postgresql://USUARIO:CONTRASENA@localhost:5432/bienestar_social_db?schema=public"

# Autenticación NextAuth
NEXTAUTH_SECRET="genera_un_secreto_aleatorio_largo_aqui"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"

# Inteligencia Artificial (Google Gemini — soporta claves dedicadas o clave única)
GEMINI_API_KEY="tu_api_key_gemini_principal"
GEMINI_API_KEY_CHAT="tu_api_key_gemini_chat"
GEMINI_API_KEY_SCANNER="tu_api_key_gemini_ocr"
# GEMINI_API_KEY_OCR="tu_api_key_ocr_alternativa"

# Opcional: URL productiva para compilar la app móvil Capacitor Android
# CAPACITOR_SERVER_URL="https://tu-dominio-institucional.gob.pe"
```

### 3. Levantar PostgreSQL y sincronizar Prisma

El esquema no utiliza carpeta `prisma/migrations/`; se aplica directamente sobre PostgreSQL:

```bash
# 1. Iniciar contenedor PostgreSQL 16 (bienestar_db en puerto 5432)
docker-compose up -d

# 2. Generar cliente Prisma y sincronizar tablas/ENUMs
npx prisma generate
npx prisma db push

# 3. Cargar datos fundacionales (Microredes, Roles y usuario base)
npx prisma db seed
```

### 4. Iniciar servidor Web

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm run build
npm run start
```

Abrir en el navegador: `http://localhost:3000` (el sistema redirige a `/login` e `/inicio`).

### Comandos Disponibles (`package.json`)

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Levanta el servidor Next.js en modo desarrollo (`localhost:3000`). |
| `npm run build` | Compila el proyecto TypeScript y genera el bundle de producción. |
| `npm run start` | Inicia la aplicación compilada en producción. |
| `npm run lint` | Ejecuta la verificación de reglas ESLint del proyecto. |
| `npm run usb` | Redirige el puerto `3000` vía ADB USB para pruebas en celular Android físico. |
| `npx prisma studio` | Abre el visor web visual de las tablas en PostgreSQL. |

---

## Motor de Machine Learning (`ml_engine`)

El sistema integra un módulo analítico offline/bajo demanda ejecutado desde `/analisis` o mediante consola:

| # | Modelo | Algoritmo | Salida / Uso principal |
| :---: | :--- | :--- | :--- |
| **1** | Pronóstico mensual de subsidios | `Ridge` / `GradientBoostingRegressor` / Promedio Móvil | Proyección de demanda mensual de días mayores a 20 y costo estimado de subsidio. |
| **2** | Detector de anomalías | `IsolationForest` + `StandardScaler` | Identifica trabajadores con frecuencia o duración estadística atípica de descansos. |
| **3** | Riesgo de caducidad de canjes | `RandomForestClassifier` | Estima probabilidad de prescripción de certificados particulares antes de los 30 días. |
| **4** | Segmentación territorial | `KMeans` + `PCA` | Agrupa microredes según carga asistencial, distancia geográfica y tasa de ausentismo. |
| **5** | Clasificador de procedencia | `RandomForestClassifier` | Modela proporción y proyección de origen `ESSALUD_CITT` frente a `PARTICULAR`. |

### Configurar y ejecutar el pipeline manualmente

**Windows (PowerShell):**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

 
# 1. Extraer snapshot actualizado desde PostgreSQL a ml_engine/data/dataset.json
node ml_engine/extract_from_db.js

# 2. Entrenar los 5 modelos (*.joblib) y generar ml_engine/output/ml_insights.json
.\.venv\Scripts\python.exe ml_engine/train_all_models.py
```

*(En Linux/macOS sustituye `.\.venv\Scripts\python.exe` por `./.venv/bin/python`; ten en cuenta que `/api/ml/route.ts` invoca por defecto la ruta `.venv/Scripts/python.exe` en despliegues Windows).*

---

## Aplicación Móvil Android (Capacitor)

El directorio `android/` empaqueta la aplicación web bajo el identificador `gob.pe.redsaludhuanuco.bienestar`:

- **Pruebas por USB en desarrollo:**

```bash
npm run dev
npm run usb          # Ejecuta adb reverse tcp:3000 tcp:3000
npx cap sync android
npx cap open android # Compilar y ejecutar desde Android Studio (JDK 21 / JBR)
```

- **Entorno productivo:** definir `CAPACITOR_SERVER_URL="https://tu-dominio.gob.pe"` antes de ejecutar `npx cap sync android` para apuntar al servidor institucional HTTPS.

---

## Traslado de Servidores y Respaldo

Dado que el sistema combina datos relacionales, archivos privados en disco y artefactos ML, un traslado de servidor completo requiere migrar **cuatro elementos**:

1. **Base de datos PostgreSQL 16 (`bienestar_social_db`):**
   ```bash
   # Respaldo binario recomendado desde contenedor o servidor origen
   pg_dump -Fc -U USUARIO -d bienestar_social_db -f respaldo_bienestar.dump

   # Restauración en PostgreSQL 16 destino
   pg_restore -U USUARIO -d bienestar_social_db --clean --if-exists respaldo_bienestar.dump
   ```
2. **Evidencias y logs privados (`storage_vol/`):** copiar íntegro `storage_vol/evidencias/` (y `public/uploads/` si existen adjuntos históricos) manteniendo permisos de escritura para el proceso Node.js.
3. **Modelos y salidas ML (`ml_engine/`):** copiar `models/`, `output/ml_insights.json` y `data/`, o re-ejecutar el pipeline tras restaurar PostgreSQL.
4. **Configuración de entorno (`.env`) y generación ORM:** recrear `.env` en el servidor destino y ejecutar `npx prisma generate` + `npm run build`.

---

## Documentación Complementaria

- **Manuales de Usuario:** [`Manual_Usuario_Super_Admin_RedSaludHco.pdf`](public/manuales/Manual_Usuario_Super_Admin_RedSaludHco.pdf) y [`Manual_Usuario_Admin_Microred_RedSaludHco.pdf`](public/manuales/Manual_Usuario_Admin_Microred_RedSaludHco.pdf)
- **Manual rápido de arranque:** [`MANUAL_DE_ARRANQUE.txt`](MANUAL_DE_ARRANQUE.txt)
- **Arquitectura BD y Checklist de Traslado:** [`.agents/skills/bienestar-social-bd/references/diagrama_base_de_datos.md`](.agents/skills/bienestar-social-bd/references/diagrama_base_de_datos.md)
- **Reglas Críticas de Subsidios y Reportes:** [`.agents/skills/bienestar-social-reglas/SKILL.md`](.agents/skills/bienestar-social-reglas/SKILL.md)
- **Plan Maestro de Machine Learning:** [`.agents/skills/bienestar-social-reglas/PLAN_MACHINE_LEARNING_BIENESTAR_SOCIAL.md`](.agents/skills/bienestar-social-reglas/PLAN_MACHINE_LEARNING_BIENESTAR_SOCIAL.md)
