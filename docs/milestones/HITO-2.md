# Hito 2 — Dominio y modelo interno

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito
- [x] Crear tipos de proyecto (`Project`) con versión de esquema (`document_schema_version = 1`).
- [x] Crear tipos de definición (`ApiDefinition`, `ApiInfo`, `Server`, `Tag`).
- [x] Crear tipos de esquemas reutilizables (`SchemaDefinition`, `SchemaType`) con compatibilidad para OpenAPI 3.1 (`allows_null`).
- [x] Crear tipos de operaciones REST (`Operation`, `HttpMethod`, `Parameter`, `ParameterLocation`, `RequestBody`, `ResponseDefinition`).
- [x] Modelar referencias internas (`$ref`) y recolector recursivo de dependencias.
- [x] Definir diagnósticos estructurados (`DesignIssue`, `IssueSeverity`).
- [x] Implementar motor de validaciones estructurales deterministas (`STRUCT-001`, `STRUCT-002`, `STRUCT-003`, `STRUCT-004`, `STRUCT-005`, `STRUCT-006`).
- [x] Escribir pruebas unitarias exhaustivas en Rust para todas las entidades e invariantes.
- [x] Crear documentación de soporte: `docs/DATA_MODEL.md` y `docs/VALIDATION_RULES.md`.

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Pruebas Unitarias del Dominio** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito: 15 tests pasados, 0 fallidos, 0 advertencias |
| **Linter Rust** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Éxito: código 0, 0 advertencias |
| **Formateo Rust** | `./scripts/dev.sh cargo fmt --check --manifest-path src-tauri/Cargo.toml` | Éxito: código 0, formato estricto |
| **Chequeo TypeScript** | `./scripts/dev.sh bun run check` | Éxito: código 0, 0 errores |
| **Build Frontend** | `./scripts/dev.sh bun run build` | Éxito: código 0 |

---

## Próximo Paso Recomendado

Proceder al **Hito 3 — Persistencia local**:
- Definir ubicación segura de datos de aplicación (app data directory en Tauri / SQLite).
- Implementar almacenamiento SQLite con `rusqlite` y migraciones con `rusqlite_migration`.
- Persistir la definición como documento JSON versionado (`document_schema_version`).
- Implementar casos de uso CRUD de proyectos en la capa de aplicación y exponer comandos IPC correspondientes.
