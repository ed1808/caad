use crate::domain::api::ApiDefinition;
use crate::domain::operation::ParameterLocation;
use crate::domain::schema::SchemaType;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IssueSeverity {
    Error,
    Warning,
    Suggestion,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DesignIssue {
    pub id: String,
    pub rule_id: String,
    pub severity: IssueSeverity,
    pub title: String,
    pub message: String,
    pub location: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

impl DesignIssue {
    pub fn new_error(
        rule_id: impl Into<String>,
        title: impl Into<String>,
        message: impl Into<String>,
        location: impl Into<String>,
        suggestion: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            rule_id: rule_id.into(),
            severity: IssueSeverity::Error,
            title: title.into(),
            message: message.into(),
            location: location.into(),
            suggestion,
        }
    }

    pub fn new_warning(
        rule_id: impl Into<String>,
        title: impl Into<String>,
        message: impl Into<String>,
        location: impl Into<String>,
        suggestion: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            rule_id: rule_id.into(),
            severity: IssueSeverity::Warning,
            title: title.into(),
            message: message.into(),
            location: location.into(),
            suggestion,
        }
    }

    pub fn new_suggestion(
        rule_id: impl Into<String>,
        title: impl Into<String>,
        message: impl Into<String>,
        location: impl Into<String>,
        suggestion: Option<String>,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            rule_id: rule_id.into(),
            severity: IssueSeverity::Suggestion,
            title: title.into(),
            message: message.into(),
            location: location.into(),
            suggestion,
        }
    }
}

