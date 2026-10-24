# Hito 0 — Verificación técnica y decisiones iniciales

**Estado:** Completado (Documentación, investigación, ADRs y fixtures listos y verificados)  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito
- [x] Inspeccionar repositorio y entorno de desarrollo real.
- [x] Verificar versiones y disponibilidad de herramientas (Rust, Bun, Tauri, Node, WebKitGTK, Docker).
- [x] Investigar bibliotecas candidatas para OpenAPI 3.1.x en Rust (`oas3`, `openapiv3_1`, `openapiv3`).
- [x] Investigar alternativa mantenida a la biblioteca deprecada `serde_yaml` (`yaml_serde`, `serde-saphyr`).
- [x] Diseñar y verificar fixtures pequeños de OpenAPI 3.1.0 en JSON y YAML (`fixtures/openapi/workshop-api.*`).
- [x] Redactar `docs/ARCHITECTURE.md`.
- [x] Crear registros de decisión arquitectónica (`docs/ADR/`):
  - [x] `ADR-0001`: Stack Tecnológico Base.
  - [x] `ADR-0002`: OpenAPI 3.1.x y Ecosistema YAML/JSON.
  - [x] `ADR-0003`: Persistencia Local con SQLite.
- [x] Ejecutar comprobaciones reproducibles de los entregables del hito.

---

## Hallazgos y Estado del Entorno

| Componente | Estado en el Entorno | Observación / Acción Requerida |
|---|---|---|
| **Sistema Operativo** | Pop!_OS 24.04 LTS (x86_64) | Kernel Linux 7.1.5, base Ubuntu noble |
| **Bun** | Instalado (`v1.4.2`) | Operativo en `/home/edward_r94/.bun/bin/bun` |
| **Docker** | **Instalado y operativo** (`v29.9.0`) | Daemon accesible por el usuario sin sudo. Permite aislar builds y pruebas |
| **Node.js / npm** | No instalado en PATH | Bun suple la ejecución de scripts y gestión de paquetes en host |
| **Rust / Cargo** | No instalado en host | Se ejecutará vía contenedor Docker / Dev Container para no alterar el host |
| **Cabeceras Tauri Linux** | No instaladas en host | Se suministrarán dentro de la imagen de desarrollo |
| **Compilador C / Make** | Instalado (`GCC 13.3 / 14.2`, `pkg-config`) | Listo en host |

---

## Decisiones Principales Adoptadas

1. **OpenAPI 3.1.x:** Se adopta `oas3` (`v0.22.x`) como DTO de infraestructura e importación/exportación, manteniendo el modelo de dominio interno completamente independiente.
2. **Reemplazo de `serde_yaml`:** Se prohíbe `serde_yaml` (deprecado). Se selecciona `yaml_serde` (fork oficial bajo The YAML Organization) y se contempla `serde-saphyr` para defensas contra entradas maliciosas/recursivas.
3. **Persistencia Local:** SQLite embebido con `rusqlite` (`bundled`) y `rusqlite_migration` para migraciones ágiles basadas en `PRAGMA user_version`. Documento de diseño persistido como JSON estructurado versionado.
4. **Fixtures:** Creados `fixtures/openapi/workshop-api.json` y `fixtures/openapi/workshop-api.yaml`, verificados mediante analizadores sintácticos reales demostrando equivalencia estructural 100%.
5. **Estrategia de Entorno de Compilación:** Se acordó utilizar Docker para alojar el entorno Rust + WebKitGTK y ejecutar builds y pruebas sin alterar el sistema operativo anfitrión.

---

## Siguiente Paso

El entorno Dev Container (`caad-dev:latest`) ya está configurado, construido y verificado con Rust 1.99, Cargo 1.99, WebKitGTK 2.52 dev y Bun 1.4.3. El proyecto está listo para iniciar el **Hito 1 — Esqueleto ejecutable** (scaffold oficial de Tauri 2 + React + TypeScript + Bun).
