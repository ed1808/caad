# Hito 5 — Gestión de operaciones

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito

- [x] Listado e inspección de operaciones y rutas REST bajo `paths/{path}/{method}` (FR-005).
- [x] Soporte para los métodos HTTP REST estándar: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `HEAD`, `OPTIONS`, `TRACE`.
- [x] Insignias de método con código visual de color cyber-brutalista (GET cian, POST citrón/verde, PUT ámbar, DELETE carmesí, PATCH magenta, HEAD/OPTIONS pizarra).
- [x] Modal de creación de operaciones con verificación y prevención de duplicados exactos de método/ruta (`STRUCT-002`).
- [x] Eliminación segura de operaciones con confirmación explícita.
- [x] Configuración de metadatos operacionales completos:
  - `operationId` con comprobación de unicidad en toda la API (`STRUCT-006`).
  - Resumen ejecutivo (`summary`).
  - Documentación descriptiva detallada (`description`).
  - Gestión de etiquetas (`tags`) con adición y eliminación interactiva y filtro por tag.
  - Indicador de obsolescencia (`deprecated`).
- [x] Gestión integral de parámetros (FR-006):
  - Ubicaciones admitidas: `path`, `query`, `header`, `cookie`.
  - Detección automática de variables en la plantilla de ruta (ej. `/vehicles/{vehicleId}`).
  - Botón de sincronización con 1-clic (`missingPathVariables`) para generar automáticamente parámetros de ruta faltantes con `required: true` (`STRUCT-004`, `STRUCT-005`).
  - Tipado de parámetros: primitivos (`string`, `integer`, `number`, `boolean`) o referencias a esquemas `$ref`.
  - Restricción OpenAPI 3.1: los parámetros con ubicación `path` están bloqueados a `required: true`.
- [x] Definición de cuerpo de solicitud (`request_body` - FR-007):
  - Habilitación/deshabilitación condicional (habitual en GET vs POST/PUT).
  - Indicador de obligatoriedad (`required`).
  - Descripción de payload.
  - Asociación de tipos de contenido (`application/json`, etc.) y vinculación con esquemas reutilizables (`$ref: "#/components/schemas/{name}"`) o esquemas inline.
  - Acceso directo a creación de esquemas si no existen aún en `components/schemas`.
