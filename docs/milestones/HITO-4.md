# Hito 4 — Gestión de esquemas

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito

- [x] Listado e inspección de esquemas reutilizables bajo `components/schemas`.
- [x] Alta, renombrado, edición y eliminación de esquemas reutilizables desde la interfaz de usuario.
- [x] Soporte para tipos de datos primitivos de OpenAPI 3.1 / JSON Schema 2020-12:
  - `string`, `integer`, `number`, `boolean`, `object`, `array`, `null`.
- [x] Soporte para nulabilidad OpenAPI 3.1 (`allows_null` / tipos multivalor con `null`).
- [x] Editor contextual de propiedades de objetos:
  - Definición de tipos primitivos o referencia interna `$ref` a otros esquemas (`#/components/schemas/{name}`).
  - Restricciones para cadenas (`format`: uuid, date, date-time, email, uri, etc.; `minLength`, `maxLength`, `pattern`).
  - Restricciones numéricas (`minimum`, `maximum`).
  - Restricciones de arrays (`minItems`, `maxItems`).
  - Marcado de obligatoriedad (`required: string[]`).
- [x] Detección de dependencias activas (`ApiDefinition::find_schema_usages`) para prevenir eliminación silenciosa de esquemas en uso:
  - Comprobación tanto en otros esquemas como en operaciones (parámetros, request bodies, respuestas).
  - Diálogo modal de advertencia que lista todos los consumidores dependientes y requiere decisión explícita.
- [x] Validación en tiempo real conectada al motor determinista (`validate_document` y `validate_project`):
  - Detección visual inmediata de referencias rotas o no resueltas (`STRUCT-003`).
- [x] Botón y función de carga del modelo de ejemplo canónico de la especificación:
  - Esquema `Vehicle` (id uuid, vin 17 caracteres, make, model, year >= 1900).
  - Esquema `WorkOrder` (id uuid, description, vehicle referenciando `$ref: "#/components/schemas/Vehicle"`, status, created_at date-time).
- [x] Panel plegable de inspección en vivo del JSON Schema / OpenAPI 3.1 generado.
- [x] Insignias dinámicas en la barra lateral con el número total de esquemas y diagnósticos activos.
- [x] Persistencia automática debounced en SQLite sin bloqueo de UI.

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Pruebas de Dominio y Comandos** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito: 18 tests pasados, 0 fallidos |
| **Linter Rust** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Éxito: código 0, 0 advertencias |
| **Formato Rust** | `./scripts/dev.sh cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Éxito: código 0 |
| **Chequeo TypeScript** | `./scripts/dev.sh bun run check` | Éxito: código 0 (`tsc --noEmit`), 0 errores |
| **Build Frontend** | `./scripts/dev.sh bun run build` | Éxito: código 0 (`dist/index.html`, bundle generado en ~310ms) |

---

## Archivos Creados o Modificados

- `src-tauri/src/domain/api.rs`: Métodos `remove_schema` y `find_schema_usages` con análisis recursivo de referencias cruzadas en esquemas y operaciones.
- `src-tauri/src/application/mod.rs`: Métodos `get_schema_usages` y `validate_project` en `ProjectService`.
- `src-tauri/src/commands/mod.rs`: Comandos Tauri `get_schema_usages`, `validate_project` y `validate_document` con prueba unitaria `test_validate_document_command`.
- `src-tauri/src/lib.rs`: Registro de nuevos manejadores en el builder de Tauri.
- `src/app/types.ts`: Ampliación de `SchemaDefinition` (restricciones de longitud, numéricas y formato) e interfaces `DesignIssue` e `IssueSeverity`.
- `src/lib/tauri.ts`: Wrappers IPC con fallbacks de simulación para `getSchemaUsages`, `validateProject` y `validateDocument`.
- `src/features/schemas/SchemasView.tsx`: Interfaz interactiva completa maestro-detalle para gestión de esquemas, formulario de propiedades, soporte OpenAPI 3.1 (`allows_null`), `$ref`, modal de advertencia de dependencias y vista previa JSON Schema.
- `src/components/Sidebar.tsx`: Insignias dinámicas de conteo de esquemas y diagnósticos.
- `src/App.tsx`: Conexión de estado del proyecto activo con `SchemasView`, autoguardado debounced y cálculo continuo de diagnósticos.

---

## Próximo Paso

Aguardar confirmación del usuario para avanzar al **Hito 5 — Modelado de operaciones REST**:
- Gestión de endpoints (método HTTP y plantilla de ruta).
- Configuración de parámetros (`path`, `query`, `header`, `cookie`).
- Definición de cuerpo de petición (media types y esquemas asociados).
- Configuración de códigos de respuesta HTTP y enlace a esquemas reutilizables.
