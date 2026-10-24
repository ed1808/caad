import React, { useState, useMemo } from "react";
import {
  Project,
  Operation,
  SchemaDefinition,
  HttpMethod,
  RequestBody,
  ResponseDefinition,
} from "../../app/types";
import { EmptyView } from "../../components/EmptyView";
import {
  BookOpen,
  Search,
  Download,
  Copy,
  Check,
  Play,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Server,
  Tag,
  Send,
  Sparkles,
  Lock,
  Unlock,
  Shield,
  GitFork,
} from "lucide-react";

interface DocumentationViewProps {
  project?: Project | null;
  onNavigateToProjects: () => void;
  onNavigateToOperation?: (path: string, method: HttpMethod) => void;
  onNavigateToSchema?: (name: string) => void;
  onExport?: () => void;
}

// Generador determinista de ejemplos JSON a partir de esquemas OpenAPI 3.1
function generateMockFromSchema(
  schema: SchemaDefinition | undefined,
  allSchemas: Record<string, SchemaDefinition>,
  depth = 0
): unknown {
  if (!schema || depth > 4) return {};

  if (schema.example !== undefined) {
    return schema.example;
  }

  if (schema.$ref) {
    const targetName = schema.$ref.replace("#/components/schemas/", "");
    const targetSchema = allSchemas[targetName];
    if (targetSchema) {
      return generateMockFromSchema(targetSchema, allSchemas, depth + 1);
    }
    return { $ref: schema.$ref };
  }

  const primaryType = schema.schema_type || "object";
  const isNullable = schema.allows_null ?? false;

  if (schema.enum_values && schema.enum_values.length > 0) {
    return schema.enum_values[0];
  }

  switch (primaryType) {
    case "string":
      if (schema.format === "uuid") return "123e4567-e89b-12d3-a456-426614174000";
      if (schema.format === "date-time") return new Date().toISOString();
      if (schema.format === "date") return "2026-03-15";
      if (schema.format === "email") return "contacto@taller-mecanico.local";
      if (schema.format === "uri") return "https://api.workshop.local/v1";
      if (schema.description?.toLowerCase().includes("placa") || schema.description?.toLowerCase().includes("matrícula")) {
        return "ABC-1234";
      }
      return "texto_ejemplo";

    case "integer":
      if (schema.minimum !== undefined) return schema.minimum;
      return 101;

    case "number":
      if (schema.minimum !== undefined) return schema.minimum;
      return 19.99;

    case "boolean":
      return true;

    case "array":
      if (schema.items) {
        return [generateMockFromSchema(schema.items, allSchemas, depth + 1)];
      }
      return [];

    case "object": {
      const obj: Record<string, unknown> = {};
      if (schema.allOf) {
        for (const parent of schema.allOf) {
          const parentMock = generateMockFromSchema(parent, allSchemas, depth + 1);
          if (parentMock && typeof parentMock === "object" && !Array.isArray(parentMock)) {
            Object.assign(obj, parentMock);
          }
        }
      }
      if (schema.properties) {
        for (const [propName, propDef] of Object.entries(schema.properties)) {
          obj[propName] = generateMockFromSchema(propDef, allSchemas, depth + 1);
        }
      }
      return obj;
    }

    default:
      return isNullable ? null : {};
  }
}

function getRequestBodySchema(requestBody?: RequestBody): SchemaDefinition | undefined {
  if (!requestBody?.content) return undefined;
  const firstMediaType = Object.values(requestBody.content)[0];
  return firstMediaType?.schema;
}

function getResponseSchema(response?: ResponseDefinition): SchemaDefinition | undefined {
  if (!response?.content) return undefined;
  const firstMediaType = Object.values(response.content)[0];
  return firstMediaType?.schema;
}

