pub mod application;
pub mod commands;
pub mod domain;
pub mod infrastructure;

use application::AppState;
use infrastructure::storage::ProjectRepository;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Resolver el directorio estándar de datos del usuario:
            // En Linux: ~/.local/share/caad/
            // En Windows: %APPDATA%/caad/
            // En macOS: ~/Library/Application Support/caad/
            let app_data_dir = app
                .path()
                .data_dir()
                .map(|p| p.join("caad"))
                .unwrap_or_else(|_| {
                    app.path()
                        .app_data_dir()
                        .unwrap_or_else(|_| std::path::PathBuf::from(".caad_data"))
                });

            // Crear explícitamente el directorio ~/.local/share/caad
            if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
                eprintln!("Aviso: No se pudo crear directorio caad: {}", e);
            }

            // Crear directorio caad/exports para exportaciones locales
            let exports_dir = app_data_dir.join("exports");
            let _ = std::fs::create_dir_all(&exports_dir);

            let db_path = app_data_dir.join("caad.db");

            // Migrar base de datos si existía previamente en identificador antiguo
            if let Ok(old_data_dir) = app.path().app_data_dir() {
                let old_db = old_data_dir.join("caad.db");
                if old_db.exists() && !db_path.exists() {
                    let _ = std::fs::copy(&old_db, &db_path);
                }
            }

            let repo = ProjectRepository::open_file(&db_path)
                .expect("error al inicializar la base de datos SQLite de CAAD");

            app.manage(AppState {
                repo: Arc::new(repo),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::ping,
            commands::create_project,
            commands::list_projects,
            commands::get_project,
            commands::save_project,
            commands::rename_project,
            commands::delete_project,
            commands::get_schema_usages,
            commands::validate_project,
            commands::validate_document,
            commands::export_project_openapi_json,
            commands::export_project_openapi_yaml,
            commands::export_document_json,
            commands::export_document_yaml,
            commands::save_exported_file,
            commands::open_export_folder,
            commands::parse_openapi,
            commands::import_project_from_openapi,
            commands::replace_project_from_openapi,
            commands::create_example_project
        ])
        .run(tauri::generate_context!())
        .expect("error al ejecutar la aplicación CAAD");
}
