use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SchemaType {
    String,
    Integer,
    Number,
    Boolean,
    Object,
    Array,
    Null,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SchemaDefinition {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub schema_type: Option<SchemaType>,

    /// Compatibilidad OpenAPI 3.1: indica si el tipo admite nulo (e.g. type: ["string", "null"])
    #[serde(default)]
    pub allows_null: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Propiedades cuando schema_type == Object
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub properties: BTreeMap<String, SchemaDefinition>,

    /// Propiedades requeridas del objeto
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub required: Vec<String>,

    /// Esquema de elementos cuando schema_type == Array
    #[serde(skip_serializing_if = "Option::is_none")]
    pub items: Option<Box<SchemaDefinition>>,

    /// Referencia interna (e.g. "#/components/schemas/Vehicle")
    #[serde(rename = "$ref", skip_serializing_if = "Option::is_none")]
    pub ref_path: Option<String>,

    /// Valores permitidos para enumeraciones
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enum_values: Option<Vec<serde_json::Value>>,

    /// Restricciones de cadenas
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_length: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,

    /// Restricciones numéricas
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minimum: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maximum: Option<f64>,

    /// Restricciones de arrays
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_items: Option<usize>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_items: Option<usize>,

    /// Composición y herencia mediante allOf
    #[serde(rename = "allOf", default, skip_serializing_if = "Option::is_none")]
    pub all_of: Option<Vec<SchemaDefinition>>,
}

impl Default for SchemaDefinition {
    fn default() -> Self {
        Self {
            id: None,
            name: None,
            schema_type: Some(SchemaType::Object),
            allows_null: false,
            description: None,
            properties: BTreeMap::new(),
            required: Vec::new(),
            items: None,
            ref_path: None,
            enum_values: None,
            min_length: None,
            max_length: None,
            pattern: None,
            format: None,
            minimum: None,
            maximum: None,
            min_items: None,
            max_items: None,
            all_of: None,
        }
    }
}

impl SchemaDefinition {
    pub fn new_ref(ref_target: impl Into<String>) -> Self {
        Self {
            schema_type: None,
            ref_path: Some(ref_target.into()),
            ..Default::default()
        }
    }

    pub fn new_string() -> Self {
        Self {
            schema_type: Some(SchemaType::String),
            ..Default::default()
        }
    }

    pub fn new_integer() -> Self {
        Self {
            schema_type: Some(SchemaType::Integer),
            ..Default::default()
        }
    }

    pub fn new_object() -> Self {
        Self::default()
    }

    pub fn new_array(items: SchemaDefinition) -> Self {
        Self {
            schema_type: Some(SchemaType::Array),
            items: Some(Box::new(items)),
            ..Default::default()
        }
    }

    /// Extrae recursivamente todas las referencias internas ($ref) declaradas dentro de este esquema.
    pub fn collect_references(&self) -> Vec<String> {
        let mut refs = Vec::new();
        if let Some(r) = &self.ref_path {
            refs.push(r.clone());
        }
        if let Some(all_of) = &self.all_of {
            for sub in all_of {
                refs.extend(sub.collect_references());
            }
        }
        for prop in self.properties.values() {
            refs.extend(prop.collect_references());
        }
        if let Some(items) = &self.items {
            refs.extend(items.collect_references());
        }
        refs
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_serialization_roundtrip() {
        let mut vehicle = SchemaDefinition::new_object();
        vehicle.name = Some("Vehicle".to_string());
        vehicle.required = vec!["id".to_string(), "licensePlate".to_string()];

        let mut id_prop = SchemaDefinition::new_string();
        id_prop.format = Some("uuid".to_string());
        vehicle.properties.insert("id".to_string(), id_prop);

        let mut plate_prop = SchemaDefinition::new_string();
        plate_prop.min_length = Some(1);
        plate_prop.max_length = Some(15);
        vehicle
            .properties
            .insert("licensePlate".to_string(), plate_prop);

        let json = serde_json::to_string(&vehicle).expect("error al serializar schema");
        let deserialized: SchemaDefinition =
            serde_json::from_str(&json).expect("error al deserializar schema");

        assert_eq!(vehicle, deserialized);
        assert_eq!(deserialized.properties.len(), 2);
    }

    #[test]
    fn test_collect_nested_references() {
        let mut order = SchemaDefinition::new_object();
        let ref_schema = SchemaDefinition::new_ref("#/components/schemas/Vehicle");
        order.properties.insert("vehicle".to_string(), ref_schema);

        let items_schema = SchemaDefinition::new_ref("#/components/schemas/Part");
        let array_schema = SchemaDefinition::new_array(items_schema);
        order.properties.insert("parts".to_string(), array_schema);

        let refs = order.collect_references();
        assert_eq!(refs.len(), 2);
        assert!(refs.contains(&"#/components/schemas/Vehicle".to_string()));
        assert!(refs.contains(&"#/components/schemas/Part".to_string()));
    }
}
