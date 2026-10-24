import React, { useState, useEffect, useMemo } from "react";
import {
  Project,
  Operation,
  HttpMethod,
  ParameterLocation,
  Parameter,
  ResponseDefinition,
  SchemaDefinition,
  DesignIssue,
} from "../../app/types";
import { EmptyView } from "../../components/EmptyView";
import { validateDocument, normalizeProject } from "../../lib/tauri";
import {
  Zap,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Code2,
  AlertTriangle,
  X,
  Tag as TagIcon,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  Filter,
  Lock,
  Unlock,
  Shield,
} from "lucide-react";

interface OperationsViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  onNavigateToProjects: () => void;
  onNavigateToSchemas: () => void;
  onNavigateToSecurity?: () => void;
  targetOperation?: { path: string; method: HttpMethod } | null;
}

const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "HEAD",
  "OPTIONS",
  "TRACE",
];

const PARAM_LOCATIONS: ParameterLocation[] = [
  "path",
  "query",
  "header",
  "cookie",
];

const COMMON_STATUS_CODES = [
  { code: "200", label: "200 OK", desc: "Petición procesada con éxito" },
  { code: "201", label: "201 Created", desc: "Recurso creado satisfactoriamente" },
  { code: "204", label: "204 No Content", desc: "Acción completada sin cuerpo de retorno" },
  { code: "400", label: "400 Bad Request", desc: "Parámetros o cuerpo de solicitud inválidos" },
  { code: "401", label: "401 Unauthorized", desc: "Autenticación requerida o token no válido" },
  { code: "403", label: "403 Forbidden", desc: "Permisos insuficientes para el recurso" },
  { code: "404", label: "404 Not Found", desc: "El recurso solicitado no existe" },
  { code: "409", label: "409 Conflict", desc: "Conflicto con el estado actual del recurso" },
  { code: "500", label: "500 Internal Error", desc: "Error interno no controlado en el servidor" },
  { code: "default", label: "default", desc: "Respuesta de error genérica inesperada" },
];

function getMethodBadgeStyle(method: HttpMethod): {
  color: string;
  bg: string;
  border: string;
} {
  switch (method) {
    case "GET":
      return {
        color: "#00e5ff",
        bg: "rgba(0, 229, 255, 0.12)",
        border: "#00e5ff",
      };
    case "POST":
      return {
        color: "#d4ff00",
        bg: "rgba(212, 255, 0, 0.12)",
        border: "#d4ff00",
      };
    case "PUT":
      return {
        color: "#ff9100",
        bg: "rgba(255, 145, 0, 0.12)",
        border: "#ff9100",
      };
    case "DELETE":
      return {
        color: "#ff1744",
        bg: "rgba(255, 23, 68, 0.12)",
        border: "#ff1744",
      };
    case "PATCH":
      return {
        color: "#d500f9",
        bg: "rgba(213, 0, 249, 0.12)",
        border: "#d500f9",
      };
    case "HEAD":
      return {
        color: "#90caf9",
        bg: "rgba(144, 202, 249, 0.12)",
        border: "#90caf9",
      };
    case "OPTIONS":
      return {
        color: "#b0bec5",
        bg: "rgba(176, 190, 197, 0.12)",
        border: "#b0bec5",
      };
    case "TRACE":
      return {
        color: "#80d8ff",
        bg: "rgba(128, 216, 255, 0.12)",
        border: "#80d8ff",
      };
    default:
      return {
        color: "var(--text-main)",
        bg: "var(--bg-app)",
        border: "var(--border-main)",
      };
  }
}

