# Catálogo Oficial de Reglas de Validación y Diagnóstico de CAAD

**Fecha:** Octubre 2026 (Actualizado en Hito 6)  
**Módulo Rust:** `src-tauri/src/domain/validation.rs`  
**Comando IPC Tauri:** `validate_document` / `validate_project`

---

## 1. Principios de Diseño del Motor de Diagnósticos

1. **Determinismo y Reproducibilidad:**
   Dada una misma definición de API (`ApiDefinition`), el validador produce exactamente la misma lista de diagnósticos (`Vec<DesignIssue>`), sin depender de la UI, de la red ni de estado volátil.
2. **Explicación Accionable y No Punitiva:**
   Cada observación contiene:
   - `id`: Identificador único (UUID) para rastreo de ciclo de vida.
   - `rule_id`: Código alfanumérico estable (`STRUCT-*`, `CONS-*`, `SUGG-*`).
   - `severity`: Nivel de impacto (`error`, `warning`, `suggestion`).
   - `title`: Título conciso del diagnóstico.
   - `message`: Descripción detallada del problema y por qué infringe la especificación o convención.
   - `location`: Puntero JSON Pointer RFC 6901 al nodo afectado en el documento (ej. `/paths/~1vehicles~1{vehicleId}/get`).
   - `suggestion`: Sugerencia clara de corrección o mejora recomendada.
3. **Fuente Única de Verdad (Single Source of Truth):**
   La lógica de validación reside exclusivamente en el núcleo de dominio en Rust (`src-tauri/src/domain/validation.rs`). El frontend en React consume los resultados mediante la API IPC tipada de Tauri (`validateDocument` / `validate_document`), evitando duplicar o divergir en reglas de negocio.
4. **Navegación Directa al Elemento (1-Clic):**
   El frontend mapea el `location` del diagnóstico hacia la vista correspondiente (`metadata`, `schemas` o `operations`), seleccionando automáticamente el esquema u operación afectado para su edición inmediata.

---

## 2. Catálogo de Reglas

### 2.1 Errores Estructurales (`STRUCT-*` — Severidad: `error`)
Los errores estructurales representan violaciones a la integridad del contrato o a la especificación OpenAPI 3.1. Impiden generar una definición utilizable.

| Código | Título | Ubicación | Condición de Activación | Sugerencia / Remedio |
|---|---|---|---|---|
| **`STRUCT-001`** | Metadatos básicos requeridos | `/info/title`, `/info/version` | El título (`info.title`) o la versión semver (`info.version`) están vacíos o compuestos únicamente por espacios en blanco. | Definir un nombre descriptivo y una versión semántica (ej. `1.0.0`). |
| **`STRUCT-002`** | Operación duplicada | `/paths/{path}/{method}` | Dos o más operaciones definen la misma combinación exacta de método HTTP y ruta. | Modificar la ruta o el método HTTP para garantizar que sea único. |
| **`STRUCT-003`** | Referencia interna no resuelta | `/components/schemas/{name}` | Un enlace `$ref: "#/components/schemas/{target}"` apunta a un esquema inexistente en `components.schemas`. | Crear el esquema faltante o corregir el selector `$ref`. |
| **`STRUCT-004`** | Parámetro de ruta ausente en URL | `/paths/{path}/{method}/parameters` | Un parámetro configurado con ubicación `in: path` no tiene su correspondiente variable `{nombre}` en la plantilla de ruta. | Añadir `{nombre}` a la ruta o cambiar la ubicación del parámetro a query/header. |
| **`STRUCT-005`** | Inconsistencia en variables de ruta | `/paths/{path}/{method}/parameters/{name}` | 1. La plantilla de ruta contiene una variable `{var}` sin parámetro `in: path` definido.<br>2. Un parámetro de ruta tiene `required: false` (OpenAPI exige estrictamente `required: true`). | Definir el parámetro de ruta o marcarlo como obligatorio. |
| **`STRUCT-006`** | `operationId` duplicado | `/paths/{path}/{method}/operationId` | Dos o más operaciones comparten el mismo `operation_id`. | Asignar identificadores únicos (ej. `getVehicle`, `listVehicles`). |
| **`STRUCT-007`** | Definición estructural de esquema inválida | `/components/schemas/{name}/properties/{prop}` | 1. Esquema con identificador vacío.<br>2. Propiedad de esquema con nombre vacío.<br>3. Propiedad sin tipo primitivo asignado y sin enlace `$ref`. | Asignar nombres válidos y seleccionar un tipo de dato o `$ref`. |
| **`STRUCT-008`** | Violación OpenAPI en respuestas | `/paths/{path}/{method}/responses` | 1. Operación sin ninguna respuesta declarada en `responses`.<br>2. Código de estado HTTP no válido (debe ser 100-599, `1XX`..`5XX`, o `default`).<br>3. Respuesta sin descripción (`description` vacía). | Declarar al menos una respuesta válida con descripción no vacía. |

