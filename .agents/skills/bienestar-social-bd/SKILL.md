---
name: bienestar-social-bd
description: Arquitectura, diagrama Entidad-Relación (ER), diccionario completo de tablas PostgreSQL 16 y checklist de traslado del sistema Bienestar Social Salud (Red de Salud Huánuco). Úsalo antes de migrar servidores, modificar prisma/schema.prisma o consultar relaciones y almacenamiento persistente.
---

# Base de Datos y Almacenamiento — Bienestar Social Salud

Esta skill documenta la estructura real de la base de datos **`bienestar_social_db`** (`PostgreSQL 16` + Prisma 5) y los activos físicos acoplados fuera de PostgreSQL (`storage_vol/` y `ml_engine/`).

## Documentación Completa

Consulta la referencia técnica completa (diagrama `erDiagram`, flujo de almacenamiento híbrido, tipos `ENUM`, diccionario de las 7 tablas, reglas de integridad RBAC y guía de traslado):

- [Diagrama y Diccionario Completo de Base de Datos](./references/diagrama_base_de_datos.md)

## Archivos Clave Asociados

- Esquema Prisma (fuente de verdad): [`prisma/schema.prisma`](../../../prisma/schema.prisma)
- Contenedor PostgreSQL local: [`docker-compose.yml`](../../../docker-compose.yml)
- Control de acceso y permisos (`text[]`): [`src/core/auth/rbac.ts`](../../../src/core/auth/rbac.ts) y [`src/shared/utils/permisos.ts`](../../../src/shared/utils/permisos.ts)
- Evidencias en disco: [`src/app/api/upload/route.ts`](../../../src/app/api/upload/route.ts) y `storage_vol/evidencias/`

## Reglas para Cualquier Cambio o Traslado

1. **Sin carpeta `prisma/migrations/`:** el esquema usa `npx prisma db push` en entornos vacíos o `pg_dump` / `pg_restore` para traslados con datos.
2. **Almacenamiento híbrido obligatorio:** al respaldar o trasladar el sistema, copiar PostgreSQL **junto con** `storage_vol/` (evidencias y logs) y `ml_engine/` (modelos `.joblib` y salidas JSON).
3. **Motor PostgreSQL requerido:** no migrar a motores sin soporte nativo de `ENUM` (`TipoLicencia`, `OrigenCertificado`) o arreglos `text[]` (`Rol.permisos`, `Usuario.permisosExtra`) sin adaptar primero el esquema.
4. **Mantenimiento de esta skill:** si se agregan tablas, columnas o índices en [`prisma/schema.prisma`](../../../prisma/schema.prisma), actualizar también [diagrama_base_de_datos.md](./references/diagrama_base_de_datos.md).

