# ADR-0002: Bibliotecas para OpenAPI 3.1.x y Procesamiento YAML/JSON en Rust

- **Estado:** Aceptado
- **Fecha:** Octubre 2026
- **Contexto:** Hito 0 — Verificación técnica y decisiones iniciales

---

## Contexto y Planteamiento del Problema

CAAD necesita parsear, serializar, importar y exportar especificaciones OpenAPI 3.1.x tanto en formato JSON como YAML. La especificación OpenAPI 3.1 introdujo cambios incompatibles con OpenAPI 3.0 (en particular, adopción de JSON Schema Draft 2020-12, soporte de tipos multivalor como `type: ["string", "null"]` y reemplazo de `nullable: true`).

Además, la biblioteca estándar histórica en el ecosistema Rust para YAML (`serde_yaml` por David Tolnay) ha sido oficialmente marcada como **deprecada y sin mantenimiento**, por lo que el documento maestro prohíbe adoptarla.

---

## Investigación de Bibliotecas Candidatas

### 1. Manejo y AST de OpenAPI 3.1.x

| Crate | Versión / Mantenimiento | Soporte OAS 3.1 | Tratamiento de Orden y Referencias | Licencia | Evaluación |
|---|---|---|---|---|---|
| **`oas3`** | `v0.22.x` (Activo, Rob Ede) | **Completo (3.1.x)** | Usa `IndexMap` para preservar orden de claves; soporte interno de referencias locales; feature `yaml-spec`. | MIT | **Recomendado** como DTO de infraestructura e importación/exportación. |
| **`openapiv3_1`** | `v0.1.5` (Baja actividad) | Parcial / AST básico | Tipos estructurales pero sin integración fluida de navegación, validación ni orden. | MIT | Descartado frente a `oas3`. |
| **`openapiv3`** | `v1.x` (Maduro) | **Incompatible** (Solo 3.0.x) | Falla al parsear schemas JSON Schema 2020-12 de OpenAPI 3.1. | Apache 2.0 | Descartado para OAS 3.1. |
| **`utoipa`** | `v4.x` / `v5.x` (Activo) | Enfoque inverso (code-first) | Diseñado para generar OpenAPI a partir de código Rust de backend (Axum/Actix), no para parsear/editar especificaciones arbitrarias. | MIT / Apache 2.0 | No aplicable al caso de uso de CAAD. |

### 2. Procesamiento de YAML (Reemplazo de `serde_yaml`)

| Crate | Mantenimiento / Origen | Seguridad e Invariantes | Compatibilidad Serde | Decisión |
|---|---|---|---|---|
| **`serde_yaml`** | **Deprecado** (dtolnay) | No recibe parches | Histórico | **Prohibido por directiva de proyecto.** |
| **`yaml_serde`** | **Activo** (The YAML Organization) | Fork oficial mantenido por la organización oficial de YAML | Drop-in replacement exacto de `serde_yaml` | **Opción estándar recomendada** para compatibilidad Serde directa. |
| **`serde-saphyr`** | **Activo** (`v1.3.x`) | `#![forbid(unsafe_code)]`, panic-free en entradas malformadas, control de recursion budget (protección DoS) | Excelente serializador y deserializador fuertemente tipado | **Excelente opción para datos no confiables** (NFR-004). |
| **`serde_yml` / `noyalib`** | Activo (shim transicional) | Pure-Rust, sin unsafe | Capa de compatibilidad transitoria | Menor adopción que `yaml_serde`. |

---

## Decisión Arquitectónica

1. **Aislamiento Estricto del Modelo de Dominio:**
   - CAAD **NO utilizará los tipos de `oas3` como su modelo de dominio interno**.
   - El módulo `domain::*` tendrá sus propios tipos (`ApiDefinition`, `Operation`, `SchemaDefinition`, etc.) optimizados para edición reactiva, cálculo de diferencias y validaciones deterministas.
   - `oas3` se limitará al módulo `infrastructure::openapi::*` actuando como DTO de importación y exportación.

2. **Adopción de `oas3`:**
   - Se adoptará `oas3` (con feature `yaml-spec` o combinado con deserializadores externos) como biblioteca base de parseo y serialización de especificaciones OpenAPI 3.1.x.
   - Preserva el orden de endpoints y propiedades gracias a su almacenamiento en `IndexMap`, evitando reordenamientos arbitrarios al guardar contratos.

3. **Adopción de `yaml_serde` y `serde_json`:**
   - Para serialización y deserialización YAML de Serde, se adoptará `yaml_serde` (de la organización oficial YAML) como reemplazo seguro y directo de `serde_yaml`.
   - Se evalúa complementar la entrada no confiable de archivos externos con `serde-saphyr` para prevenir ataques de desbordamiento de pila por recursión excesiva si se requiere validación preliminar.

4. **Validación de Esquemas JSON Schema 2020-12:**
   - Las reglas de negocio de CAAD (`STRUCT-*`, `CONS-*`) se codifican en Rust nativo.
   - Si se requiere validación estricta de meta-esquemas JSON Schema Draft 2020-12, se evaluará el crate `boon` o `jsonschema`.

---

## Limitaciones Detectadas de OpenAPI 3.1.x

1. **Divergencia entre OpenAPI 3.0 y 3.1:** Muchos editores existentes generan contratos 3.0 con `nullable: true`. OpenAPI 3.1 utiliza sintaxis JSON Schema `type: ["string", "null"]` o `oneOf: [{type: "string"}, {type: "null"}]`. El adaptador de importación de CAAD debe normalizar esta discrepancia para evitar errores de parseo silenciosos.
2. **Referencias externas complejas:** `oas3` no descarga referencias de red remotas por defecto, lo cual se alinea perfectamente con el principio de seguridad de CAAD (NFR-004). Las referencias externas se informarán como no soportadas en el MVP.
3. **Pérdida de extensiones no mapeadas:** Campos de extensión `x-*` no contemplados por el modelo inicial de CAAD deben preservarse en una tabla de metadatos o reportarse explícitamente al importar.

---

## Consecuencias

- El proyecto queda completamente libre de la dependencia deprecada `serde_yaml`.
- El modelo de dominio de CAAD permanece inmune a futuros cambios de versión en especificaciones o crates de OpenAPI.
- Se garantiza interoperabilidad con herramientas de OpenAPI 3.1 modernas respetando el orden del documento.
