import { invoke } from "@tauri-apps/api/core";
import {
  Project,
  ProjectSummaryDto,
  DesignIssue,
  ApiDefinition,
  ImportReport,
} from "../app/types";

export interface AppInfoDto {
  name: string;
  version: string;
  description: string;
}

// Fallback en memoria si se ejecuta en navegador fuera de Tauri
let inMemoryProjects: Project[] = [];

function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function pingBackend(): Promise<string> {
  if (!isTauriEnvironment()) return "pong (web)";
  try {
    return await invoke<string>("ping");
  } catch (error) {
    console.error("Error al invocar ping:", error);
    return "error";
  }
}

export async function getAppInfo(): Promise<AppInfoDto> {
  if (!isTauriEnvironment()) {
    return {
      name: "CAAD",
      version: "0.1.0",
      description: "Modo Desarrollo Web",
    };
  }
  try {
    return await invoke<AppInfoDto>("app_info");
  } catch (error) {
    console.error("Error al obtener app_info:", error);
    return {
      name: "CAAD",
      version: "0.1.0",
      description: "Modo Desarrollo",
    };
  }
}

export function normalizeProject(project: Project): Project {
  return {
    ...project,
    document: {
      openapi_version: project.document?.openapi_version ?? "3.1.0",
      info: {
        title: project.document?.info?.title ?? project.name ?? "API",
        version: project.document?.info?.version ?? "0.1.0",
        summary: project.document?.info?.summary,
        description: project.document?.info?.description,
      },
      servers: project.document?.servers ?? [],
      tags: project.document?.tags ?? [],
      schemas: project.document?.schemas ?? {},
      operations: (project.document?.operations ?? []).map((op) => ({
        ...op,
        tags: op.tags ?? [],
        parameters: op.parameters ?? [],
        responses: op.responses ?? [],
        deprecated: op.deprecated ?? false,
      })),
      security_schemes: project.document?.security_schemes ?? {},
      security: project.document?.security ?? [],
    },
  };
}

export async function createProject(
  name: string,
  description?: string
): Promise<Project> {
  if (!isTauriEnvironment()) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío.");
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: trimmed,
      description,
      document_schema_version: 1,
      document: {
        openapi_version: "3.1.0",
        info: {
          title: trimmed,
          version: "0.1.0",
        },
        servers: [],
        tags: [],
        schemas: {},
        operations: [],
        security_schemes: {},
        security: [],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryProjects.unshift(newProj);
    return newProj;
  }
  const proj = await invoke<Project>("create_project", { name, description });
  return normalizeProject(proj);
}

export async function listProjects(): Promise<ProjectSummaryDto[]> {
  if (!isTauriEnvironment()) {
    return inMemoryProjects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? null,
      document_schema_version: p.document_schema_version,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));
  }
  return await invoke<ProjectSummaryDto[]>("list_projects");
}

export async function getProject(id: string): Promise<Project | null> {
  if (!isTauriEnvironment()) {
    const found = inMemoryProjects.find((p) => p.id === id);
    return found ? normalizeProject(found) : null;
  }
  const proj = await invoke<Project | null>("get_project", { id });
  return proj ? normalizeProject(proj) : null;
}

export async function saveProject(project: Project): Promise<void> {
  const normalized = normalizeProject(project);
  if (!isTauriEnvironment()) {
    const idx = inMemoryProjects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      inMemoryProjects[idx] = {
        ...normalized,
        updated_at: new Date().toISOString(),
      };
    } else {
      inMemoryProjects.unshift(normalized);
    }
    return;
  }
  await invoke<void>("save_project", { project: normalized });
}

export async function renameProject(
  id: string,
  newName: string
): Promise<Project> {
  if (!isTauriEnvironment()) {
    const trimmed = newName.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío.");
    const proj = inMemoryProjects.find((p) => p.id === id);
    if (!proj) throw new Error("Proyecto no encontrado.");
    proj.name = trimmed;
    proj.document.info.title = trimmed;
    proj.updated_at = new Date().toISOString();
    return normalizeProject({ ...proj });
  }
  const proj = await invoke<Project>("rename_project", { id, newName });
  return normalizeProject(proj);
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!isTauriEnvironment()) {
    const initialLen = inMemoryProjects.length;
    inMemoryProjects = inMemoryProjects.filter((p) => p.id !== id);
    return inMemoryProjects.length < initialLen;
  }
  return await invoke<boolean>("delete_project", { id });
}

