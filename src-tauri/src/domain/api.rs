use crate::domain::operation::Operation;
use crate::domain::schema::SchemaDefinition;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiInfo {
    pub title: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

impl Default for ApiInfo {
    fn default() -> Self {
        Self {
            title: "Nueva API".to_string(),
            version: "0.1.0".to_string(),
            summary: None,
            description: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Server {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Tag {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SecurityScheme {
    #[serde(rename = "type")]
    pub scheme_type: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheme: Option<String>,

    #[serde(rename = "bearerFormat", skip_serializing_if = "Option::is_none")]
    pub bearer_format: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    #[serde(rename = "in", skip_serializing_if = "Option::is_none")]
    pub in_location: Option<String>,

    #[serde(rename = "openIdConnectUrl", skip_serializing_if = "Option::is_none")]
    pub open_id_connect_url: Option<String>,

    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub flows: Option<serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiDefinition {
    pub openapi_version: String,
    pub info: ApiInfo,
    #[serde(default)]
    pub servers: Vec<Server>,
    #[serde(default)]
    pub tags: Vec<Tag>,
    #[serde(default)]
    pub schemas: BTreeMap<String, SchemaDefinition>,
    #[serde(default)]
    pub operations: Vec<Operation>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub security_schemes: BTreeMap<String, SecurityScheme>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub security: Vec<BTreeMap<String, Vec<String>>>,
}

impl Default for ApiDefinition {
    fn default() -> Self {
        Self {
            openapi_version: "3.1.0".to_string(),
            info: ApiInfo::default(),
            servers: Vec::new(),
            tags: Vec::new(),
            schemas: BTreeMap::new(),
            operations: Vec::new(),
            security_schemes: BTreeMap::new(),
            security: Vec::new(),
        }
    }
}

impl ApiDefinition {
    pub fn new(title: impl Into<String>, version: impl Into<String>) -> Self {
        Self {
            openapi_version: "3.1.0".to_string(),
            info: ApiInfo {
                title: title.into(),
                version: version.into(),
                summary: None,
                description: None,
            },
            servers: Vec::new(),
            tags: Vec::new(),
            schemas: BTreeMap::new(),
            operations: Vec::new(),
            security_schemes: BTreeMap::new(),
            security: Vec::new(),
        }
    }

    /// Añade o actualiza un esquema reutilizable en components.schemas
    pub fn add_schema(&mut self, name: impl Into<String>, schema: SchemaDefinition) {
        let name_str = name.into();
        self.schemas.insert(name_str, schema);
    }

    /// Añade una operación HTTP
    pub fn add_operation(&mut self, operation: Operation) {
        self.operations.push(operation);
    }

    /// Elimina una operación HTTP por método y ruta.
    pub fn remove_operation(
        &mut self,
        method: &crate::domain::operation::HttpMethod,
        path: &str,
    ) -> Option<Operation> {
        if let Some(pos) = self
            .operations
            .iter()
            .position(|op| &op.method == method && op.path == path)
        {
            Some(self.operations.remove(pos))
        } else {
            None
        }
    }

    /// Busca una operación HTTP por método y ruta.
    pub fn find_operation(
        &self,
        method: &crate::domain::operation::HttpMethod,
        path: &str,
    ) -> Option<&Operation> {
        self.operations
            .iter()
            .find(|op| &op.method == method && op.path == path)
    }

    /// Recopila todas las referencias internas usadas a lo largo de toda la definición.
    pub fn collect_all_references(&self) -> Vec<String> {
        let mut refs = Vec::new();
        for schema in self.schemas.values() {
            refs.extend(schema.collect_references());
        }
        for op in &self.operations {
            refs.extend(op.collect_references());
        }
        refs.sort();
        refs.dedup();
        refs
    }

    /// Elimina un esquema reutilizable por su nombre.
    pub fn remove_schema(&mut self, name: &str) -> Option<SchemaDefinition> {
        self.schemas.remove(name)
    }

    /// Encuentra todos los elementos del contrato que referencian al esquema dado mediante $ref.
    pub fn find_schema_usages(&self, schema_name: &str) -> Vec<String> {
        let target = format!("#/components/schemas/{}", schema_name);
        let mut usages = Vec::new();

        // 1. Usos en otros esquemas
        for (name, schema) in &self.schemas {
            if name != schema_name && schema.collect_references().contains(&target) {
                usages.push(format!("Esquema '{}'", name));
            }
        }

        // 2. Usos en operaciones
        for op in &self.operations {
            let op_label = format!("{} {}", op.method, op.path);
            for param in &op.parameters {
                if let Some(schema) = &param.schema
                    && schema.collect_references().contains(&target)
                {
                    usages.push(format!(
                        "Operación {} (Parámetro '{}')",
                        op_label, param.name
                    ));
                }
            }

            if let Some(body) = &op.request_body {
                for (media_type, media) in &body.content {
                    if let Some(schema) = &media.schema
                        && schema.collect_references().contains(&target)
                    {
                        usages.push(format!("Operación {} (Cuerpo '{}')", op_label, media_type));
                    }
                }
            }

            for resp in &op.responses {
                for (media_type, media) in &resp.content {
                    if let Some(schema) = &media.schema
                        && schema.collect_references().contains(&target)
                    {
                        usages.push(format!(
                            "Operación {} (Respuesta {} '{}')",
                            op_label, resp.status_code, media_type
                        ));
                    }
                }
            }
        }

        usages.sort();
        usages.dedup();
        usages
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_api_definition_default_and_serialization() {
        let mut api = ApiDefinition::new("Workshop API", "1.0.0");
        let vehicle = SchemaDefinition::new_object();
        api.add_schema("Vehicle", vehicle);

        let json = serde_json::to_string_pretty(&api).expect("error serializando api");
        let parsed: ApiDefinition = serde_json::from_str(&json).expect("error deserializando api");

        assert_eq!(parsed.info.title, "Workshop API");
        assert_eq!(parsed.openapi_version, "3.1.0");
        assert!(parsed.schemas.contains_key("Vehicle"));
    }

    #[test]
    fn test_find_schema_usages_tracking() {
        let mut api = ApiDefinition::new("Workshop API", "1.0.0");
        let vehicle = SchemaDefinition::new_object();
        api.add_schema("Vehicle", vehicle);

        let mut work_order = SchemaDefinition::new_object();
        work_order.properties.insert(
            "vehicle".to_string(),
            SchemaDefinition::new_ref("#/components/schemas/Vehicle"),
        );
        api.add_schema("WorkOrder", work_order);

        let usages = api.find_schema_usages("Vehicle");
        assert_eq!(usages, vec!["Esquema 'WorkOrder'"]);

        let unused = api.find_schema_usages("WorkOrder");
        assert!(unused.is_empty());
    }

    #[test]
    fn test_operation_lifecycle() {
        let mut api = ApiDefinition::new("Workshop API", "1.0.0");
        let op = Operation {
            id: None,
            path: "/vehicles".to_string(),
            method: crate::domain::operation::HttpMethod::Get,
            operation_id: Some("listVehicles".to_string()),
            summary: Some("Lista de vehículos".to_string()),
            description: None,
            tags: vec!["Vehicles".to_string()],
            parameters: vec![],
            request_body: None,
            responses: vec![],
            deprecated: false,
            ..Default::default()
        };

        api.add_operation(op.clone());
        assert_eq!(api.operations.len(), 1);

        let found = api.find_operation(&crate::domain::operation::HttpMethod::Get, "/vehicles");
        assert!(found.is_some());
        assert_eq!(
            found.unwrap().operation_id,
            Some("listVehicles".to_string())
        );

        let removed = api.remove_operation(&crate::domain::operation::HttpMethod::Get, "/vehicles");
        assert!(removed.is_some());
        assert_eq!(api.operations.len(), 0);
    }
}