---

### 2.2 Advertencias de Consistencia (`CONS-*` — Severidad: `warning`)
Las advertencias no invalidan necesariamente la especificación técnica, pero señalan potenciales defectos de diseño o vacíos en el contrato que pueden impactar a los consumidores.

| Código | Título | Ubicación | Condición de Activación | Sugerencia / Remedio |
|---|---|---|---|---|
| **`CONS-002`** | Formato de ruta anómalo | `/paths/{path}/{method}` | 1. La ruta no empieza con barra diagonal `/`.<br>2. La ruta contiene barras consecutivas `//`.<br>3. La ruta termina con barra final innecesaria en endpoints que no son la raíz. | Corregir la sintaxis de la URL (ej. `/vehicles` en vez de `vehicles/`). |
| **`CONS-003`** | Esquema no utilizado / huérfano | `/components/schemas/{name}` | Un esquema definido en `components.schemas` no es referenciado por ninguna operación ni por otro esquema en todo el contrato. | Vincular el esquema a una respuesta o payload, o eliminarlo si está en desuso. |
| **`CONS-004`** | Colección sin paginación | `/paths/{path}/get/parameters` | Operación GET cuya respuesta `200` o `201` retorna un arreglo (`array`), pero no incluye parámetros de paginación (`limit`, `offset`, `page`, `page_size`, `cursor`, `size`). | Añadir parámetros de consulta para limitar y paginar resultados. |
| **`CONS-005`** | Operación sin documentación | `/paths/{path}/{method}` | La operación no tiene ni resumen (`summary`) ni descripción (`description`). | Añadir un resumen conciso y documentación sobre la finalidad del endpoint. |
| **`CONS-006`** | Falta respuesta de error habitual | `/paths/{path}/{method}/responses` | 1. Operación con variables de ruta `{id}` sin respuesta `404 Not Found`.<br>2. Operación con cuerpo de solicitud (`request_body`) sin respuesta `400 Bad Request`. | Documentar respuestas de error para recursos inexistentes o entradas inválidas. |

---

### 2.3 Sugerencias de Diseño (`SUGG-*` — Severidad: `suggestion`)
Recomendaciones de estilo y mejores prácticas de arquitectura REST para maximizar la legibilidad, mantenibilidad y usabilidad de la API.

| Código | Título | Ubicación | Condición de Activación | Sugerencia / Remedio |
|---|---|---|---|---|
| **`SUGG-001`** | Convención de nombres REST | `/paths/...`, `/components/schemas/...` | 1. Segmentos de ruta con mayúsculas o `snake_case` (se sugiere `kebab-case` en minúsculas).<br>2. Nombres de esquemas que no sigan `PascalCase` (ej. `vehicle_order` en vez de `VehicleOrder`). | Normalizar nombres siguiendo las convenciones del ecosistema REST. |
| **`SUGG-002`** | Manejo de errores de servidor (500/default) | `/paths/{path}/{method}/responses` | La operación no documenta una respuesta para fallos imprevistos (`500 Internal Server Error` o `default`). | Añadir respuesta `500` o `default` para contemplar indisponibilidad interna. |
| **`SUGG-003`** | Operación sin etiquetas (`tags`) | `/paths/{path}/{method}` | La operación no tiene ninguna etiqueta para categorización. | Asignar etiquetas para agrupar endpoints por recurso o módulo funcional. |

---

## 3. Pruebas y Verificación

Cada regla activa cuenta con pruebas unitarias deterministas en `src-tauri/src/domain/validation.rs`:
- `test_valid_definition_has_no_errors`
- `test_detect_missing_title_or_version_struct_001`
- `test_detect_duplicate_operations_struct_002`
- `test_detect_broken_reference_struct_003`
- `test_detect_path_parameter_mismatches_struct_004_and_005`
- `test_detect_duplicate_operation_id_struct_006`
- `test_detect_invalid_schema_property_struct_007`
- `test_detect_invalid_operation_responses_struct_008`
- `test_detect_path_formatting_cons_002`
- `test_detect_orphan_schema_cons_003`
- `test_detect_unpaginated_collection_cons_004`
- `test_detect_missing_summary_and_description_cons_005`
- `test_detect_missing_error_responses_cons_006`
- `test_detect_naming_conventions_sugg_001`

Para ejecutar las pruebas en cualquier momento:
```bash
./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml
```