/// Ejecuta las validaciones y diagnósticos deterministas sobre la definición de API.
pub fn validate_api_definition(api: &ApiDefinition) -> Vec<DesignIssue> {
    let mut issues = Vec::new();

    // ==========================================
    // 1. ERRORES ESTRUCTURALES (STRUCT-*)
    // ==========================================

    // STRUCT-001: Título o versión requerida
    if api.info.title.trim().is_empty() {
        issues.push(DesignIssue::new_error(
            "STRUCT-001",
            "Título de API ausente",
            "La API debe tener un título descriptivo no vacío en info.title.",
            "/info/title",
            Some("Define un nombre como 'Workshop API' o 'Mi Servicio API'.".to_string()),
        ));
    }

    if api.info.version.trim().is_empty() {
        issues.push(DesignIssue::new_error(
            "STRUCT-001",
            "Versión de API ausente",
            "La API debe tener una versión semántica no vacía en info.version.",
            "/info/version",
            Some("Especifica una versión semver válida como '1.0.0' o '0.1.0'.".to_string()),
        ));
    }

    // STRUCT-002: Duplicados exactos de método y ruta
    let mut seen_endpoints: HashMap<(String, String), usize> = HashMap::new();
    for (idx, op) in api.operations.iter().enumerate() {
        let key = (op.method.to_string(), op.path.clone());
        if let Some(first_idx) = seen_endpoints.get(&key) {
            issues.push(DesignIssue::new_error(
                "STRUCT-002",
                "Operación duplicada",
                format!(
                    "Existe más de una operación con método {} y ruta '{}' (índices {} y {}).",
                    op.method, op.path, first_idx, idx
                ),
                format!(
                    "/paths/{}/{}",
                    escape_json_pointer(&op.path),
                    op.method.to_string().to_lowercase()
                ),
                Some(
                    "Modifica la ruta o el método HTTP para garantizar que sea único.".to_string(),
                ),
            ));
        } else {
            seen_endpoints.insert(key, idx);
        }
    }

    // STRUCT-003: Referencias internas rotas (#/components/schemas/{name})
    let available_schemas: HashSet<&str> = api.schemas.keys().map(|k| k.as_str()).collect();
    for ref_target in api.collect_all_references() {
        let Some(schema_name) = ref_target.strip_prefix("#/components/schemas/") else {
            continue;
        };
        if !available_schemas.contains(schema_name) {
            issues.push(DesignIssue::new_error(
                "STRUCT-003",
                "Referencia interna no resuelta",
                format!(
                    "La referencia '{}' apunta a un esquema inexistente en components.schemas.",
                    ref_target
                ),
                format!("/components/schemas/{}", escape_json_pointer(schema_name)),
                Some(format!(
                    "Crea el esquema '{}' o corrige el enlace $ref.",
                    schema_name
                )),
            ));
        }
    }

    // STRUCT-006: operationId duplicado
    let mut seen_op_ids: HashMap<String, String> = HashMap::new();
    for op in &api.operations {
        if let Some(op_id) = &op.operation_id {
            let trimmed = op_id.trim();
            if !trimmed.is_empty() {
                let current_location = format!("{} {}", op.method, op.path);
                if let Some(prev_location) = seen_op_ids.get(trimmed) {
                    issues.push(DesignIssue::new_error(
                        "STRUCT-006",
                        "operationId duplicado",
                        format!(
                            "El operationId '{}' está duplicado entre '{}' y '{}'. Debe ser único en toda la API.",
                            trimmed, prev_location, current_location
                        ),
                        format!(
                            "/paths/{}/{}/operationId",
                            escape_json_pointer(&op.path),
                            op.method.to_string().to_lowercase()
                        ),
                        Some("Asigna un identificador único a cada operación (ej. getVehicle, listVehicles).".to_string()),
                    ));
                } else {
                    seen_op_ids.insert(trimmed.to_string(), current_location);
                }
            }
        }
    }

    // STRUCT-004 y STRUCT-005: Invariantes de parámetros de ruta
    for op in &api.operations {
        let path_vars: HashSet<String> = op.extract_path_variables().into_iter().collect();
        let path_params: Vec<_> = op
            .parameters
            .iter()
            .filter(|p| p.location == ParameterLocation::Path)
            .collect();

        let declared_path_names: HashSet<String> =
            path_params.iter().map(|p| p.name.clone()).collect();

        // STRUCT-004: Parámetros de ruta declarados que no están en la plantilla de ruta
        for param in &path_params {
            if !path_vars.contains(&param.name) {
                issues.push(DesignIssue::new_error(
                    "STRUCT-004",
                    "Parámetro de ruta no presente en URL",
                    format!(
                        "El parámetro '{}' está configurado como 'path' pero la plantilla '{}' no contiene '{{{}}}'.",
                        param.name, op.path, param.name
                    ),
                    format!(
                        "/paths/{}/{}/parameters",
                        escape_json_pointer(&op.path),
                        op.method.to_string().to_lowercase()
                    ),
                    Some(format!(
                        "Agrega '{{{}}}' a la ruta o cambia la ubicación del parámetro.",
                        param.name
                    )),
                ));
            }

            // STRUCT-005: Los parámetros de ruta deben ser obligatorios (required = true)
            if !param.required {
                issues.push(DesignIssue::new_error(
                    "STRUCT-005",
                    "Parámetro de ruta no obligatorio",
                    format!(
                        "El parámetro de ruta '{}' en '{}' debe tener 'required: true' según la especificación OpenAPI.",
                        param.name, op.path
                    ),
                    format!(
                        "/paths/{}/{}/parameters/{}",
                        escape_json_pointer(&op.path),
                        op.method.to_string().to_lowercase(),
                        param.name
                    ),
                    Some("Marca el parámetro como obligatorio (required = true).".to_string()),
                ));
            }
        }

        // STRUCT-005 (continuación): Variables en la plantilla sin parámetro declarado
        for var in &path_vars {
            if !declared_path_names.contains(var) {
                issues.push(DesignIssue::new_error(
                    "STRUCT-005",
                    "Variable de ruta sin parámetro definido",
                    format!(
                        "La plantilla de ruta '{}' contiene la variable '{{{}}}' pero no se ha definido un parámetro 'path' para ella.",
                        op.path, var
                    ),
                    format!(
                        "/paths/{}/{}/parameters",
                        escape_json_pointer(&op.path),
                        op.method.to_string().to_lowercase()
                    ),
                    Some(format!("Añade un parámetro con nombre '{}' e in: 'path'.", var)),
                ));
            }
        }
    }

    // STRUCT-007: Definición estructural de esquemas
    for (schema_name, schema) in &api.schemas {
        let location = format!("/components/schemas/{}", escape_json_pointer(schema_name));

        if schema_name.trim().is_empty() {
            issues.push(DesignIssue::new_error(
                "STRUCT-007",
                "Nombre de esquema vacío",
                "El esquema no tiene un identificador de clave válido.",
                location.clone(),
                Some("Asigna un nombre al esquema en PascalCase (ej. 'UserProfile').".to_string()),
            ));
        }

        for (prop_name, prop_schema) in &schema.properties {
            let prop_loc = format!("{}/properties/{}", location, escape_json_pointer(prop_name));
            if prop_name.trim().is_empty() {
                issues.push(DesignIssue::new_error(
                    "STRUCT-007",
                    "Nombre de propiedad vacío",
                    format!(
                        "El esquema '{}' contiene una propiedad con nombre vacío.",
                        schema_name
                    ),
                    prop_loc.clone(),
                    Some("Asigna un nombre no vacío a cada propiedad.".to_string()),
                ));
            }

            if prop_schema.ref_path.is_none() && prop_schema.schema_type.is_none() {
                issues.push(DesignIssue::new_error(
                    "STRUCT-007",
                    "Tipo de propiedad no definido",
                    format!(
                        "La propiedad '{}' en el esquema '{}' no especifica ningún tipo ni referencia $ref.",
                        prop_name, schema_name
                    ),
                    prop_loc.clone(),
                    Some("Selecciona un tipo primitivo ('string', 'integer', etc.) o vincula a otro esquema.".to_string()),
                ));
            }
        }
    }

    // STRUCT-008: Validaciones de respuestas en operaciones
    for op in &api.operations {
        let op_loc = format!(
            "/paths/{}/{}",
            escape_json_pointer(&op.path),
            op.method.to_string().to_lowercase()
        );

        if op.responses.is_empty() {
            issues.push(DesignIssue::new_error(
                "STRUCT-008",
                "Operación sin respuestas definidas",
                format!(
                    "La operación {} '{}' no tiene ninguna respuesta definida. OpenAPI exige al menos una respuesta HTTP.",
                    op.method, op.path
                ),
                format!("{}/responses", op_loc),
                Some("Agrega al menos una respuesta como '200 OK' o '204 No Content'.".to_string()),
            ));
        }

        for resp in &op.responses {
            let resp_loc = format!("{}/responses/{}", op_loc, resp.status_code);

            // Código HTTP válido (3 dígitos 100-599, comodines 1XX-5XX, o default)
            let is_valid_status = is_valid_http_status_code(&resp.status_code);
            if !is_valid_status {
                issues.push(DesignIssue::new_error(
                    "STRUCT-008",
                    "Código de estado HTTP inválido",
                    format!(
                        "El código de respuesta '{}' en {} '{}' no es un código HTTP válido ni 'default'.",
                        resp.status_code, op.method, op.path
                    ),
                    resp_loc.clone(),
                    Some("Utiliza un código de 3 dígitos (ej. 200, 404, 500) o 'default'.".to_string()),
                ));
            }

            // OpenAPI 3.1 exige que cada respuesta defina 'description'
            if resp.description.trim().is_empty() {
                issues.push(DesignIssue::new_error(
                    "STRUCT-008",
                    "Descripción de respuesta ausente",
                    format!(
                        "La respuesta '{}' en {} '{}' no tiene descripción.",
                        resp.status_code, op.method, op.path
                    ),
                    format!("{}/description", resp_loc),
                    Some(
                        "Agrega una descripción como 'Operación completada con éxito'.".to_string(),
                    ),
                ));
            }
        }
    }

    // STRUCT-009: Esquema de seguridad no declarado en components.securitySchemes
    for sec_req in &api.security {
        for scheme_name in sec_req.keys() {
            if !api.security_schemes.contains_key(scheme_name) {
                issues.push(DesignIssue::new_error(
                    "STRUCT-009",
                    "Esquema de seguridad no definido",
                    format!(
                        "El requisito de seguridad global referencia el esquema '{}' que no está definido en components.securitySchemes.",
                        scheme_name
                    ),
                    format!("/security/{}", escape_json_pointer(scheme_name)),
                    Some(format!("Define el esquema de seguridad '{}' en la sección de Autenticación.", scheme_name)),
                ));
            }
        }
    }

    for op in &api.operations {
        if let Some(op_sec) = &op.security {
            for sec_req in op_sec {
                for scheme_name in sec_req.keys() {
                    if !api.security_schemes.contains_key(scheme_name) {
                        issues.push(DesignIssue::new_error(
                            "STRUCT-009",
                            "Esquema de seguridad no definido",
                            format!(
                                "La operación {} '{}' referencia el esquema de seguridad '{}' no declarado en components.securitySchemes.",
                                op.method, op.path, scheme_name
                            ),
                            format!(
                                "/paths/{}/{}/security/{}",
                                escape_json_pointer(&op.path),
                                op.method.to_string().to_lowercase(),
                                escape_json_pointer(scheme_name)
                            ),
                            Some(format!("Define el esquema de seguridad '{}' en la sección de Autenticación o corrige la referencia.", scheme_name)),
                        ));
                    }
                }
            }
        }
    }

    // STRUCT-010: Herencia circular detectada mediante allOf
    for (schema_name, schema) in &api.schemas {
        let mut visited: HashSet<String> = HashSet::new();
        visited.insert(schema_name.clone());
        let mut current_refs: Vec<String> = schema
            .all_of
            .as_ref()
            .map(|v| v.iter().filter_map(|s| s.ref_path.clone()).collect())
            .unwrap_or_default();

        while let Some(r) = current_refs.pop() {
            if let Some(target_name) = r.strip_prefix("#/components/schemas/") {
                if target_name == schema_name {
                    issues.push(DesignIssue::new_error(
                        "STRUCT-010",
                        "Herencia circular detectada",
                        format!(
                            "El esquema '{}' tiene una referencia de herencia circular (allOf) consigo mismo o mediante una cadena de ancestros.",
                            schema_name
                        ),
                        format!("/components/schemas/{}/allOf", escape_json_pointer(schema_name)),
                        Some("Elimina la referencia circular en la jerarquía de herencia.".to_string()),
                    ));
                    break;
                }
                let target_str = target_name.to_string();
                if visited.insert(target_str) {
                    if let Some(ancestor) = api.schemas.get(target_name) {
                        if let Some(ancestor_all_of) = &ancestor.all_of {
                            for ancestor_ref in ancestor_all_of.iter().filter_map(|s| s.ref_path.clone()) {
                                current_refs.push(ancestor_ref);
                            }
                        }
                    }
                }
            }
        }
    }

    // ==========================================
    // 2. ADVERTENCIAS DE CONSISTENCIA (CONS-*)
    // ==========================================

    // CONS-002: Formato de ruta anómalo
    for op in &api.operations {
        let op_loc = format!(
            "/paths/{}/{}",
            escape_json_pointer(&op.path),
            op.method.to_string().to_lowercase()
        );

        if !op.path.starts_with('/') {
            issues.push(DesignIssue::new_warning(
                "CONS-002",
                "Ruta sin barra diagonal inicial",
                format!(
                    "La ruta '{}' debe comenzar con una barra diagonal '/'.",
                    op.path
                ),
                op_loc.clone(),
                Some(format!("Cambia la ruta a '/{}'.", op.path)),
            ));
        }

        if op.path.contains("//") {
            issues.push(DesignIssue::new_warning(
                "CONS-002",
                "Ruta con barras diagonales consecutivas",
                format!(
                    "La ruta '{}' contiene doble barra '//' que puede causar ambigüedades en el enrutamiento.",
                    op.path
                ),
                op_loc.clone(),
                Some("Elimina las barras repetidas en la plantilla de ruta.".to_string()),
            ));
        }

        if op.path.len() > 1 && op.path.ends_with('/') {
            issues.push(DesignIssue::new_warning(
                "CONS-002",
                "Ruta con barra final innecesaria",
                format!(
                    "La ruta '{}' termina con una barra diagonal '/'. La convención REST suele preferir sin barra final.",
                    op.path
                ),
                op_loc.clone(),
                Some(format!("Utiliza '{}'.", op.path.trim_end_matches('/'))),
            ));
        }
    }

    // CONS-003: Esquema huérfano / no utilizado
    for schema_name in api.schemas.keys() {
        let usages = api.find_schema_usages(schema_name);
        if usages.is_empty() {
            issues.push(DesignIssue::new_warning(
                "CONS-003",
                "Esquema no utilizado",
                format!(
                    "El esquema '{}' está definido en components.schemas pero ninguna operación ni otro esquema lo referencia.",
                    schema_name
                ),
                format!("/components/schemas/{}", escape_json_pointer(schema_name)),
                Some("Asócialo a una respuesta, parámetro o cuerpo de solicitud, o elimínalo si es obsoleto.".to_string()),
            ));
        }
    }

    // CONS-004: Endpoint de colección sin paginación
    let pagination_param_names = [
        "limit",
        "offset",
        "page",
        "page_size",
        "per_page",
        "cursor",
        "size",
        "skip",
        "count",
    ];
    for op in &api.operations {
        if op.method == crate::domain::operation::HttpMethod::Get {
            let mut returns_collection = false;
            for resp in &op.responses {
                if resp.status_code.starts_with('2') {
                    for media in resp.content.values() {
                        if let Some(schema) = &media.schema
                            && schema.schema_type == Some(SchemaType::Array)
                        {
                            returns_collection = true;
                            break;
                        }
                    }
                }
            }

            if returns_collection {
                let has_pagination = op.parameters.iter().any(|p| {
                    p.location == ParameterLocation::Query
                        && pagination_param_names.contains(&p.name.to_lowercase().as_str())
                });

                if !has_pagination {
                    issues.push(DesignIssue::new_warning(
                        "CONS-004",
                        "Colección sin parámetros de paginación",
                        format!(
                            "La operación GET '{}' devuelve una colección de elementos pero no define parámetros de paginación (ej. 'limit', 'page', 'offset').",
                            op.path
                        ),
                        format!("/paths/{}/get/parameters", escape_json_pointer(&op.path)),
                        Some("Añade parámetros 'query' como 'limit' y 'offset' para controlar el tamaño de la respuesta.".to_string()),
                    ));
                }
            }
        }
    }

    // CONS-005: Operación sin documentación descriptiva
    for op in &api.operations {
        let has_summary = op.summary.as_ref().is_some_and(|s| !s.trim().is_empty());
        let has_desc = op
            .description
            .as_ref()
            .is_some_and(|d| !d.trim().is_empty());

        if !has_summary && !has_desc {
            issues.push(DesignIssue::new_warning(
                "CONS-005",
                "Operación sin resumen ni descripción",
                format!(
                    "La operación {} '{}' no incluye ni resumen (summary) ni descripción para los consumidores.",
                    op.method, op.path
                ),
                format!(
                    "/paths/{}/{}",
                    escape_json_pointer(&op.path),
                    op.method.to_string().to_lowercase()
                ),
                Some("Añade un resumen conciso en summary y una descripción de su propósito.".to_string()),
            ));
        }
    }

    // CONS-006: Respuestas de error habituales ausentes
    for op in &api.operations {
        let op_loc = format!(
            "/paths/{}/{}",
            escape_json_pointer(&op.path),
            op.method.to_string().to_lowercase()
        );

        let path_vars = op.extract_path_variables();
        if !path_vars.is_empty() {
            let has_404 = op.responses.iter().any(|r| r.status_code == "404");
            if !has_404 {
                issues.push(DesignIssue::new_warning(
                    "CONS-006",
                    "Falta respuesta 404 Not Found",
                    format!(
                        "La operación {} '{}' recibe variables de ruta ({}) pero no define una respuesta '404' para cuando el recurso no existe.",
                        op.method,
                        op.path,
                        path_vars.join(", ")
                    ),
                    format!("{}/responses", op_loc),
                    Some("Agrega una respuesta con status 404 (Not Found).".to_string()),
                ));
            }
        }

        if op.request_body.is_some() {
            let has_400 = op.responses.iter().any(|r| r.status_code == "400");
            if !has_400 {
                issues.push(DesignIssue::new_warning(
                    "CONS-006",
                    "Falta respuesta 400 Bad Request",
                    format!(
                        "La operación {} '{}' recibe un cuerpo de solicitud pero no documenta una respuesta '400' para errores de validación de entrada.",
                        op.method, op.path
                    ),
                    format!("{}/responses", op_loc),
                    Some("Agrega una respuesta con status 400 (Bad Request).".to_string()),
                ));
            }
        }
    }

    // ==========================================
    // 3. SUGERENCIAS DE DISEÑO (SUGG-*)
    // ==========================================

    // SUGG-001: Convenciones de nombres
    // Convención en rutas: minúsculas y kebab-case
    for op in &api.operations {
        let op_loc = format!(
            "/paths/{}/{}",
            escape_json_pointer(&op.path),
            op.method.to_string().to_lowercase()
        );

        let segments = op.path.split('/').filter(|s| !s.is_empty());
        for seg in segments {
            // Ignorar parámetros {param}
            if seg.starts_with('{') && seg.ends_with('}') {
                continue;
            }
            if seg.chars().any(|c| c.is_ascii_uppercase() || c == '_') {
                issues.push(DesignIssue::new_suggestion(
                    "SUGG-001",
                    "Convención de ruta REST no estándar",
                    format!(
                        "El segmento de ruta '{}' en '{}' contiene mayúsculas o guiones bajos. La convención REST estándar recomienda minúsculas y kebab-case.",
                        seg, op.path
                    ),
                    op_loc.clone(),
                    Some(format!(
                        "Usa minúsculas con guiones para los segmentos (ej. '/{}').",
                        seg.to_lowercase().replace('_', "-")
                    )),
                ));
                break;
            }
        }
    }

    // Convención en nombres de esquemas: PascalCase
    for schema_name in api.schemas.keys() {
        let is_pascal_case = schema_name
            .chars()
            .next()
            .is_some_and(|c| c.is_ascii_uppercase())
            && !schema_name.contains('_')
            && !schema_name.contains('-');

        if !is_pascal_case && !schema_name.is_empty() {
            issues.push(DesignIssue::new_suggestion(
                "SUGG-001",
                "Convención de nombre de esquema",
                format!(
                    "El esquema '{}' no sigue la convención PascalCase (ej. 'UserProfile', 'Vehicle').",
                    schema_name
                ),
                format!("/components/schemas/{}", escape_json_pointer(schema_name)),
                Some("Usa nombres en PascalCase iniciando con mayúscula y sin guiones.".to_string()),
            ));
        }
    }

    // SUGG-002: Manejo de errores 500 / default
    for op in &api.operations {
        if !op.responses.is_empty() {
            let has_server_error = op
                .responses
                .iter()
                .any(|r| r.status_code == "500" || r.status_code.eq_ignore_ascii_case("default"));

            if !has_server_error {
                let op_loc = format!(
                    "/paths/{}/{}",
                    escape_json_pointer(&op.path),
                    op.method.to_string().to_lowercase()
                );
                issues.push(DesignIssue::new_suggestion(
                    "SUGG-002",
                    "Respuesta de error 500 o default recomendada",
                    format!(
                        "La operación {} '{}' no documenta una respuesta para fallos inesperados del servidor (500 o default).",
                        op.method, op.path
                    ),
                    format!("{}/responses", op_loc),
                    Some("Añade una respuesta con código '500' o 'default' para describir posibles fallos internos del servidor.".to_string()),
                ));
            }
        }
    }

    // SUGG-003: Operación sin tags
    for op in &api.operations {
        if op.tags.is_empty() {
            let op_loc = format!(
                "/paths/{}/{}",
                escape_json_pointer(&op.path),
                op.method.to_string().to_lowercase()
            );
            issues.push(DesignIssue::new_suggestion(
                "SUGG-003",
                "Operación sin etiquetas (tags)",
                format!(
                    "La operación {} '{}' no tiene ninguna etiqueta asignada. Las etiquetas permiten organizar los endpoints en la documentación.",
                    op.method, op.path
                ),
                op_loc,
                Some("Asigna al menos una etiqueta (ej. 'Vehicles', 'Orders') para agrupar endpoints relacionados.".to_string()),
            ));
        }
    }

    issues
}

