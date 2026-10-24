use crate::domain::project::Project;
use crate::infrastructure::storage::{ProjectRepository, ProjectSummaryDto};
use std::sync::Arc;

pub struct AppState {
    pub repo: Arc<ProjectRepository>,
}

pub struct ProjectService {
    repo: Arc<ProjectRepository>,
}

impl ProjectService {
    pub fn new(repo: Arc<ProjectRepository>) -> Self {
        Self { repo }
    }

    pub fn create_project(
        &self,
        name: &str,
        description: Option<String>,
    ) -> Result<Project, String> {
        let project = Project::new(name, description)?;
        self.repo
            .save_project(&project)
            .map_err(|e| format!("Error al persistir el proyecto: {}", e))?;
        Ok(project)
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummaryDto>, String> {
        self.repo
            .list_projects()
            .map_err(|e| format!("Error al consultar proyectos: {}", e))
    }

    pub fn get_project(&self, id: &str) -> Result<Option<Project>, String> {
        self.repo
            .get_project(id)
            .map_err(|e| format!("Error al cargar el proyecto: {}", e))
    }

    pub fn save_project(&self, mut project: Project) -> Result<(), String> {
        project.touch();
        self.repo
            .save_project(&project)
            .map_err(|e| format!("Error al guardar el proyecto: {}", e))
    }

    pub fn rename_project(&self, id: &str, new_name: &str) -> Result<Project, String> {
        self.repo
            .rename_project(id, new_name)
            .map_err(|e| format!("Error al renombrar el proyecto: {}", e))
    }

    pub fn delete_project(&self, id: &str) -> Result<bool, String> {
        self.repo
            .delete_project(id)
            .map_err(|e| format!("Error al eliminar el proyecto: {}", e))
    }

    pub fn get_schema_usages(
        &self,
        project_id: &str,
        schema_name: &str,
    ) -> Result<Vec<String>, String> {
        let project = self
            .get_project(project_id)?
            .ok_or_else(|| format!("Proyecto con ID '{}' no encontrado", project_id))?;
        Ok(project.document.find_schema_usages(schema_name))
    }

    pub fn validate_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<crate::domain::validation::DesignIssue>, String> {
        let project = self
            .get_project(project_id)?
            .ok_or_else(|| format!("Proyecto con ID '{}' no encontrado", project_id))?;
        Ok(crate::domain::validation::validate_api_definition(
            &project.document,
        ))
    }

    pub fn export_project_openapi_json(&self, project_id: &str) -> Result<String, String> {
        let project = self
            .get_project(project_id)?
            .ok_or_else(|| format!("Proyecto con ID '{}' no encontrado", project_id))?;
        crate::infrastructure::openapi::export_to_json(&project.document)
    }

    pub fn export_project_openapi_yaml(&self, project_id: &str) -> Result<String, String> {
        let project = self
            .get_project(project_id)?
            .ok_or_else(|| format!("Proyecto con ID '{}' no encontrado", project_id))?;
        crate::infrastructure::openapi::export_to_yaml(&project.document)
    }

    pub fn parse_openapi_document(
        &self,
        content: &str,
    ) -> Result<crate::infrastructure::openapi::ImportReport, String> {
        crate::infrastructure::openapi::parse_and_report_openapi(content)
    }

    pub fn import_project_from_openapi(
        &self,
        name: &str,
        content: &str,
    ) -> Result<Project, String> {
        let report = crate::infrastructure::openapi::parse_and_report_openapi(content)?;
        let mut document = report.document.ok_or_else(|| {
            "El informe de importación no generó una definición válida.".to_string()
        })?;

        let project_name = if name.trim().is_empty() {
            document.info.title.clone()
        } else {
            name.trim().to_string()
        };

        // Si se especificó un nombre explícito, sincronizar info.title
        document.info.title = project_name.clone();

        let mut project = Project::new(&project_name, document.info.description.clone())?;
        project.document = document;
        self.repo
            .save_project(&project)
            .map_err(|e| format!("Error al persistir el proyecto importado: {}", e))?;
        Ok(project)
    }

    pub fn replace_project_from_openapi(
        &self,
        project_id: &str,
        content: &str,
    ) -> Result<Project, String> {
        let mut project = self
            .get_project(project_id)?
            .ok_or_else(|| format!("Proyecto con ID '{}' no encontrado", project_id))?;

        let report = crate::infrastructure::openapi::parse_and_report_openapi(content)?;
        let document = report.document.ok_or_else(|| {
            "El informe de importación no generó una definición válida.".to_string()
        })?;

        project.document = document;
        project.touch();
        self.repo
            .save_project(&project)
            .map_err(|e| format!("Error al guardar cambios de importación: {}", e))?;
        Ok(project)
    }

    pub fn create_example_project(&self) -> Result<Project, String> {
        const WORKSHOP_API_YAML: &str = include_str!("../../../fixtures/openapi/workshop-api.yaml");
        self.import_project_from_openapi("Workshop API (Demo)", WORKSHOP_API_YAML)
    }
}
