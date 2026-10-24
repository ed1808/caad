use crate::domain::api::{ApiDefinition, ApiInfo, Server, Tag};
use crate::domain::operation::{
    HttpMethod, MediaTypeDefinition, Operation, Parameter, ParameterLocation, RequestBody,
    ResponseDefinition,
};
use crate::domain::schema::{SchemaDefinition, SchemaType};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportWarning {
    pub location: String,
    pub message: String,
    pub impact: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportReport {
    pub success: bool,
    pub document: Option<ApiDefinition>,
    pub detected_version: String,
    pub warnings: Vec<ImportWarning>,
    pub schemas_count: usize,
    pub operations_count: usize,
}

/// Convierte una ApiDefinition de CAAD al AST de OpenAPI 3.1.0 preservando el orden canónico.
pub fn export_openapi_value(api: &ApiDefinition) -> Value {
    let mut root = Map::new();

    // 1. openapi
    root.insert("openapi".to_string(), Value::String("3.1.0".to_string()));

    // 2. info
    let mut info_map = Map::new();
    info_map.insert("title".to_string(), Value::String(api.info.title.clone()));
    info_map.insert(
        "version".to_string(),
        Value::String(api.info.version.clone()),
    );
    if let Some(summary) = &api.info.summary
        && !summary.trim().is_empty()
    {
        info_map.insert("summary".to_string(), Value::String(summary.clone()));
    }
    if let Some(desc) = &api.info.description
        && !desc.trim().is_empty()
    {
        info_map.insert("description".to_string(), Value::String(desc.clone()));
    }
    root.insert("info".to_string(), Value::Object(info_map));

    // 3. servers
    if !api.servers.is_empty() {
        let servers_val: Vec<Value> = api
            .servers
            .iter()
            .map(|s| {
                let mut smap = Map::new();
                smap.insert("url".to_string(), Value::String(s.url.clone()));
                if let Some(d) = &s.description {
                    smap.insert("description".to_string(), Value::String(d.clone()));
                }
                Value::Object(smap)
            })
            .collect();
        root.insert("servers".to_string(), Value::Array(servers_val));
    }

    // 4. tags
    if !api.tags.is_empty() {
        let tags_val: Vec<Value> = api
            .tags
            .iter()
            .map(|t| {
                let mut tmap = Map::new();
                tmap.insert("name".to_string(), Value::String(t.name.clone()));
                if let Some(d) = &t.description {
                    tmap.insert("description".to_string(), Value::String(d.clone()));
                }
                Value::Object(tmap)
            })
            .collect();
        root.insert("tags".to_string(), Value::Array(tags_val));
    }

    // 5. paths
    let mut paths_map = Map::new();
    // Agrupar operaciones por ruta preservando orden de aparición
    let mut grouped_paths: BTreeMap<String, Vec<&Operation>> = BTreeMap::new();
    for op in &api.operations {
        grouped_paths.entry(op.path.clone()).or_default().push(op);
    }

    for (path, ops) in grouped_paths {
        let mut path_item = Map::new();
        for op in ops {
            let method_key = op.method.to_string().to_lowercase();
            let mut op_map = Map::new();

            if let Some(op_id) = &op.operation_id
                && !op_id.trim().is_empty()
            {
                op_map.insert("operationId".to_string(), Value::String(op_id.clone()));
            }
            if let Some(summary) = &op.summary
                && !summary.trim().is_empty()
            {
                op_map.insert("summary".to_string(), Value::String(summary.clone()));
            }
            if let Some(desc) = &op.description
                && !desc.trim().is_empty()
            {
                op_map.insert("description".to_string(), Value::String(desc.clone()));
            }
            if !op.tags.is_empty() {
                op_map.insert(
                    "tags".to_string(),
                    Value::Array(op.tags.iter().map(|t| Value::String(t.clone())).collect()),
                );
            }
            if op.deprecated {
                op_map.insert("deprecated".to_string(), Value::Bool(true));
            }

            // Parámetros
            if !op.parameters.is_empty() {
                let params_arr: Vec<Value> = op
                    .parameters
                    .iter()
                    .map(|p| {
                        let mut pmap = Map::new();
                        pmap.insert("name".to_string(), Value::String(p.name.clone()));
                        let in_str = match p.location {
                            ParameterLocation::Path => "path",
                            ParameterLocation::Query => "query",
                            ParameterLocation::Header => "header",
                            ParameterLocation::Cookie => "cookie",
                        };
                        pmap.insert("in".to_string(), Value::String(in_str.to_string()));
                        pmap.insert("required".to_string(), Value::Bool(p.required));
                        if let Some(d) = &p.description {
                            pmap.insert("description".to_string(), Value::String(d.clone()));
                        }
                        if let Some(s) = &p.schema {
                            pmap.insert("schema".to_string(), schema_to_json_value(s));
                        }
                        Value::Object(pmap)
                    })
                    .collect();
                op_map.insert("parameters".to_string(), Value::Array(params_arr));
            }

            // RequestBody
            if let Some(body) = &op.request_body {
                let mut bmap = Map::new();
                if let Some(d) = &body.description {
                    bmap.insert("description".to_string(), Value::String(d.clone()));
                }
                bmap.insert("required".to_string(), Value::Bool(body.required));

                let mut content_map = Map::new();
                for (media_type, media) in &body.content {
                    let mut mmap = Map::new();
                    if let Some(s) = &media.schema {
                        mmap.insert("schema".to_string(), schema_to_json_value(s));
                    }
                    if let Some(ex) = &media.example {
                        mmap.insert("example".to_string(), ex.clone());
                    }
                    content_map.insert(media_type.clone(), Value::Object(mmap));
                }
                bmap.insert("content".to_string(), Value::Object(content_map));
                op_map.insert("requestBody".to_string(), Value::Object(bmap));
            }

            // Responses
            let mut responses_map = Map::new();
            for resp in &op.responses {
                let mut rmap = Map::new();
                rmap.insert(
                    "description".to_string(),
                    Value::String(resp.description.clone()),
                );

                if !resp.content.is_empty() {
                    let mut content_map = Map::new();
                    for (media_type, media) in &resp.content {
                        let mut mmap = Map::new();
                        if let Some(s) = &media.schema {
                            mmap.insert("schema".to_string(), schema_to_json_value(s));
                        }
                        if let Some(ex) = &media.example {
                            mmap.insert("example".to_string(), ex.clone());
                        }
                        content_map.insert(media_type.clone(), Value::Object(mmap));
                    }
                    rmap.insert("content".to_string(), Value::Object(content_map));
                }

                responses_map.insert(resp.status_code.clone(), Value::Object(rmap));
            }
            op_map.insert("responses".to_string(), Value::Object(responses_map));

            if let Some(sec) = &op.security {
                if let Ok(sec_val) = serde_json::to_value(sec) {
                    op_map.insert("security".to_string(), sec_val);
                }
            }

            path_item.insert(method_key, Value::Object(op_map));
        }
        paths_map.insert(path, Value::Object(path_item));
    }
    root.insert("paths".to_string(), Value::Object(paths_map));

    // 6. components (schemas & securitySchemes)
    if !api.schemas.is_empty() || !api.security_schemes.is_empty() {
        let mut components_map = Map::new();
        if !api.schemas.is_empty() {
            let mut schemas_map = Map::new();
            for (name, schema) in &api.schemas {
                schemas_map.insert(name.clone(), schema_to_json_value(schema));
            }
            components_map.insert("schemas".to_string(), Value::Object(schemas_map));
        }
        if !api.security_schemes.is_empty() {
            let mut sec_map = Map::new();
            for (name, scheme) in &api.security_schemes {
                if let Ok(val) = serde_json::to_value(scheme) {
                    sec_map.insert(name.clone(), val);
                }
            }
            components_map.insert("securitySchemes".to_string(), Value::Object(sec_map));
        }
        root.insert("components".to_string(), Value::Object(components_map));
    }

    // 7. security (global)
    if !api.security.is_empty() {
        if let Ok(sec_val) = serde_json::to_value(&api.security) {
            root.insert("security".to_string(), sec_val);
        }
    }

    Value::Object(root)
}

fn schema_to_json_value(schema: &SchemaDefinition) -> Value {
    if let Some(ref_path) = &schema.ref_path {
        let mut map = Map::new();
        map.insert("$ref".to_string(), Value::String(ref_path.clone()));
        return Value::Object(map);
    }

    let mut map = Map::new();

    // En OpenAPI 3.1, si admite nulo se serializa como array de tipos ["tipo", "null"]
    if let Some(st) = &schema.schema_type {
        let type_str = match st {
            SchemaType::String => "string",
            SchemaType::Integer => "integer",
            SchemaType::Number => "number",
            SchemaType::Boolean => "boolean",
            SchemaType::Object => "object",
            SchemaType::Array => "array",
            SchemaType::Null => "null",
        };

        if schema.allows_null && *st != SchemaType::Null {
            map.insert(
                "type".to_string(),
                Value::Array(vec![
                    Value::String(type_str.to_string()),
                    Value::String("null".to_string()),
                ]),
            );
        } else {
            map.insert("type".to_string(), Value::String(type_str.to_string()));
        }
    }

    if let Some(desc) = &schema.description
        && !desc.trim().is_empty()
    {
        map.insert("description".to_string(), Value::String(desc.clone()));
    }

    if let Some(fmt) = &schema.format {
        map.insert("format".to_string(), Value::String(fmt.clone()));
    }

    if let Some(pat) = &schema.pattern {
        map.insert("pattern".to_string(), Value::String(pat.clone()));
    }

    if let Some(min_len) = schema.min_length {
        map.insert("minLength".to_string(), Value::from(min_len));
    }
    if let Some(max_len) = schema.max_length {
        map.insert("maxLength".to_string(), Value::from(max_len));
    }

    if let Some(min) = schema.minimum
        && let Some(n) = serde_json::Number::from_f64(min)
    {
        map.insert("minimum".to_string(), Value::Number(n));
    }
    if let Some(max) = schema.maximum
        && let Some(n) = serde_json::Number::from_f64(max)
    {
        map.insert("maximum".to_string(), Value::Number(n));
    }

    if let Some(min_it) = schema.min_items {
        map.insert("minItems".to_string(), Value::from(min_it));
    }
    if let Some(max_it) = schema.max_items {
        map.insert("maxItems".to_string(), Value::from(max_it));
    }

    if let Some(enums) = &schema.enum_values {
        map.insert("enum".to_string(), Value::Array(enums.clone()));
    }

    if !schema.required.is_empty() {
        map.insert(
            "required".to_string(),
            Value::Array(
                schema
                    .required
                    .iter()
                    .map(|r| Value::String(r.clone()))
                    .collect(),
            ),
        );
    }

    if !schema.properties.is_empty() {
        let mut props_map = Map::new();
        for (pname, pschema) in &schema.properties {
            props_map.insert(pname.clone(), schema_to_json_value(pschema));
        }
        map.insert("properties".to_string(), Value::Object(props_map));
    }

    if let Some(items) = &schema.items {
        map.insert("items".to_string(), schema_to_json_value(items));
    }

    if let Some(all_of) = &schema.all_of {
        if !all_of.is_empty() {
            let all_of_val: Vec<Value> = all_of.iter().map(schema_to_json_value).collect();
            map.insert("allOf".to_string(), Value::Array(all_of_val));
        }
    }

    Value::Object(map)
}

/// Exporta la definición de API a OpenAPI 3.1 en formato JSON con indentación legible.
pub fn export_to_json(api: &ApiDefinition) -> Result<String, String> {
    let val = export_openapi_value(api);
    serde_json::to_string_pretty(&val).map_err(|e| format!("Error al serializar a JSON: {}", e))
}

/// Exporta la definición de API a OpenAPI 3.1 en formato YAML canónico.
pub fn export_to_yaml(api: &ApiDefinition) -> Result<String, String> {
    let val = export_openapi_value(api);
    yaml_serde::to_string(&val).map_err(|e| format!("Error al serializar a YAML: {}", e))
}

/// Parsea un documento OpenAPI (JSON o YAML), normaliza sus estructuras y genera un informe de compatibilidad sin alterar el proyecto actual.
pub fn parse_and_report_openapi(content: &str) -> Result<ImportReport, String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Err("El contenido a importar está vacío.".to_string());
    }

    // 1. Detección y parseo sintáctico (JSON primero, luego YAML)
    let root_val: Value = match serde_json::from_str(trimmed) {
        Ok(v) => v,
        Err(_) => yaml_serde::from_str(trimmed).map_err(|e| {
            format!(
                "El archivo no contiene un documento JSON ni YAML válido: {}",
                e
            )
        })?,
    };

    let Some(root) = root_val.as_object() else {
        return Err("La raíz del documento OpenAPI debe ser un objeto JSON/YAML.".to_string());
    };

    let mut warnings = Vec::new();

    // 2. Detección de versión (Swagger 2.0 vs OpenAPI 3.0 vs 3.1)
    let detected_version = if let Some(v) = root.get("openapi").and_then(|v| v.as_str()) {
        v.to_string()
    } else if let Some(v) = root.get("swagger").and_then(|v| v.as_str()) {
        warnings.push(ImportWarning {
            location: "/swagger".to_string(),
            message: format!("Documento Swagger 2.0 ({}) detectado.", v),
            impact: "CAAD soporta nativamente OpenAPI 3.0/3.1. Se importarán los esquemas y operaciones compatibles mapeados a OpenAPI 3.1.".to_string(),
        });
        v.to_string()
    } else {
        warnings.push(ImportWarning {
            location: "/".to_string(),
            message: "No se encontró el campo 'openapi' o 'swagger'. Se asume OpenAPI 3.1.0."
                .to_string(),
            impact: "Puede que algunas características no se interpreten adecuadamente."
                .to_string(),
        });
        "3.1.0".to_string()
    };

    if detected_version.starts_with("3.0") {
        warnings.push(ImportWarning {
            location: "/openapi".to_string(),
            message: format!("Documento OpenAPI 3.0 ({}) detectado.", detected_version),
            impact: "Se normalizan automáticamente campos de compatibilidad (como 'nullable: true' convertido a tipos compatibles OpenAPI 3.1).".to_string(),
        });
    }

    // 3. Extracción de metadatos de info
    let mut api_info = ApiInfo::default();
    if let Some(info_obj) = root.get("info").and_then(|i| i.as_object()) {
        if let Some(title) = info_obj.get("title").and_then(|t| t.as_str()) {
            api_info.title = title.to_string();
        }
        if let Some(ver) = info_obj.get("version").and_then(|v| v.as_str()) {
            api_info.version = ver.to_string();
        }
        if let Some(summary) = info_obj.get("summary").and_then(|s| s.as_str()) {
            api_info.summary = Some(summary.to_string());
        }
        if let Some(desc) = info_obj.get("description").and_then(|d| d.as_str()) {
            api_info.description = Some(desc.to_string());
        }
    } else {
        warnings.push(ImportWarning {
            location: "/info".to_string(),
            message: "Falta el bloque 'info' con metadatos del contrato.".to_string(),
            impact: "Se asignarán valores por defecto para el título y la versión.".to_string(),
        });
    }

    // 4. Extracción de servers
    let mut servers = Vec::new();
    if let Some(servers_arr) = root.get("servers").and_then(|s| s.as_array()) {
        for (idx, sval) in servers_arr.iter().enumerate() {
            if let Some(sobj) = sval.as_object() {
                if let Some(url) = sobj.get("url").and_then(|u| u.as_str()) {
                    let desc = sobj
                        .get("description")
                        .and_then(|d| d.as_str())
                        .map(|d| d.to_string());
                    servers.push(Server {
                        url: url.to_string(),
                        description: desc,
                    });
                }
            } else {
                warnings.push(ImportWarning {
                    location: format!("/servers/{}", idx),
                    message: "Servidor con formato no válido.".to_string(),
                    impact: "Se omitió la entrada del servidor.".to_string(),
                });
            }
        }
    }

    // 5. Extracción de tags
    let mut tags = Vec::new();
    if let Some(tags_arr) = root.get("tags").and_then(|t| t.as_array()) {
        for (idx, tval) in tags_arr.iter().enumerate() {
            if let Some(tobj) = tval.as_object() {
                if let Some(name) = tobj.get("name").and_then(|n| n.as_str()) {
                    let desc = tobj
                        .get("description")
                        .and_then(|d| d.as_str())
                        .map(|d| d.to_string());
                    tags.push(Tag {
                        name: name.to_string(),
                        description: desc,
                    });
                }
            } else {
                warnings.push(ImportWarning {
                    location: format!("/tags/{}", idx),
                    message: "Tag con formato no válido.".to_string(),
                    impact: "Se omitió el tag.".to_string(),
                });
            }
        }
    }

    // 6. Extracción de schemas (components.schemas o definitions en Swagger)
    let mut schemas = BTreeMap::new();
    let schemas_source = root
        .get("components")
        .and_then(|c| c.as_object())
        .and_then(|c| c.get("schemas"))
        .and_then(|s| s.as_object())
        .or_else(|| {
            root.get("definitions").and_then(|d| d.as_object()) // Swagger 2.0
        });

    if let Some(schemas_obj) = schemas_source {
        for (sname, sval) in schemas_obj {
            let schema_def = parse_json_schema(sname, sval, &mut warnings);
            schemas.insert(sname.clone(), schema_def);
        }
    }

    // 7. Extracción de securitySchemes (components.securitySchemes o securityDefinitions en Swagger)
    let mut security_schemes = BTreeMap::new();
    let sec_source = root
        .get("components")
        .and_then(|c| c.as_object())
        .and_then(|c| c.get("securitySchemes"))
        .and_then(|s| s.as_object())
        .or_else(|| {
            root.get("securityDefinitions").and_then(|d| d.as_object()) // Swagger 2.0
        });

    if let Some(sec_obj) = sec_source {
        for (sec_name, sec_val) in sec_obj {
            if let Ok(scheme) = serde_json::from_value::<crate::domain::api::SecurityScheme>(sec_val.clone()) {
                security_schemes.insert(sec_name.clone(), scheme);
            }
        }
    }

    // 8. Extracción de security global
    let mut global_security = Vec::new();
    if let Some(sec_arr) = root.get("security").and_then(|s| s.as_array()) {
        for sval in sec_arr {
            if let Ok(req) = serde_json::from_value::<BTreeMap<String, Vec<String>>>(sval.clone()) {
                global_security.push(req);
            }
        }
    }

    // Alerta sobre otros componentes no soportados en el MVP
    if let Some(components_obj) = root.get("components").and_then(|c| c.as_object()) {
        for (k, _) in components_obj {
            if k != "schemas" && k != "securitySchemes" {
                warnings.push(ImportWarning {
                    location: format!("/components/{}", k),
                    message: format!(
                        "El componente '{}' no es editable directamente en el editor visual del MVP.",
                        k
                    ),
                    impact: "No se representará en los formularios visuales de diseño.".to_string(),
                });
            }
        }
    }

    // 7. Extracción de operaciones (paths)
    let mut operations = Vec::new();
    if let Some(paths_obj) = root.get("paths").and_then(|p| p.as_object()) {
        for (path_pattern, path_item_val) in paths_obj {
            let Some(path_item) = path_item_val.as_object() else {
                continue;
            };

            // Parámetros a nivel de path para heredar
            let mut path_level_parameters = Vec::new();
            if let Some(params_val) = path_item.get("parameters").and_then(|p| p.as_array()) {
                warnings.push(ImportWarning {
                    location: format!("/paths/{}/parameters", path_pattern),
                    message: "Parámetros declarados a nivel de ruta detectados.".to_string(),
                    impact: "Se heredan automáticamente a cada operación individual en esa ruta."
                        .to_string(),
                });
                for pval in params_val {
                    if let Some(p) = parse_parameter(pval, &mut warnings) {
                        path_level_parameters.push(p);
                    }
                }
            }

            for (key, op_val) in path_item {
                let lower_key = key.to_lowercase();
                let method = match lower_key.as_str() {
                    "get" => HttpMethod::Get,
                    "post" => HttpMethod::Post,
                    "put" => HttpMethod::Put,
                    "delete" => HttpMethod::Delete,
                    "patch" => HttpMethod::Patch,
                    "head" => HttpMethod::Head,
                    "options" => HttpMethod::Options,
                    "trace" => HttpMethod::Trace,
                    _ => continue, // ignorar parameters, summary, etc. a nivel de ruta
                };

                let Some(op_obj) = op_val.as_object() else {
                    continue;
                };

                let op_id = op_obj
                    .get("operationId")
                    .and_then(|i| i.as_str())
                    .map(|s| s.to_string());
                let summary = op_obj
                    .get("summary")
                    .and_then(|s| s.as_str())
                    .map(|s| s.to_string());
                let description = op_obj
                    .get("description")
                    .and_then(|d| d.as_str())
                    .map(|s| s.to_string());
                let deprecated = op_obj
                    .get("deprecated")
                    .and_then(|d| d.as_bool())
                    .unwrap_or(false);

                let mut op_tags = Vec::new();
                if let Some(tarr) = op_obj.get("tags").and_then(|t| t.as_array()) {
                    for t in tarr {
                        if let Some(ts) = t.as_str() {
                            op_tags.push(ts.to_string());
                        }
                    }
                }

                // Parámetros: heredar de ruta + específicos de operación
                let mut parameters = path_level_parameters.clone();
                if let Some(parr) = op_obj.get("parameters").and_then(|p| p.as_array()) {
                    for pval in parr {
                        if let Some(param) = parse_parameter(pval, &mut warnings) {
                            // Evitar duplicados por nombre y ubicación
                            if let Some(pos) = parameters.iter().position(|existing| {
                                existing.name == param.name && existing.location == param.location
                            }) {
                                parameters[pos] = param;
                            } else {
                                parameters.push(param);
                            }
                        }
                    }
                }

                // Request body
                let mut request_body = None;
                if let Some(body_obj) = op_obj.get("requestBody").and_then(|b| b.as_object()) {
                    let desc = body_obj
                        .get("description")
                        .and_then(|d| d.as_str())
                        .map(|s| s.to_string());
                    let required = body_obj
                        .get("required")
                        .and_then(|r| r.as_bool())
                        .unwrap_or(false);
                    let mut content_map = BTreeMap::new();

                    if let Some(content_obj) = body_obj.get("content").and_then(|c| c.as_object()) {
                        for (media_type, media_val) in content_obj {
                            if let Some(media_obj) = media_val.as_object() {
                                let schema = media_obj
                                    .get("schema")
                                    .map(|s| parse_json_schema("body", s, &mut warnings));
                                let example = media_obj.get("example").cloned();
                                content_map.insert(
                                    media_type.clone(),
                                    MediaTypeDefinition { schema, example },
                                );
                            }
                        }
                    }
                    request_body = Some(RequestBody {
                        description: desc,
                        required,
                        content: content_map,
                    });
                }

                // Responses
                let mut responses = Vec::new();
                if let Some(resp_obj) = op_obj.get("responses").and_then(|r| r.as_object()) {
                    for (status_code, resp_val) in resp_obj {
                        let mut desc = "Sin descripción".to_string();
                        let mut content_map = BTreeMap::new();

                        if let Some(robj) = resp_val.as_object() {
                            if let Some(d) = robj.get("description").and_then(|d| d.as_str()) {
                                desc = d.to_string();
                            }
                            if let Some(content_obj) =
                                robj.get("content").and_then(|c| c.as_object())
                            {
                                for (media_type, media_val) in content_obj {
                                    if let Some(media_obj) = media_val.as_object() {
                                        let schema = media_obj.get("schema").map(|s| {
                                            parse_json_schema("response", s, &mut warnings)
                                        });
                                        let example = media_obj.get("example").cloned();
                                        content_map.insert(
                                            media_type.clone(),
                                            MediaTypeDefinition { schema, example },
                                        );
                                    }
                                }
                            }
                        }

                        responses.push(ResponseDefinition {
                            status_code: status_code.clone(),
                            description: desc,
                            content: content_map,
                        });
                    }
                }

                let mut op_security = None;
                if let Some(sec_arr) = op_obj.get("security").and_then(|s| s.as_array()) {
                    let mut reqs = Vec::new();
                    for sval in sec_arr {
                        if let Ok(req) = serde_json::from_value::<BTreeMap<String, Vec<String>>>(sval.clone()) {
                            reqs.push(req);
                        }
                    }
                    op_security = Some(reqs);
                }

                operations.push(Operation {
                    id: None,
                    path: path_pattern.clone(),
                    method,
                    operation_id: op_id,
                    summary,
                    description,
                    tags: op_tags,
                    parameters,
                    request_body,
                    responses,
                    deprecated,
                    security: op_security,
                });
            }
        }
    }

    let schemas_count = schemas.len();
    let operations_count = operations.len();

    let doc = ApiDefinition {
        openapi_version: "3.1.0".to_string(),
        info: api_info,
        servers,
        tags,
        schemas,
        operations,
        security_schemes,
        security: global_security,
    };

    Ok(ImportReport {
        success: true,
        document: Some(doc),
        detected_version,
        warnings,
        schemas_count,
        operations_count,
    })
}