export async function getSchemaUsages(
  projectId: string,
  schemaName: string
): Promise<string[]> {
  if (!isTauriEnvironment()) {
    const proj = inMemoryProjects.find((p) => p.id === projectId);
    if (!proj) return [];
    const targetRef = `#/components/schemas/${schemaName}`;
    const usages: string[] = [];
    for (const [name, schema] of Object.entries(proj.document.schemas)) {
      if (name === schemaName) continue;
      const json = JSON.stringify(schema);
      if (json.includes(`"${targetRef}"`)) {
        usages.push(`Esquema '${name}'`);
      }
    }
    return usages;
  }
  return await invoke<string[]>("get_schema_usages", {
    projectId,
    schemaName,
  });
}

export async function validateProject(
  projectId: string
): Promise<DesignIssue[]> {
  if (!isTauriEnvironment()) {
    const proj = inMemoryProjects.find((p) => p.id === projectId);
    if (!proj) return [];
    return validateDocument(proj.document);
  }
  return await invoke<DesignIssue[]>("validate_project", { projectId });
}

export async function validateDocument(
  document: ApiDefinition
): Promise<DesignIssue[]> {
  if (!document) return [];
  const safeDoc: ApiDefinition = {
    openapi_version: document.openapi_version ?? "3.1.0",
    info: document.info ?? { title: "API", version: "0.1.0" },
    servers: document.servers ?? [],
    tags: document.tags ?? [],
    schemas: document.schemas ?? {},
    operations: document.operations ?? [],
    security_schemes: document.security_schemes ?? {},
    security: document.security ?? [],
  };
  if (!isTauriEnvironment()) {
    const issues: DesignIssue[] = [];
    const schemas = safeDoc.schemas;
    const available = new Set(Object.keys(schemas));
    for (const [name, s] of Object.entries(schemas)) {
      const json = JSON.stringify(s);
      const matches = json.match(/#\/components\/schemas\/[a-zA-Z0-9._-]+/g) || [];
      for (const m of matches) {
        const target = m.replace("#/components/schemas/", "");
        if (!available.has(target)) {
          issues.push({
            id: crypto.randomUUID(),
            rule_id: "STRUCT-003",
            severity: "error",
            title: "Referencia interna no resuelta",
            message: `El esquema '${name}' referencia '${m}', pero no existe en components/schemas.`,
            location: `/components/schemas/${name}`,
            suggestion: `Define el esquema '${target}' o actualiza el $ref.`,
          });
        }
      }
    }
    return issues;
  }
  return await invoke<DesignIssue[]>("validate_document", { document: safeDoc });
}

export async function exportProjectOpenApiJson(projectId: string): Promise<string> {
  if (!isTauriEnvironment()) {
    const proj = inMemoryProjects.find((p) => p.id === projectId);
    return proj ? JSON.stringify(proj.document, null, 2) : "{}";
  }
  return await invoke<string>("export_project_openapi_json", { projectId });
}

export async function exportProjectOpenApiYaml(projectId: string): Promise<string> {
  if (!isTauriEnvironment()) {
    const proj = inMemoryProjects.find((p) => p.id === projectId);
    return proj ? `# OpenAPI 3.1 (Web Fallback)\nopenapi: "3.1.0"\ninfo:\n  title: "${proj.document.info.title}"\n  version: "${proj.document.info.version}"\n` : "";
  }
  return await invoke<string>("export_project_openapi_yaml", { projectId });
}

export async function exportDocumentJson(document: ApiDefinition): Promise<string> {
  if (!isTauriEnvironment()) {
    return JSON.stringify(document, null, 2);
  }
  return await invoke<string>("export_document_json", { document });
}

export async function exportDocumentYaml(document: ApiDefinition): Promise<string> {
  if (!isTauriEnvironment()) {
    return `# OpenAPI 3.1 (Web Fallback)\nopenapi: "3.1.0"\ninfo:\n  title: "${document.info.title}"\n  version: "${document.info.version}"\n`;
  }
  return await invoke<string>("export_document_yaml", { document });
}

export interface ExportResult {
  success: boolean;
  saved_path?: string;
  cancelled: boolean;
  message: string;
}

export async function saveExportedFile(
  defaultName: string,
  format: string,
  content: string
): Promise<ExportResult> {
  if (!isTauriEnvironment()) {
    try {
      const mimeType = format === "yaml" ? "application/x-yaml" : "application/json";
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return {
        success: true,
        saved_path: `Descargas (Navegador): ${defaultName}`,
        cancelled: false,
        message: `Archivo descargado como ${defaultName}`,
      };
    } catch (err) {
      return {
        success: false,
        cancelled: false,
        message: `Error al descargar: ${err}`,
      };
    }
  }

  try {
    return await invoke<ExportResult>("save_exported_file", {
      defaultName,
      format,
      content,
    });
  } catch (error) {
    console.error("Error al exportar archivo nativo:", error);
    return {
      success: false,
      cancelled: false,
      message: `Error al guardar: ${error}`,
    };
  }
}

export async function openExportFolder(path?: string): Promise<void> {
  if (!isTauriEnvironment()) {
    console.info("Abrir carpeta solo está disponible en el entorno de escritorio");
    return;
  }
  try {
    await invoke("open_export_folder", { path });
  } catch (error) {
    console.error("Error al abrir carpeta de exportación:", error);
  }
}

export async function parseOpenApi(content: string): Promise<ImportReport> {
  if (!isTauriEnvironment()) {
    try {
      const parsed = JSON.parse(content);
      return {
        success: true,
        document: {
          openapi_version: parsed.openapi || "3.1.0",
          info: parsed.info || { title: "API Importada", version: "1.0.0" },
          servers: parsed.servers || [],
          tags: parsed.tags || [],
          schemas: parsed.components?.schemas || {},
          operations: [],
        },
        detected_version: parsed.openapi || "3.1.0",
        warnings: [],
        schemas_count: Object.keys(parsed.components?.schemas || {}).length,
        operations_count: 0,
      };
    } catch {
      throw new Error("Modo web: El archivo debe ser un JSON válido.");
    }
  }
  return await invoke<ImportReport>("parse_openapi", { content });
}

export async function importProjectFromOpenApi(
  name: string,
  content: string
): Promise<Project> {
  if (!isTauriEnvironment()) {
    const report = await parseOpenApi(content);
    if (!report.document) throw new Error("Documento no válido");
    const newProj: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || report.document.info.title,
      description: report.document.info.description,
      document_schema_version: 1,
      document: report.document,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryProjects.unshift(newProj);
    return newProj;
  }
  const proj = await invoke<Project>("import_project_from_openapi", { name, content });
  return normalizeProject(proj);
}

export async function replaceProjectFromOpenApi(
  projectId: string,
  content: string
): Promise<Project> {
  if (!isTauriEnvironment()) {
    const report = await parseOpenApi(content);
    if (!report.document) throw new Error("Documento no válido");
    const idx = inMemoryProjects.findIndex((p) => p.id === projectId);
    if (idx < 0) throw new Error("Proyecto no encontrado");
    inMemoryProjects[idx].document = report.document;
    inMemoryProjects[idx].updated_at = new Date().toISOString();
    return normalizeProject(inMemoryProjects[idx]);
  }
  const proj = await invoke<Project>("replace_project_from_openapi", { projectId, content });
  return normalizeProject(proj);
}

export async function createExampleProject(): Promise<Project> {
  if (!isTauriEnvironment()) {
    const demoProject: Project = {
      id: crypto.randomUUID(),
      name: "Workshop API (Demo)",
      description: "Especificación representativa de OpenAPI 3.1.0 para gestión de taller mecánico y órdenes de trabajo.",
      document_schema_version: 1,
      document: {
        openapi_version: "3.1.0",
        info: {
          title: "Workshop API (Demo)",
          version: "1.0.0",
          description: "Especificación representativa de OpenAPI 3.1.0 para gestión de taller mecánico y órdenes de trabajo.",
          summary: "API de gestión de taller mecánico",
        },
        servers: [
          {
            url: "https://api.workshop.local/v1",
            description: "Servidor local simulado",
          },
        ],
        tags: [{ name: "Vehicles" }, { name: "WorkOrders" }],
        schemas: {
          Vehicle: {
            schema_type: "object",
            required: ["id", "licensePlate", "make", "modelYear"],
            description: "Representación completa de un vehículo en el taller",
            properties: {
              id: {
                schema_type: "string",
                format: "uuid",
                description: "Identificador único del vehículo",
              },
              licensePlate: {
                schema_type: "string",
                description: "Matrícula o placa del vehículo",
              },
              make: {
                schema_type: "string",
                description: "Marca del fabricante",
              },
              modelYear: {
                schema_type: "integer",
                description: "Año del modelo",
              },
            },
          },
          WorkOrder: {
            schema_type: "object",
            required: ["id", "vehicleId", "description", "status"],
            description: "Orden de trabajo registrada para servicio",
            properties: {
              id: {
                schema_type: "string",
                format: "uuid",
                description: "Identificador único de la orden",
              },
              vehicleId: {
                schema_type: "string",
                format: "uuid",
                description: "ID del vehículo",
              },
              description: {
                schema_type: "string",
                description: "Detalle del trabajo a realizar",
              },
              status: {
                schema_type: "string",
                description: "Estado de la orden de trabajo",
              },
              estimatedHours: {
                schema_type: "number",
                allows_null: true,
                description: "Horas estimadas",
              },
            },
          },
          WorkOrderCreate: {
            schema_type: "object",
            required: ["vehicleId", "description"],
            description: "Payload para apertura de nueva orden de trabajo",
            properties: {
              vehicleId: {
                schema_type: "string",
                format: "uuid",
                description: "ID del vehículo asociado",
              },
              description: {
                schema_type: "string",
                description: "Detalle del trabajo o falla reportada",
              },
              estimatedHours: {
                schema_type: "number",
                allows_null: true,
                description: "Horas estimadas de trabajo",
              },
            },
          },
          ErrorResponse: {
            schema_type: "object",
            required: ["code", "message"],
            description: "Estructura estándar de respuesta de error",
            properties: {
              code: {
                schema_type: "string",
                description: "Código interno o estándar de error",
              },
              message: {
                schema_type: "string",
                description: "Mensaje legible del error",
              },
            },
          },
        },
        operations: [
          {
            path: "/vehicles/{vehicleId}",
            method: "GET",
            operation_id: "getVehicleById",
            summary: "Obtener vehículo por ID",
            description: "Devuelve la información detallada de un vehículo registrado en el taller.",
            tags: ["Vehicles"],
            parameters: [
              {
                name: "vehicleId",
                location: "path",
                required: true,
                description: "Identificador único del vehículo",
                schema: {
                  schema_type: "string",
                  format: "uuid",
                },
              },
            ],
            responses: [
              {
                status_code: "200",
                description: "Vehículo encontrado exitosamente",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/Vehicle",
                    },
                  },
                },
              },
              {
                status_code: "404",
                description: "Vehículo no encontrado",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/ErrorResponse",
                    },
                  },
                },
              },
            ],
          },
          {
            path: "/work-orders",
            method: "POST",
            operation_id: "createWorkOrder",
            summary: "Crear orden de trabajo",
            description: "Registra una nueva orden de servicio asociada a un vehículo.",
            tags: ["WorkOrders"],
            parameters: [],
            request_body: {
              description: "Datos de la nueva orden de trabajo",
              required: true,
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/WorkOrderCreate",
                  },
                },
              },
            },
            responses: [
              {
                status_code: "201",
                description: "Orden de trabajo creada",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/WorkOrder",
                    },
                  },
                },
              },
              {
                status_code: "400",
                description: "Solicitud inválida",
                content: {
                  "application/json": {
                    schema: {
                      $ref: "#/components/schemas/ErrorResponse",
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    inMemoryProjects.unshift(demoProject);
    return demoProject;
  }
  const proj = await invoke<Project>("create_example_project");
  return normalizeProject(proj);
}
