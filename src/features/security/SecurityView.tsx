import React, { useState, useMemo } from "react";
import { Project, SecurityScheme } from "../../app/types";
import { EmptyView } from "../../components/EmptyView";
import { normalizeProject } from "../../lib/tauri";
import {
  Lock,
  Plus,
  Search,
  Trash2,
  Code2,
  ShieldCheck,
  Key,
  Globe,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

interface SecurityViewProps {
  project: Project | null;
  onUpdateProject: (updated: Project) => void;
  onNavigateToProjects: () => void;
}

export const SecurityView: React.FC<SecurityViewProps> = ({
  project,
  onUpdateProject,
  onNavigateToProjects,
}) => {
  const safeProject = useMemo(() => {
    return project ? normalizeProject(project) : null;
  }, [project]);

  const securitySchemes = useMemo(() => {
    return safeProject?.document?.security_schemes ?? {};
  }, [safeProject]);

  const globalSecurity = useMemo(() => {
    return safeProject?.document?.security ?? [];
  }, [safeProject]);

  const schemeNames = useMemo(() => {
    return Object.keys(securitySchemes).sort();
  }, [securitySchemes]);

  const [selectedSchemeName, setSelectedSchemeName] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Modal para nuevo esquema
  const [newSchemeModalOpen, setNewSchemeModalOpen] = useState(false);
  const [newSchemeName, setNewSchemeName] = useState("");
  const [newSchemeType, setNewSchemeType] = useState<"http" | "apiKey" | "openIdConnect">("http");
  const [newSchemeError, setNewSchemeError] = useState<string | null>(null);

  // Auto seleccionar el primero si ninguno está seleccionado
  React.useEffect(() => {
    if (schemeNames.length > 0) {
      if (!selectedSchemeName || !securitySchemes[selectedSchemeName]) {
        setSelectedSchemeName(schemeNames[0]);
      }
    } else {
      setSelectedSchemeName(null);
    }
  }, [schemeNames, selectedSchemeName, securitySchemes]);

  if (!safeProject) {
    return (
      <EmptyView
        icon={Lock}
        title="Ningún proyecto en sesión"
        description="Abre o crea un proyecto desde 'Proyectos' para configurar esquemas de autenticación y seguridad OpenAPI 3.1."
        actionLabel="IR AL DIRECTORIO"
        onAction={onNavigateToProjects}
      />
    );
  }

  const selectedScheme = selectedSchemeName ? securitySchemes[selectedSchemeName] : null;

  const filteredSchemeNames = schemeNames.filter((name) =>
    name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isGlobalActive = (name: string) => {
    return globalSecurity.some((req) => Object.prototype.hasOwnProperty.call(req, name));
  };

  const updateCurrentScheme = (updater: (prev: SecurityScheme) => SecurityScheme) => {
    if (!selectedSchemeName || !selectedScheme) return;
    const updated = updater(selectedScheme);
    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        security_schemes: {
          ...safeProject.document.security_schemes,
          [selectedSchemeName]: updated,
        },
      },
    };
    onUpdateProject(updatedProject);
  };

  const handleToggleGlobalSecurity = (name: string) => {
    let updatedGlobal: Record<string, string[]>[];
    if (isGlobalActive(name)) {
      updatedGlobal = globalSecurity.filter((req) => !Object.prototype.hasOwnProperty.call(req, name));
    } else {
      updatedGlobal = [...globalSecurity, { [name]: [] }];
    }
    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        security: updatedGlobal,
      },
    };
    onUpdateProject(updatedProject);
  };

  const handleCreateScheme = () => {
    const trimmed = newSchemeName.trim();
    if (!trimmed) {
      setNewSchemeError("El identificador del esquema no puede estar vacío.");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
      setNewSchemeError("El nombre solo puede contener letras, números, puntos, guiones y guiones bajos.");
      return;
    }
    if (securitySchemes[trimmed]) {
      setNewSchemeError(`Ya existe un esquema de seguridad con el nombre '${trimmed}'.`);
      return;
    }

    let defaultScheme: SecurityScheme;
    if (newSchemeType === "http") {
      defaultScheme = {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Autenticación mediante JSON Web Token (JWT) Bearer",
      };
    } else if (newSchemeType === "apiKey") {
      defaultScheme = {
        type: "apiKey",
        name: "X-API-KEY",
        in: "header",
        description: "Clave de acceso API enviada en cabecera HTTP",
      };
    } else {
      defaultScheme = {
        type: "openIdConnect",
        openIdConnectUrl: "https://auth.example.com/.well-known/openid-configuration",
        description: "Servicio de autenticación e identidad federada OpenID Connect",
      };
    }

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        security_schemes: {
          ...safeProject.document.security_schemes,
          [trimmed]: defaultScheme,
        },
      },
    };

    onUpdateProject(updatedProject);
    setSelectedSchemeName(trimmed);
    setNewSchemeName("");
    setNewSchemeError(null);
    setNewSchemeModalOpen(false);
  };

  const handleDeleteScheme = (nameToDelete: string) => {
    const updatedSchemes = { ...securitySchemes };
    delete updatedSchemes[nameToDelete];

    const updatedGlobal = globalSecurity.filter((req) => !Object.prototype.hasOwnProperty.call(req, nameToDelete));

    // También limpiar de operaciones que lo tengan referenciado
    const updatedOps = (safeProject.document.operations ?? []).map((op) => {
      if (!op.security) return op;
      return {
        ...op,
        security: op.security.filter((req) => !Object.prototype.hasOwnProperty.call(req, nameToDelete)),
      };
    });

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        security_schemes: updatedSchemes,
        security: updatedGlobal,
        operations: updatedOps,
      },
    };

    onUpdateProject(updatedProject);
    if (selectedSchemeName === nameToDelete) {
      const remaining = Object.keys(updatedSchemes).sort();
      setSelectedSchemeName(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const handleLoadPresets = () => {
    const updatedSchemes: Record<string, SecurityScheme> = {
      ...securitySchemes,
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Autenticación basada en tokens JWT en la cabecera Authorization: Bearer <token>",
      },
      apiKeyAuth: {
        type: "apiKey",
        name: "X-API-KEY",
        in: "header",
        description: "Clave de autenticación API en cabecera HTTP",
      },
    };

    // Activar bearerAuth por defecto globalmente si no hay ninguno
    const updatedGlobal =
      globalSecurity.length === 0 ? [{ bearerAuth: [] }] : globalSecurity;

    const updatedProject: Project = {
      ...safeProject,
      document: {
        ...safeProject.document,
        security_schemes: updatedSchemes,
        security: updatedGlobal,
      },
    };

    onUpdateProject(updatedProject);
    setSelectedSchemeName("bearerAuth");
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden", backgroundColor: "var(--bg-app)" }}>
      {/* Columna Izquierda: Master List de Esquemas de Seguridad */}
      <div
        style={{
          width: "320px",
          borderRight: "2px solid var(--border-strong)",
          backgroundColor: "var(--bg-surface)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "0.85rem", borderBottom: "2px solid var(--border-strong)", backgroundColor: "var(--bg-surface-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <span style={{ fontWeight: 900, fontSize: "0.82rem", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>
              // AUTH METHODS [{schemeNames.length < 10 ? `0${schemeNames.length}` : schemeNames.length}]
            </span>
            <button
              onClick={() => setNewSchemeModalOpen(true)}
              style={{
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                padding: "0.3rem 0.6rem",
                fontSize: "0.72rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                border: "1px solid #000000",
                boxShadow: "1px 1px 0px 0px #000000",
                cursor: "pointer",
              }}
              title="Crear nuevo método de autenticación"
            >
              <Plus size={12} strokeWidth={3} />
              NUEVO
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "0.6rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Buscar esquema de seguridad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.45rem 0.6rem 0.45rem 2rem",
                fontSize: "0.78rem",
                border: "1px solid var(--border-main)",
                backgroundColor: "var(--bg-app)",
                color: "var(--text-main)",
                fontFamily: "var(--font-mono)",
              }}
            />
          </div>
        </div>

        {/* Lista con scroll */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {filteredSchemeNames.length === 0 ? (
            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
              {searchQuery ? "// NINGUNA COINCIDENCIA" : "// SIN MÉTODOS DE AUTENTICACIÓN"}
              {!searchQuery && schemeNames.length === 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <button
                    onClick={handleLoadPresets}
                    style={{
                      padding: "0.55rem 0.85rem",
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      fontFamily: "var(--font-mono)",
                      border: "1px solid #000000",
                      boxShadow: "2px 2px 0px 0px #000000",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      cursor: "pointer",
                    }}
                  >
                    <Sparkles size={13} />
                    CARGAR PRESETS (JWT / API KEY)
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredSchemeNames.map((name, idx) => {
              const s = securitySchemes[name];
              const isSelected = name === selectedSchemeName;
              const isGlobal = isGlobalActive(name);
              const indexStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

              const typeBadge =
                s.type === "http"
                  ? `http/${s.scheme ?? "bearer"}`
                  : s.type === "apiKey"
                  ? `apiKey/${s.in ?? "header"}`
                  : s.type;

              return (
                <div
                  key={name}
                  onClick={() => setSelectedSchemeName(name)}
                  style={{
                    padding: "0.65rem 0.75rem",
                    marginBottom: "0.35rem",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "var(--bg-app)" : "transparent",
                    border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-subtle)"}`,
                    borderLeft: `3px solid ${isSelected ? "var(--primary)" : "transparent"}`,
                    boxShadow: isSelected ? "2px 2px 0px 0px var(--primary)" : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    transition: "all 0.1s ease",
                  }}
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.68rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        {indexStr}
                      </span>
                      <ShieldCheck size={13} style={{ color: "var(--primary)", flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: isSelected ? 800 : 600,
                          color: isSelected ? "var(--primary)" : "var(--text-main)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {name}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem" }}>
                      <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        [{typeBadge}]
                      </span>
                      {isGlobal && (
                        <span
                          style={{
                            fontSize: "0.6rem",
                            padding: "0.05rem 0.3rem",
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "var(--success)",
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        >
                          GLOBAL
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScheme(name);
                    }}
                    style={{
                      padding: "0.25rem 0.35rem",
                      color: "var(--text-muted)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      opacity: 0.7,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--error)";
                      e.currentTarget.style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text-muted)";
                      e.currentTarget.style.opacity = "0.7";
                    }}
                    title="Eliminar esquema de seguridad"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Columna Derecha: Detalle y Editor del Esquema de Seguridad */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedScheme && selectedSchemeName ? (
          <>
            {/* Header */}
            <div
              style={{
                padding: "0.85rem 1.5rem",
                backgroundColor: "var(--bg-surface)",
                borderBottom: "2px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Lock size={20} style={{ color: "var(--primary)", flexShrink: 0 }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2
                      style={{
                        margin: 0,
                        fontSize: "1.15rem",
                        fontWeight: 900,
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.02em",
                      }}
                    >
                      {selectedSchemeName}
                    </h2>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.5rem",
                        backgroundColor: "var(--bg-surface-subtle)",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      components.securitySchemes.{selectedSchemeName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => setShowJsonPreview(!showJsonPreview)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--border-strong)",
                    backgroundColor: showJsonPreview ? "var(--primary)" : "var(--bg-surface)",
                    color: showJsonPreview ? "#ffffff" : "var(--text-main)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                >
                  <Code2 size={13} />
                  {showJsonPreview ? "OCULTAR JSON" : "VER JSON SPEC"}
                </button>

                <button
                  onClick={() => handleDeleteScheme(selectedSchemeName)}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "1px solid var(--error)",
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    color: "var(--error)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    cursor: "pointer",
                  }}
                >
                  <Trash2 size={13} />
                  ELIMINAR
                </button>
              </div>
            </div>

            {/* Editor Container */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "1.5rem",
              }}
            >
              {/* Banner de Estado Global */}
              <div
                style={{
                  backgroundColor: isGlobalActive(selectedSchemeName)
                    ? "rgba(16, 185, 129, 0.08)"
                    : "var(--bg-surface)",
                  border: `2px solid ${isGlobalActive(selectedSchemeName) ? "var(--success)" : "var(--border-strong)"}`,
                  boxShadow: "3px 3px 0px 0px var(--border-strong)",
                  padding: "1.2rem",
                  marginBottom: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                    {isGlobalActive(selectedSchemeName) ? (
                      <CheckCircle2 size={16} style={{ color: "var(--success)" }} />
                    ) : (
                      <Globe size={16} style={{ color: "var(--text-muted)" }} />
                    )}
                    <span style={{ fontWeight: 900, fontSize: "0.9rem", fontFamily: "var(--font-mono)" }}>
                      REQUISITO DE SEGURIDAD GLOBAL (security: [{selectedSchemeName}: []])
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {isGlobalActive(selectedSchemeName)
                      ? "Este método de autenticación está activo globalmente en todas las operaciones del contrato salvo las que lo anulen."
                      : "Activa este método para aplicarlo automáticamente a toda la API como requisito obligatorio por defecto."}
                  </p>
                </div>

                <button
                  onClick={() => handleToggleGlobalSecurity(selectedSchemeName)}
                  style={{
                    padding: "0.45rem 1rem",
                    fontSize: "0.76rem",
                    fontWeight: 900,
                    fontFamily: "var(--font-mono)",
                    border: "1.5px solid #000000",
                    boxShadow: "2px 2px 0px 0px #000000",
                    backgroundColor: isGlobalActive(selectedSchemeName) ? "var(--error)" : "var(--success)",
                    color: "#ffffff",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isGlobalActive(selectedSchemeName) ? "DESACTIVAR GLOBAL" : "ACTIVAR GLOBAL"}
                </button>
              </div>

              {/* Formulario Principal de Configuración */}
              <div
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "2px solid var(--border-strong)",
                  boxShadow: "3px 3px 0px 0px var(--border-strong)",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, marginBottom: "0.3rem" }}>
                  // OPENAPI 3.1 // SECURITY SCHEME SPECIFICATION
                </div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 900, marginBottom: "1.2rem", textTransform: "uppercase" }}>
                  Configuración del Mecanismo de Autenticación
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem", marginBottom: "1.2rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                      TIPO DE ESQUEMA (type)
                    </label>
                    <select
                      value={selectedScheme.type}
                      onChange={(e) => {
                        const newType = e.target.value;
                        updateCurrentScheme((prev) => ({
                          ...prev,
                          type: newType,
                          scheme: newType === "http" ? prev.scheme ?? "bearer" : undefined,
                          bearerFormat: newType === "http" && prev.scheme === "bearer" ? prev.bearerFormat ?? "JWT" : undefined,
                          name: newType === "apiKey" ? prev.name ?? "X-API-KEY" : undefined,
                          in: newType === "apiKey" ? prev.in ?? "header" : undefined,
                        }));
                      }}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.7rem",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-app)",
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    >
                      <option value="http">http (HTTP Authentication: Bearer, Basic)</option>
                      <option value="apiKey">apiKey (API Key en Header, Query o Cookie)</option>
                      <option value="openIdConnect">openIdConnect (Federación OpenID Connect)</option>
                      <option value="oauth2">oauth2 (Flujos OAuth 2.0)</option>
                    </select>
                  </div>

                  {/* Campos condicionales para tipo HTTP */}
                  {selectedScheme.type === "http" && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                        ESQUEMA HTTP (scheme)
                      </label>
                      <select
                        value={selectedScheme.scheme ?? "bearer"}
                        onChange={(e) =>
                          updateCurrentScheme((prev) => ({
                            ...prev,
                            scheme: e.target.value,
                            bearerFormat: e.target.value === "bearer" ? prev.bearerFormat ?? "JWT" : undefined,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.7rem",
                          border: "1px solid var(--border-main)",
                          backgroundColor: "var(--bg-app)",
                          color: "var(--text-main)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="bearer">bearer (Bearer Token, JWT)</option>
                        <option value="basic">basic (Basic Auth: Usuario & Contraseña)</option>
                      </select>
                    </div>
                  )}

                  {/* Campos condicionales para tipo apiKey */}
                  {selectedScheme.type === "apiKey" && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                        UBICACIÓN DEL API KEY (in)
                      </label>
                      <select
                        value={selectedScheme.in ?? "header"}
                        onChange={(e) =>
                          updateCurrentScheme((prev) => ({
                            ...prev,
                            in: e.target.value,
                          }))
                        }
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.7rem",
                          border: "1px solid var(--border-main)",
                          backgroundColor: "var(--bg-app)",
                          color: "var(--text-main)",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.85rem",
                        }}
                      >
                        <option value="header">header (Cabecera HTTP, ej. X-API-KEY)</option>
                        <option value="query">query (Parámetro de consulta URL, ej. ?api_key=...)</option>
                        <option value="cookie">cookie (Cookie de sesión HTTP)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Subcampos específicos */}
                {selectedScheme.type === "http" && selectedScheme.scheme === "bearer" && (
                  <div style={{ marginBottom: "1.2rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                      FORMATO DEL TOKEN BEARER (bearerFormat)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. JWT, OAuth2, SAML..."
                      value={selectedScheme.bearerFormat ?? ""}
                      onChange={(e) =>
                        updateCurrentScheme((prev) => ({
                          ...prev,
                          bearerFormat: e.target.value || undefined,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.7rem",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-app)",
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                )}

                {selectedScheme.type === "apiKey" && (
                  <div style={{ marginBottom: "1.2rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                      NOMBRE DEL PARÁMETRO O CABECERA (name)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. X-API-KEY, api_key, Authorization..."
                      value={selectedScheme.name ?? ""}
                      onChange={(e) =>
                        updateCurrentScheme((prev) => ({
                          ...prev,
                          name: e.target.value || undefined,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.7rem",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-app)",
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                )}

                {selectedScheme.type === "openIdConnect" && (
                  <div style={{ marginBottom: "1.2rem" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                      URL DE CONFIGURACIÓN OPENID CONNECT (openIdConnectUrl)
                    </label>
                    <input
                      type="text"
                      placeholder="https://auth.example.com/.well-known/openid-configuration"
                      value={selectedScheme.openIdConnectUrl ?? ""}
                      onChange={(e) =>
                        updateCurrentScheme((prev) => ({
                          ...prev,
                          openIdConnectUrl: e.target.value || undefined,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.7rem",
                        border: "1px solid var(--border-main)",
                        backgroundColor: "var(--bg-app)",
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                    DESCRIPCIÓN DEL MÉTODO DE AUTENTICACIÓN
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe los requisitos, obtención de credenciales o alcances para consumir la API..."
                    value={selectedScheme.description ?? ""}
                    onChange={(e) =>
                      updateCurrentScheme((prev) => ({
                        ...prev,
                        description: e.target.value || undefined,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.7rem",
                      border: "1px solid var(--border-main)",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                    }}
                  />
                </div>
              </div>

              {/* Vista Previa JSON Schema */}
              {showJsonPreview && (
                <div
                  style={{
                    backgroundColor: "#060709",
                    color: "var(--accent-citron)",
                    border: "2px solid #000000",
                    padding: "1rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.78rem",
                    overflowX: "auto",
                    marginBottom: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.3rem" }}>
                    <span style={{ color: "var(--primary)", fontWeight: 800 }}>
                      // GENERATED OPENAPI 3.1 SECURITY SPEC
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "#8b92a3" }}>
                      components.securitySchemes.{selectedSchemeName}
                    </span>
                  </div>
                  <pre>
                    {JSON.stringify(
                      {
                        "components.securitySchemes": {
                          [selectedSchemeName]: selectedScheme,
                        },
                        "api.security (global)": globalSecurity,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                backgroundColor: "var(--bg-surface)",
                border: "2px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--primary)",
              }}
            >
              <Key size={28} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "0.3rem" }}>
                Ningún Método de Autenticación Seleccionado
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "420px" }}>
                Crea un nuevo método o carga presets (Bearer JWT / API Key) para asegurar los endpoints de tu API.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nuevo Esquema de Seguridad */}
      {newSchemeModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.65)",
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
              border: "3px solid #000000",
              boxShadow: "6px 6px 0px 0px #000000",
              width: "480px",
              padding: "1.5rem",
            }}
          >
            <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 900, marginBottom: "0.3rem" }}>
              // SECURITY SPEC // NUEVO MÉTODO
            </div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 900, marginBottom: "1rem", textTransform: "uppercase" }}>
              Definir Esquema de Seguridad
            </h3>

            {newSchemeError && (
              <div style={{ padding: "0.5rem", backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid var(--error)", color: "var(--error)", fontSize: "0.75rem", fontFamily: "var(--font-mono)", marginBottom: "1rem" }}>
                {newSchemeError}
              </div>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                IDENTIFICADOR EN COMPONENTS (Ej. bearerAuth, apiKeyHeader)
              </label>
              <input
                type="text"
                placeholder="bearerAuth"
                value={newSchemeName}
                onChange={(e) => setNewSchemeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateScheme();
                }}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  border: "1px solid var(--border-main)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                }}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                MECANISMO DE AUTENTICACIÓN
              </label>
              <select
                value={newSchemeType}
                onChange={(e) => setNewSchemeType(e.target.value as "http" | "apiKey" | "openIdConnect")}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.7rem",
                  border: "1px solid var(--border-main)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="http">HTTP Bearer (Token JWT / OAuth2)</option>
                <option value="apiKey">API Key (Header / Query / Cookie)</option>
                <option value="openIdConnect">OpenID Connect Discovery</option>
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
              <button
                onClick={() => {
                  setNewSchemeModalOpen(false);
                  setNewSchemeError(null);
                }}
                style={{
                  padding: "0.45rem 1rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-main)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                CANCELAR
              </button>
              <button
                onClick={handleCreateScheme}
                style={{
                  padding: "0.45rem 1.2rem",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  border: "1.5px solid #000000",
                  boxShadow: "2px 2px 0px 0px #000000",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                CREAR ESQUEMA
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