fn parse_parameter(val: &Value, warnings: &mut Vec<ImportWarning>) -> Option<Parameter> {
    let obj = val.as_object()?;
    let name = obj.get("name").and_then(|n| n.as_str())?.to_string();
    let in_str = obj
        .get("in")
        .and_then(|i| i.as_str())
        .unwrap_or("query")
        .to_lowercase();
    let location = match in_str.as_str() {
        "path" => ParameterLocation::Path,
        "query" => ParameterLocation::Query,
        "header" => ParameterLocation::Header,
        "cookie" => ParameterLocation::Cookie,
        _ => {
            warnings.push(ImportWarning {
                location: format!("/parameters/{}", name),
                message: format!("Ubicación de parámetro desconocida '{}'.", in_str),
                impact: "Se normalizó a 'query'.".to_string(),
            });
            ParameterLocation::Query
        }
    };

    let required = obj
        .get("required")
        .and_then(|r| r.as_bool())
        .unwrap_or(location == ParameterLocation::Path);

    let description = obj
        .get("description")
        .and_then(|d| d.as_str())
        .map(|s| s.to_string());
    let schema = obj
        .get("schema")
        .map(|s| parse_json_schema(&name, s, warnings));

    Some(Parameter {
        name,
        location,
        description,
        required,
        schema,
    })
}

