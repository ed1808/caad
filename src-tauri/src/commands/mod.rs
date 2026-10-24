use crate::application::{AppState, ProjectService};
use crate::domain::project::Project;
use crate::infrastructure::storage::ProjectSummaryDto;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfoDto {
    pub name: String,
    pub version: String,
    pub description: String,
}

#[tauri::command]
pub fn ping() -> String {
    "pong".to_string()
}

#[tauri::command]
pub fn app_info() -> AppInfoDto {
    AppInfoDto {
        name: "CAAD".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Computer Assisted API Design".to_string(),
    }
}

#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
) -> Result<Project, String> {
    let service = ProjectService::new(state.repo.clone());
    service.create_project(&name, description)
}

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<ProjectSummaryDto>, String> {
    let service = ProjectService::new(state.repo.clone());
    service.list_projects()
}

#[tauri::command]
pub fn get_project(state: State<'_, AppState>, id: String) -> Result<Option<Project>, String> {
    let service = ProjectService::new(state.repo.clone());
    service.get_project(&id)
}

#[tauri::command]
pub fn save_project(state: State<'_, AppState>, project: Project) -> Result<(), String> {
    let service = ProjectService::new(state.repo.clone());
    service.save_project(project)
}

#[tauri::command]
pub fn rename_project(
    state: State<'_, AppState>,
    id: String,
    new_name: String,
) -> Result<Project, String> {
    let service = ProjectService::new(state.repo.clone());
    service.rename_project(&id, &new_name)
}

#[tauri::command]
pub fn delete_project(state: State<'_, AppState>, id: String) -> Result<bool, String> {
    let service = ProjectService::new(state.repo.clone());
    service.delete_project(&id)
}

#[tauri::command]
pub fn get_schema_usages(
    state: State<'_, AppState>,
    project_id: String,
    schema_name: String,
) -> Result<Vec<String>, String> {
    let service = ProjectService::new(state.repo.clone());
    service.get_schema_usages(&project_id, &schema_name)
}

#[tauri::command]
pub fn validate_project(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<Vec<crate::domain::validation::DesignIssue>, String> {
    let service = ProjectService::new(state.repo.clone());
    service.validate_project(&project_id)
}

#[tauri::command]
pub fn validate_document(
    document: crate::domain::api::ApiDefinition,
) -> Vec<crate::domain::validation::DesignIssue> {
    crate::domain::validation::validate_api_definition(&document)
}

#[tauri::command]
pub fn export_project_openapi_json(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<String, String> {
    let service = ProjectService::new(state.repo.clone());
    service.export_project_openapi_json(&project_id)
}

#[tauri::command]
pub fn export_project_openapi_yaml(
    state: State<'_, AppState>,
    project_id: String,
) -> Result<String, String> {
    let service = ProjectService::new(state.repo.clone());
    service.export_project_openapi_yaml(&project_id)
}

#[tauri::command]
pub fn export_document_json(document: crate::domain::api::ApiDefinition) -> Result<String, String> {
    crate::infrastructure::openapi::export_to_json(&document)
}

#[tauri::command]
pub fn export_document_yaml(document: crate::domain::api::ApiDefinition) -> Result<String, String> {
    crate::infrastructure::openapi::export_to_yaml(&document)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub saved_path: Option<String>,
    pub cancelled: bool,
    pub message: String,
}

pub fn ensure_caad_exports_dir(app: &tauri::AppHandle) -> std::path::PathBuf {
    use tauri::Manager;
    let dir = app
        .path()
        .data_dir()
        .map(|p| p.join("caad").join("exports"))
        .unwrap_or_else(|_| {
            if let Ok(home) = std::env::var("HOME") {
                std::path::PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("caad")
                    .join("exports")
            } else {
                std::path::PathBuf::from(".caad_exports")
            }
        });
    let _ = std::fs::create_dir_all(&dir);
    dir
}

pub fn get_fallback_export_path(app: &tauri::AppHandle, default_name: &str) -> std::path::PathBuf {
    use tauri::Manager;
    // 1. Probar directorio de Descargas estándar del sistema
    if let Ok(dl) = app.path().download_dir() {
        if std::fs::create_dir_all(&dl).is_ok() {
            return dl.join(default_name);
        }
    }

    // 2. Probar ~/Descargas o ~/Downloads en Linux/Unix
    if let Ok(home) = std::env::var("HOME") {
        let descargas = std::path::PathBuf::from(&home).join("Descargas");
        if descargas.is_dir() || std::fs::create_dir_all(&descargas).is_ok() {
            return descargas.join(default_name);
        }
        let downloads = std::path::PathBuf::from(&home).join("Downloads");
        if downloads.is_dir() || std::fs::create_dir_all(&downloads).is_ok() {
            return downloads.join(default_name);
        }
    }

    // 3. Directorio de datos de caad: ~/.local/share/caad/exports/
    let caad_exports = ensure_caad_exports_dir(app);
    caad_exports.join(default_name)
}

#[tauri::command]
pub fn save_exported_file(
    app: tauri::AppHandle,
    default_name: String,
    format: String,
    content: String,
) -> Result<ExportResult, String> {
    let extension = if format.to_lowercase().contains("yaml") || format.to_lowercase().contains("yml") {
        "yaml"
    } else {
        "json"
    };

    let filter_name = if extension == "yaml" {
        "OpenAPI YAML (*.yaml, *.yml)"
    } else {
        "OpenAPI JSON (*.json)"
    };

    // 1. Siempre guardar de inmediato en ~/.local/share/caad/exports/ para asegurar persistencia
    let caad_exports = ensure_caad_exports_dir(&app);
    let caad_backup_file = caad_exports.join(&default_name);
    let _ = std::fs::write(&caad_backup_file, &content);

    // 2. Guardar también en ./exports/ del directorio de trabajo actual si es posible
    if let Ok(cwd) = std::env::current_dir() {
        let local_exports = cwd.join("exports");
        if std::fs::create_dir_all(&local_exports).is_ok() {
            let _ = std::fs::write(local_exports.join(&default_name), &content);
        }
    }

    // 3. Intentar diálogo nativo del sistema
    let file_dialog = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter(filter_name, &[extension]);

    let chosen_path = file_dialog.save_file();

    let (final_path, is_fallback) = if let Some(path) = chosen_path {
        // El usuario seleccionó explícitamente una ruta en el diálogo
        std::fs::write(&path, &content)
            .map_err(|e| format!("Error al guardar archivo en {}: {}", path.display(), e))?;
        (path, false)
    } else {
        // Si el portal/diálogo nativo no está disponible o devolvió None,
        // guardar automáticamente en Descargas o en ~/.local/share/caad/exports/
        let fallback_path = get_fallback_export_path(&app, &default_name);
        if let Err(e) = std::fs::write(&fallback_path, &content) {
            eprintln!("Aviso: No se pudo escribir en fallback {}: {}", fallback_path.display(), e);
            // Si el fallback a Descargas falló, caad_backup_file ya fue guardado exitosamente en el paso 1
            (caad_backup_file, true)
        } else {
            (fallback_path, true)
        }
    };

    let saved_path_str = final_path.to_string_lossy().to_string();
    let message = if is_fallback {
        format!("Archivo guardado automáticamente en: {}", saved_path_str)
    } else {
        format!("Archivo exportado exitosamente en: {}", saved_path_str)
    };

    Ok(ExportResult {
        success: true,
        saved_path: Some(saved_path_str),
        cancelled: false,
        message,
    })
}

#[tauri::command]
pub fn open_export_folder(path: Option<String>, app: tauri::AppHandle) -> Result<(), String> {
    let target_dir = if let Some(ref p) = path {
        let pb = std::path::PathBuf::from(p);
        if pb.is_file() {
            pb.parent().map(|parent| parent.to_path_buf()).unwrap_or(pb)
        } else {
            pb
        }
    } else {
        ensure_caad_exports_dir(&app)
    };

    let _ = std::fs::create_dir_all(&target_dir);
    let dir_str = target_dir.to_string_lossy().to_string();

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| format!("No se pudo abrir la carpeta con xdg-open: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| format!("No se pudo abrir la carpeta en el explorador: {}", e))?;
        Ok(())
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| format!("No se pudo abrir la carpeta en Finder: {}", e))?;
        Ok(())
    }

    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("Plataforma no soportada para abrir explorador de archivos.".to_string())
    }
}