fn is_valid_http_status_code(code: &str) -> bool {
    let trimmed = code.trim();
    if trimmed.eq_ignore_ascii_case("default") {
        return true;
    }
    if let Ok(num) = trimmed.parse::<u16>() {
        return (100..=599).contains(&num);
    }
    let upper = trimmed.to_ascii_uppercase();
    matches!(upper.as_str(), "1XX" | "2XX" | "3XX" | "4XX" | "5XX")
}

fn escape_json_pointer(fragment: &str) -> String {
    fragment.replace('~', "~0").replace('/', "~1")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::operation::{HttpMethod, Operation, Parameter, ResponseDefinition};
    use crate::domain::schema::SchemaDefinition;
    use std::collections::BTreeMap;

    fn build_clean_test_api() -> ApiDefinition {
        let mut api = ApiDefinition::new("Workshop API", "1.0.0");
        let op = Operation {
            id: None,
            path: "/vehicles/{vehicleId}".to_string(),
            method: HttpMethod::Get,
            operation_id: Some("getVehicle".to_string()),
            summary: Some("Obtiene vehículo".to_string()),
            description: Some("Detalles de vehículo".to_string()),
            tags: vec!["Vehicles".to_string()],
            parameters: vec![Parameter {
                name: "vehicleId".to_string(),
                location: ParameterLocation::Path,
                description: None,
                required: true,
                schema: None,
            }],
            request_body: None,
            responses: vec![
                ResponseDefinition {
                    status_code: "200".to_string(),
                    description: "Éxito".to_string(),
                    content: BTreeMap::new(),
                },
                ResponseDefinition {
                    status_code: "404".to_string(),
                    description: "No encontrado".to_string(),
                    content: BTreeMap::new(),
                },
                ResponseDefinition {
                    status_code: "500".to_string(),
                    description: "Error de servidor".to_string(),
                    content: BTreeMap::new(),
                },
            ],
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);
        api
    }

    #[test]
    fn test_valid_definition_has_no_errors() {
        let api = build_clean_test_api();
        let issues = validate_api_definition(&api);
        let errors: Vec<_> = issues
            .iter()
            .filter(|i| i.severity == IssueSeverity::Error)
            .collect();
        assert!(
            errors.is_empty(),
            "No debe haber errores estructurales: {:?}",
            errors
        );
    }

    #[test]
    fn test_detect_missing_title_or_version_struct_001() {
        let mut api = build_clean_test_api();
        api.info.title = "   ".to_string();
        api.info.version = "".to_string();

        let issues = validate_api_definition(&api);
        let struct_001_count = issues.iter().filter(|i| i.rule_id == "STRUCT-001").count();
        assert_eq!(struct_001_count, 2);
    }

    #[test]
    fn test_detect_duplicate_operations_struct_002() {
        let mut api = build_clean_test_api();
        let op2 = api.operations[0].clone();
        api.add_operation(op2);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "STRUCT-002"));
    }

    #[test]
    fn test_detect_broken_reference_struct_003() {
        let mut api = build_clean_test_api();
        let mut schema = SchemaDefinition::new_object();
        schema.properties.insert(
            "vehicle".to_string(),
            SchemaDefinition::new_ref("#/components/schemas/NonExistentVehicle"),
        );
        api.add_schema("WorkOrder", schema);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "STRUCT-003"));
    }

    #[test]
    fn test_detect_path_parameter_mismatches_struct_004_and_005() {
        let mut api = ApiDefinition::new("Test API", "1.0.0");
        let op = Operation {
            id: None,
            path: "/vehicles/{vehicleId}".to_string(),
            method: HttpMethod::Get,
            operation_id: None,
            summary: Some("Summary".to_string()),
            description: None,
            tags: vec![],
            parameters: vec![
                Parameter {
                    name: "wrongParam".to_string(),
                    location: ParameterLocation::Path,
                    description: None,
                    required: true,
                    schema: None,
                },
                Parameter {
                    name: "vehicleId".to_string(),
                    location: ParameterLocation::Path,
                    description: None,
                    required: false, // Invalido: debe ser true
                    schema: None,
                },
            ],
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "200".to_string(),
                description: "OK".to_string(),
                content: BTreeMap::new(),
            }],
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);

        let issues = validate_api_definition(&api);
        let rule_ids: Vec<_> = issues.iter().map(|i| i.rule_id.as_str()).collect();
        assert!(rule_ids.contains(&"STRUCT-004"));
        assert!(rule_ids.contains(&"STRUCT-005"));
    }

    #[test]
    fn test_detect_duplicate_operation_id_struct_006() {
        let mut api = build_clean_test_api();
        let mut op2 = api.operations[0].clone();
        op2.path = "/other-vehicles/{vehicleId}".to_string();
        // Mismo operation_id
        api.add_operation(op2);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "STRUCT-006"));
    }

    #[test]
    fn test_detect_invalid_schema_property_struct_007() {
        let mut api = build_clean_test_api();
        let mut schema = SchemaDefinition::new_object();
        let invalid_prop = SchemaDefinition {
            schema_type: None,
            ref_path: None,
            ..Default::default()
        };
        schema
            .properties
            .insert("invalidProp".to_string(), invalid_prop);
        api.add_schema("UserProfile", schema);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "STRUCT-007"));
    }

    #[test]
    fn test_detect_invalid_operation_responses_struct_008() {
        let mut api = ApiDefinition::new("Test API", "1.0.0");
        let op = Operation {
            id: None,
            path: "/items".to_string(),
            method: HttpMethod::Get,
            operation_id: None,
            summary: Some("Get items".to_string()),
            description: None,
            tags: vec![],
            parameters: vec![],
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "invalid_code".to_string(),
                description: "".to_string(), // Vacío
                content: BTreeMap::new(),
            }],
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(
            |i| i.rule_id == "STRUCT-008" && i.message.contains("no es un código HTTP válido")
        ));
        assert!(
            issues
                .iter()
                .any(|i| i.rule_id == "STRUCT-008" && i.message.contains("no tiene descripción"))
        );
    }

    #[test]
    fn test_detect_path_formatting_cons_002() {
        let mut api = ApiDefinition::new("Test API", "1.0.0");
        let op = Operation {
            id: None,
            path: "vehicles//list/".to_string(), // No empieza con /, tiene // y termina con /
            method: HttpMethod::Get,
            operation_id: None,
            summary: Some("Summary".to_string()),
            description: None,
            tags: vec![],
            parameters: vec![],
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "200".to_string(),
                description: "OK".to_string(),
                content: BTreeMap::new(),
            }],
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);

        let issues = validate_api_definition(&api);
        let cons_002_count = issues.iter().filter(|i| i.rule_id == "CONS-002").count();
        assert_eq!(cons_002_count, 3);
    }

    #[test]
    fn test_detect_orphan_schema_cons_003() {
        let mut api = build_clean_test_api();
        api.add_schema("UnusedModel", SchemaDefinition::new_object());

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "CONS-003"));
    }

    #[test]
    fn test_detect_unpaginated_collection_cons_004() {
        use crate::domain::operation::MediaTypeDefinition;
        let mut api = ApiDefinition::new("Test API", "1.0.0");
        let array_schema = SchemaDefinition {
            schema_type: Some(SchemaType::Array),
            ..Default::default()
        };

        let mut content = BTreeMap::new();
        content.insert(
            "application/json".to_string(),
            MediaTypeDefinition {
                schema: Some(array_schema),
                example: None,
            },
        );

        let op = Operation {
            id: None,
            path: "/vehicles".to_string(),
            method: HttpMethod::Get,
            operation_id: None,
            summary: Some("Lista de vehículos".to_string()),
            description: None,
            tags: vec![],
            parameters: vec![], // Sin limit/page
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "200".to_string(),
                description: "Lista de vehículos".to_string(),
                content,
            }],
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "CONS-004"));
    }

    #[test]
    fn test_detect_missing_summary_and_description_cons_005() {
        let mut api = ApiDefinition::new("Test API", "1.0.0");
        let op = Operation {
            id: None,
            path: "/status".to_string(),
            method: HttpMethod::Get,
            operation_id: None,
            summary: None,
            description: None,
            tags: vec![],
            parameters: vec![],
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "200".to_string(),
                description: "OK".to_string(),
                content: BTreeMap::new(),
            }],
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "CONS-005"));
    }

    #[test]
    fn test_detect_missing_error_responses_cons_006() {
        let mut api = ApiDefinition::new("Test API", "1.0.0");
        let op = Operation {
            id: None,
            path: "/vehicles/{id}".to_string(),
            method: HttpMethod::Get,
            operation_id: None,
            summary: Some("Get by id".to_string()),
            description: None,
            tags: vec![],
            parameters: vec![Parameter {
                name: "id".to_string(),
                location: ParameterLocation::Path,
                description: None,
                required: true,
                schema: None,
            }],
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "200".to_string(),
                description: "OK".to_string(),
                content: BTreeMap::new(),
            }], // Falta 404
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "CONS-006"));
    }

    #[test]
    fn test_detect_naming_conventions_sugg_001() {
        let mut api = ApiDefinition::new("Test API", "1.0.0");
        let op = Operation {
            id: None,
            path: "/vehicle_orders".to_string(), // snake_case en path
            method: HttpMethod::Get,
            operation_id: None,
            summary: Some("Orders".to_string()),
            description: None,
            tags: vec![],
            parameters: vec![],
            request_body: None,
            responses: vec![ResponseDefinition {
                status_code: "200".to_string(),
                description: "OK".to_string(),
                content: BTreeMap::new(),
            }],
            deprecated: false,
            ..Default::default()
        };
        api.add_operation(op);
        api.add_schema("vehicle_order", SchemaDefinition::new_object()); // snake_case en schema

        let issues = validate_api_definition(&api);
        let sugg_001_count = issues.iter().filter(|i| i.rule_id == "SUGG-001").count();
        assert_eq!(sugg_001_count, 2);
    }

    #[test]
    fn test_detect_undefined_security_scheme_struct_009() {
        let mut api = build_clean_test_api();
        let mut sec_req = BTreeMap::new();
        sec_req.insert("jwtAuth".to_string(), vec![]);
        api.security.push(sec_req);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "STRUCT-009"));
    }

    #[test]
    fn test_detect_circular_inheritance_struct_010() {
        let mut api = build_clean_test_api();
        let mut pet = SchemaDefinition::new_object();
        pet.all_of = Some(vec![SchemaDefinition::new_ref("#/components/schemas/Animal")]);

        let mut animal = SchemaDefinition::new_object();
        animal.all_of = Some(vec![SchemaDefinition::new_ref("#/components/schemas/Pet")]);

        api.add_schema("Pet", pet);
        api.add_schema("Animal", animal);

        let issues = validate_api_definition(&api);
        assert!(issues.iter().any(|i| i.rule_id == "STRUCT-010"));
    }
}