fn parse_json_schema(
    context_name: &str,
    val: &Value,
    warnings: &mut Vec<ImportWarning>,
) -> SchemaDefinition {
    let mut schema = SchemaDefinition::default();

    let Some(obj) = val.as_object() else {
        return schema;
    };

    // 1. $ref
    if let Some(ref_str) = obj.get("$ref").and_then(|r| r.as_str()) {
        // En Swagger 2.0 es #/definitions/{name}
        let normalized_ref = if let Some(def_name) = ref_str.strip_prefix("#/definitions/") {
            format!("#/components/schemas/{}", def_name)
        } else {
            ref_str.to_string()
        };

        if !normalized_ref.starts_with("#/components/schemas/") {
            warnings.push(ImportWarning {
                location: format!("{}/$ref", context_name),
                message: format!("Referencia no local o externa '{}'.", normalized_ref),
                impact: "El MVP no resuelve referencias externas ni archivos remotos.".to_string(),
            });
        }

        // Si contiene properties o type: object, es una herencia en OpenAPI 3.1
        if obj.contains_key("properties") {
            schema.all_of = Some(vec![SchemaDefinition::new_ref(normalized_ref)]);
        } else {
            schema.ref_path = Some(normalized_ref);
            schema.schema_type = None;
            return schema;
        }
    }

    // 2. allOf (Herencia y composición de esquemas)
    if let Some(all_of_arr) = obj.get("allOf").and_then(|a| a.as_array()) {
        let mut all_of_defs = Vec::new();
        for (idx, item_val) in all_of_arr.iter().enumerate() {
            let item_schema = parse_json_schema(
                &format!("{}.allOf[{}]", context_name, idx),
                item_val,
                warnings,
            );
            if item_schema.ref_path.is_some() {
                all_of_defs.push(item_schema);
            } else if !item_schema.properties.is_empty() {
                // Si el item de allOf define propiedades inline, las incorporamos al objeto
                for (pname, pdef) in item_schema.properties {
                    schema.properties.insert(pname, pdef);
                }
                for req in item_schema.required {
                    if !schema.required.contains(&req) {
                        schema.required.push(req);
                    }
                }
            } else {
                all_of_defs.push(item_schema);
            }
        }
        if !all_of_defs.is_empty() {
            schema.all_of = Some(all_of_defs);
        }
    }

    // Advertencia para oneOf / anyOf no editables directamente
    for comp in &["anyOf", "oneOf"] {
        if obj.contains_key(*comp) {
            warnings.push(ImportWarning {
                location: format!("{}/{}", context_name, comp),
                message: format!(
                    "Construcción composicional '{}' detectada en el esquema.",
                    comp
                ),
                impact:
                    "Se preservan metadatos pero no es editable mediante el formulario estándar."
                        .to_string(),
            });
        }
    }

    // 3. Tipos y Allows null (OpenAPI 3.0 nullable vs OpenAPI 3.1 type array)
    let is_nullable = obj
        .get("nullable")
        .and_then(|n| n.as_bool())
        .unwrap_or(false);
    let mut allows_null = is_nullable;

    if let Some(type_val) = obj.get("type") {
        if let Some(type_str) = type_val.as_str() {
            schema.schema_type = parse_schema_type(type_str);
        } else if let Some(type_arr) = type_val.as_array() {
            for t in type_arr {
                if let Some(ts) = t.as_str() {
                    if ts == "null" {
                        allows_null = true;
                    } else if schema.schema_type.is_none() {
                        schema.schema_type = parse_schema_type(ts);
                    }
                }
            }
        }
    }
    schema.allows_null = allows_null;

    if let Some(desc) = obj.get("description").and_then(|d| d.as_str()) {
        schema.description = Some(desc.to_string());
    }

    if let Some(fmt) = obj.get("format").and_then(|f| f.as_str()) {
        schema.format = Some(fmt.to_string());
    }

    if let Some(pat) = obj.get("pattern").and_then(|p| p.as_str()) {
        schema.pattern = Some(pat.to_string());
    }

    schema.min_length = obj
        .get("minLength")
        .and_then(|m| m.as_u64())
        .map(|m| m as usize);
    schema.max_length = obj
        .get("maxLength")
        .and_then(|m| m.as_u64())
        .map(|m| m as usize);

    schema.minimum = obj.get("minimum").and_then(|m| m.as_f64());
    schema.maximum = obj.get("maximum").and_then(|m| m.as_f64());

    schema.min_items = obj
        .get("minItems")
        .and_then(|m| m.as_u64())
        .map(|m| m as usize);
    schema.max_items = obj
        .get("maxItems")
        .and_then(|m| m.as_u64())
        .map(|m| m as usize);

    if let Some(enums) = obj.get("enum").and_then(|e| e.as_array()) {
        schema.enum_values = Some(enums.clone());
    }

    if let Some(req_arr) = obj.get("required").and_then(|r| r.as_array()) {
        schema.required = req_arr
            .iter()
            .filter_map(|r| r.as_str().map(|s| s.to_string()))
            .collect();
    }

    // Properties
    if let Some(props_obj) = obj.get("properties").and_then(|p| p.as_object()) {
        let mut props = BTreeMap::new();
        for (pname, pval) in props_obj {
            let child_schema =
                parse_json_schema(&format!("{}.{}", context_name, pname), pval, warnings);
            props.insert(pname.clone(), child_schema);
        }
        schema.properties = props;
    }

    // Items
    if let Some(items_val) = obj.get("items") {
        schema.items = Some(Box::new(parse_json_schema(
            &format!("{}.items", context_name),
            items_val,
            warnings,
        )));
    }

    schema
}