function extractPathVariables(path: string): string[] {
  const vars: string[] = [];
  let inVar = false;
  let currentVar = "";

  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === "{") {
      inVar = true;
      currentVar = "";
    } else if (ch === "}" && inVar) {
      inVar = false;
      if (currentVar.trim().length > 0) {
        vars.push(currentVar.trim());
      }
    } else if (inVar) {
      currentVar += ch;
    }
  }
  return vars;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToProjects,
  onNavigateToSchemas,
  onNavigateToSecurity,
  targetOperation,
}) => {
  const safeProject = useMemo(() => {
    return project ? normalizeProject(project) : null;
  }, [project]);

  const operations = useMemo(() => {
    return safeProject?.document?.operations ?? [];
  }, [safeProject]);

  const schemas = useMemo(() => {
    return safeProject?.document?.schemas ?? {};
  }, [safeProject]);

  const schemaNames = useMemo(() => {
    return Object.keys(schemas).sort();
  }, [schemas]);

  const securitySchemes = useMemo(() => {
    return safeProject?.document?.security_schemes ?? {};
  }, [safeProject]);

  const securitySchemeNames = useMemo(() => {
    return Object.keys(securitySchemes).sort();
  }, [securitySchemes]);

  const globalSecurity = useMemo(() => {
    return safeProject?.document?.security ?? [];
  }, [safeProject]);

  // Selección de operación activa por índice o ID
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [tagFilter, setTagFilter] = useState<string>("ALL");

  // Modales
  const [isNewOpModalOpen, setIsNewOpModalOpen] = useState<boolean>(false);
  const [newOpMethod, setNewOpMethod] = useState<HttpMethod>("GET");
  const [newOpPath, setNewOpPath] = useState<string>("/recursos");
  const [newOpError, setNewOpError] = useState<string | null>(null);

  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [showJsonPreview, setShowJsonPreview] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Nuevo tag inline
  const [newTagInput, setNewTagInput] = useState<string>("");

  // Diagnósticos de validación en tiempo real
  const [validationIssues, setValidationIssues] = useState<DesignIssue[]>([]);

  // Validar documento en tiempo real
  useEffect(() => {
    if (!safeProject) {
      setValidationIssues([]);
      return;
    }
    let isMounted = true;
    validateDocument(safeProject.document).then((issues) => {
      if (isMounted) setValidationIssues(issues);
    });
    return () => {
      isMounted = false;
    };
  }, [safeProject]);

  // Asegurar que el selectedIndex sea válido
  useEffect(() => {
    if (operations.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= operations.length) {
      setSelectedIndex(Math.max(0, operations.length - 1));
    }
  }, [operations.length, selectedIndex]);

  // Si se pasa targetOperation desde diagnósticos u otra vista, seleccionarla
  useEffect(() => {
    if (targetOperation && operations.length > 0) {
      const idx = operations.findIndex(
        (op) =>
          op.path === targetOperation.path &&
          op.method.toUpperCase() === targetOperation.method.toUpperCase()
      );
      if (idx >= 0) {
        setSelectedIndex(idx);
        setMethodFilter("ALL");
        setTagFilter("ALL");
        setSearchQuery("");
      }
    }
  }, [targetOperation, operations]);

  if (!safeProject) {
    return (
      <EmptyView
        icon={Zap}
        title="Ningún proyecto en sesión"
        description="Abre o crea un proyecto desde la sección 'Proyectos' para modelar y gestionar las operaciones HTTP REST de la API."
        actionLabel="IR AL DIRECTORIO"
        onAction={onNavigateToProjects}
      />
    );
  }

  // Filtrado de operaciones
  const allTags = Array.from(
    new Set(operations.flatMap((op) => op.tags ?? []))
  ).sort();

  const filteredOperationsWithIndex = operations
    .map((op, idx) => ({ op, idx }))
    .filter(({ op }) => {
      if (methodFilter !== "ALL" && op.method !== methodFilter) {
        return false;
      }
      if (tagFilter !== "ALL" && !(op.tags ?? []).includes(tagFilter)) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesPath = op.path.toLowerCase().includes(query);
        const matchesSummary = (op.summary ?? "").toLowerCase().includes(query);
        const matchesOpId = (op.operation_id ?? "").toLowerCase().includes(query);
        const matchesTags = (op.tags ?? []).some((t) =>
          t.toLowerCase().includes(query)
        );
        return matchesPath || matchesSummary || matchesOpId || matchesTags;
      }
      return true;
    });

  const currentOp = operations[selectedIndex] ?? null;

  // Actualizar operación activa en el proyecto
  const updateCurrentOperation = (updater: (prev: Operation) => Operation) => {
    if (!currentOp || selectedIndex < 0 || selectedIndex >= operations.length) return;
    const updatedOp = updater(currentOp);
    const updatedOps = [...operations];
    updatedOps[selectedIndex] = updatedOp;

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        operations: updatedOps,
      },
    };
    onUpdateProject(updatedProject);
  };

  // Crear nueva operación
  const handleCreateOperation = () => {
    const formattedPath = newOpPath.trim();
    if (!formattedPath) {
      setNewOpError("La ruta del endpoint no puede estar vacía.");
      return;
    }
    if (!formattedPath.startsWith("/")) {
      setNewOpError("La ruta debe comenzar con '/' (ejemplo: '/usuarios').");
      return;
    }

    // Verificar si ya existe una con el mismo método y ruta (FR-005, STRUCT-002)
    const duplicate = operations.some(
      (op) => op.method === newOpMethod && op.path === formattedPath
    );
    if (duplicate) {
      setNewOpError(
        `Ya existe una operación con método ${newOpMethod} y ruta '${formattedPath}'.`
      );
      return;
    }

    // Detectar variables de ruta automáticas
    const detectedVars = extractPathVariables(formattedPath);
    const initialParams: Parameter[] = detectedVars.map((v) => ({
      name: v,
      location: "path",
      required: true,
      description: `Identificador del parámetro de ruta ${v}`,
      schema: { schema_type: "string" },
    }));

    const newOp: Operation = {
      id: crypto.randomUUID(),
      method: newOpMethod,
      path: formattedPath,
      operation_id: "",
      summary: "",
      description: "",
      tags: [],
      parameters: initialParams,
      request_body:
        newOpMethod === "POST" || newOpMethod === "PUT" || newOpMethod === "PATCH"
          ? {
              description: "Cuerpo de la petición",
              required: true,
              content: {
                "application/json": {},
              },
            }
          : undefined,
      responses: [
        {
          status_code: newOpMethod === "POST" ? "201" : "200",
          description: "Operación completada exitosamente",
          content: {
            "application/json": {},
          },
        },
      ],
      deprecated: false,
    };

    const updatedOps = [...operations, newOp];
    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        operations: updatedOps,
      },
    };
    onUpdateProject(updatedProject);
    setSelectedIndex(updatedOps.length - 1);
    setIsNewOpModalOpen(false);
    setNewOpPath("/recursos");
    setNewOpError(null);
  };

  // Eliminar operación
  const handleDeleteOperation = (indexToDelete: number) => {
    const updatedOps = operations.filter((_, idx) => idx !== indexToDelete);
    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        operations: updatedOps,
      },
    };
    onUpdateProject(updatedProject);
    setDeleteConfirmIndex(null);
    if (selectedIndex >= updatedOps.length) {
      setSelectedIndex(Math.max(0, updatedOps.length - 1));
    }
  };

  // Cargar ejemplo canónico: Workshop REST API (Vehicles & WorkOrders)
  const handleLoadSampleOperations = () => {
    const sampleSchemas: Record<string, SchemaDefinition> = {
      ...safeProject.document.schemas,
    };

    // Si faltan esquemas Vehicle o WorkOrder, incorporarlos automáticamente
    if (!sampleSchemas["Vehicle"]) {
      sampleSchemas["Vehicle"] = {
        schema_type: "object",
        description: "Entidad que representa un vehículo en el taller",
        properties: {
          id: { schema_type: "string", description: "UUID único del vehículo" },
          vin: { schema_type: "string", description: "Número de identificación vehicular (VIN)" },
          brand: { schema_type: "string", description: "Marca del fabricante" },
          model: { schema_type: "string", description: "Línea o modelo" },
          year: { schema_type: "integer", description: "Año de fabricación" },
          mileage: { schema_type: "integer", description: "Kilometraje actual" },
          status: { schema_type: "string", description: "Estado operativo (ACTIVO, TALLER, ARCHIVADO)" },
        },
        required: ["id", "vin", "brand", "model", "year"],
      };
    }

    if (!sampleSchemas["WorkOrder"]) {
      sampleSchemas["WorkOrder"] = {
        schema_type: "object",
        description: "Orden de servicio técnico y mantenimiento preventivo",
        properties: {
          id: { schema_type: "string", description: "Identificador único de la orden" },
          order_number: { schema_type: "string", description: "Código de seguimiento visible" },
          vehicle: { $ref: "#/components/schemas/Vehicle", description: "Vehículo asociado" },
          description: { schema_type: "string", description: "Diagnóstico inicial y tareas" },
          estimated_hours: { schema_type: "number", description: "Horas estimadas" },
          status: { schema_type: "string", description: "Estado de la orden (ABIERTA, EN_PROCESO, CERRADA)" },
        },
        required: ["id", "order_number", "vehicle", "description", "status"],
      };
    }

    const sampleOps: Operation[] = [
      {
        id: crypto.randomUUID(),
        method: "GET",
        path: "/vehicles",
        operation_id: "listVehicles",
        summary: "Listar vehículos registrados en el taller",
        description: "Retorna el catálogo completo de vehículos con filtros opcionales de estado y paginación.",
        tags: ["Vehicles"],
        parameters: [
          {
            name: "status",
            location: "query",
            required: false,
            description: "Filtrar por estado operativo (ej. ACTIVO, TALLER)",
            schema: { schema_type: "string" },
          },
          {
            name: "limit",
            location: "query",
            required: false,
            description: "Número máximo de registros por página",
            schema: { schema_type: "integer", minimum: 1, maximum: 100 },
          },
        ],
        responses: [
          {
            status_code: "200",
            description: "Catálogo de vehículos obtenido con éxito",
            content: {
              "application/json": {
                schema: {
                  schema_type: "array",
                  items: { $ref: "#/components/schemas/Vehicle" },
                },
              },
            },
          },
        ],
        deprecated: false,
      },
      {
        id: crypto.randomUUID(),
        method: "POST",
        path: "/vehicles",
        operation_id: "createVehicle",
        summary: "Registrar nuevo vehículo",
        description: "Crea la ficha de un vehículo en la base de datos local del taller.",
        tags: ["Vehicles"],
        parameters: [],
        request_body: {
          description: "Datos del vehículo requeridos para el alta",
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Vehicle" },
            },
          },
        },
        responses: [
          {
            status_code: "201",
            description: "Vehículo registrado satisfactoriamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Vehicle" },
              },
            },
          },
          {
            status_code: "400",
            description: "Datos de entrada inválidos o VIN duplicado",
          },
        ],
        deprecated: false,
      },
      {
        id: crypto.randomUUID(),
        method: "GET",
        path: "/vehicles/{vehicleId}",
        operation_id: "getVehicleById",
        summary: "Consultar vehículo por ID",
        description: "Devuelve los detalles técnicos y estado de un vehículo específico.",
        tags: ["Vehicles"],
        parameters: [
          {
            name: "vehicleId",
            location: "path",
            required: true,
            description: "Identificador único UUID del vehículo",
            schema: { schema_type: "string" },
          },
        ],
        responses: [
          {
            status_code: "200",
            description: "Ficha del vehículo encontrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Vehicle" },
              },
            },
          },
          {
            status_code: "404",
            description: "No se encontró ningún vehículo con el ID especificado",
          },
        ],
        deprecated: false,
      },
      {
        id: crypto.randomUUID(),
        method: "PUT",
        path: "/vehicles/{vehicleId}",
        operation_id: "updateVehicle",
        summary: "Actualizar datos completos del vehículo",
        description: "Modifica las especificaciones o kilometraje del vehículo indicado.",
        tags: ["Vehicles"],
        parameters: [
          {
            name: "vehicleId",
            location: "path",
            required: true,
            description: "Identificador único UUID del vehículo",
            schema: { schema_type: "string" },
          },
        ],
        request_body: {
          description: "Nuevos valores del vehículo",
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Vehicle" },
            },
          },
        },
        responses: [
          {
            status_code: "200",
            description: "Vehículo actualizado exitosamente",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Vehicle" },
              },
            },
          },
          {
            status_code: "404",
            description: "Vehículo no encontrado",
          },
        ],
        deprecated: false,
      },
      {
        id: crypto.randomUUID(),
        method: "DELETE",
        path: "/vehicles/{vehicleId}",
        operation_id: "deleteVehicle",
        summary: "Archivar o eliminar vehículo",
        description: "Elimina de forma permanente o archiva la ficha del vehículo en el sistema.",
        tags: ["Vehicles"],
        parameters: [
          {
            name: "vehicleId",
            location: "path",
            required: true,
            description: "Identificador único UUID del vehículo a remover",
            schema: { schema_type: "string" },
          },
        ],
        responses: [
          {
            status_code: "204",
            description: "Vehículo removido sin contenido de retorno",
          },
          {
            status_code: "404",
            description: "Vehículo no encontrado",
          },
        ],
        deprecated: false,
      },
      {
        id: crypto.randomUUID(),
        method: "POST",
        path: "/work-orders",
        operation_id: "createWorkOrder",
        summary: "Crear nueva orden de trabajo de mantenimiento",
        description: "Abre una orden de servicio vinculada a un vehículo registrado.",
        tags: ["WorkOrders"],
        parameters: [],
        request_body: {
          description: "Información técnica y tareas de la orden de trabajo",
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/WorkOrder" },
            },
          },
        },
        responses: [
          {
            status_code: "201",
            description: "Orden de trabajo creada con éxito",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/WorkOrder" },
              },
            },
          },
          {
            status_code: "400",
            description: "Vehículo no existente o datos incompletos",
          },
        ],
        deprecated: false,
      },
    ];

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        schemas: sampleSchemas,
        operations: sampleOps,
      },
    };
    onUpdateProject(updatedProject);
    setSelectedIndex(0);
  };

  // Diagnósticos de la operación actual
  const currentOpIssues = useMemo(() => {
    if (!currentOp) return [];
    const escapedPath = currentOp.path.replace(/~/g, "~0").replace(/\//g, "~1");
    const opPrefix = `/paths/${escapedPath}/${currentOp.method.toLowerCase()}`;
    return validationIssues.filter((issue) =>
      issue.location.startsWith(opPrefix) ||
      (issue.rule_id === "STRUCT-002" && issue.message.includes(`'${currentOp.path}'`)) ||
      (issue.rule_id === "STRUCT-006" && currentOp.operation_id && issue.message.includes(`'${currentOp.operation_id}'`))
    );
  }, [currentOp, validationIssues]);

  // Variables de ruta detectadas en la URL
  const pathVariables = currentOp ? extractPathVariables(currentOp.path) : [];
  const declaredPathParams = currentOp
    ? (currentOp.parameters ?? [])
        .filter((p) => p.location === "path")
        .map((p) => p.name)
    : [];
  const missingPathVariables = pathVariables.filter(
    (v) => !declaredPathParams.includes(v)
  );

  // Sincronizar parámetros de ruta faltantes con un clic (DX boost para STRUCT-005)
  const handleSyncPathParameters = () => {
    if (!currentOp || missingPathVariables.length === 0) return;
    const newParams: Parameter[] = missingPathVariables.map((v) => ({
      name: v,
      location: "path",
      required: true,
      description: `Identificador del parámetro de ruta ${v}`,
      schema: { schema_type: "string" },
    }));

    updateCurrentOperation((prev) => ({
      ...prev,
      parameters: [...(prev.parameters ?? []), ...newParams],
    }));
  };

  // Convertir operación actual a OpenAPI 3.1 Paths JSON Preview
  const openApiPathsJson = useMemo(() => {
    if (!currentOp) return "{}";
    const opObj: Record<string, unknown> = {};
    if (currentOp.operation_id) opObj.operationId = currentOp.operation_id;
    if (currentOp.summary) opObj.summary = currentOp.summary;
    if (currentOp.description) opObj.description = currentOp.description;
    if (currentOp.tags && currentOp.tags.length > 0) opObj.tags = currentOp.tags;
    if (currentOp.deprecated) opObj.deprecated = true;

    if (currentOp.parameters && currentOp.parameters.length > 0) {
      opObj.parameters = currentOp.parameters.map((p) => ({
        name: p.name,
        in: p.location,
        required: p.required,
        ...(p.description ? { description: p.description } : {}),
        ...(p.schema ? { schema: p.schema } : {}),
      }));
    }

    if (currentOp.request_body) {
      opObj.requestBody = {
        ...(currentOp.request_body.description
          ? { description: currentOp.request_body.description }
          : {}),
        required: currentOp.request_body.required,
        content: currentOp.request_body.content,
      };
    }

    const responsesObj: Record<string, unknown> = {};
    for (const resp of currentOp.responses ?? []) {
      responsesObj[resp.status_code] = {
        description: resp.description,
        ...(resp.content && Object.keys(resp.content).length > 0
          ? { content: resp.content }
          : {}),
      };
    }
    opObj.responses = responsesObj;

    const fullPathSnippet = {
      paths: {
        [currentOp.path]: {
          [currentOp.method.toLowerCase()]: opObj,
        },
      },
    };

    return JSON.stringify(fullPathSnippet, null, 2);
  }, [currentOp]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(openApiPathsJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        backgroundColor: "var(--bg-app)",
      }}
    >
      {/* =========================================================================
          COLUMNA IZQUIERDA: MASTER LIST DE OPERACIONES
          ========================================================================= */}
      <aside
        style={{
          width: "380px",
          borderRight: "2px solid var(--border-main)",
          backgroundColor: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Cabecera del Master List */}
        <div
          style={{
            padding: "1rem",
            borderBottom: "2px solid var(--border-main)",
            backgroundColor: "var(--bg-app)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.8rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Zap size={16} color="var(--primary)" />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                OPERACIONES REST
              </span>
              <span
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-main)",
                  fontSize: "0.7rem",
                  padding: "0.1rem 0.4rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                }}
              >
                {operations.length}
              </span>
            </div>

            <button
              onClick={() => {
                setNewOpMethod("GET");
                setNewOpPath("/recursos");
                setNewOpError(null);
                setIsNewOpModalOpen(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.35rem 0.65rem",
                backgroundColor: "var(--primary)",
                color: "#000000",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0px 0px #000000",
                fontWeight: 900,
                fontSize: "0.75rem",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              <Plus size={14} strokeWidth={3} />
              NUEVA
            </button>
          </div>

          {/* Buscador */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.5rem",
              backgroundColor: "var(--bg-surface)",
              border: "1.5px solid var(--border-main)",
              marginBottom: "0.6rem",
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por ruta, operationId, tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--text-main)",
                fontSize: "0.75rem",
                outline: "none",
                fontFamily: "var(--font-mono)",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: 0,
                  display: "flex",
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filtros rápidos por Método HTTP */}
          <div
            style={{
              display: "flex",
              gap: "0.3rem",
              overflowX: "auto",
              paddingBottom: "0.2rem",
            }}
          >
            {["ALL", "GET", "POST", "PUT", "DELETE", "PATCH"].map((m) => {
              const isSelected = methodFilter === m;
              return (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  style={{
                    padding: "0.2rem 0.45rem",
                    border: isSelected
                      ? "1.5px solid var(--primary)"
                      : "1.5px solid var(--border-muted)",
                    backgroundColor: isSelected
                      ? "rgba(255, 87, 34, 0.15)"
                      : "transparent",
                    color: isSelected ? "var(--primary)" : "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Filtro por Tags (si existen) */}
          {allTags.length > 0 && (
            <div
              style={{
                marginTop: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
              }}
            >
              <Filter size={12} color="var(--text-muted)" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-main)",
                  border: "1px solid var(--border-main)",
                  fontSize: "0.7rem",
                  fontFamily: "var(--font-mono)",
                  padding: "0.15rem 0.3rem",
                  width: "100%",
                }}
              >
                <option value="ALL">Todos los tags ({allTags.length})</option>
                {allTags.map((t) => (
                  <option key={t} value={t}>
                    Tag: {t}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Lista de Operaciones */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {operations.length === 0 ? (
            <div
              style={{
                padding: "2rem 1rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              <Zap size={32} color="var(--border-muted)" style={{ margin: "0 auto 1rem" }} />
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: "0.8rem",
                  marginBottom: "0.5rem",
                }}
              >
                SIN ENDPOINTS DECLARADOS
              </div>
              <p style={{ fontSize: "0.75rem", lineHeight: 1.5, marginBottom: "1.2rem" }}>
                Comienza creando tu primera operación REST o carga el conjunto de ejemplo de taller mecánico.
              </p>
              <button
                onClick={handleLoadSampleOperations}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 0.8rem",
                  backgroundColor: "var(--accent-citron)",
                  color: "#000000",
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px 0px #000000",
                  fontWeight: 900,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <Sparkles size={14} />
                CARGAR EJEMPLO (VEHICLES API)
              </button>
            </div>
          ) : filteredOperationsWithIndex.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
              <p style={{ fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
                No se encontraron operaciones con los filtros actuales.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {filteredOperationsWithIndex.map(({ op, idx }) => {
                const isSelected = idx === selectedIndex;
                const badgeStyle = getMethodBadgeStyle(op.method);

                // Detectar si esta operación particular tiene diagnósticos
                const escaped = op.path.replace(/~/g, "~0").replace(/\//g, "~1");
                const prefix = `/paths/${escaped}/${op.method.toLowerCase()}`;
                const hasIssues = validationIssues.some(
                  (iss) =>
                    iss.location.startsWith(prefix) ||
                    (iss.rule_id === "STRUCT-002" && iss.message.includes(`'${op.path}'`)) ||
                    (iss.rule_id === "STRUCT-006" && op.operation_id && iss.message.includes(`'${op.operation_id}'`))
                );

                return (
                  <div
                    key={`${op.method}-${op.path}-${idx}`}
                    onClick={() => setSelectedIndex(idx)}
                    style={{
                      padding: "0.6rem 0.75rem",
                      backgroundColor: isSelected ? "var(--bg-app)" : "var(--bg-surface)",
                      border: isSelected ? "2px solid var(--primary)" : "1.5px solid var(--border-main)",
                      boxShadow: isSelected ? "3px 3px 0px 0px var(--primary)" : "none",
                      cursor: "pointer",
                      transition: "background-color 0.1s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.65rem",
                            fontWeight: 900,
                            padding: "0.15rem 0.4rem",
                            border: `1px solid ${badgeStyle.border}`,
                            color: badgeStyle.color,
                            backgroundColor: badgeStyle.bg,
                            letterSpacing: "0.05em",
                          }}
                        >
                          {op.method}
                        </span>
                        {op.deprecated && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.6rem",
                              color: "var(--text-muted)",
                              textDecoration: "line-through",
                            }}
                          >
                            DEPRECATED
                          </span>
                        )}
                        {op.security !== undefined && (
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.6rem",
                              color: op.security.length === 0 ? "var(--text-muted)" : "var(--primary)",
                              backgroundColor: "var(--bg-app)",
                              border: `1px solid ${op.security.length === 0 ? "var(--border-muted)" : "var(--primary)"}`,
                              padding: "0.1rem 0.35rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.2rem",
                              fontWeight: 700,
                            }}
                            title={
                              op.security.length === 0
                                ? "Operación pública (sin autenticación)"
                                : `Requiere: ${op.security.map((s) => Object.keys(s).join(", ")).join("; ")}`
                            }
                          >
                            {op.security.length === 0 ? <Unlock size={10} /> : <Lock size={10} />}
                            {op.security.length === 0 ? "PÚBLICO" : "AUTH"}
                          </span>
                        )}
                      </div>

                      {hasIssues && (
                        <div title="Esta operación contiene observaciones estructurales">
                          <AlertTriangle size={14} color="var(--primary)" />
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8rem",
                        fontWeight: 700,
                        color: "var(--text-main)",
                        wordBreak: "break-all",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {op.path}
                    </div>

                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {op.summary || op.operation_id || "(Sin resumen descriptivo)"}
                    </div>

                    {op.tags && op.tags.length > 0 && (
                      <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                        {op.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: "0.6rem",
                              fontFamily: "var(--font-mono)",
                              padding: "0.05rem 0.3rem",
                              backgroundColor: "var(--border-muted)",
                              color: "var(--text-main)",
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botón inferior para cargar ejemplo si ya hay operaciones */}
        {operations.length > 0 && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderTop: "2px solid var(--border-main)",
              backgroundColor: "var(--bg-app)",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              onClick={handleLoadSampleOperations}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                width: "100%",
                justifyContent: "center",
                padding: "0.45rem",
                backgroundColor: "transparent",
                border: "1.5px dashed var(--border-strong)",
                color: "var(--text-main)",
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Sparkles size={13} color="var(--accent-citron)" />
              RECARGAR EJEMPLO (VEHICLES REST API)
            </button>
          </div>
        )}
      </aside>

      {/* =========================================================================
          COLUMNA DERECHA: DETALLE / EDITOR DE OPERACIÓN
          ========================================================================= */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!currentOp ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              color: "var(--text-muted)",
            }}
          >
            <Zap size={48} color="var(--border-muted)" style={{ marginBottom: "1rem" }} />
            <h3 style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 800 }}>
              SELECCIONA O CREA UNA OPERACIÓN
            </h3>
            <p style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
              Selecciona una operación de la barra izquierda para configurar parámetros, cuerpos y respuestas.
            </p>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
            {/* Header del Editor de Operación */}
            <div
              style={{
                padding: "1.2rem 1.8rem",
                borderBottom: "2px solid var(--border-main)",
                backgroundColor: "var(--bg-surface)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              {/* Selector de Método y Campo de Ruta */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: "300px" }}>
                <select
                  value={currentOp.method}
                  onChange={(e) => {
                    const newM = e.target.value as HttpMethod;
                    updateCurrentOperation((prev) => ({ ...prev, method: newM }));
                  }}
                  style={{
                    padding: "0.5rem 0.8rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    backgroundColor: getMethodBadgeStyle(currentOp.method).bg,
                    color: getMethodBadgeStyle(currentOp.method).color,
                    border: `2px solid ${getMethodBadgeStyle(currentOp.method).border}`,
                    cursor: "pointer",
                  }}
                >
                  {HTTP_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <div style={{ flex: 1, position: "relative" }}>
                  <input
                    type="text"
                    value={currentOp.path}
                    onChange={(e) => {
                      const newP = e.target.value;
                      updateCurrentOperation((prev) => ({ ...prev, path: newP }));
                    }}
                    placeholder="/ruta/{parametro}"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.8rem",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      border: "2px solid var(--border-main)",
                    }}
                  />
                </div>
              </div>

              {/* Botones de acción del endpoint */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <button
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.75rem",
                    backgroundColor: "transparent",
                    color: "var(--text-main)",
                    border: "1.5px solid var(--border-main)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Code2 size={14} color="var(--primary)" />
                  OPENAPI JSON
                </button>

                <button
                  onClick={() => setDeleteConfirmIndex(selectedIndex)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.75rem",
                    backgroundColor: "rgba(255, 23, 68, 0.1)",
                    color: "#ff1744",
                    border: "1.5px solid #ff1744",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={14} />
                  ELIMINAR
                </button>
              </div>
            </div>

            {/* Banner de Diagnósticos si aplican a este endpoint */}
            {currentOpIssues.length > 0 && (
              <div
                style={{
                  margin: "1rem 1.8rem 0",
                  padding: "0.8rem 1rem",
                  backgroundColor: "rgba(255, 87, 34, 0.1)",
                  border: "2px solid var(--primary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <AlertTriangle size={16} color="var(--primary)" />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      color: "var(--primary)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    OBSERVACIONES ESTRUCTURALES DEL ENDPOINT ({currentOpIssues.length})
                  </span>
                </div>
                {currentOpIssues.map((iss) => (
                  <div
                    key={iss.id}
                    style={{
                      fontSize: "0.75rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.4rem",
                      color: "var(--text-main)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        color: "var(--primary)",
                      }}
                    >
                      [{iss.rule_id}]:
                    </span>
                    <span>{iss.message}</span>
                    {iss.suggestion && (
                      <span style={{ color: "var(--text-muted)" }}>({iss.suggestion})</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Aviso de variables de ruta no declaradas como parámetros (STRUCT-004 / STRUCT-005) */}
            {missingPathVariables.length > 0 && (
              <div
                style={{
                  margin: "1rem 1.8rem 0",
                  padding: "0.8rem 1rem",
                  backgroundColor: "rgba(212, 255, 0, 0.08)",
                  border: "2px solid var(--accent-citron)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <AlertTriangle size={16} color="var(--accent-citron)" />
                  <div style={{ fontSize: "0.75rem" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                      Variables en URL sin parámetro declarado:{" "}
                    </span>
                    {missingPathVariables.map((v) => (
                      <span
                        key={v}
                        style={{
                          backgroundColor: "#000000",
                          color: "var(--accent-citron)",
                          padding: "0.1rem 0.35rem",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          marginRight: "0.3rem",
                        }}
                      >
                        {`{${v}}`}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSyncPathParameters}
                  style={{
                    padding: "0.35rem 0.65rem",
                    backgroundColor: "var(--accent-citron)",
                    color: "#000000",
                    border: "1.5px solid #000000",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 900,
                    fontSize: "0.7rem",
                    cursor: "pointer",
                  }}
                >
                  SINCRONIZAR PARÁMETROS
                </button>
              </div>
            )}

            {/* Contenedor con Secciones de Configuración */}
            <div style={{ padding: "1.5rem 1.8rem 24rem 1.8rem", display: "flex", flexDirection: "column", gap: "1.8rem" }}>
              {/* SECCIÓN 1: METADATOS BÁSICOS */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-main)",
                  padding: "1.2rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    color: "var(--primary)",
                    letterSpacing: "0.1em",
                    marginBottom: "0.8rem",
                  }}
                >
                  // 01. METADATOS OPERACIONALES
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        marginBottom: "0.3rem",
                      }}
                    >
                      OPERATION ID (ÚNICO)
                    </label>
                    <input
                      type="text"
                      value={currentOp.operation_id ?? ""}
                      onChange={(e) =>
                        updateCurrentOperation((prev) => ({
                          ...prev,
                          operation_id: e.target.value.trim() ? e.target.value.trim() : undefined,
                        }))
                      }
                      placeholder="ej. getVehicleById"
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        backgroundColor: "var(--bg-app)",
                        border: "1.5px solid var(--border-main)",
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        display: "block",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        marginBottom: "0.3rem",
                      }}
                    >
                      RESUMEN EJECUTIVO (SUMMARY)
                    </label>
                    <input
                      type="text"
                      value={currentOp.summary ?? ""}
                      onChange={(e) =>
                        updateCurrentOperation((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
                      }
                      placeholder="ej. Consultar datos de vehículo por ID"
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.6rem",
                        backgroundColor: "var(--bg-app)",
                        border: "1.5px solid var(--border-main)",
                        color: "var(--text-main)",
                        fontSize: "0.8rem",
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      marginBottom: "0.3rem",
                    }}
                  >
                    DESCRIPCIÓN DETALLADA
                  </label>
                  <textarea
                    rows={2}
                    value={currentOp.description ?? ""}
                    onChange={(e) =>
                      updateCurrentOperation((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Documentación de comportamiento, condiciones de uso y efectos..."
                    style={{
                      width: "100%",
                      padding: "0.45rem 0.6rem",
                      backgroundColor: "var(--bg-app)",
                      border: "1.5px solid var(--border-main)",
                      color: "var(--text-main)",
                      fontSize: "0.8rem",
                      lineHeight: 1.4,
                    }}
                  />
                </div>

                {/* Tags y Deprecated */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: 1 }}>
                    <TagIcon size={14} color="var(--text-muted)" />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 800 }}>
                      TAGS:
                    </span>
                    {(currentOp.tags ?? []).map((t, tIdx) => (
                      <span
                        key={t}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          backgroundColor: "var(--bg-app)",
                          border: "1px solid var(--border-main)",
                          padding: "0.15rem 0.45rem",
                          fontSize: "0.7rem",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        #{t}
                        <button
                          onClick={() => {
                            const newTags = (currentOp.tags ?? []).filter((_, i) => i !== tIdx);
                            updateCurrentOperation((prev) => ({ ...prev, tags: newTags }));
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                          }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}

                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <input
                        type="text"
                        placeholder="+ tag"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newTagInput.trim()) {
                            e.preventDefault();
                            const val = newTagInput.trim();
                            if (!(currentOp.tags ?? []).includes(val)) {
                              updateCurrentOperation((prev) => ({
                                ...prev,
                                tags: [...(prev.tags ?? []), val],
                              }));
                            }
                            setNewTagInput("");
                          }
                        }}
                        style={{
                          width: "90px",
                          padding: "0.2rem 0.4rem",
                          fontSize: "0.7rem",
                          fontFamily: "var(--font-mono)",
                          backgroundColor: "var(--bg-app)",
                          border: "1px dashed var(--border-main)",
                          color: "var(--text-main)",
                        }}
                      />
                    </div>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={currentOp.deprecated ?? false}
                      onChange={(e) =>
                        updateCurrentOperation((prev) => ({
                          ...prev,
                          deprecated: e.target.checked,
                        }))
                      }
                      style={{ cursor: "pointer", accentColor: "var(--primary)" }}
                    />
                    MARCAR COMO OBSOLETA (DEPRECATED)
                  </label>
                </div>
              </div>

              {/* SECCIÓN 2: PARÁMETROS (FR-006) */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-main)",
                  padding: "1.2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      color: "var(--primary)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    // 02. PARÁMETROS DE SOLICITUD
                  </div>

                  <button
                    onClick={() => {
                      const newP: Parameter = {
                        name: "nuevoParametro",
                        location: "query",
                        required: false,
                        description: "",
                        schema: { schema_type: "string" },
                      };
                      updateCurrentOperation((prev) => ({
                        ...prev,
                        parameters: [...(prev.parameters ?? []), newP],
                      }));
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.3rem 0.6rem",
                      backgroundColor: "var(--bg-app)",
                      border: "1.5px solid var(--border-strong)",
                      color: "var(--text-main)",
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <Plus size={12} strokeWidth={3} />
                    AÑADIR PARÁMETRO
                  </button>
                </div>

                {(!currentOp.parameters || currentOp.parameters.length === 0) ? (
                  <div
                    style={{
                      padding: "1.2rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      border: "1px dashed var(--border-main)",
                    }}
                  >
                    No se han definido parámetros para esta operación.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {currentOp.parameters.map((param, pIdx) => {
                      const isPathVariable = param.location === "path";

                      return (
                        <div
                          key={`param-${pIdx}`}
                          style={{
                            padding: "0.8rem",
                            backgroundColor: "var(--bg-app)",
                            border: "1px solid var(--border-main)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.6rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                            {/* Nombre del parámetro */}
                            <div style={{ flex: 1, minWidth: "140px" }}>
                              <input
                                type="text"
                                value={param.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateCurrentOperation((prev) => {
                                    const next = [...(prev.parameters ?? [])];
                                    next[pIdx] = { ...next[pIdx], name: val };
                                    return { ...prev, parameters: next };
                                  });
                                }}
                                placeholder="Nombre del parámetro"
                                style={{
                                  width: "100%",
                                  padding: "0.35rem 0.5rem",
                                  backgroundColor: "var(--bg-surface)",
                                  border: "1px solid var(--border-main)",
                                  color: "var(--text-main)",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                }}
                              />
                            </div>

                            {/* Ubicación: path, query, header, cookie */}
                            <select
                              value={param.location}
                              onChange={(e) => {
                                const loc = e.target.value as ParameterLocation;
                                updateCurrentOperation((prev) => {
                                  const next = [...(prev.parameters ?? [])];
                                  next[pIdx] = {
                                    ...next[pIdx],
                                    location: loc,
                                    // Los parámetros de ruta deben ser obligatorios (OpenAPI 3.1)
                                    required: loc === "path" ? true : next[pIdx].required,
                                  };
                                  return { ...prev, parameters: next };
                                });
                              }}
                              style={{
                                padding: "0.35rem 0.5rem",
                                backgroundColor: "var(--bg-surface)",
                                border: "1px solid var(--border-main)",
                                color: "var(--text-main)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                              }}
                            >
                              {PARAM_LOCATIONS.map((loc) => (
                                <option key={loc} value={loc}>
                                  in: {loc}
                                </option>
                              ))}
                            </select>

                            {/* Tipo de dato del esquema */}
                            <select
                              value={
                                param.schema?.$ref
                                  ? `ref:${param.schema.$ref}`
                                  : param.schema?.schema_type ?? "string"
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCurrentOperation((prev) => {
                                  const next = [...(prev.parameters ?? [])];
                                  if (val.startsWith("ref:")) {
                                    const refPath = val.replace("ref:", "");
                                    next[pIdx] = {
                                      ...next[pIdx],
                                      schema: { $ref: refPath },
                                    };
                                  } else {
                                    next[pIdx] = {
                                      ...next[pIdx],
                                      schema: { schema_type: val as any },
                                    };
                                  }
                                  return { ...prev, parameters: next };
                                });
                              }}
                              style={{
                                padding: "0.35rem 0.5rem",
                                backgroundColor: "var(--bg-surface)",
                                border: "1px solid var(--border-main)",
                                color: "var(--text-main)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.75rem",
                              }}
                            >
                              <optgroup label="Tipos Primitivos">
                                <option value="string">string</option>
                                <option value="integer">integer</option>
                                <option value="number">number</option>
                                <option value="boolean">boolean</option>
                              </optgroup>
                              {schemaNames.length > 0 && (
                                <optgroup label="Referencias a Esquemas ($ref)">
                                  {schemaNames.map((s) => (
                                    <option
                                      key={s}
                                      value={`ref:#/components/schemas/${s}`}
                                    >
                                      $ref: {s}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>

                            {/* Required checkbox */}
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                fontSize: "0.7rem",
                                fontFamily: "var(--font-mono)",
                                cursor: isPathVariable ? "not-allowed" : "pointer",
                                opacity: isPathVariable ? 0.8 : 1,
                              }}
                              title={
                                isPathVariable
                                  ? "Los parámetros de ruta siempre deben ser obligatorios (OpenAPI 3.1)"
                                  : undefined
                              }
                            >
                              <input
                                type="checkbox"
                                checked={param.required}
                                disabled={isPathVariable}
                                onChange={(e) => {
                                  const req = e.target.checked;
                                  updateCurrentOperation((prev) => {
                                    const next = [...(prev.parameters ?? [])];
                                    next[pIdx] = { ...next[pIdx], required: req };
                                    return { ...prev, parameters: next };
                                  });
                                }}
                                style={{ accentColor: "var(--primary)" }}
                              />
                              REQ
                            </label>

                            {/* Botón eliminar parámetro */}
                            <button
                              onClick={() => {
                                updateCurrentOperation((prev) => ({
                                  ...prev,
                                  parameters: (prev.parameters ?? []).filter(
                                    (_, i) => i !== pIdx
                                  ),
                                }));
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "0.2rem",
                                display: "flex",
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Descripción del parámetro */}
                          <input
                            type="text"
                            value={param.description ?? ""}
                            onChange={(e) => {
                              const desc = e.target.value;
                              updateCurrentOperation((prev) => {
                                const next = [...(prev.parameters ?? [])];
                                next[pIdx] = {
                                  ...next[pIdx],
                                  description: desc ? desc : undefined,
                                };
                                return { ...prev, parameters: next };
                              });
                            }}
                            placeholder="Descripción del parámetro (opcional)..."
                            style={{
                              width: "100%",
                              padding: "0.3rem 0.5rem",
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border-muted)",
                              color: "var(--text-main)",
                              fontSize: "0.7rem",
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN 3: CUERPO DE SOLICITUD (REQUEST BODY - FR-007) */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-main)",
                  padding: "1.2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      color: "var(--primary)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    // 03. CUERPO DE SOLICITUD (REQUEST BODY)
                  </div>

                  <button
                    onClick={() => {
                      if (currentOp.request_body) {
                        updateCurrentOperation((prev) => ({
                          ...prev,
                          request_body: undefined,
                        }));
                      } else {
                        updateCurrentOperation((prev) => ({
                          ...prev,
                          request_body: {
                            description: "Datos de entrada",
                            required: true,
                            content: {
                              "application/json": {
                                schema:
                                  schemaNames.length > 0
                                    ? { $ref: `#/components/schemas/${schemaNames[0]}` }
                                    : { schema_type: "object" },
                              },
                            },
                          },
                        }));
                      }
                    }}
                    style={{
                      padding: "0.3rem 0.6rem",
                      backgroundColor: currentOp.request_body
                        ? "rgba(255, 23, 68, 0.1)"
                        : "var(--bg-app)",
                      border: currentOp.request_body
                        ? "1.5px solid #ff1744"
                        : "1.5px solid var(--border-strong)",
                      color: currentOp.request_body ? "#ff1744" : "var(--text-main)",
                      fontSize: "0.7rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    {currentOp.request_body
                      ? "DESHABILITAR CUERPO"
                      : "+ HABILITAR REQUEST BODY"}
                  </button>
                </div>

                {!currentOp.request_body ? (
                  <div
                    style={{
                      padding: "1.2rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      border: "1px dashed var(--border-main)",
                    }}
                  >
                    Esta operación no requiere cuerpo de solicitud (común en GET y DELETE).
                  </div>
                ) : (
                  <div
                    style={{
                      backgroundColor: "var(--bg-app)",
                      border: "1px solid var(--border-main)",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.8rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={currentOp.request_body.required}
                          onChange={(e) => {
                            const req = e.target.checked;
                            updateCurrentOperation((prev) => ({
                              ...prev,
                              request_body: prev.request_body
                                ? { ...prev.request_body, required: req }
                                : undefined,
                            }));
                          }}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        CUERPO DE SOLICITUD OBLIGATORIO (REQUIRED)
                      </label>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          marginBottom: "0.25rem",
                        }}
                      >
                        DESCRIPCIÓN DEL PAYLOAD
                      </label>
                      <input
                        type="text"
                        value={currentOp.request_body.description ?? ""}
                        onChange={(e) => {
                          const desc = e.target.value;
                          updateCurrentOperation((prev) => ({
                            ...prev,
                            request_body: prev.request_body
                              ? { ...prev.request_body, description: desc }
                              : undefined,
                          }));
                        }}
                        placeholder="ej. Especificación del recurso en formato JSON"
                        style={{
                          width: "100%",
                          padding: "0.35rem 0.5rem",
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--border-main)",
                          color: "var(--text-main)",
                          fontSize: "0.75rem",
                        }}
                      />
                    </div>

                    {/* Media Type y Esquema asociado */}
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.7rem",
                          fontWeight: 800,
                          marginBottom: "0.4rem",
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span>MEDIA TYPE Y ESQUEMA:</span>
                      </div>

                      {Object.entries(currentOp.request_body.content).map(
                        ([mediaType, mediaDef]) => {
                          return (
                            <div
                              key={mediaType}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                padding: "0.6rem",
                                backgroundColor: "var(--bg-surface)",
                                border: "1px solid var(--border-main)",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                  color: "var(--accent-citron)",
                                }}
                              >
                                {mediaType}
                              </span>

                              <ArrowRight size={14} color="var(--text-muted)" />

                              <select
                                value={
                                  mediaDef.schema?.$ref
                                    ? `ref:${mediaDef.schema.$ref}`
                                    : mediaDef.schema?.schema_type ?? "object"
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateCurrentOperation((prev) => {
                                    if (!prev.request_body) return prev;
                                    const nextContent = { ...prev.request_body.content };
                                    if (val.startsWith("ref:")) {
                                      const refTarget = val.replace("ref:", "");
                                      nextContent[mediaType] = {
                                        ...mediaDef,
                                        schema: { $ref: refTarget },
                                      };
                                    } else {
                                      nextContent[mediaType] = {
                                        ...mediaDef,
                                        schema: { schema_type: val as any },
                                      };
                                    }
                                    return {
                                      ...prev,
                                      request_body: {
                                        ...prev.request_body,
                                        content: nextContent,
                                      },
                                    };
                                  });
                                }}
                                style={{
                                  flex: 1,
                                  padding: "0.35rem 0.5rem",
                                  backgroundColor: "var(--bg-app)",
                                  border: "1px solid var(--border-main)",
                                  color: "var(--text-main)",
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <optgroup label="Esquemas Reutilizables ($ref)">
                                  {schemaNames.length === 0 ? (
                                    <option disabled value="">
                                      (No hay esquemas creados en components/schemas)
                                    </option>
                                  ) : (
                                    schemaNames.map((s) => (
                                      <option
                                        key={s}
                                        value={`ref:#/components/schemas/${s}`}
                                      >
                                        $ref: #/components/schemas/{s}
                                      </option>
                                    ))
                                  )}
                                </optgroup>
                                <optgroup label="Tipos Genéricos / Inline">
                                  <option value="object">object (inline)</option>
                                  <option value="array">array (inline)</option>
                                  <option value="string">string</option>
                                </optgroup>
                              </select>

                              {schemaNames.length === 0 && (
                                <button
                                  onClick={onNavigateToSchemas}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    padding: "0.3rem 0.5rem",
                                    backgroundColor: "var(--primary)",
                                    color: "#000000",
                                    border: "1px solid #000000",
                                    fontSize: "0.65rem",
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                  }}
                                >
                                  CREAR ESQUEMA
                                  <ExternalLink size={10} />
                                </button>
                              )}
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 4: RESPUESTAS HTTP (RESPONSES - FR-007) */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-main)",
                  padding: "1.2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.8rem",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.7rem",
                      fontWeight: 900,
                      color: "var(--primary)",
                      letterSpacing: "0.1em",
                    }}
                  >
                    // 04. RESPUESTAS HTTP Y ESQUEMAS ASOCIADOS
                  </div>

                  {/* Botones de adición rápida de códigos de estado */}
                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                    {["200", "201", "204", "400", "404", "500"].map((statusCode) => {
                      const alreadyAdded = (currentOp.responses ?? []).some(
                        (r) => r.status_code === statusCode
                      );
                      if (alreadyAdded) return null;

                      const preset = COMMON_STATUS_CODES.find(
                        (c) => c.code === statusCode
                      );

                      return (
                        <button
                          key={statusCode}
                          onClick={() => {
                            const newResp: ResponseDefinition = {
                              status_code: statusCode,
                              description: preset ? preset.desc : "Respuesta",
                              content:
                                statusCode === "204"
                                  ? {}
                                  : {
                                      "application/json": {
                                        schema:
                                          schemaNames.length > 0
                                            ? {
                                                $ref: `#/components/schemas/${schemaNames[0]}`,
                                              }
                                            : { schema_type: "object" },
                                      },
                                    },
                            };
                            updateCurrentOperation((prev) => ({
                              ...prev,
                              responses: [...(prev.responses ?? []), newResp],
                            }));
                          }}
                          style={{
                            padding: "0.2rem 0.45rem",
                            backgroundColor: "var(--bg-app)",
                            border: "1px solid var(--border-main)",
                            color: "var(--text-main)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          + {statusCode}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => {
                        const newResp: ResponseDefinition = {
                          status_code: "200",
                          description: "Respuesta exitosa",
                          content: {
                            "application/json": {},
                          },
                        };
                        updateCurrentOperation((prev) => ({
                          ...prev,
                          responses: [...(prev.responses ?? []), newResp],
                        }));
                      }}
                      style={{
                        padding: "0.2rem 0.45rem",
                        backgroundColor: "var(--primary)",
                        color: "#000000",
                        border: "1px solid #000000",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.65rem",
                        fontWeight: 900,
                        cursor: "pointer",
                      }}
                    >
                      + PERSONALIZADA
                    </button>
                  </div>
                </div>

                {(!currentOp.responses || currentOp.responses.length === 0) ? (
                  <div
                    style={{
                      padding: "1.2rem",
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      border: "1px dashed var(--border-main)",
                    }}
                  >
                    Al menos una respuesta HTTP (ej. 200) debe ser configurada por OpenAPI.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                    {currentOp.responses.map((resp, rIdx) => {
                      const is2xx = resp.status_code.startsWith("2");
                      const is4xx = resp.status_code.startsWith("4");
                      const is5xx = resp.status_code.startsWith("5");
                      const statusColor = is2xx
                        ? "#00ff66"
                        : is4xx
                        ? "#ff9100"
                        : is5xx
                        ? "#ff1744"
                        : "var(--text-main)";

                      const jsonMedia = resp.content?.["application/json"];

                      return (
                        <div
                          key={`resp-${rIdx}`}
                          style={{
                            padding: "0.8rem 1rem",
                            backgroundColor: "var(--bg-app)",
                            border: `1.5px solid ${is2xx ? "var(--border-main)" : "var(--border-muted)"}`,
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.6rem",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                              <span
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "0.8rem",
                                  fontWeight: 900,
                                  color: statusColor,
                                  backgroundColor: "rgba(0,0,0,0.3)",
                                  border: `1px solid ${statusColor}`,
                                  padding: "0.15rem 0.45rem",
                                }}
                              >
                                {resp.status_code}
                              </span>

                              <input
                                type="text"
                                value={resp.description}
                                onChange={(e) => {
                                  const desc = e.target.value;
                                  updateCurrentOperation((prev) => {
                                    const next = [...(prev.responses ?? [])];
                                    next[rIdx] = { ...next[rIdx], description: desc };
                                    return { ...prev, responses: next };
                                  });
                                }}
                                placeholder="Descripción de la respuesta (obligatoria por OpenAPI)..."
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  backgroundColor: "var(--bg-surface)",
                                  border: "1px solid var(--border-main)",
                                  color: "var(--text-main)",
                                  fontSize: "0.75rem",
                                  width: "320px",
                                }}
                              />
                            </div>

                            <button
                              onClick={() => {
                                updateCurrentOperation((prev) => ({
                                  ...prev,
                                  responses: (prev.responses ?? []).filter(
                                    (_, i) => i !== rIdx
                                  ),
                                }));
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "0.2rem",
                                display: "flex",
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Vinculación de Esquema Reutilizable en Respuesta */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.6rem",
                              backgroundColor: "var(--bg-surface)",
                              padding: "0.45rem 0.6rem",
                              border: "1px solid var(--border-muted)",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.7rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              SCHEMA (application/json):
                            </span>

                            <select
                              value={
                                jsonMedia?.schema?.$ref
                                  ? `ref:${jsonMedia.schema.$ref}`
                                  : jsonMedia?.schema?.schema_type === "array" &&
                                    jsonMedia?.schema?.items?.$ref
                                  ? `array_ref:${jsonMedia.schema.items.$ref}`
                                  : jsonMedia?.schema?.schema_type ?? "none"
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCurrentOperation((prev) => {
                                  const next = [...(prev.responses ?? [])];
                                  if (val === "none") {
                                    next[rIdx] = {
                                      ...next[rIdx],
                                      content: {},
                                    };
                                  } else if (val.startsWith("ref:")) {
                                    const refPath = val.replace("ref:", "");
                                    next[rIdx] = {
                                      ...next[rIdx],
                                      content: {
                                        "application/json": {
                                          schema: { $ref: refPath },
                                        },
                                      },
                                    };
                                  } else if (val.startsWith("array_ref:")) {
                                    const refPath = val.replace("array_ref:", "");
                                    next[rIdx] = {
                                      ...next[rIdx],
                                      content: {
                                        "application/json": {
                                          schema: {
                                            schema_type: "array",
                                            items: { $ref: refPath },
                                          },
                                        },
                                      },
                                    };
                                  } else {
                                    next[rIdx] = {
                                      ...next[rIdx],
                                      content: {
                                        "application/json": {
                                          schema: { schema_type: val as any },
                                        },
                                      },
                                    };
                                  }
                                  return { ...prev, responses: next };
                                });
                              }}
                              style={{
                                flex: 1,
                                padding: "0.25rem 0.45rem",
                                backgroundColor: "var(--bg-app)",
                                border: "1px solid var(--border-main)",
                                color: "var(--text-main)",
                                fontFamily: "var(--font-mono)",
                                fontSize: "0.7rem",
                              }}
                            >
                              <option value="none">(Sin cuerpo de respuesta - ej. 204)</option>
                              {schemaNames.length > 0 && (
                                <optgroup label="Esquema Reutilizable Directo">
                                  {schemaNames.map((s) => (
                                    <option
                                      key={s}
                                      value={`ref:#/components/schemas/${s}`}
                                    >
                                      $ref: #/components/schemas/{s}
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              {schemaNames.length > 0 && (
                                <optgroup label="Arreglo de Esquemas (Listado)">
                                  {schemaNames.map((s) => (
                                    <option
                                      key={`arr-${s}`}
                                      value={`array_ref:#/components/schemas/${s}`}
                                    >
                                      Array &lt;$ref: {s}&gt;
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                              <optgroup label="Tipos Primitivos / Genéricos">
                                <option value="object">object (inline)</option>
                                <option value="string">string</option>
                                <option value="boolean">boolean</option>
                              </optgroup>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* =================================================================
                  SECCIÓN 5: REQUISITOS DE SEGURIDAD (SECURITY)
                  ================================================================= */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "3px 3px 0px 0px var(--border-strong)",
                  padding: "1.2rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.7rem",
                        color: "var(--primary)",
                        fontWeight: 900,
                        letterSpacing: "0.06em",
                        marginBottom: "0.2rem",
                      }}
                    >
                      // 05. AUTENTICACIÓN Y SEGURIDAD (SECURITY)
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 900,
                        fontSize: "0.95rem",
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                      }}
                    >
                      Requisitos de Seguridad de la Operación
                    </h3>
                  </div>

                  {onNavigateToSecurity && (
                    <button
                      onClick={onNavigateToSecurity}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.35rem 0.65rem",
                        backgroundColor: "var(--bg-app)",
                        border: "1px solid var(--border-strong)",
                        color: "var(--primary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      <Shield size={12} />
                      GESTIONAR ESQUEMAS ↗
                    </button>
                  )}
                </div>

                {/* Modos de Seguridad */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <div style={{ display: "flex", gap: "1.2rem", flexWrap: "wrap" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="op-security-mode"
                        checked={currentOp.security === undefined}
                        onChange={() => {
                          updateCurrentOperation((prev) => {
                            const next = { ...prev };
                            delete next.security;
                            return next;
                          });
                        }}
                      />
                      <span>
                        <strong>Heredar Seguridad Global</strong>{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                          ({globalSecurity.length > 0 ? "Aplica los esquemas configurados a nivel de contrato" : "Sin seguridad global requerida"})
                        </span>
                      </span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="op-security-mode"
                        checked={Array.isArray(currentOp.security) && currentOp.security.length === 0}
                        onChange={() => {
                          updateCurrentOperation((prev) => ({
                            ...prev,
                            security: [],
                          }));
                        }}
                      />
                      <span>
                        <strong>Público</strong>{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                          (Exento de autenticación, security: [])
                        </span>
                      </span>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8rem",
                      }}
                    >
                      <input
                        type="radio"
                        name="op-security-mode"
                        checked={Array.isArray(currentOp.security) && currentOp.security.length > 0}
                        onChange={() => {
                          const firstScheme = securitySchemeNames[0];
                          updateCurrentOperation((prev) => ({
                            ...prev,
                            security: firstScheme ? [{ [firstScheme]: [] }] : [],
                          }));
                        }}
                      />
                      <span>
                        <strong>Requisitos Específicos</strong>{" "}
                        <span style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
                          (Sobrescribe con esquemas puntuales)
                        </span>
                      </span>
                    </label>
                  </div>

                  {/* Panel de selección cuando es Requisitos Específicos */}
                  {Array.isArray(currentOp.security) && currentOp.security.length > 0 && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.85rem",
                        backgroundColor: "var(--bg-app)",
                        border: "1px dashed var(--border-strong)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 800,
                          marginBottom: "0.5rem",
                          color: "var(--primary)",
                        }}
                      >
                        SELECCIONA LOS ESQUEMAS DE AUTENTICACIÓN REQUERIDOS:
                      </div>

                      {securitySchemeNames.length === 0 ? (
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontFamily: "var(--font-mono)" }}>
                          No hay esquemas definidos en components.securitySchemes.
                          {onNavigateToSecurity && (
                            <button
                              onClick={onNavigateToSecurity}
                              style={{
                                marginLeft: "0.6rem",
                                color: "var(--primary)",
                                background: "none",
                                border: "none",
                                textDecoration: "underline",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              Configurar en Autenticación ↗
                            </button>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem" }}>
                          {securitySchemeNames.map((sName) => {
                            const isChecked = currentOp.security?.some((req) => sName in req) ?? false;
                            const schemeDef = securitySchemes[sName];

                            return (
                              <label
                                key={sName}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.45rem",
                                  padding: "0.35rem 0.65rem",
                                  backgroundColor: "var(--bg-surface)",
                                  border: `1.5px solid ${isChecked ? "var(--primary)" : "var(--border-subtle)"}`,
                                  cursor: "pointer",
                                  fontSize: "0.78rem",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    updateCurrentOperation((prev) => {
                                      const currentList = prev.security ?? [];
                                      let nextList: Array<Record<string, string[]>>;
                                      if (checked) {
                                        nextList = [...currentList, { [sName]: [] }];
                                      } else {
                                        nextList = currentList.filter((req) => !(sName in req));
                                      }
                                      return { ...prev, security: nextList };
                                    });
                                  }}
                                />
                                <span style={{ fontWeight: 800 }}>{sName}</span>
                                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>
                                  ({schemeDef.type === "http" ? `${schemeDef.scheme} ${schemeDef.bearerFormat || ""}` : schemeDef.type})
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: NUEVA OPERACIÓN (FR-005)
          ========================================================================= */}
      {isNewOpModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--border-strong)",
              boxShadow: "6px 6px 0px 0px var(--border-strong)",
              width: "480px",
              padding: "1.6rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Zap size={18} color="var(--primary)" />
                <h3
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 900,
                    fontSize: "0.95rem",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  NUEVA OPERACIÓN REST
                </h3>
              </div>
              <button
                onClick={() => setIsNewOpModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {newOpError && (
              <div
                style={{
                  backgroundColor: "rgba(255, 23, 68, 0.12)",
                  border: "1.5px solid #ff1744",
                  padding: "0.6rem 0.8rem",
                  fontSize: "0.75rem",
                  color: "#ff1744",
                  marginBottom: "1rem",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {newOpError}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  marginBottom: "0.4rem",
                }}
              >
                MÉTODO HTTP
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.4rem" }}>
                {HTTP_METHODS.slice(0, 8).map((m) => {
                  const isSelected = newOpMethod === m;
                  const bStyle = getMethodBadgeStyle(m);
                  return (
                    <button
                      key={m}
                      onClick={() => setNewOpMethod(m)}
                      style={{
                        padding: "0.45rem",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 900,
                        fontSize: "0.75rem",
                        border: isSelected
                          ? `2px solid ${bStyle.border}`
                          : "1.5px solid var(--border-muted)",
                        backgroundColor: isSelected ? bStyle.bg : "var(--bg-app)",
                        color: isSelected ? bStyle.color : "var(--text-muted)",
                        cursor: "pointer",
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: "1.4rem" }}>
              <label
                style={{
                  display: "block",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  marginBottom: "0.4rem",
                }}
              >
                PLANTILLA DE RUTA (PATH)
              </label>
              <input
                type="text"
                value={newOpPath}
                onChange={(e) => setNewOpPath(e.target.value)}
                placeholder="/vehicles/{vehicleId}"
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  backgroundColor: "var(--bg-app)",
                  border: "2px solid var(--border-main)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                }}
              />
              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  marginTop: "0.35rem",
                }}
              >
                Las variables entre llaves (ej. <code style={{ color: "var(--primary)" }}>{`{id}`}</code>) se detectarán e inicializarán como parámetros de ruta automáticamente.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                onClick={() => setIsNewOpModalOpen(false)}
                style={{
                  padding: "0.5rem 0.9rem",
                  backgroundColor: "transparent",
                  border: "2px solid var(--border-main)",
                  color: "var(--text-main)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                CANCELAR
              </button>

              <button
                onClick={handleCreateOperation}
                style={{
                  padding: "0.5rem 1.1rem",
                  backgroundColor: "var(--primary)",
                  color: "#000000",
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px 0px #000000",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                CREAR OPERACIÓN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CONFIRMAR ELIMINACIÓN DE OPERACIÓN
          ========================================================================= */}
      {deleteConfirmIndex !== null && operations[deleteConfirmIndex] && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "2px solid #ff1744",
              boxShadow: "6px 6px 0px 0px #ff1744",
              width: "440px",
              padding: "1.6rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              <AlertTriangle size={20} color="#ff1744" />
              <h3 style={{ fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: "0.95rem" }}>
                CONFIRMAR ELIMINACIÓN
              </h3>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.5, marginBottom: "1.4rem" }}>
              ¿Estás seguro de que deseas eliminar permanentemente la operación{" "}
              <strong>
                {operations[deleteConfirmIndex].method} {operations[deleteConfirmIndex].path}
              </strong>
              ? Esta acción no se puede deshacer.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                onClick={() => setDeleteConfirmIndex(null)}
                style={{
                  padding: "0.5rem 0.9rem",
                  backgroundColor: "transparent",
                  border: "2px solid var(--border-main)",
                  color: "var(--text-main)",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                CANCELAR
              </button>

              <button
                onClick={() => handleDeleteOperation(deleteConfirmIndex)}
                style={{
                  padding: "0.5rem 1.1rem",
                  backgroundColor: "#ff1744",
                  color: "#ffffff",
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px 0px #000000",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ELIMINAR OPERACIÓN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          DRAWER / MODAL: VISTA PREVIA OPENAPI 3.1 JSON
          ========================================================================= */}
      {showJsonPreview && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--border-strong)",
              boxShadow: "6px 6px 0px 0px var(--border-strong)",
              width: "680px",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "1rem 1.4rem",
                borderBottom: "2px solid var(--border-main)",
                backgroundColor: "var(--bg-app)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Code2 size={16} color="var(--primary)" />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 900,
                    fontSize: "0.85rem",
                    letterSpacing: "0.06em",
                  }}
                >
                  OPENAPI 3.1 PATHS JSON PREVIEW
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={handleCopyJson}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.3rem 0.6rem",
                    backgroundColor: copiedJson ? "var(--accent-citron)" : "var(--bg-surface)",
                    color: copiedJson ? "#000000" : "var(--text-main)",
                    border: "1.5px solid var(--border-main)",
                    fontSize: "0.7rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {copiedJson ? <Check size={12} /> : <Copy size={12} />}
                  {copiedJson ? "COPIADO" : "COPIAR JSON"}
                </button>

                <button
                  onClick={() => setShowJsonPreview(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div
              style={{
                padding: "1.2rem",
                overflowY: "auto",
                backgroundColor: "#0d1117",
                color: "#e6edf3",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              <pre style={{ margin: 0 }}>{openApiPathsJson}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