#[tauri::command]
pub fn parse_openapi(
    content: String,
) -> Result<crate::infrastructure::openapi::ImportReport, String> {
    crate::infrastructure::openapi::parse_and_report_openapi(&content)
}

#[tauri::command]
pub fn import_project_from_openapi(
    state: State<'_, AppState>,
    name: String,
    content: String,
) -> Result<Project, String> {
    let service = ProjectService::new(state.repo.clone());
    service.import_project_from_openapi(&name, &content)
}

#[tauri::command]
pub fn replace_project_from_openapi(
    state: State<'_, AppState>,
    project_id: String,
    content: String,
) -> Result<Project, String> {
    let service = ProjectService::new(state.repo.clone());
    service.replace_project_from_openapi(&project_id, &content)
}

#[tauri::command]
pub fn create_example_project(state: State<'_, AppState>) -> Result<Project, String> {
    let service = ProjectService::new(state.repo.clone());
    service.create_example_project()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn test_create_example_project_service() {
        let repo =
            Arc::new(crate::infrastructure::storage::ProjectRepository::open_in_memory().unwrap());
        let service = ProjectService::new(repo);
        let project = service
            .create_example_project()
            .expect("Debe crear el proyecto demo");
        assert_eq!(project.name, "Workshop API (Demo)");
        assert!(project.document.schemas.contains_key("Vehicle"));
        assert!(project.document.schemas.contains_key("WorkOrder"));
        assert_eq!(project.document.operations.len(), 2);
    }

    #[test]
    fn test_ping_command() {
        assert_eq!(ping(), "pong");
    }

    #[test]
    fn test_validate_document_command() {
        let mut api = crate::domain::api::ApiDefinition::new("Test API", "1.0.0");
        let mut schema = crate::domain::schema::SchemaDefinition::new_object();
        schema.properties.insert(
            "vehicle".to_string(),
            crate::domain::schema::SchemaDefinition::new_ref("#/components/schemas/NonExistent"),
        );
        api.add_schema("WorkOrder", schema);

        let issues = validate_document(api);
        assert!(issues.iter().any(|i| i.rule_id == "STRUCT-003"));
    }
}
