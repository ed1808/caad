# Hito 8 — Documentación, pulido y empaquetado inicial

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito

- [x] **Vista Previa de Documentación Interactiva (FR-010):**
  - Implementación completa en [`src/features/documentation/DocumentationView.tsx`](file:///home/edward_r94/Documentos/web-projects/caad/src/features/documentation/DocumentationView.tsx).
  - Pestaña de operaciones REST:
    - Desglose por método HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`, `TRACE`) con código de colores estandarizado.
    - Metadatos de operación: ruta, resumen, descripción detallada, tags y `operation_id`.
    - Tabla de parámetros tipados (`path`, `query`, `header`, `cookie`) con indicador de obligatoriedad y formato.
    - Sección de cuerpo de solicitud (*Request Body*) con Content-Type, esquema asociado y previsualización de payload JSON de ejemplo.
    - Sección de respuestas (*Responses*) con código HTTP, descripción, esquema asociado y previsualización JSON.
    - Botones de acción directa: "EDITAR EN DISEÑADOR" (navegación asistida) y "PROBAR EN MOCK CONSOLE".
  - Pestaña de modelos de datos / esquemas (`components.schemas`):
    - Visualización de propiedades, tipos, nulabilidad (OpenAPI 3.1 `allows_null`), referencias internas (`$ref`), restricciones (`minimum`, `maximum`, `min_length`, `max_length`, `enum_values`).
    - Generación y previsualización de JSON de ejemplo determinista para cada esquema con botón para copiar al portapapeles.
  - Filtros y búsqueda reactiva por etiqueta (*Tags*) y texto libre en tiempo real.
  - Acceso directo a exportación OpenAPI en YAML y JSON desde la cabecera del documento.
- [x] **Consola de Simulación Mock Local (Mock Server DX):**
  - Consola interactiva integrada en `DocumentationView` que permite simular peticiones REST contra cualquier endpoint del contrato sin requerir un backend desplegado.
  - Parámetros dinámicos configurables por el usuario.
  - Editor interactivo del cuerpo de solicitud JSON con payload autogenerado.
  - Selector de código de respuesta deseado (ej. `200`, `201`, `400`, `404`).
  - Salida simulada con latencia de red realista (`~20-40ms`), cabeceras HTTP simuladas (`content-type: application/json`, etc.) y cuerpo JSON conforme al esquema de respuesta.
- [x] **Proyecto Demostrativo Oficial Canónico (FR-015):**
  - Comando IPC nativo en Rust `create_example_project` en `src-tauri/src/commands/mod.rs` y `ProjectService::create_example_project` en `src-tauri/src/application/mod.rs`.
  - Generación del contrato oficial **Workshop API (Demo)** con:
    - Metadatos OpenAPI 3.1.0 (`Workshop API (Demo)`, versión `1.0.0`, descripción y servidores).
    - Esquemas: `Vehicle`, `WorkOrder`, `WorkOrderCreate`, `ErrorResponse`.
    - Operaciones: `GET /vehicles/{vehicleId}` (con parámetro de ruta requerido y respuestas 200 y 404) y `POST /work-orders` (con RequestBody `WorkOrderCreate` y respuestas 201 y 400).
  - Acceso desde botón de acción destacado **"CARGAR DEMO"** en la barra superior de `ProjectsView`, en el estado vacío cuando no existen proyectos y en la vista de configuración del sistema.
  - Aislamiento total: se persiste con UUID independiente sin sobrescribir datos de proyectos existentes.
- [x] **Configuración del Sistema y Soporte de Temas (FR-014):**
  - Implementación de [`src/features/settings/SettingsView.tsx`](file:///home/edward_r94/Documentos/web-projects/caad/src/features/settings/SettingsView.tsx).
  - Selector de 3 temas visuales cyber-brutalistas aplicados reactivamente vía atributo `[data-theme]`:
    - **Cyber Dark:** Tema oscuro de alto contraste con acentos naranja y carbón (predeterminado).
    - **Parchment Light:** Fondo claro arquitectónico estilo pergamino y líneas negras definidas.
    - **Tactical Amber:** Modo monocromático terminal industrial CRT / cyberpunk.
  - Conmutador de guardado automático (*Autosave debounced* de 1.000 ms vs manual).
  - Panel de diagnósticos del Core (estado IPC Tauri, motor SQLite 3, versión semver).
- [x] **Pulido, Accesibilidad y Estados Vacíos:**
  - Estados vacíos contextuales con diseño cyber-brutalista en todas las vistas cuando no hay proyectos abiertos o cuando no existen elementos.
  - Indicadores visuales de persistencia en tiempo real en la cabecera (`PERSISTIENDO...`, `GUARDADO (SQLITE)`, `ERROR AL GUARDAR`).
- [x] **Empaquetado y Verificación de Construcción Desktop:**
  - Construcción del binario nativo ejecutable mediante `cargo build` superada sin errores.
  - Build del frontend de producción mediante Vite en 884ms.

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Pruebas de Backend en Rust** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito: **36 tests pasados**, 0 fallidos (incluyendo test unitario de creación de demo) |
| **Linter Rust (Clippy con `-D warnings`)** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Éxito: código 0, **0 advertencias** |
| **Formato Rust** | `./scripts/dev.sh cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Éxito: código 0, formato verificado |
| **Chequeo TypeScript** | `./scripts/dev.sh bun run check` | Éxito: código 0 (`tsc --noEmit`), **0 errores de tipo** |
| **Build Frontend de Producción** | `./scripts/dev.sh bun run build` | Éxito: código 0 (`dist/index.html`, bundle generado en 884ms) |
| **Compilación Desktop de Desarrollo** | `./scripts/dev.sh cargo build --manifest-path src-tauri/Cargo.toml` | Éxito: código 0, binario compilado en 8.18s |

---

## Archivos Creados o Modificados

1. `src-tauri/src/application/mod.rs`:
   - Método `ProjectService::create_example_project` con inclusión estática del fixture canónico `fixtures/openapi/workshop-api.yaml`.
2. `src-tauri/src/commands/mod.rs` & `src-tauri/src/lib.rs`:
   - Comando IPC `create_example_project` y prueba unitaria `test_create_example_project_service`.
3. `src/lib/tauri.ts`:
   - Función cliente `createExampleProject()` con fallback determinista en memoria para previsualización web.
4. `src/features/documentation/DocumentationView.tsx`:
   - Vista interactiva de documentación OpenAPI 3.1.0 completa con explorador de endpoints, esquemas, generador de mocks y consola de simulación REST.
5. `src/features/settings/SettingsView.tsx`:
   - Vista de configuración del sistema (selección de temas, autoguardado, diagnóstico del core e importación del proyecto demo).
6. `src/features/projects/ProjectsView.tsx`:
   - Integración de botones **"CARGAR DEMO"** en la cabecera y en el estado vacío de la lista de proyectos.
7. `src/styles/theme.css`:
   - Selectores `:root[data-theme="dark"]`, `:root[data-theme="light"]` y `:root[data-theme="amber"]`.
8. `src/App.tsx`:
   - Integración de `DocumentationView` y `SettingsView`, inicialización reactiva del tema y control de autoguardado.
9. `README.md`:
   - Actualización de instrucciones de compilación desktop y tabla de estado del MVP completado.
10. `docs/milestones/HITO-8.md`:
    - Registro de cumplimiento y criterios de verificación del hito.
