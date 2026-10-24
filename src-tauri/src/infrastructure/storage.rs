use crate::domain::project::Project;
use chrono::{DateTime, Utc};
use rusqlite::{Connection, OptionalExtension, params};
use rusqlite_migration::{M, Migrations};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectSummaryDto {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub document_schema_version: u32,
    pub updated_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, thiserror::Error)]
pub enum StorageError {
    #[error("Error de base de datos SQLite: {0}")]
    Sqlite(#[from] rusqlite::Error),

    #[error("Error de migración de esquema: {0}")]
    Migration(#[from] rusqlite_migration::Error),

    #[error("Error de serialización JSON: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Proyecto no encontrado: {0}")]
    NotFound(String),

    #[error("Dato inválido: {0}")]
    InvalidData(String),

    #[error("Error de concurrencia/bloqueo de base de datos")]
    LockError,
}

pub struct ProjectRepository {
    conn: Arc<Mutex<Connection>>,
    db_path: Option<PathBuf>,
}

impl ProjectRepository {
    /// Inicializa las migraciones del esquema.
    fn migrations() -> Migrations<'static> {
        Migrations::new(vec![M::up(
            "CREATE TABLE projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                document_schema_version INTEGER NOT NULL,
                document_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);",
        )])
    }

    /// Abre una base de datos en un archivo del sistema de archivos.
    pub fn open_file<P: AsRef<Path>>(path: P) -> Result<Self, StorageError> {
        let path_buf = path.as_ref().to_path_buf();
        if let Some(parent) = path_buf.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let mut conn = Connection::open(&path_buf)?;
        Self::apply_pragmas(&mut conn)?;

        let migrations = Self::migrations();
        migrations.to_latest(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: Some(path_buf),
        })
    }

    /// Abre una base de datos SQLite en memoria (ideal para pruebas unitarias).
    pub fn open_in_memory() -> Result<Self, StorageError> {
        let mut conn = Connection::open_in_memory()?;
        Self::apply_pragmas(&mut conn)?;

        let migrations = Self::migrations();
        migrations.to_latest(&mut conn)?;

        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path: None,
        })
    }

    fn apply_pragmas(conn: &mut Connection) -> Result<(), StorageError> {
        conn.pragma_update(None, "journal_mode", "WAL").ok();
        conn.pragma_update(None, "synchronous", "NORMAL").ok();
        conn.pragma_update(None, "foreign_keys", "ON")?;
        Ok(())
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummaryDto>, StorageError> {
        let conn = self.conn.lock().map_err(|_| StorageError::LockError)?;
        let mut stmt = conn.prepare(
            "SELECT id, name, description, document_schema_version, created_at, updated_at
             FROM projects ORDER BY updated_at DESC",
        )?;

        let rows = stmt.query_map([], |row| {
            let created_str: String = row.get(4)?;
            let updated_str: String = row.get(5)?;

            let created_at = DateTime::parse_from_rfc3339(&created_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(ProjectSummaryDto {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                document_schema_version: row.get(3)?,
                created_at,
                updated_at,
            })
        })?;

        let mut results = Vec::new();
        for row in rows {
            results.push(row?);
        }
        Ok(results)
    }

    pub fn get_project(&self, id: &str) -> Result<Option<Project>, StorageError> {
        let conn = self.conn.lock().map_err(|_| StorageError::LockError)?;
        let mut stmt = conn.prepare(
            "SELECT id, name, description, document_schema_version, document_json, created_at, updated_at
             FROM projects WHERE id = ?1",
        )?;

        let project = stmt
            .query_row(params![id], |row| {
                let id: String = row.get(0)?;
                let name: String = row.get(1)?;
                let description: Option<String> = row.get(2)?;
                let document_schema_version: u32 = row.get(3)?;
                let doc_json: String = row.get(4)?;
                let created_str: String = row.get(5)?;
                let updated_str: String = row.get(6)?;

                let created_at = DateTime::parse_from_rfc3339(&created_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                let updated_at = DateTime::parse_from_rfc3339(&updated_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                let document = serde_json::from_str(&doc_json).map_err(|e| {
                    rusqlite::Error::FromSqlConversionFailure(
                        4,
                        rusqlite::types::Type::Text,
                        Box::new(e),
                    )
                })?;

                Ok(Project {
                    id,
                    name,
                    description,
                    document_schema_version,
                    document,
                    created_at,
                    updated_at,
                })
            })
            .optional()?;

        Ok(project)
    }

    pub fn save_project(&self, project: &Project) -> Result<(), StorageError> {
        let mut conn = self.conn.lock().map_err(|_| StorageError::LockError)?;
        let doc_json = serde_json::to_string(&project.document)?;

        let tx = conn.transaction()?;
        tx.execute(
            "INSERT INTO projects (id, name, description, document_schema_version, document_json, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                document_schema_version = excluded.document_schema_version,
                document_json = excluded.document_json,
                updated_at = excluded.updated_at",
            params![
                project.id,
                project.name,
                project.description,
                project.document_schema_version,
                doc_json,
                project.created_at.to_rfc3339(),
                project.updated_at.to_rfc3339(),
            ],
        )?;
        tx.commit()?;
        Ok(())
    }

    pub fn rename_project(&self, id: &str, new_name: &str) -> Result<Project, StorageError> {
        let trimmed = new_name.trim();
        if trimmed.is_empty() {
            return Err(StorageError::InvalidData(
                "El nombre no puede estar vacío".to_string(),
            ));
        }

        let mut project = self
            .get_project(id)?
            .ok_or_else(|| StorageError::NotFound(id.to_string()))?;

        project.name = trimmed.to_string();
        project.document.info.title = trimmed.to_string();
        project.touch();

        self.save_project(&project)?;
        Ok(project)
    }

    pub fn delete_project(&self, id: &str) -> Result<bool, StorageError> {
        let conn = self.conn.lock().map_err(|_| StorageError::LockError)?;
        let affected = conn.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
        Ok(affected > 0)
    }

    pub fn get_db_path(&self) -> Option<&PathBuf> {
        self.db_path.as_ref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_and_empty_list() {
        let repo = ProjectRepository::open_in_memory().expect("debe abrir BD en memoria");
        let list = repo.list_projects().expect("debe listar proyectos");
        assert!(list.is_empty());
    }

    #[test]
    fn test_create_read_update_delete_project_lifecycle() {
        let repo = ProjectRepository::open_in_memory().expect("debe abrir BD");

        // 1. Crear y guardar proyecto
        let mut proj = Project::new("Workshop API", Some("Taller".to_string())).unwrap();
        repo.save_project(&proj).expect("debe guardar");

        // 2. Listar
        let list = repo.list_projects().expect("debe listar");
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].name, "Workshop API");

        // 3. Recuperar
        let fetched = repo.get_project(&proj.id).unwrap().expect("debe existir");
        assert_eq!(fetched.id, proj.id);
        assert_eq!(fetched.document.info.title, "Workshop API");

        // 4. Renombrar
        let renamed = repo.rename_project(&proj.id, "Workshop API v2").unwrap();
        assert_eq!(renamed.name, "Workshop API v2");
        assert_eq!(renamed.document.info.title, "Workshop API v2");

        // 5. Actualizar documento y re-guardar
        proj.name = "Workshop API v2".to_string();
        proj.document.info.title = "Workshop API v2".to_string();
        proj.document.info.version = "2.0.0".to_string();
        repo.save_project(&proj).unwrap();

        let updated = repo.get_project(&proj.id).unwrap().unwrap();
        assert_eq!(updated.document.info.version, "2.0.0");

        // 6. Eliminar
        let deleted = repo.delete_project(&proj.id).unwrap();
        assert!(deleted);
        assert!(repo.get_project(&proj.id).unwrap().is_none());
    }
}
