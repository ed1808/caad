use crate::domain::schema::SchemaDefinition;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum HttpMethod {
    Get,
    Post,
    Put,
    Delete,
    Patch,
    Head,
    Options,
    Trace,
}

impl std::fmt::Display for HttpMethod {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HttpMethod::Get => write!(f, "GET"),
            HttpMethod::Post => write!(f, "POST"),
            HttpMethod::Put => write!(f, "PUT"),
            HttpMethod::Delete => write!(f, "DELETE"),
            HttpMethod::Patch => write!(f, "PATCH"),
            HttpMethod::Head => write!(f, "HEAD"),
            HttpMethod::Options => write!(f, "OPTIONS"),
            HttpMethod::Trace => write!(f, "TRACE"),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ParameterLocation {
    Path,
    Query,
    Header,
    Cookie,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Parameter {
    pub name: String,
    pub location: ParameterLocation,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema: Option<SchemaDefinition>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MediaTypeDefinition {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema: Option<SchemaDefinition>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub example: Option<serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RequestBody {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub required: bool,
    pub content: BTreeMap<String, MediaTypeDefinition>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ResponseDefinition {
    /// Código HTTP (e.g. "200", "404") o "default"
    pub status_code: String,
    pub description: String,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub content: BTreeMap<String, MediaTypeDefinition>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Operation {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub path: String,
    pub method: HttpMethod,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub operation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub tags: Vec<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub parameters: Vec<Parameter>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_body: Option<RequestBody>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub responses: Vec<ResponseDefinition>,
    #[serde(default)]
    pub deprecated: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub security: Option<Vec<BTreeMap<String, Vec<String>>>>,
}

impl Default for Operation {
    fn default() -> Self {
        Self {
            id: None,
            path: String::new(),
            method: HttpMethod::Get,
            operation_id: None,
            summary: None,
            description: None,
            tags: Vec::new(),
            parameters: Vec::new(),
            request_body: None,
            responses: Vec::new(),
            deprecated: false,
            security: None,
        }
    }
}

impl Operation {
    /// Extrae las variables dinámicas de la plantilla de ruta (e.g. "/vehicles/{vehicleId}" -> ["vehicleId"])
    pub fn extract_path_variables(&self) -> Vec<String> {
        let mut vars = Vec::new();
        let mut in_var = false;
        let mut current_var = String::new();

        for ch in self.path.chars() {
            if ch == '{' {
                in_var = true;
                current_var.clear();
            } else if ch == '}' && in_var {
                in_var = false;
                if !current_var.is_empty() {
                    vars.push(current_var.clone());
                }
            } else if in_var {
                current_var.push(ch);
            }
        }
        vars
    }

    /// Recopila todas las referencias ($ref) presentes en parámetros, request body y responses.
    pub fn collect_references(&self) -> Vec<String> {
        let mut refs = Vec::new();
        for param in &self.parameters {
            if let Some(schema) = &param.schema {
                refs.extend(schema.collect_references());
            }
        }
        if let Some(body) = &self.request_body {
            for media in body.content.values() {
                if let Some(schema) = &media.schema {
                    refs.extend(schema.collect_references());
                }
            }
        }
        for resp in &self.responses {
            for media in resp.content.values() {
                if let Some(schema) = &media.schema {
                    refs.extend(schema.collect_references());
                }
            }
        }
        refs
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_path_variables() {
        let op = Operation {
            id: None,
            path: "/vehicles/{vehicleId}/parts/{part_id}".to_string(),
            method: HttpMethod::Get,
            operation_id: Some("getVehiclePart".to_string()),
            summary: None,
            description: None,
            tags: vec![],
            parameters: vec![],
            request_body: None,
            responses: vec![],
            deprecated: false,
            ..Default::default()
        };

        let vars = op.extract_path_variables();
        assert_eq!(vars, vec!["vehicleId", "part_id"]);
    }

    #[test]
    fn test_operation_collect_references() {
        let mut resp_content = BTreeMap::new();
        resp_content.insert(
            "application/json".to_string(),
            MediaTypeDefinition {
                schema: Some(SchemaDefinition::new_ref("#/components/schemas/Vehicle")),
                example: None,
            },
        );

        let op = Operation {
            id: None,
            path: "/vehicles/{vehicleId}".to_string(),
            method: HttpMethod::Get,
            operation_id: None,
            summary: None,
            description: None,
            tags: vec![],
            parameters: vec![],
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "200".to_string(),
                description: "Success".to_string(),
                content: resp_content,
            }],
            deprecated: false,
            ..Default::default()
        };

        let refs = op.collect_references();
        assert_eq!(refs, vec!["#/components/schemas/Vehicle"]);
    }
}
