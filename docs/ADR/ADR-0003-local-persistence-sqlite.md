# ADR-0003: Persistencia Local Mediante SQLite y Almacén de Documentos JSON Versionados

- **Estado:** Aceptado
- **Fecha:** Octubre 2026
- **Contexto:** Hito 0 — Verificación técnica y decisiones iniciales

---

## Contexto y Planteamiento del Problema

CAAD necesita almacenar proyectos localmente en el equipo del usuario sin requerir bases de datos externas, servicios en la nube ni configuraciones complejas. La aplicación requiere:
- Persistencia atómica y resiliente ante caídas repentinas o fallos de energía.
- Capacidad de evolucionar el esquema de datos interno a lo largo de las versiones del producto.
- Soporte para autoguardado sin penalizaciones de rendimiento.

Se evaluaron opciones entre un modelo completamente relacional normalizado (múltiples tablas: `endpoints`, `schemas`, `parameters`, `responses`), archivos JSON sueltos en el disco, o un modelo SQLite híbrido tipo almacén de documentos.

---

## Alternativas Evaluadas

### 1. Archivos Planos JSON en el Sistema de Archivos
- **Ventajas:** Fácil inspección por el usuario con editores externos.
- **Desventajas:** No ofrece control transaccional robusto, susceptible a escrituras a medias o corrupción si la app se interrumpe durante el guardado; no maneja índices ni metadatos de múltiples proyectos de forma atómica.

### 2. SQLite con Tablas Totalmente Normalizadas
- **Ventajas:** Integridad referencial forzada por claves foráneas a nivel de base de datos.
- **Desventajas:** Excesiva complejidad para el MVP: requiere decenas de operaciones INSERT/UPDATE/DELETE en cascada por cada cambio de diseño, mapeos objeto-relacionales tediosos y migraciones SQL engorrosas por cada ajuste fino en el modelo de contratos.

### 3. SQLite con Tabla de Proyectos y Documento JSON Versionado (Elegida)
- **Ventajas:**
  - Combina la fiabilidad y atomicidad de SQLite (transacciones ACID, modo WAL) con la flexibilidad de un documento de diseño serializado en JSON mediante Serde.
  - El campo `document_schema_version INTEGER NOT NULL` permite ejecutar migraciones de datos estructuradas en memoria cuando se actualiza el formato interno.
  - Guarda el contrato completo en una sola transacción rápida.
- **Biblioteca en Rust:** `rusqlite` con la feature `bundled` (para no depender de la versión de SQLite del sistema) y `rusqlite_migration` para migraciones de esquema basadas en `PRAGMA user_version`.

---

## Decisión Arquitectónica

1. **Uso de `rusqlite` con feature `bundled`:**
   - Garantiza consistencia en cualquier sistema operativo (Linux, macOS, Windows) al compilar la versión oficial embebida de SQLite.

2. **Gestión de Migraciones con `rusqlite_migration`:**
   - Aprovecha `PRAGMA user_version`, evitando crear tablas adicionales de metadatos de migración y reduciendo el tiempo de inicialización de la base de datos.

3. **Esquema Inicial (Migración 1):**
   ```sql
   CREATE TABLE projects (
       id TEXT PRIMARY KEY,
       name TEXT NOT NULL,
       description TEXT,
       document_schema_version INTEGER NOT NULL,
       document_json TEXT NOT NULL,
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL
   );
   CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);
   ```

4. **Configuración de Rendimiento y Seguridad:**
   - `PRAGMA journal_mode = WAL;` (Write-Ahead Logging para lecturas y escrituras concurrentes eficientes).
   - `PRAGMA synchronous = NORMAL;` (balance ideal entre integridad y velocidad en discos modernos).
   - `PRAGMA foreign_keys = ON;`

5. **Estrategia de Guardado:**
   - El frontend aplica un debounce (ej. 1000 ms) antes de solicitar persistencia.
   - Rust ejecuta la actualización dentro de una transacción. Si la serialización o escritura falla, se conserva el estado previo y se emite un error estructurado a la UI sin descartar el borrador en memoria.

---

## Consecuencias

- Persistencia simple, robusta y con garantías ACID.
- Cero dependencias externas en tiempo de ejecución.
- Camino despejado para el Hito 3.
