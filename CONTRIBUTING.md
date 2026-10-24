# Guía de Contribución para CAAD

## Principios de Desarrollo

1. **Aislamiento del Dominio:** La lógica de contratos y validación debe permanecer en Rust puro dentro de `src-tauri/src/domain/`. No dependas de Tauri ni de crates de terceros en el dominio.
2. **Sin Duplicación de Lógica en Frontend:** El frontend no implementa validaciones de negocio independientes; Rust es la fuente de verdad.
3. **Calidad de Código Obligatoria:** Todo cambio debe superar:
   - `./scripts/dev.sh cargo fmt --check --manifest-path src-tauri/Cargo.toml`
   - `./scripts/dev.sh cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`
   - `./scripts/dev.sh cargo test --manifest-path src-tauri/Cargo.toml`
   - `./scripts/dev.sh bun run check`
   - `./scripts/dev.sh bun run build`
4. **Registro de Decisiones:** Toda modificación de arquitectura o adición de dependencias debe documentarse mediante un ADR en `docs/ADR/`.