const METHOD_COLORS: Record<HttpMethod, { bg: string; text: string; border: string }> = {
  GET: { bg: "#2563eb", text: "#ffffff", border: "#1d4ed8" },
  POST: { bg: "#16a34a", text: "#ffffff", border: "#15803d" },
  PUT: { bg: "#ea580c", text: "#ffffff", border: "#c2410c" },
  DELETE: { bg: "#dc2626", text: "#ffffff", border: "#b91c1c" },
  PATCH: { bg: "#9333ea", text: "#ffffff", border: "#7e22ce" },
  OPTIONS: { bg: "#475569", text: "#ffffff", border: "#334155" },
  HEAD: { bg: "#0284c7", text: "#ffffff", border: "#0369a1" },
  TRACE: { bg: "#64748b", text: "#ffffff", border: "#475569" },
};

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  project,
  onNavigateToProjects,
  onNavigateToOperation,
  onNavigateToSchema,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState<"operations" | "schemas" | "mock">("operations");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [expandedOperations, setExpandedOperations] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Estados para simulación de Mock Server
  const [mockSelectedOpKey, setMockSelectedOpKey] = useState<string>("");
  const [mockParamValues, setMockParamValues] = useState<Record<string, string>>({});
  const [mockRequestBody, setMockRequestBody] = useState<string>("");
  const [mockSelectedStatus, setMockSelectedStatus] = useState<string>("");
  const [mockResponseOutput, setMockResponseOutput] = useState<{
    status: string;
    durationMs: number;
    headers: Record<string, string>;
    body: string;
  } | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const document = project?.document;
  const schemas = useMemo(() => document?.schemas || {}, [document]);
  const operations = useMemo(() => document?.operations || [], [document]);

  // Extraer todos los tags disponibles
  const availableTags = useMemo(() => {
    const tagsSet = new Set<string>();
    for (const op of operations) {
      if (op.tags) {
        for (const t of op.tags) {
          if (t.trim()) tagsSet.add(t.trim());
        }
      }
    }
    return Array.from(tagsSet);
  }, [operations]);

  // Filtrado de operaciones
  const filteredOperations = useMemo(() => {
    return operations.filter((op) => {
      const matchesTag = selectedTag === "ALL" || (op.tags && op.tags.includes(selectedTag));
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        op.path.toLowerCase().includes(q) ||
        op.method.toLowerCase().includes(q) ||
        op.summary?.toLowerCase().includes(q) ||
        op.description?.toLowerCase().includes(q) ||
        op.operation_id?.toLowerCase().includes(q);
      return matchesTag && matchesQuery;
    });
  }, [operations, selectedTag, searchQuery]);

  // Filtrado de esquemas
  const filteredSchemas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return Object.entries(schemas).filter(([name, schema]) => {
      return (
        !q ||
        name.toLowerCase().includes(q) ||
        schema.description?.toLowerCase().includes(q)
      );
    });
  }, [schemas, searchQuery]);

  const toggleOpExpand = (opKey: string) => {
    setExpandedOperations((prev) => ({
      ...prev,
      [opKey]: !prev[opKey],
    }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Configuración de la operación seleccionada para simulación Mock
  const activeMockOp = useMemo(() => {
    if (!mockSelectedOpKey && operations.length > 0) {
      return operations[0];
    }
    return operations.find((op) => `${op.method} ${op.path}` === mockSelectedOpKey) || operations[0];
  }, [mockSelectedOpKey, operations]);

  // Sincronizar parámetros y request body al cambiar de operación mock
  const handleSelectMockOp = (op: Operation) => {
    const key = `${op.method} ${op.path}`;
    setMockSelectedOpKey(key);
    setMockResponseOutput(null);

    // Parámetros por defecto
    const initialParams: Record<string, string> = {};
    for (const p of op.parameters || []) {
      if (p.schema?.format === "uuid") {
        initialParams[p.name] = "123e4567-e89b-12d3-a456-426614174000";
      } else {
        initialParams[p.name] = "demo-valor";
      }
    }
    setMockParamValues(initialParams);

    // Request body mock
    const reqSchema = getRequestBodySchema(op.request_body);
    if (reqSchema) {
      const generated = generateMockFromSchema(reqSchema, schemas);
      setMockRequestBody(JSON.stringify(generated, null, 2));
    } else {
      setMockRequestBody("");
    }

    // Código de respuesta por defecto
    if (op.responses && op.responses.length > 0) {
      setMockSelectedStatus(op.responses[0].status_code);
    } else {
      setMockSelectedStatus("200");
    }
  };

  const handleRunMockSimulation = () => {
    if (!activeMockOp) return;
    setIsSimulating(true);

    setTimeout(() => {
      const respDef = activeMockOp.responses?.find((r) => r.status_code === mockSelectedStatus) ||
        activeMockOp.responses?.[0];

      let responsePayload: unknown = { message: "Simulación mock ejecutada con éxito" };
      const respSchema = getResponseSchema(respDef);

      if (respSchema) {
        responsePayload = generateMockFromSchema(respSchema, schemas);
      }

      const mediaType = respDef?.content ? Object.keys(respDef.content)[0] || "application/json" : "application/json";

      setMockResponseOutput({
        status: `${respDef?.status_code || "200"} ${respDef?.description || "OK"}`,
        durationMs: Math.floor(Math.random() * 25) + 18,
        headers: {
          "content-type": `${mediaType}; charset=utf-8`,
          "x-powered-by": "CAAD OAS 3.1 Mock Engine",
          "access-control-allow-origin": "*",
        },
        body: JSON.stringify(responsePayload, null, 2),
      });

      setIsSimulating(false);
    }, 180);
  };

  if (!project) {
    return (
      <EmptyView
        icon={BookOpen}
        title="Sin Contrato Activo"
        description="Abre o crea un proyecto desde el directorio para previsualizar su documentación interactiva y simulador mock."
        actionLabel="IR AL DIRECTORIO DE PROYECTOS"
        onAction={onNavigateToProjects}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "var(--bg-app)",
      }}
    >
      {/* Encabezado Principal de Documentación */}
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          borderBottom: "2px solid var(--border-strong)",
          padding: "1.5rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1.5rem",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                fontWeight: 800,
                color: "#ffffff",
                backgroundColor: "var(--primary)",
                padding: "0.15rem 0.5rem",
                letterSpacing: "0.05em",
                border: "1px solid #000000",
              }}
            >
              OPENAPI {document?.openapi_version || "3.1.0"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--text-muted)",
              }}
            >
              VERSION {document?.info.version || "1.0.0"}
            </span>
          </div>

          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 900,
              letterSpacing: "0.02em",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {document?.info.title || project.name}
          </h1>

          {document?.info.summary && (
            <p style={{ color: "var(--primary)", fontSize: "0.88rem", fontWeight: 700, marginTop: "0.2rem" }}>
              {document.info.summary}
            </p>
          )}

          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.3rem", maxWidth: "800px" }}>
            {document?.info.description || "Sin descripción detallada de la API."}
          </p>

          {/* Servidores declarados */}
          {document?.servers && document.servers.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                <Server size={13} />
                <span>BASE URL:</span>
              </div>
              {document.servers.map((srv, idx) => (
                <span
                  key={idx}
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    padding: "0.15rem 0.6rem",
                    backgroundColor: "var(--bg-app)",
                    border: "1px solid var(--border-main)",
                    color: "var(--text-main)",
                  }}
                  title={srv.description}
                >
                  {srv.url}
                </span>
              ))}
            </div>
          )}

          {/* Métodos de Autenticación / Seguridad declarados */}
          {document?.security_schemes && Object.keys(document.security_schemes).length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                <Shield size={13} style={{ color: "var(--primary)" }} />
                <span>AUTH SCHEMES:</span>
              </div>
              {Object.entries(document.security_schemes).map(([sName, sDef]) => (
                <span
                  key={sName}
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    padding: "0.15rem 0.6rem",
                    backgroundColor: "var(--bg-app)",
                    border: "1px solid var(--border-main)",
                    color: "var(--primary)",
                    fontWeight: 700,
                  }}
                  title={sDef.description}
                >
                  {sName} ({sDef.type === "http" ? `${sDef.scheme} ${sDef.bearerFormat || ""}`.trim() : sDef.type})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Acciones y Métricas */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
          {onExport && (
            <button
              onClick={onExport}
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-main)",
                padding: "0.55rem 1.1rem",
                fontSize: "0.8rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                border: "2px solid var(--border-strong)",
                boxShadow: "3px 3px 0px 0px var(--border-strong)",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "4px 4px 0px 0px var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "3px 3px 0px 0px var(--border-strong)";
              }}
            >
              <Download size={14} />
              EXPORTAR CONTRATO
            </button>
          )}

          <div style={{ display: "flex", gap: "0.6rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                padding: "0.25rem 0.6rem",
                backgroundColor: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>ENDPOINTS: </span>
              <strong>{operations.length}</strong>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                padding: "0.25rem 0.6rem",
                backgroundColor: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>ESQUEMAS: </span>
              <strong>{Object.keys(schemas).length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Navegación de Pestañas & Búsqueda */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "var(--bg-surface-subtle)",
          borderBottom: "2px solid var(--border-strong)",
          padding: "0 2rem",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            onClick={() => setActiveTab("operations")}
            style={{
              padding: "0.75rem 1.25rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: activeTab === "operations" ? "var(--primary)" : "var(--text-muted)",
              borderBottom: activeTab === "operations" ? "3px solid var(--primary)" : "3px solid transparent",
              backgroundColor: activeTab === "operations" ? "var(--bg-surface)" : "transparent",
              transition: "all 0.1s ease",
            }}
          >
            ENDPOINTS REST ({operations.length})
          </button>

          <button
            onClick={() => setActiveTab("schemas")}
            style={{
              padding: "0.75rem 1.25rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              color: activeTab === "schemas" ? "var(--primary)" : "var(--text-muted)",
              borderBottom: activeTab === "schemas" ? "3px solid var(--primary)" : "3px solid transparent",
              backgroundColor: activeTab === "schemas" ? "var(--bg-surface)" : "transparent",
              transition: "all 0.1s ease",
            }}
          >
            MODELOS DE DATOS ({Object.keys(schemas).length})
          </button>

          <button
            onClick={() => {
              setActiveTab("mock");
              if (!mockSelectedOpKey && operations.length > 0) {
                handleSelectMockOp(operations[0]);
              }
            }}
            style={{
              padding: "0.75rem 1.25rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              fontWeight: 800,
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              color: activeTab === "mock" ? "var(--primary)" : "var(--text-muted)",
              borderBottom: activeTab === "mock" ? "3px solid var(--primary)" : "3px solid transparent",
              backgroundColor: activeTab === "mock" ? "var(--bg-surface)" : "transparent",
              transition: "all 0.1s ease",
            }}
          >
            <Sparkles size={14} />
            CONSOLA DE PRUEBAS MOCK
          </button>
        </div>

        {/* Buscador & Selector de Tag */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.4rem 0" }}>
          {activeTab === "operations" && availableTags.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Tag size={13} style={{ color: "var(--text-muted)" }} />
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                style={{
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  padding: "0.35rem 0.6rem",
                  border: "1px solid var(--border-main)",
                  backgroundColor: "var(--bg-surface)",
                  color: "var(--text-main)",
                  fontWeight: 700,
                }}
              >
                <option value="ALL">TODAS LAS ETIQUETAS</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    TAG: {tag}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-main)",
              padding: "0.35rem 0.75rem",
            }}
          >
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder={activeTab === "schemas" ? "Buscar esquema..." : "Filtrar por ruta, método..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
                border: "none",
                background: "transparent",
                color: "var(--text-main)",
                width: "180px",
              }}
            />
          </div>
        </div>
      </div>

      {/* Contenido Principal con Scroll */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
        {/* PESTAÑA 1: OPERACIONES REST */}
        {activeTab === "operations" && (
          <div style={{ maxWidth: "1050px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {filteredOperations.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "3px 3px 0px 0px var(--border-strong)",
                }}
              >
                <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                  // NO SE ENCONTRARON OPERACIONES CON EL FILTRO ESPECIFICADO.
                </p>
              </div>
            ) : (
              filteredOperations.map((op, idx) => {
                const opKey = `${op.method}-${op.path}`;
                const isExpanded = expandedOperations[opKey] ?? true;
                const methodColor = METHOD_COLORS[op.method] || METHOD_COLORS.GET;
                const reqSchema = getRequestBodySchema(op.request_body);

                return (
                  <div
                    key={idx}
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "2px solid var(--border-strong)",
                      boxShadow: "4px 4px 0px 0px var(--border-strong)",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {/* Fila de cabecera de la operación */}
                    <div
                      onClick={() => toggleOpExpand(opKey)}
                      style={{
                        padding: "1rem 1.25rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        backgroundColor: isExpanded ? "var(--bg-surface)" : "var(--bg-surface-subtle)",
                        borderBottom: isExpanded ? "1px solid var(--border-main)" : "none",
                        userSelect: "none",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span
                          style={{
                            backgroundColor: methodColor.bg,
                            color: methodColor.text,
                            padding: "0.25rem 0.65rem",
                            fontSize: "0.75rem",
                            fontWeight: 900,
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.08em",
                            border: `1px solid ${methodColor.border}`,
                            minWidth: "70px",
                            textAlign: "center",
                          }}
                        >
                          {op.method}
                        </span>

                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "var(--text-main)",
                          }}
                        >
                          {op.path}
                        </span>

                        {op.summary && (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                            — {op.summary}
                          </span>
                        )}

                        {op.security !== undefined ? (
                          op.security.length === 0 ? (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontFamily: "var(--font-mono)",
                                padding: "0.1rem 0.4rem",
                                backgroundColor: "var(--bg-app)",
                                border: "1px solid var(--border-subtle)",
                                color: "var(--text-muted)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <Unlock size={10} /> PUBLIC
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontFamily: "var(--font-mono)",
                                padding: "0.1rem 0.45rem",
                                backgroundColor: "rgba(212, 255, 0, 0.1)",
                                border: "1px solid var(--primary)",
                                color: "var(--primary)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                fontWeight: 700,
                              }}
                            >
                              <Lock size={10} /> AUTH: {op.security.map((s) => Object.keys(s).join(", ")).join("; ")}
                            </span>
                          )
                        ) : (
                          document?.security && document.security.length > 0 && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontFamily: "var(--font-mono)",
                                padding: "0.1rem 0.45rem",
                                backgroundColor: "var(--bg-app)",
                                border: "1px solid var(--border-muted)",
                                color: "var(--text-muted)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                              }}
                            >
                              <Lock size={10} /> GLOBAL AUTH
                            </span>
                          )
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                        {op.tags && op.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              fontSize: "0.7rem",
                              fontFamily: "var(--font-mono)",
                              padding: "0.15rem 0.5rem",
                              backgroundColor: "var(--bg-app)",
                              border: "1px solid var(--border-subtle)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>

                    {/* Detalle expandido de la operación */}
                    {isExpanded && (
                      <div style={{ padding: "1.5rem" }}>
                        {op.description && (
                          <p style={{ color: "var(--text-main)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                            {op.description}
                          </p>
                        )}

                        {/* Parámetros */}
                        {op.parameters && op.parameters.length > 0 && (
                          <div style={{ marginBottom: "1.8rem" }}>
                            <h4
                              style={{
                                fontSize: "0.75rem",
                                fontFamily: "var(--font-mono)",
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                color: "var(--primary)",
                                textTransform: "uppercase",
                                marginBottom: "0.6rem",
                              }}
                            >
                              // PARÁMETROS ({op.parameters.length})
                            </h4>
                            <div style={{ border: "1px solid var(--border-main)", overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                                <thead>
                                  <tr style={{ backgroundColor: "var(--bg-surface-subtle)", borderBottom: "1px solid var(--border-main)", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                                    <th style={{ padding: "0.5rem 0.8rem" }}>NOMBRE</th>
                                    <th style={{ padding: "0.5rem 0.8rem" }}>UBICACIÓN</th>
                                    <th style={{ padding: "0.5rem 0.8rem" }}>TIPO</th>
                                    <th style={{ padding: "0.5rem 0.8rem" }}>REQUERIDO</th>
                                    <th style={{ padding: "0.5rem 0.8rem" }}>DESCRIPCIÓN</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {op.parameters.map((p, pIdx) => (
                                    <tr key={pIdx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                      <td style={{ padding: "0.5rem 0.8rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                        {p.name}
                                      </td>
                                      <td style={{ padding: "0.5rem 0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                        {p.location}
                                      </td>
                                      <td style={{ padding: "0.5rem 0.8rem", fontFamily: "var(--font-mono)" }}>
                                        {p.schema?.schema_type || "string"}
                                        {p.schema?.format ? ` (${p.schema.format})` : ""}
                                      </td>
                                      <td style={{ padding: "0.5rem 0.8rem" }}>
                                        <span
                                          style={{
                                            fontSize: "0.68rem",
                                            fontFamily: "var(--font-mono)",
                                            padding: "0.1rem 0.4rem",
                                            backgroundColor: p.required ? "var(--error-subtle)" : "var(--bg-app)",
                                            color: p.required ? "var(--error)" : "var(--text-muted)",
                                            fontWeight: 800,
                                            border: `1px solid ${p.required ? "var(--error)" : "var(--border-subtle)"}`,
                                          }}
                                        >
                                          {p.required ? "REQUIRED" : "OPTIONAL"}
                                        </span>
                                      </td>
                                      <td style={{ padding: "0.5rem 0.8rem", color: "var(--text-muted)" }}>
                                        {p.description || "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Request Body */}
                        {op.request_body && (
                          <div style={{ marginBottom: "1.8rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                              <h4
                                style={{
                                  fontSize: "0.75rem",
                                  fontFamily: "var(--font-mono)",
                                  fontWeight: 800,
                                  letterSpacing: "0.08em",
                                  color: "var(--primary)",
                                  textTransform: "uppercase",
                                  margin: 0,
                                }}
                              >
                                // CUERPO DE SOLICITUD (REQUEST BODY)
                              </h4>
                              <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                MEDIA TYPE: {Object.keys(op.request_body.content)[0] || "application/json"}
                              </span>
                            </div>

                            {op.request_body.description && (
                              <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "0.6rem" }}>
                                {op.request_body.description}
                              </p>
                            )}

                            {reqSchema && (
                              <div
                                style={{
                                  backgroundColor: "var(--bg-app)",
                                  border: "1px solid var(--border-main)",
                                  padding: "0.75rem 1rem",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                                  <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                    ESQUEMA: {reqSchema.$ref || reqSchema.name || "inline"}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const sample = generateMockFromSchema(reqSchema, schemas);
                                      copyToClipboard(JSON.stringify(sample, null, 2), `req-${opKey}`);
                                    }}
                                    style={{
                                      fontSize: "0.72rem",
                                      fontFamily: "var(--font-mono)",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.3rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    {copiedKey === `req-${opKey}` ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                                    {copiedKey === `req-${opKey}` ? "COPIADO" : "COPIAR JSON EJEMPLO"}
                                  </button>
                                </div>
                                <pre
                                  style={{
                                    fontFamily: "var(--font-mono)",
                                    fontSize: "0.78rem",
                                    color: "var(--text-main)",
                                    margin: 0,
                                    overflowX: "auto",
                                  }}
                                >
                                  {JSON.stringify(generateMockFromSchema(reqSchema, schemas), null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Respuestas */}
                        {op.responses && op.responses.length > 0 && (
                          <div>
                            <h4
                              style={{
                                fontSize: "0.75rem",
                                fontFamily: "var(--font-mono)",
                                fontWeight: 800,
                                letterSpacing: "0.08em",
                                color: "var(--primary)",
                                textTransform: "uppercase",
                                marginBottom: "0.6rem",
                              }}
                            >
                              // RESPUESTAS ({op.responses.length})
                            </h4>

                            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                              {op.responses.map((resp, rIdx) => {
                                const isSuccess = resp.status_code.startsWith("2");
                                const isClientErr = resp.status_code.startsWith("4");
                                const statusColor = isSuccess ? "var(--success)" : isClientErr ? "var(--warning)" : "var(--error)";
                                const respSchema = getResponseSchema(resp);

                                return (
                                  <div
                                    key={rIdx}
                                    style={{
                                      border: "1px solid var(--border-main)",
                                      backgroundColor: "var(--bg-app)",
                                      padding: "0.85rem 1rem",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                        <span
                                          style={{
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "0.75rem",
                                            fontWeight: 900,
                                            padding: "0.15rem 0.5rem",
                                            backgroundColor: isSuccess ? "var(--success-subtle)" : "var(--warning-subtle)",
                                            color: statusColor,
                                            border: `1px solid ${statusColor}`,
                                          }}
                                        >
                                          {resp.status_code}
                                        </span>
                                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-main)" }}>
                                          {resp.description}
                                        </span>
                                      </div>

                                      {respSchema && (
                                        <button
                                          onClick={() => {
                                            const sample = generateMockFromSchema(respSchema, schemas);
                                            copyToClipboard(JSON.stringify(sample, null, 2), `resp-${opKey}-${resp.status_code}`);
                                          }}
                                          style={{
                                            fontSize: "0.72rem",
                                            fontFamily: "var(--font-mono)",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.3rem",
                                            color: "var(--text-muted)",
                                          }}
                                        >
                                          {copiedKey === `resp-${opKey}-${resp.status_code}` ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                                          {copiedKey === `resp-${opKey}-${resp.status_code}` ? "COPIADO" : "COPIAR JSON"}
                                        </button>
                                      )}
                                    </div>

                                    {respSchema && (
                                      <div style={{ marginTop: "0.5rem" }}>
                                        <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                                          ESQUEMA ASOCIADO: {respSchema.$ref || respSchema.name || "inline"}
                                        </div>
                                        <pre
                                          style={{
                                            fontFamily: "var(--font-mono)",
                                            fontSize: "0.75rem",
                                            color: "var(--text-main)",
                                            backgroundColor: "var(--bg-surface)",
                                            padding: "0.5rem 0.75rem",
                                            border: "1px solid var(--border-subtle)",
                                            margin: 0,
                                            overflowX: "auto",
                                          }}
                                        >
                                          {JSON.stringify(generateMockFromSchema(respSchema, schemas), null, 2)}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Botón rápido para abrir en consola de simulación */}
                        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                          {onNavigateToOperation && (
                            <button
                              onClick={() => onNavigateToOperation(op.path, op.method)}
                              style={{
                                padding: "0.4rem 0.8rem",
                                fontSize: "0.75rem",
                                fontFamily: "var(--font-mono)",
                                color: "var(--text-muted)",
                                border: "1px solid var(--border-main)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                              }}
                            >
                              <ExternalLink size={12} />
                              EDITAR EN DISEÑADOR
                            </button>
                          )}

                          <button
                            onClick={() => {
                              handleSelectMockOp(op);
                              setActiveTab("mock");
                            }}
                            style={{
                              padding: "0.4rem 0.9rem",
                              fontSize: "0.75rem",
                              fontFamily: "var(--font-mono)",
                              fontWeight: 800,
                              backgroundColor: "var(--text-main)",
                              color: "var(--bg-surface)",
                              border: "1px solid var(--border-strong)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                            }}
                          >
                            <Play size={12} />
                            PROBAR EN MOCK CONSOLE
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* PESTAÑA 2: MODELOS DE DATOS / ESQUEMAS */}
        {activeTab === "schemas" && (
          <div style={{ maxWidth: "1050px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {filteredSchemas.length === 0 ? (
              <div
                style={{
                  padding: "3rem",
                  textAlign: "center",
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "3px 3px 0px 0px var(--border-strong)",
                }}
              >
                <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "0.9rem" }}>
                  // NO SE ENCONTRARON ESQUEMAS EN ESTE CONTRATO.
                </p>
              </div>
            ) : (
              filteredSchemas.map(([name, schema]) => {
                const sampleJson = JSON.stringify(generateMockFromSchema(schema, schemas), null, 2);

                return (
                  <div
                    key={name}
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "2px solid var(--border-strong)",
                      boxShadow: "4px 4px 0px 0px var(--border-strong)",
                      padding: "1.5rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, marginBottom: "0.2rem" }}>
                          // COMPONENT SCHEMA // JSON SCHEMA 2020-12
                        </div>
                        <h3 style={{ fontSize: "1.3rem", fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                          {name}
                        </h3>

                        {schema.allOf?.some((i) => Boolean(i.$ref)) && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
                            <span
                              style={{
                                fontSize: "0.72rem",
                                fontFamily: "var(--font-mono)",
                                color: "var(--primary)",
                                fontWeight: 800,
                                backgroundColor: "var(--bg-app)",
                                padding: "0.15rem 0.5rem",
                                border: "1px solid var(--border-main)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.3rem",
                              }}
                            >
                              <GitFork size={12} />
                              HEREDA DE: {schema.allOf.find((i) => Boolean(i.$ref))?.$ref?.replace("#/components/schemas/", "")} (allOf)
                            </span>
                          </div>
                        )}

                        {schema.description && (
                          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.3rem" }}>
                            {schema.description}
                          </p>
                        )}
                      </div>

                      {onNavigateToSchema && (
                        <button
                          onClick={() => onNavigateToSchema(name)}
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border-main)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.35rem",
                          }}
                        >
                          <ExternalLink size={12} />
                          EDITAR ESQUEMA
                        </button>
                      )}
                    </div>

                    {/* Tabla de Propiedades */}
                    {schema.properties && Object.keys(schema.properties).length > 0 ? (
                      <div style={{ border: "1px solid var(--border-main)", marginBottom: "1.2rem", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                          <thead>
                            <tr style={{ backgroundColor: "var(--bg-surface-subtle)", borderBottom: "1px solid var(--border-main)", textAlign: "left", fontFamily: "var(--font-mono)", fontSize: "0.72rem" }}>
                              <th style={{ padding: "0.5rem 0.8rem" }}>PROPIEDAD</th>
                              <th style={{ padding: "0.5rem 0.8rem" }}>TIPO</th>
                              <th style={{ padding: "0.5rem 0.8rem" }}>FORMATO / ITEMS / REF</th>
                              <th style={{ padding: "0.5rem 0.8rem" }}>OBLIGATORIA</th>
                              <th style={{ padding: "0.5rem 0.8rem" }}>RESTRICCIONES</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(schema.properties).map(([propKey, propDef]) => {
                              const isRequired = schema.required?.includes(propKey);
                              const propType = propDef.schema_type || "string";
                              const isArrayRef = propDef.schema_type === "array" && propDef.items?.$ref;
                              const isArrayPrimitive = propDef.schema_type === "array" && !propDef.items?.$ref;

                              return (
                                <tr key={propKey} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                                  <td style={{ padding: "0.5rem 0.8rem", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                                    {propKey}
                                  </td>
                                  <td style={{ padding: "0.5rem 0.8rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                                    {propType}
                                    {propDef.allows_null && " (nullable)"}
                                  </td>
                                  <td style={{ padding: "0.5rem 0.8rem", fontFamily: "var(--font-mono)" }}>
                                    {propDef.$ref ? (
                                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                                        {propDef.$ref}
                                      </span>
                                    ) : isArrayRef ? (
                                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                                        items: {propDef.items?.$ref}
                                      </span>
                                    ) : isArrayPrimitive ? (
                                      <span>
                                        items: {propDef.items?.schema_type || "string"}
                                        {propDef.items?.format ? ` (${propDef.items.format})` : ""}
                                      </span>
                                    ) : (
                                      propDef.format || "—"
                                    )}
                                  </td>
                                  <td style={{ padding: "0.5rem 0.8rem" }}>
                                    <span
                                      style={{
                                        fontSize: "0.68rem",
                                        fontFamily: "var(--font-mono)",
                                        padding: "0.1rem 0.4rem",
                                        backgroundColor: isRequired ? "var(--error-subtle)" : "var(--bg-app)",
                                        color: isRequired ? "var(--error)" : "var(--text-muted)",
                                        fontWeight: 800,
                                        border: `1px solid ${isRequired ? "var(--error)" : "var(--border-subtle)"}`,
                                      }}
                                    >
                                      {isRequired ? "SI" : "NO"}
                                    </span>
                                  </td>
                                  <td style={{ padding: "0.5rem 0.8rem", fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                    {[
                                      propDef.minimum !== undefined ? `min: ${propDef.minimum}` : null,
                                      propDef.maximum !== undefined ? `max: ${propDef.maximum}` : null,
                                      propDef.min_length !== undefined ? `minLen: ${propDef.min_length}` : null,
                                      propDef.max_length !== undefined ? `maxLen: ${propDef.max_length}` : null,
                                      propDef.min_items !== undefined ? `minItems: ${propDef.min_items}` : null,
                                      propDef.max_items !== undefined ? `maxItems: ${propDef.max_items}` : null,
                                      propDef.enum_values ? `enum: [${propDef.enum_values.join(", ")}]` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" • ") || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                        Sin propiedades declaradas.
                      </p>
                    )}

                    {/* Previsualización de Ejemplo JSON */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-muted)" }}>
                          PAYLOAD JSON DE EJEMPLO
                        </span>
                        <button
                          onClick={() => copyToClipboard(sampleJson, `schema-${name}`)}
                          style={{
                            fontSize: "0.72rem",
                            fontFamily: "var(--font-mono)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {copiedKey === `schema-${name}` ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                          {copiedKey === `schema-${name}` ? "COPIADO" : "COPIAR JSON"}
                        </button>
                      </div>
                      <pre
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.78rem",
                          color: "var(--text-main)",
                          backgroundColor: "var(--bg-app)",
                          padding: "0.75rem 1rem",
                          border: "1px solid var(--border-main)",
                          margin: 0,
                          overflowX: "auto",
                        }}
                      >
                        {sampleJson}
                      </pre>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* PESTAÑA 3: CONSOLA DE PRUEBAS MOCK */}
        {activeTab === "mock" && (
          <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "2px solid var(--border-strong)",
                boxShadow: "4px 4px 0px 0px var(--border-strong)",
                padding: "1.5rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: "0.2rem" }}>
                // MOCK SERVER SIMULATOR // DETERMINISTIC REST TESTING
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "0.4rem" }}>
                Consola de Pruebas Mock Local
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                Ejecuta peticiones simuladas en tiempo real contra cualquier operación del contrato sin desplegar un backend. El motor genera respuestas conformes a los esquemas y códigos de respuesta configurados.
              </p>

              {/* Selector de Endpoint */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 800, marginBottom: "0.35rem" }}>
                    SELECCIONAR OPERACIÓN A SIMULAR:
                  </label>
                  <select
                    value={activeMockOp ? `${activeMockOp.method} ${activeMockOp.path}` : ""}
                    onChange={(e) => {
                      const found = operations.find((op) => `${op.method} ${op.path}` === e.target.value);
                      if (found) handleSelectMockOp(found);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.8rem",
                      fontSize: "0.85rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      backgroundColor: "var(--bg-app)",
                      border: "2px solid var(--border-main)",
                      color: "var(--text-main)",
                    }}
                  >
                    {operations.map((op, idx) => (
                      <option key={idx} value={`${op.method} ${op.path}`}>
                        [{op.method}] {op.path} {op.summary ? `— ${op.summary}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 800, marginBottom: "0.35rem" }}>
                    CÓDIGO DE RESPUESTA:
                  </label>
                  <select
                    value={mockSelectedStatus}
                    onChange={(e) => setMockSelectedStatus(e.target.value)}
                    style={{
                      padding: "0.55rem 1rem",
                      fontSize: "0.85rem",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      backgroundColor: "var(--bg-app)",
                      border: "2px solid var(--border-main)",
                      color: "var(--text-main)",
                    }}
                  >
                    {activeMockOp?.responses?.map((r, idx) => (
                      <option key={idx} value={r.status_code}>
                        HTTP {r.status_code} ({r.description.slice(0, 20)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Parámetros de Simulación */}
              {activeMockOp?.parameters && activeMockOp.parameters.length > 0 && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h4 style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--primary)", marginBottom: "0.5rem" }}>
                    // VALORES DE PARÁMETROS:
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
                    {activeMockOp.parameters.map((p, pIdx) => (
                      <div key={pIdx}>
                        <label style={{ display: "block", fontSize: "0.72rem", fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: "0.25rem" }}>
                          {p.name} ({p.location}) {p.required && "*"}
                        </label>
                        <input
                          type="text"
                          value={mockParamValues[p.name] || ""}
                          onChange={(e) => setMockParamValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
                          style={{
                            width: "100%",
                            padding: "0.45rem 0.65rem",
                            fontSize: "0.8rem",
                            fontFamily: "var(--font-mono)",
                            backgroundColor: "var(--bg-app)",
                            border: "1px solid var(--border-main)",
                            color: "var(--text-main)",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body para POST/PUT/PATCH */}
              {activeMockOp?.request_body && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <h4 style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--primary)", margin: 0 }}>
                      // CUERPO DE PETICIÓN (PAYLOAD):
                    </h4>
                    <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {Object.keys(activeMockOp.request_body.content)[0] || "application/json"}
                    </span>
                  </div>
                  <textarea
                    rows={6}
                    value={mockRequestBody}
                    onChange={(e) => setMockRequestBody(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      fontSize: "0.8rem",
                      fontFamily: "var(--font-mono)",
                      backgroundColor: "var(--bg-app)",
                      border: "1px solid var(--border-main)",
                      color: "var(--text-main)",
                      resize: "vertical",
                    }}
                  />
                </div>
              )}

              {/* Botón de Lanzamiento */}
              <button
                onClick={handleRunMockSimulation}
                disabled={isSimulating}
                style={{
                  padding: "0.75rem 1.75rem",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 900,
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.06em",
                  border: "2px solid #000000",
                  boxShadow: "3px 3px 0px 0px #000000",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  cursor: isSimulating ? "wait" : "pointer",
                }}
              >
                <Send size={15} />
                {isSimulating ? "SIMULANDO PETICIÓN..." : "ENVIAR PETICIÓN MOCK"}
              </button>
            </div>

            {/* Resultado de la Simulación */}
            {mockResponseOutput && (
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "4px 4px 0px 0px var(--border-strong)",
                  padding: "1.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.65rem",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.82rem",
                        fontWeight: 900,
                        backgroundColor: mockResponseOutput.status.startsWith("2") ? "var(--success)" : "var(--warning)",
                        color: "#ffffff",
                        border: "1px solid #000000",
                      }}
                    >
                      {mockResponseOutput.status}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      TIEMPO: <strong>{mockResponseOutput.durationMs}ms</strong>
                    </span>
                  </div>

                  <button
                    onClick={() => copyToClipboard(mockResponseOutput.body, "mock-output")}
                    style={{
                      fontSize: "0.75rem",
                      fontFamily: "var(--font-mono)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {copiedKey === "mock-output" ? <Check size={12} style={{ color: "var(--success)" }} /> : <Copy size={12} />}
                    {copiedKey === "mock-output" ? "COPIADO" : "COPIAR RESPUESTA"}
                  </button>
                </div>

                {/* Headers */}
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    CABECERAS HTTP SIMULADAS:
                  </div>
                  <div style={{ backgroundColor: "var(--bg-app)", padding: "0.5rem 0.75rem", border: "1px solid var(--border-subtle)", fontSize: "0.72rem", fontFamily: "var(--font-mono)" }}>
                    {Object.entries(mockResponseOutput.headers).map(([hKey, hVal]) => (
                      <div key={hKey} style={{ color: "var(--text-muted)" }}>
                        <strong style={{ color: "var(--text-main)" }}>{hKey}:</strong> {hVal}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body */}
                <div>
                  <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                    CUERPO DE RESPUESTA JSON:
                  </div>
                  <pre
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.8rem",
                      backgroundColor: "var(--bg-app)",
                      border: "1px solid var(--border-main)",
                      padding: "1rem",
                      margin: 0,
                      overflowX: "auto",
                      color: "var(--text-main)",
                    }}
                  >
                    {mockResponseOutput.body}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
