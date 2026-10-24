# Hito 3 — Persistencia local

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito
- [x] Definir ubicación segura de base de datos SQLite en Tauri (`app_data_dir/caad.db`).
- [x] Implementar repositorio `ProjectRepository` con `rusqlite` (`bundled`) y migraciones automáticas versionadas con `rusqlite_migration` (`PRAGMA user_version`).
- [x] Persistir el contrato completo como documento JSON estructurado versionado (`document_schema_version = 1`).
- [x] Implementar operaciones CRUD transaccionales (crear, listar, recuperar, actualizar/guardar, renombrar, eliminar).
- [x] Implementar capa de servicio `ProjectService` y estado gestionado `AppState`.
- [x] Exponer comandos IPC seguros y fuertemente tipados en Tauri:
  - `create_project`
  - `list_projects`
  - `get_project`
  - `save_project`
  - `rename_project`
  - `delete_project`
- [x] Implementar interfaz de usuario en React:
  - Vista completa de proyectos (`ProjectsView`) con listado, creación, apertura, renombrado y confirmación explícita de eliminación.
  - Indicadores visuales de estado de guardado (`Guardando...`, `Guardado`, `Error al guardar`) y autoguardado con debounce de 1000ms.
- [x] Escribir pruebas unitarias e integración de base de datos y ciclo de vida de persistencia.

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Pruebas de Persistencia y Dominio** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito: 17 tests pasados, 0 fallidos |
| **Linter Rust** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Éxito: código 0, 0 advertencias |
| **Formato Rust** | `./scripts/dev.sh cargo fmt --check --manifest-path src-tauri/Cargo.toml` | Éxito: código 0 |
| **Chequeo TypeScript** | `./scripts/dev.sh bun run check` | Éxito: código 0, 0 errores |
| **Build Frontend** | `./scripts/dev.sh bun run build` | Éxito: código 0 (458ms) |

---

## Próximo Paso Recomendado

Proceder al **Hito 4 — Gestión de esquemas**:
- Listado e inspección de esquemas reutilizables en `components.schemas`.
- Formularios contextuales para creación y edición de propiedades de objeto y tipos primitivos.
- Selección de referencias internas a esquemas existentes (`$ref`).
- Detección de dependencias activas para prevenir eliminación silenciosa de esquemas en uso.
