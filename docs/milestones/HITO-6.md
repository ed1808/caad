# Hito 6 — Motor de validación y diagnósticos

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito

- [x] Definir catálogo formal de reglas y códigos de diagnóstico (`docs/VALIDATION_RULES.md`).
- [x] Ejecutar validación determinista y reproducible sobre el modelo de dominio interno (`src-tauri/src/domain/validation.rs`).
- [x] Categorizar observaciones por severidad tipada:
  - **Errores Estructurales (`STRUCT-*`):** Inconsistencias que violan la integridad del contrato o la especificación OpenAPI 3.1.
  - **Advertencias de Consistencia (`CONS-*`):** Posibles omisiones o anomalías de diseño que afectan la calidad de la API.
  - **Sugerencias de Diseño (`SUGG-*`):** Recomendaciones de mejores prácticas arquitectónicas REST y convenciones de estilo.
- [x] Construir interfaz de usuario cyber-brutalista para inspección de diagnósticos (`src/features/validation/ValidationView.tsx`):
  - Métricas en tarjetas interactivas (Total, Errores, Advertencias, Sugerencias).
  - Pestañas de filtrado por nivel de severidad con contadores dinámicos.
  - Barra de búsqueda reactiva por código de regla, título, mensaje o ruta.
  - Estado vacío de celebración (Contrato 100% Saludable) cuando no existen anomalías.
  - Botón de re-evaluación manual en tiempo real.
- [x] Enlazar diagnósticos con elementos editables mediante navegación de 1-clic (`IR AL ELEMENTO`):
  - Parseo de RFC 6901 JSON Pointers (`/info/...`, `/components/schemas/{name}`, `/paths/{path}/{method}`).
  - Salto directo al editor de metadatos, esquema específico o endpoint correspondiente.
- [x] Pruebas unitarias completas para cada regla activa en el motor de validación de Rust.
- [x] Sin duplicación de la lógica de validación en el frontend: Rust actúa como única fuente de verdad a través de los comandos IPC `validate_document` y `validate_project`.

---

## Catálogo de Reglas Implementadas y Probadas

### 1. Errores Estructurales (`STRUCT-*`)
- `STRUCT-001`: Título (`info.title`) o versión (`info.version`) ausente o compuesto únicamente por espacios en blanco.
- `STRUCT-002`: Operación duplicada con método HTTP y ruta exacta coincidentes.
- `STRUCT-003`: Referencia interna rota (`#/components/schemas/{target}`) hacia un esquema inexistente.
- `STRUCT-004`: Parámetro con ubicación `in: path` ausente de la plantilla de ruta de la URL.
- `STRUCT-005`: Variable `{variable}` en la plantilla de ruta sin parámetro definido o parámetro de ruta con `required: false`.
- `STRUCT-006`: `operationId` duplicado en distintas operaciones de la API.
- `STRUCT-007`: Definición estructural de esquema inválida (nombre vacío o propiedad sin tipo ni referencia).
- `STRUCT-008`: Violación de especificación en respuestas (operación sin respuestas, código de estado HTTP inválido o descripción ausente).

### 2. Advertencias de Consistencia (`CONS-*`)
- `CONS-002`: Formato de ruta anómalo (omisión de barra diagonal inicial `/`, doble barra `//` o barra final innecesaria).
- `CONS-003`: Esquema huérfano / no utilizado (definido en `components.schemas` sin ser referenciado en ninguna operación ni esquema).
- `CONS-004`: Endpoint de colección sin paginación (operación GET que retorna arreglos sin parámetros `limit`, `page`, `offset`, etc.).
- `CONS-005`: Operación sin documentación descriptiva (`summary` y `description` vacíos).
- `CONS-006`: Respuestas de error habituales ausentes (`404` en endpoints con parámetros de ruta, `400` en operaciones con `request_body`).

### 3. Sugerencias de Diseño (`SUGG-*`)
- `SUGG-001`: Convenciones de nomenclatura REST (kebab-case en minúsculas para rutas, PascalCase para esquemas).
- `SUGG-002`: Documentación de respuesta para errores imprevistos del servidor (`500` o `default`).
- `SUGG-003`: Categorización de endpoints mediante etiquetas (`tags`).

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Pruebas de Dominio y Validación Rust** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito: **28 tests pasados**, 0 fallidos |
| **Linter Rust (Clippy con `-D warnings`)** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Éxito: código 0, **0 advertencias** |
| **Formato Rust** | `./scripts/dev.sh cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Éxito: código 0, formato verificado |
| **Chequeo TypeScript** | `./scripts/dev.sh bun run check` | Éxito: código 0 (`tsc --noEmit`), **0 errores de tipo** |
| **Build Frontend** | `./scripts/dev.sh bun run build` | Éxito: código 0 (`dist/index.html`, bundle generado en 582ms) |

---

## Archivos Creados o Modificados

1. `src-tauri/src/domain/validation.rs`:
   - Implementación completa del catálogo de reglas deterministas (`STRUCT-*`, `CONS-*`, `SUGG-*`).
   - Constructores tipados `DesignIssue::new_error`, `new_warning`, `new_suggestion`.
   - Pruebas unitarias para cada regla activa (28 pruebas en la suite total).
2. `src-tauri/src/commands/mod.rs`:
   - Pruebas de integración IPC de `validate_document` adaptadas al motor expandido.
3. `src/features/validation/ValidationView.tsx`:
   - Vista completa de diagnósticos con diseño Industrial / Cyber-Brutalista.
   - Tarjetas de estadísticas agregadas, filtros por severidad, búsqueda textual reactiva.
   - Navegación de 1-clic con resolución de JSON Pointers a vista de destino.
4. `src/features/schemas/SchemasView.tsx`:
   - Soporte para `targetSchemaName` con selección automática al navegar desde un diagnóstico.
5. `src/features/operations/OperationsView.tsx`:
   - Soporte para `targetOperation` con selección y limpieza de filtros al navegar desde un diagnóstico.
6. `src/App.tsx`:
   - Orquestación de navegación asistida y paso de propiedades de destino entre vistas.
7. `docs/VALIDATION_RULES.md`:
   - Catálogo oficial y detallado de todas las reglas de validación activas.
8. `docs/milestones/HITO-6.md`:
   - Registro de estado, pruebas y criterios de salida del hito.
