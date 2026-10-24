# Hito 1 — Esqueleto ejecutable

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito
- [x] Crear el proyecto con el scaffold oficial de Tauri 2 (`create-tauri-app`).
- [x] Configurar Rust (`src-tauri/`) y React 19 / TypeScript / Vite (`src/`).
- [x] Configurar Bun como gestor de paquetes con `bun.lock` reproducible.
- [x] Diseñar layout inicial de escritorio con navegación, barra lateral, cabecera, barra de estado y vistas vacías informativas.
- [x] Organizar la estructura del repositorio por capas arquitectónicas (`commands`, `application`, `domain`, `infrastructure`).
- [x] Crear cliente tipado de comunicación IPC (`ping`, `app_info`).
- [x] Añadir `README.md` y `CONTRIBUTING.md` con requisitos y comandos de ejecución.
- [x] Ejecutar y validar todas las comprobaciones de calidad (fmt, clippy, test, tsc, build).

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Formateo Rust** | `./scripts/dev.sh cargo fmt --check --manifest-path src-tauri/Cargo.toml` | Éxito (código 0, sin diferencias) |
| **Linter Rust** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Éxito (código 0, 0 advertencias) |
| **Pruebas Rust** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito (código 0, tests de ping y app_info pasados) |
| **Tipos TypeScript** | `./scripts/dev.sh bun run check` (`tsc --noEmit`) | Éxito (código 0, 0 errores de tipo) |
| **Build Frontend** | `./scripts/dev.sh bun run build` | Éxito (código 0, dist generado en ~500ms) |

---

## Próximo Paso Recomendado

Proceder al **Hito 2 — Dominio y modelo interno**:
- Definir tipos del dominio (`Project`, `ApiDefinition`, `SchemaDefinition`, `Operation`, `Parameter`, etc.).
- Modelar referencias internas (`$ref`) y resolución de dependencias.
- Implementar catálogo de errores tipados y validaciones estructurales básicas con pruebas unitarias en Rust sin depender de la UI.
