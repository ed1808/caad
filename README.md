# CAAD — Computer Assisted API Design

CAAD es una herramienta de escritorio **local-first** que asiste a desarrolladores y diseñadores en la definición, revisión, validación y exportación de contratos de APIs HTTP REST (OpenAPI 3.1.x) antes de implementar el backend.

---

## Características Principales (Visión del MVP)

- **Local-First y Privacidad:** Almacenamiento local en SQLite. Sin telemetría ni dependencias obligatorias de la nube.
- **Diseño Asistido:** Modelado visual y formulario de esquemas de datos reutilizables y operaciones REST.
- **Validación Determinista:** Detección de inconsistencias estructurales y advertencias de diseño con navegación directa al elemento.
- **Interoperabilidad OpenAPI 3.1.x:** Importación y exportación a JSON y YAML preservando el orden de propiedades sin pérdida silenciosa.
- **Desktop Nativo:** Construido con Tauri 2 (Rust) y frontend en React 19 + TypeScript + Vite.

---

## Estructura del Repositorio

```text
caad/
├── docs/                        # Especificaciones de arquitectura, producto y ADRs
│   ├── MANUAL_DE_USUARIO.md     # Manual oficial de usuario (técnico y no técnico)
│   ├── PROJECT_SPECS.md         # Documento maestro del proyecto
│   ├── ARCHITECTURE.md          # Arquitectura técnica y separación de capas
│   ├── ADR/                     # Architecture Decision Records
│   └── milestones/              # Seguimiento y estado de los hitos
├── fixtures/                    # Especificaciones OpenAPI de prueba y validación
├── .devcontainer/               # Entorno reproducible Docker (Rust, Bun, WebKitGTK)
├── src/                         # Frontend React + TypeScript
│   ├── app/                     # App shell y tipos
│   ├── components/              # Componentes de layout (Sidebar, Header, StatusBar, EmptyView)
│   ├── features/                # Módulos funcionales (Projects, Schemas, Operations, etc.)
│   ├── lib/                     # Clientes de integración IPC de Tauri
│   └── styles/                  # Variables de tema y reset CSS
├── src-tauri/                   # Backend nativo y dominio en Rust
│   ├── src/
│   │   ├── commands/            # Comandos IPC expuestos a la interfaz
│   │   ├── application/         # Orquestación de casos de uso
│   │   ├── domain/              # Núcleo de dominio puro (sin dependencias UI)
│   │   ├── infrastructure/      # Adaptadores SQLite y OpenAPI
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── bun.lock
```

---

## Requisitos de Desarrollo

Para garantizar reproducibilidad sin alterar el sistema operativo anfitrión, el desarrollo puede realizarse completamente mediante **Docker / Dev Container** o directamente en el host si cuenta con las herramientas instaladas:

1. **Docker y Docker Compose:** Docker `24+` con acceso de usuario al daemon.
2. *(Opcional en host)*:
   - **Bun:** `v1.4+`
   - **Rust & Cargo:** `1.85+` / stable
   - **WebKitGTK dev:** `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

---

## Comandos de Desarrollo

Se incluye el script `./scripts/dev.sh` para ejecutar comandos directamente en el contenedor de desarrollo:

### 1. Frontend

```bash
# Instalar dependencias
./scripts/dev.sh bun install

# Verificación de tipos TypeScript
./scripts/dev.sh bun run check

# Compilación de producción del frontend
./scripts/dev.sh bun run build
```

### 2. Backend (Rust)

```bash
# Verificación de compilación de Rust
./scripts/dev.sh cargo check --manifest-path src-tauri/Cargo.toml

# Formateo de código Rust
./scripts/dev.sh cargo fmt --check --manifest-path src-tauri/Cargo.toml

# Análisis estático de código (linter)
./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings

# Ejecución de pruebas unitarias
./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml
```

### 3. Ejecución de la Aplicación de Escritorio

```bash
# Modo desarrollo con recarga rápida (HMR y Tauri Window)
./scripts/dev.sh bun run tauri dev

# Compilación del binario ejecutable desktop
./scripts/dev.sh cargo build --manifest-path src-tauri/Cargo.toml
```

---

## Estado del Proyecto (MVP Completado)

- [x] **Hito 0:** Verificación técnica y decisiones iniciales (ADR-0001, ADR-0002).
- [x] **Hito 1:** Esqueleto ejecutable Tauri 2 + React 19 + Bun.
- [x] **Hito 2:** Modelo de dominio puro en Rust y pruebas unitarias.
- [x] **Hito 3:** Persistencia local SQLite transaccional y autoguardado debounced.
- [x] **Hito 4:** Diseñador visual de esquemas reutilizables y referencias internas.
- [x] **Hito 5:** Gestión de operaciones REST, parámetros, request body y respuestas HTTP.
- [x] **Hito 6:** Motor de diagnósticos en Rust con 16 reglas activas (`STRUCT-*`, `CONS-*`, `SUGG-*`) y navegación asistida de 1-clic.
- [x] **Hito 7:** Importador/Exportador OpenAPI 3.1.x nativo (JSON y YAML) con reporte de pérdida no silenciosa (*non-silent loss*).
- [x] **Hito 8:** Vista previa de documentación interactiva, consola de pruebas mock local, proyecto de ejemplo canónico (Workshop API) y soporte de temas (Dark, Light, Amber).

---

## Licencia

Propiedad del proyecto CAAD. Consulta el documento [`docs/PROJECT_SPECS.md`](file:///home/edward_r94/Documentos/web-projects/caad/docs/PROJECT_SPECS.md) para más detalles.
