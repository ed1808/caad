# Hito 7 — Importación y exportación OpenAPI

**Estado:** Completado  
**Fecha:** Octubre 2026  

---

## Objetivos del Hito

- [x] **Exportación OpenAPI 3.1.x nativa en JSON y YAML:**
  - Exportación con orden de campos y endpoints preservado (`IndexMap` y feature `preserve_order` en `serde_json`).
  - Serialización YAML conforme al estándar mediante el crate moderno y mantenido `yaml_serde` (ADR-0002 respetado estrictamente; sin uso del obsoleto y abandonado `serde_yaml`).
  - Enriquecimiento con metadatos completos (`openapi: 3.1.0`, `info`, `paths`, `components.schemas`).
- [x] **Importación OpenAPI 3.0 / 3.1.x en JSON y YAML:**
  - Deserialización segura y flexible de especificaciones OpenAPI tanto en formato JSON como YAML.
  - Normalización de patrones OpenAPI 3.0 hacia OpenAPI 3.1:
    - Conversión de `nullable: true` al array de tipos `["<type>", "null"]` nativo de OpenAPI 3.1 / JSON Schema 2020-12.
  - Extracción de operaciones HTTP estándar (`get`, `post`, `put`, `delete`, `patch`, `options`, `head`, `trace`) asociadas a cada ruta.
  - Mapeo de parámetros (`path`, `query`, `header`, `cookie`), request bodies y responses.
- [x] **Detección y reporte de pérdida no silenciosa (Non-Silent Loss):**
  - Generación de informe tipado de compatibilidad (`ImportReport`) con lista de advertencias (`ImportWarning`):
    - Reporte de referencias externas o remotas no resueltas (`#/external/...` o `http://...`).
    - Detección de constructos avanzados o extensiones de especificación no representadas directamente en el modelo de diseño simplificado (`callbacks`, `links`, extensiones de seguridad propietarias, etc.).
  - Presentación visual explícita en el modal de importación antes de persistir o sobrescribir datos.
- [x] **Protección contra sobrescritura no intencional:**
  - Prohibición de sobrescritura de proyectos existentes sin confirmación expresa del usuario.
  - Opciones claras en el flujo de importación: crear un proyecto nuevo con nombre personalizado o reemplazar el proyecto activo con advertencia destructiva.
- [x] **Pruebas de ida y vuelta (Roundtrip tests):**
  - Pruebas exhaustivas en Rust que exportan un modelo a JSON/YAML y lo reimportan verificando la integridad de esquemas, propiedades, operaciones y respuestas.
  - Pruebas con fixtures reales de taller (`fixtures/openapi/workshop-api.yaml` y `.json`).
- [x] **Comandos Tauri IPC nativos:**
  - `export_project_openapi_json` y `export_project_openapi_yaml`.
  - `export_document_json` y `export_document_yaml`.
  - `parse_openapi` (análisis preliminar y cálculo de reporte de compatibilidad sin modificar la base de datos).
  - `import_project_from_openapi` (creación transaccional de un nuevo proyecto importado en SQLite).
  - `replace_project_from_openapi` (reemplazo transaccional del documento de un proyecto existente).
- [x] **Interfaz de Usuario Cyber-Brutalista con Lucide Icons:**
  - `ExportModal`: Selector de formato YAML/JSON, indicador de salud de validación (aviso de errores estructurales si los hubiere), previsualización del código fuente con sintaxis monoespaciada, copia al portapapeles y descarga de archivo directo (`.yaml` o `.json`).
  - `ImportModal`: Asistente de 2 pasos con carga de archivo (`.yaml`, `.json`), pegado directo de texto, botón para cargar fixture de prueba, informe de compatibilidad con desglose de advertencias, y selección protegida entre "Crear nuevo proyecto" o "Reemplazar proyecto activo".
  - Integración accesible desde el directorio de proyectos (`ProjectsView`) y la barra superior (`Header`).

---

## Criterios de Salida y Verificación

| Criterio | Comando Ejecutado | Resultado Real |
|---|---|---|
| **Pruebas de Dominio y OpenAPI Rust** | `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml` | Éxito: **35 tests pasados**, 0 fallidos (incluyendo roundtrip, fixtures y nullable 3.0) |
| **Linter Rust (Clippy con `-D warnings`)** | `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | Éxito: código 0, **0 advertencias** |
| **Formato Rust** | `./scripts/dev.sh cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | Éxito: código 0, formato verificado |
| **Chequeo TypeScript** | `./scripts/dev.sh bun run check` | Éxito: código 0 (`tsc --noEmit`), **0 errores de tipo** |
| **Build Frontend** | `./scripts/dev.sh bun run build` | Éxito: código 0 (`dist/index.html`, bundle generado en 568ms) |

---

## Archivos Creados o Modificados

1. `src-tauri/Cargo.toml`:
   - Adición de `yaml_serde = "0.10.7"` cumpliendo ADR-0002.
   - Habilitación del feature `preserve_order` en `serde_json` para mantener el orden de inserción de propiedades y operaciones.
2. `src-tauri/src/infrastructure/openapi.rs`:
   - Lógica de exportación (`export_to_json`, `export_to_yaml`).
   - Lógica de parseo, normalización 3.0 -> 3.1 y detección de advertencias (`parse_and_report_openapi`).
   - Suite de 7 pruebas unitarias de exportación, parseo de fixtures, normalización y roundtrip.
3. `src-tauri/src/infrastructure/mod.rs`:
   - Exportación del módulo `openapi` y sus funciones públicas.
4. `src-tauri/src/application/mod.rs`:
   - Métodos en `ProjectService` para exportación e importación con persistencia transaccional SQLite.
5. `src-tauri/src/commands/mod.rs` & `src-tauri/src/lib.rs`:
   - 7 nuevos comandos IPC registrados en Tauri para interactuar de forma segura con el frontend.
6. `src/app/types.ts`:
   - Interfaces `ImportWarning` e `ImportReport`.
7. `src/lib/tauri.ts`:
   - Funciones clientes IPC `exportProjectOpenApiJson`, `exportProjectOpenApiYaml`, `exportDocumentJson`, `exportDocumentYaml`, `parseOpenApi`, `importProjectFromOpenApi` y `replaceProjectFromOpenApi` con soporte de fallback para modo web.
8. `src/features/openapi/ExportModal.tsx`:
   - Modal cyber-brutalista de exportación con selector YAML/JSON, diagnóstico de salud, previsualizador y descarga.
9. `src/features/openapi/ImportModal.tsx`:
   - Modal cyber-brutalista de importación en dos fases con reporte de pérdida no silenciosa y confirmación explícita de destino.
10. `src/components/Header.tsx`:
    - Incorporación de botones de acción `EXPORTAR` e `IMPORTAR` integrados con el flujo de trabajo global.
11. `src/features/projects/ProjectsView.tsx`:
    - Botón `IMPORTAR OPENAPI` en la cabecera del directorio de proyectos.
12. `src/App.tsx`:
    - Orquestación y renderizado de los modales de OpenAPI con refresco reactivo del estado del proyecto activo.
13. `docs/milestones/HITO-7.md`:
    - Registro de cumplimiento y criterios de verificación.