fn parse_schema_type(type_str: &str) -> Option<SchemaType> {
    match type_str.to_lowercase().as_str() {
        "string" => Some(SchemaType::String),
        "integer" => Some(SchemaType::Integer),
        "number" => Some(SchemaType::Number),
        "boolean" => Some(SchemaType::Boolean),
        "object" => Some(SchemaType::Object),
        "array" => Some(SchemaType::Array),
        "null" => Some(SchemaType::Null),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_to_json_and_yaml() {
        let api = ApiDefinition::new("Workshop API", "1.0.0");
        let json = export_to_json(&api).expect("debe exportar a JSON");
        assert!(json.contains("\"openapi\": \"3.1.0\""));
        assert!(json.contains("\"title\": \"Workshop API\""));

        let yaml = export_to_yaml(&api).expect("debe exportar a YAML");
        assert!(yaml.contains("openapi: 3.1.0") || yaml.contains("openapi: \"3.1.0\""));
        assert!(yaml.contains("title: Workshop API"));
    }

    #[test]
    fn test_parse_fixture_workshop_yaml() {
        let yaml_content = include_str!("../../../fixtures/openapi/workshop-api.yaml");
        let report = parse_and_report_openapi(yaml_content).expect("debe parsear YAML fixture");

        assert!(report.success);
        assert_eq!(report.detected_version, "3.1.0");
        assert_eq!(report.schemas_count, 4); // Vehicle, WorkOrderCreate, WorkOrder, ErrorResponse
        assert_eq!(report.operations_count, 2); // GET /vehicles/{vehicleId}, POST /work-orders

        let doc = report.document.expect("debe contener el documento");
        assert_eq!(doc.info.title, "Workshop API");
        assert!(doc.schemas.contains_key("Vehicle"));
        assert!(doc.schemas.contains_key("WorkOrder"));

        let get_op = doc
            .find_operation(&HttpMethod::Get, "/vehicles/{vehicleId}")
            .expect("debe encontrar GET operation");
        assert_eq!(get_op.operation_id, Some("getVehicleById".to_string()));
        assert_eq!(get_op.parameters.len(), 1);
        assert_eq!(get_op.parameters[0].name, "vehicleId");
        assert!(get_op.parameters[0].required);
    }

    #[test]
    fn test_parse_fixture_workshop_json() {
        let json_content = include_str!("../../../fixtures/openapi/workshop-api.json");
        let report = parse_and_report_openapi(json_content).expect("debe parsear JSON fixture");

        assert!(report.success);
        assert_eq!(report.detected_version, "3.1.0");
        assert_eq!(report.schemas_count, 4);
        assert_eq!(report.operations_count, 2);

        let doc = report.document.expect("debe contener documento");
        assert_eq!(doc.info.title, "Workshop API");
    }

    #[test]
    fn test_roundtrip_export_and_import() {
        // 1. Cargar fixture YAML
        let fixture_yaml = include_str!("../../../fixtures/openapi/workshop-api.yaml");
        let initial_report = parse_and_report_openapi(fixture_yaml).unwrap();
        let initial_doc = initial_report.document.unwrap();

        // 2. Exportar a YAML
        let exported_yaml = export_to_yaml(&initial_doc).unwrap();

        // 3. Re-importar el YAML exportado
        let roundtrip_report = parse_and_report_openapi(&exported_yaml).unwrap();
        let roundtrip_doc = roundtrip_report.document.unwrap();

        // 4. Comparar semántica
        assert_eq!(roundtrip_doc.info.title, initial_doc.info.title);
        assert_eq!(roundtrip_doc.schemas.len(), initial_doc.schemas.len());
        assert_eq!(roundtrip_doc.operations.len(), initial_doc.operations.len());

        for (name, schema) in &initial_doc.schemas {
            let roundtrip_schema = roundtrip_doc.schemas.get(name).expect("esquema conservado");
            assert_eq!(roundtrip_schema.properties.len(), schema.properties.len());
            assert_eq!(roundtrip_schema.required, schema.required);
        }

        for op in &initial_doc.operations {
            let roundtrip_op = roundtrip_doc
                .find_operation(&op.method, &op.path)
                .expect("operación conservada");
            assert_eq!(roundtrip_op.operation_id, op.operation_id);
            assert_eq!(roundtrip_op.parameters.len(), op.parameters.len());
            assert_eq!(roundtrip_op.responses.len(), op.responses.len());
        }
    }

    #[test]
    fn test_openapi_3_0_nullable_normalization() {
        let oas_30_sample = r#"
openapi: 3.0.3
info:
  title: Legacy 3.0 API
  version: 0.9.0
paths: {}
components:
  schemas:
    User:
      type: string
      nullable: true
"#;
        let report = parse_and_report_openapi(oas_30_sample).unwrap();
        assert_eq!(report.detected_version, "3.0.3");
        assert!(
            report
                .warnings
                .iter()
                .any(|w| w.message.contains("OpenAPI 3.0"))
        );

        let doc = report.document.unwrap();
        let user_schema = doc.schemas.get("User").unwrap();
        assert_eq!(user_schema.schema_type, Some(SchemaType::String));
        assert!(user_schema.allows_null);
    }

    #[test]
    fn test_external_ref_warning() {
        let external_ref_sample = r#"
openapi: 3.1.0
info:
  title: External Ref API
  version: 1.0.0
paths: {}
components:
  schemas:
    Order:
      $ref: "https://example.com/schemas/Order.json"
"#;
        let report = parse_and_report_openapi(external_ref_sample).unwrap();
        assert!(
            report
                .warnings
                .iter()
                .any(|w| w.message.contains("Referencia no local o externa"))
        );
    }

    #[test]
    fn test_invalid_syntax_returns_clear_error() {
        let invalid_content = "this is : not a valid : yaml : [unclosed";
        let err = parse_and_report_openapi(invalid_content).unwrap_err();
        assert!(err.contains("El archivo no contiene un documento JSON ni YAML válido"));
    }

    #[test]
    fn test_parse_animals_api_yaml_inheritance_and_arrays() {
        let yaml_content = r#"
openapi: 3.1.0
info:
  title: API de Gestión de Animales (OpenAPI 3.1)
  version: 1.3.0
components:
  schemas:
    Animal:
      type: object
      required:
        - id
        - species
      properties:
        id:
          type: integer
        species:
          type: string
        tags:
          type: array
          items:
            type: string
    Pet:
      $ref: '#/components/schemas/Animal'
      type: object
      required:
        - name
      properties:
        name:
          type: string
        vaccines:
          type: array
          items:
            $ref: '#/components/schemas/Vaccine'
    Vaccine:
      type: object
      required:
        - name
      properties:
        name:
          type: string
"#;
        let report = parse_and_report_openapi(yaml_content).unwrap();
        assert!(report.success);
        let doc = report.document.unwrap();
        assert_eq!(doc.schemas.len(), 3);

        let pet = doc.schemas.get("Pet").unwrap();
        assert!(pet.all_of.is_some());
        assert_eq!(
            pet.all_of.as_ref().unwrap()[0].ref_path.as_deref(),
            Some("#/components/schemas/Animal")
        );
        assert!(pet.properties.contains_key("vaccines"));
        let vaccines = pet.properties.get("vaccines").unwrap();
        assert_eq!(vaccines.schema_type, Some(SchemaType::Array));
        assert!(vaccines.items.is_some());
        assert_eq!(
            vaccines.items.as_ref().unwrap().ref_path.as_deref(),
            Some("#/components/schemas/Vaccine")
        );

        let animal = doc.schemas.get("Animal").unwrap();
        let tags = animal.properties.get("tags").unwrap();
        assert_eq!(tags.schema_type, Some(SchemaType::Array));
        assert!(tags.items.is_some());
        assert_eq!(tags.items.as_ref().unwrap().schema_type, Some(SchemaType::String));

        // Roundtrip export
        let exported_yaml = export_to_yaml(&doc).unwrap();
        assert!(exported_yaml.contains("allOf"));
        assert!(exported_yaml.contains("#/components/schemas/Animal"));
        assert!(exported_yaml.contains("#/components/schemas/Vaccine"));
    }
}