- [x] Definición de respuestas HTTP estructuradas (`responses` - FR-007):
  - Múltiples respuestas por operación con selector rápido de códigos comunes (`200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `404 Not Found`, `500 Internal Error`, `default`) y códigos personalizados.
  - Descripción obligatoria por respuesta exigida por OpenAPI.
  - Tipos de contenido y vinculación directa a esquemas reutilizables (`$ref`), arreglos de esquemas (`array <$ref>`) o tipos primitivos.
- [x] Cargador de ejemplo canónico de la especificación:
  - Workshop REST API de taller mecánico:
    - `GET /vehicles`: Lista vehículos con filtros de consulta (`status`, `limit`) y respuesta 200 con array de `Vehicle`.
    - `POST /vehicles`: Alta de vehículo con request body vinculado a `$ref: "#/components/schemas/Vehicle"` y respuestas 201/400.
    - `GET /vehicles/{vehicleId}`: Consulta por parámetro de ruta `vehicleId` (requerido) y respuestas 200/404.
    - `PUT /vehicles/{vehicleId}`: Actualización con parámetro de ruta y cuerpo `Vehicle`.
    - `DELETE /vehicles/{vehicleId}`: Eliminación con parámetro de ruta y respuesta 204 sin contenido.
    - `POST /work-orders`: Creación de orden de trabajo vinculada a `WorkOrder`.
  - Creación automática de los esquemas `Vehicle` y `WorkOrder` si no existen previamente.
- [x] Inspección en vivo del JSON generado para la operación y las rutas bajo OpenAPI 3.1 con botón de copiado al portapapeles.
- [x] Diagnósticos y feedback en tiempo real:
  - Banner en el editor alertando sobre anomalías estructurales (`STRUCT-002`, `STRUCT-004`, `STRUCT-005`, `STRUCT-006`, `STRUCT-003`).
  - Iconos de alerta en la lista de operaciones para identificar endpoints con problemas.
- [x] Persistencia automática debounced en SQLite a través del documento global del proyecto.
- [x] Insignia dinámica en la barra lateral con el número total de operaciones REST activas.

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Pruebas de Dominio Rust** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito: 19 tests pasados, 0 fallidos |
| **Linter Rust** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` | Éxito: código 0, 0 advertencias |
| **Formato Rust** | `./scripts/dev.sh cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Éxito: código 0 |
| **Chequeo TypeScript** | `./scripts/dev.sh bun run check` | Éxito: código 0 (`tsc --noEmit`), 0 errores |
| **Build Frontend** | `./scripts/dev.sh bun run build` | Éxito: código 0 (`dist/index.html`, bundle generado en 1.51s) |

---

## Archivos Creados o Modificados

- `src-tauri/src/domain/api.rs`:
  - Métodos `remove_operation` y `find_operation` en `ApiDefinition`.
  - Prueba unitaria `test_operation_lifecycle` que verifica alta, búsqueda y eliminación de operaciones en el dominio.
- `src/app/types.ts`:
  - Tipos e interfaces dedicadas exportadas: `HttpMethod`, `ParameterLocation`, `Parameter`, `MediaTypeDefinition`, `RequestBody`, `ResponseDefinition`, `Operation`.
- `src/lib/tauri.ts`:
  - Enriquecimiento de `normalizeProject` para garantizar arrays limpios por defecto en `parameters`, `responses`, `tags` y booleano en `deprecated`.
- `src/features/operations/OperationsView.tsx`:
  - Vista completa maestro-detalle para gestión de operaciones REST OpenAPI 3.1.
  - Filtro por método HTTP, búsqueda de texto y filtrado por tags.
  - Sincronización automática de variables de ruta (`{variable}`) a parámetros de ruta con 1-clic.
  - Editor de parámetros (`path`, `query`, `header`, `cookie`).
  - Editor de cuerpos de solicitud (`request_body`) con soporte para referencias a esquemas `$ref`.
  - Editor de respuestas HTTP con presets de códigos de estado, descripción y vinculación a esquemas.
  - Generador de ejemplo de API de taller de vehículos (`Workshop REST API`).
  - Drawer de inspección OpenAPI 3.1 Paths JSON.
- `src/components/Sidebar.tsx`:
  - Propiedad `operationsCount` e insignia dinámica de conteo de endpoints activos.
- `src/App.tsx`:
  - Enrutamiento y pase de propiedades a `OperationsView` con autoguardado debounced al modificar operaciones.
  - Paso de `operationsCount` a la barra lateral.
- `docs/milestones/HITO-5.md`:
  - Registro de criterios de aceptación, resultados reales y estado del hito.

---

## Decisiones Técnicas y Estado de Riesgos

1. **Identidad de Operaciones en OpenAPI**:
   - En OpenAPI 3.1, la identidad de una operación está determinada por la tupla `(method, path)`. La interfaz previene colisiones al crear operaciones y muestra advertencias inmediatas si se edita una ruta o método duplicando uno existente (`STRUCT-002`).
2. **Invariante de Parámetros de Ruta**:
   - Según la especificación OpenAPI, todo segmento `{param}` debe tener su correspondiente parámetro con `in: "path"` y `required: true`. El botón "SINCRONIZAR PARÁMETROS" asiste al desarrollador evitando errores tipográficos y resolviendo automáticamente `STRUCT-004` y `STRUCT-005`.
3. **Referencias a Esquemas**:
   - Tanto los cuerpos de solicitud como las respuestas permiten vincularse mediante `$ref` a los esquemas definidos en `components/schemas`. El motor de validación en Rust verifica en tiempo real la existencia del destino (`STRUCT-003`).
