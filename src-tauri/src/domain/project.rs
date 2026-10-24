use crate::domain::api::ApiDefinition;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub const CURRENT_DOCUMENT_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub document_schema_version: u32,
    pub document: ApiDefinition,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl Project {
    /// Crea un nuevo proyecto garantizando las invariantes de identidad y nombre.
    pub fn new(name: impl Into<String>, description: Option<String>) -> Result<Self, String> {
        let name_str = name.into();
        let trimmed_name = name_str.trim();
        if trimmed_name.is_empty() {
            return Err("El nombre del proyecto no puede estar vacío.".to_string());
        }

        let now = Utc::now();
        let project_id = Uuid::new_v4().to_string();
        let api_doc = ApiDefinition::new(trimmed_name, "0.1.0");

        Ok(Self {
            id: project_id,
            name: trimmed_name.to_string(),
            description,
            document_schema_version: CURRENT_DOCUMENT_SCHEMA_VERSION,
            document: api_doc,
            created_at: now,
            updated_at: now,
        })
    }

    /// Actualiza el nombre del proyecto validando la invariante.
    pub fn set_name(&mut self, new_name: impl Into<String>) -> Result<(), String> {
        let name_str = new_name.into();
        let trimmed = name_str.trim();
        if trimmed.is_empty() {
            return Err("El nombre del proyecto no puede estar vacío.".to_string());
        }
        self.name = trimmed.to_string();
        self.updated_at = Utc::now();
        Ok(())
    }

    /// Toca la marca temporal de actualización tras modificaciones en el documento.
    pub fn touch(&mut self) {
        self.updated_at = Utc::now();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_valid_project() {
        let proj = Project::new("  Workshop API  ", Some("API de taller".to_string()))
            .expect("debe crear proyecto");
        assert_eq!(proj.name, "Workshop API");
        assert_eq!(proj.document_schema_version, 1);
        assert!(!proj.id.is_empty());
        assert_eq!(proj.document.info.title, "Workshop API");
    }

    #[test]
    fn test_reject_empty_project_name() {
        let err = Project::new("   ", None).unwrap_err();
        assert!(err.contains("no puede estar vacío"));
    }

    #[test]
    fn test_project_serialization_roundtrip() {
        let proj = Project::new("Test Project", None).unwrap();
        let json = serde_json::to_string(&proj).expect("error serializando proyecto");
        let restored: Project = serde_json::from_str(&json).expect("error deserializando proyecto");
        assert_eq!(proj.id, restored.id);
        assert_eq!(proj.name, restored.name);
        assert_eq!(
            proj.document_schema_version,
            restored.document_schema_version
        );
    }
}
