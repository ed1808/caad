# Modelo de Datos Interno de CAAD

**Versión del Esquema de Documento:** `1` (`CURRENT_DOCUMENT_SCHEMA_VERSION = 1`)  
**Fecha:** Octubre 2026 (Definido en Hito 2)  
**Módulo Rust:** `src-tauri/src/domain/`

---

## 1. Principios del Modelo Interno

1. **Aislamiento e Independencia:** El modelo de dominio de CAAD no deriva ni depende de las estructuras de ninguna biblioteca de terceros (como `oas3` o `openapiv3`). Representa fielmente las entidades necesarias para la edición, navegación y diagnóstico.
2. **Determinismo:** Todos los mapas y colecciones que impactan en la serialización utilizan ordenamientos estables (`BTreeMap` o secuencias ordenadas) para garantizar representaciones JSON reproducibles.
3. **Compatibilidad OpenAPI 3.1.x:** Los esquemas admiten la especificación JSON Schema Draft 2020-12 mediante el flag `allows_null`, facilitando la traducción hacia `type: ["string", "null"]` sin depender del obsoleto `nullable: true` de OpenAPI 3.0.

---

## 2. Entidades Principales

### 2.1 `Project` (`src-tauri/src/domain/project.rs`)
Representa la unidad de trabajo y persistencia local:
- `id: String` (UUID v4 único y estable)
- `name: String` (Nombre visible no vacío tras trim)
- `description: Option<String>`
- `document_schema_version: u32` (Versión 1)
- `document: ApiDefinition` (Definición completa del contrato de la API)
- `created_at: DateTime<Utc>`
- `updated_at: DateTime<Utc>`

### 2.2 `ApiDefinition` (`src-tauri/src/domain/api.rs`)
Contenido integral del contrato de la API:
- `openapi_version: String` (Por defecto `"3.1.0"`)
- `info: ApiInfo`:
  - `title: String`
  - `version: String` (Versión del contrato, ej. `"1.0.0"`)
  - `summary: Option<String>`
  - `description: Option<String>`
- `servers: Vec<Server>` (`url`, `description`)
- `tags: Vec<Tag>` (`name`, `description`)
- `schemas: BTreeMap<String, SchemaDefinition>` (Catálogo de esquemas reutilizables en `components/schemas`)
- `operations: Vec<Operation>` (Colección de endpoints REST)

### 2.3 `SchemaDefinition` (`src-tauri/src/domain/schema.rs`)
Definición de esquemas de datos reutilizables y anidados:
- `id: Option<String>`
- `name: Option<String>`
- `schema_type: Option<SchemaType>` (`String`, `Integer`, `Number`, `Boolean`, `Object`, `Array`, `Null`)
- `allows_null: bool`
- `description: Option<String>`
- `properties: BTreeMap<String, SchemaDefinition>`
- `required: Vec<String>`
- `items: Option<Box<SchemaDefinition>>` (Para tipos array)
- `ref_path: Option<String>` (Referencia interna, ej. `"#/components/schemas/Vehicle"`)
- `enum_values: Option<Vec<serde_json::Value>>`
- Restricciones: `minimum`, `maximum`, `min_length`, `max_length`, `pattern`, `format`, `min_items`, `max_items`.

### 2.4 `Operation` (`src-tauri/src/domain/operation.rs`)
Operación HTTP en una ruta REST:
- `id: Option<String>`
- `path: String` (Ejemplo: `"/vehicles/{vehicleId}"`)
- `method: HttpMethod` (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`)
- `operation_id: Option<String>` (Identificador único de la operación)
- `summary: Option<String>`
- `description: Option<String>`
- `tags: Vec<String>`
- `parameters: Vec<Parameter>`:
  - `name: String`
  - `location: ParameterLocation` (`Path`, `Query`, `Header`, `Cookie`)
  - `required: bool` (Obligatorio en `Path`)
  - `schema: Option<SchemaDefinition>`
- `request_body: Option<RequestBody>`:
  - `description: Option<String>`
  - `required: bool`
  - `content: BTreeMap<String, MediaTypeDefinition>` (Ej. `"application/json"`)
- `responses: Vec<ResponseDefinition>`:
  - `status_code: String` (Ej. `"200"`, `"404"`, `"default"`)
  - `description: String`
  - `content: BTreeMap<String, MediaTypeDefinition>`
- `deprecated: bool`
