# ADR-0001: Selección del Stack Tecnológico Base (Tauri 2, Rust, React, Bun)

- **Estado:** Aceptado
- **Fecha:** Octubre 2026
- **Contexto:** Hito 0 — Verificación técnica y decisiones iniciales

---

## Contexto y Planteamiento del Problema

CAAD (*Computer Assisted API Design*) es una herramienta de escritorio orientada a diseñadores y desarrolladores de APIs. Requiere una interfaz con formularios densos, navegación ágil entre recursos y paneles de diagnóstico reactivos, combinada con un motor de validación estricto, persistencia local segura y procesamiento de archivos sin latencia apreciable.

Era necesario determinar el runtime de escritorio, el lenguaje del núcleo de dominio y el stack de interfaz de usuario, evaluando alternativas y verificando el estado del entorno de desarrollo.

---

## Factores de Decisión

1. **Rendimiento y consumo de recursos:** Evitar el alto consumo de memoria y tamaño de empaquetado típico de Electron.
2. **Seguridad y robustez del dominio:** Garantizar invariantes de tipos estrictos en el modelo de contratos y validadores.
3. **Ergonomía de desarrollo de UI:** Facilidad para construir interfaces complejas con tablas, árboles, formularios y autocompletados.
4. **Local-first sin dependencias en la nube:** Operación completamente offline con almacenamiento SQLite.
5. **Verificación del entorno local:** Evaluar el estado de las herramientas en el sistema operativo del desarrollador (Pop!_OS 24.04 LTS / Ubuntu noble).

---

## Decisiones Consideradas

### 1. Shell de Escritorio
- **Opción A: Tauri 2 (Elegida).** Utiliza el webview del sistema operativo (WebKitGTK en Linux), con backend nativo en Rust. Ofrece un binario ligero, control estricto de permisos IPC y mínimo uso de memoria RAM.
- **Opción B: Electron.** Ecosistema maduro pero genera binarios pesados (>150MB) y alto consumo de memoria, innecesario para una herramienta local de diseño.
- **Opción C: Frameworks GUI nativos de Rust (Slint, egui, iced).** Excelente rendimiento nativo en Rust, pero el ecosistema de componentes UI para formularios web/REST (árboles de rutas, editores complejos, documentación tipo Swagger/Scalar) es significativamente más inmaduro y costoso de mantener.

### 2. Lenguaje del Dominio y Reglas
- **Rust (Elegido).** Proporciona seguridad de memoria sin recolector de basura, sistema de tipos algebraicos exhaustivo para modelar invariantes de OpenAPI y excelente soporte de serialización con Serde.

### 3. Frontend y Gestor de Paquetes
- **Frontend: React 19 + TypeScript + Vite.** Amplio ecosistema de componentes UI accesibles y tipado estricto.
- **Gestor: Bun (v1.4.2 verificado).** Proporciona resolución de dependencias ultra-rápida y scripts de build ágiles.

---

## Hallazgos en la Verificación del Entorno Real

Durante la inspección en el entorno del sistema (Pop!_OS 24.04 LTS):
- **Bun:** Instalado y funcional (`v1.4.2` en `/home/edward_r94/.bun/bin/bun`).
- **Rust / Cargo:** No instalado en el sistema (`rustc: orden no encontrada`).
- **Cabeceras de desarrollo de Tauri en Linux:** `libwebkit2gtk-4.1-dev`, `libssl-dev`, `libayatana-appindicator3-dev` y `librsvg2-dev` no están instaladas (aunque las librerías runtime de WebKitGTK sí están presentes).
- **Compilador C:** GCC 13.3 y GCC 14.2 junto con `pkg-config` están instalados.
- **Docker:** Instalado y operativo (`Docker v29.9.0`), accesible sin sudo por el usuario.

**Decisión de Entorno:**
Para compilar Rust, ejecutar pruebas `cargo test` y compilar Tauri 2 sin alterar ni saturar de cabeceras el sistema operativo anfitrión (Pop!_OS), se utilizará un contenedor Docker / Dev Container con la toolchain de Rust, Bun y las cabeceras WebKitGTK / GTK requeridas.

---

## Consecuencias

### Positivas
- Separación limpia de responsabilidades: Rust para dominio e IO seguro, React para UI y estado transitorio.
- Aplicación liviana y rápida de distribuir.
- Modelo de concurrencia y validación seguro en Rust.

### Riesgos y Mitigaciones
- **Riesgo:** WebKitGTK en Linux puede presentar inconsistencias de renderizado frente a Chromium/Blink en plataformas Windows/macOS.  
  *Mitigación:* Limitar el uso de CSS a estándares ampliamente soportados y realizar comprobaciones en los sistemas operativos destino.
- **Riesgo:** Duplicación de lógica de validación entre frontend y backend.  
  *Mitigación:* Se prohíbe que el frontend implemente validaciones de negocio independientes; el backend en Rust es la única fuente de verdad diagnóstica.
