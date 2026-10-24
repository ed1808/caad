import React, { useState, useEffect, useMemo } from "react";
import { Project, DesignIssue, IssueSeverity, ViewId, HttpMethod } from "../../app/types";
import { EmptyView } from "../../components/EmptyView";
import { validateDocument } from "../../lib/tauri";
import {
  ShieldAlert,
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Search,
  ArrowUpRight,
  Sparkles,
  Layers,
  Code2,
} from "lucide-react";

export interface NavigationTarget {
  view: ViewId;
  schemaName?: string;
  operation?: { path: string; method: HttpMethod };
}

interface ValidationViewProps {
  project: Project | null;
  onNavigateToElement?: (target: NavigationTarget) => void;
  onNavigateToProjects: () => void;
}

export const ValidationView: React.FC<ValidationViewProps> = ({
  project,
  onNavigateToElement,
  onNavigateToProjects,
}) => {
  const [issues, setIssues] = useState<DesignIssue[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<"all" | IssueSeverity>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const runValidation = async () => {
    if (!project) {
      setIssues([]);
      return;
    }
    setIsValidating(true);
    try {
      const results = await validateDocument(project.document);
      setIssues(results);
    } catch (err) {
      console.error("Error al validar documento:", err);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, [project]);

  // Contadores por severidad
  const counts = useMemo(() => {
    let error = 0;
    let warning = 0;
    let suggestion = 0;
    for (const issue of issues) {
      if (issue.severity === "error") error++;
      else if (issue.severity === "warning") warning++;
      else if (issue.severity === "suggestion") suggestion++;
    }
    return {
      all: issues.length,
      error,
      warning,
      suggestion,
    };
  }, [issues]);

  // Filtrado de diagnósticos
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // Filtro de pestaña
      if (activeSeverityFilter !== "all" && issue.severity !== activeSeverityFilter) {
        return false;
      }
      // Filtro de búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesRule = issue.rule_id.toLowerCase().includes(q);
        const matchesTitle = issue.title.toLowerCase().includes(q);
        const matchesMsg = issue.message.toLowerCase().includes(q);
        const matchesLoc = issue.location.toLowerCase().includes(q);
        return matchesRule || matchesTitle || matchesMsg || matchesLoc;
      }
      return true;
    });
  }, [issues, activeSeverityFilter, searchQuery]);

  // Si no hay proyecto abierto, mostrar vista vacía amigable
  if (!project) {
    return (
      <EmptyView
        icon={ShieldAlert}
        title="Sin proyecto abierto"
        description="Abre o crea un proyecto desde el directorio para evaluar las reglas deterministas de diseño, consistencia y conformidad con OpenAPI 3.1."
        actionLabel="IR AL DIRECTORIO"
        onAction={onNavigateToProjects}
      />
    );
  }

  // Parsear puntero JSON Pointer a destino de navegación
  const parseNavigationTarget = (location: string): { target: NavigationTarget; label: string } | null => {
    if (!location) return null;

    if (location.startsWith("/info")) {
      return {
        target: { view: "metadata" },
        label: "EDITAR EN METADATOS",
      };
    }

    if (location.startsWith("/components/schemas/")) {
      const remainder = location.replace("/components/schemas/", "");
      const segments = remainder.split("/");
      const rawSchemaName = segments[0] || "";
      const schemaName = rawSchemaName.replace(/~1/g, "/").replace(/~0/g, "~");
      return {
        target: { view: "schemas", schemaName },
        label: `EDITAR ESQUEMA (${schemaName})`,
      };
    }

    if (location.startsWith("/paths/")) {
      const remainder = location.replace("/paths/", "");
      const segments = remainder.split("/");
      if (segments.length >= 2) {
        const rawPath = segments[0];
        const rawMethod = segments[1];
        const path = rawPath.replace(/~1/g, "/").replace(/~0/g, "~");
        const method = rawMethod.toUpperCase() as HttpMethod;
        return {
          target: { view: "operations", operation: { path, method } },
          label: `EDITAR ENDPOINT (${method} ${path})`,
        };
      }
    }

    return null;
  };

  const getSeverityBadge = (sev: IssueSeverity) => {
    switch (sev) {
      case "error":
        return {
          label: "ERROR ESTRUCTURAL",
          bg: "var(--error-subtle)",
          border: "var(--error)",
          color: "var(--error)",
          icon: AlertOctagon,
        };
      case "warning":
        return {
          label: "ADVERTENCIA",
          bg: "var(--warning-subtle)",
          border: "var(--warning)",
          color: "var(--warning)",
          icon: AlertTriangle,
        };
      case "suggestion":
        return {
          label: "SUGERENCIA",
          bg: "rgba(6, 182, 212, 0.12)",
          border: "#06b6d4",
          color: "#0284c7",
          icon: Lightbulb,
        };
    }
  };

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
      {/* Cabecera de la Vista de Validación */}
      <div
        style={{
          padding: "1.2rem 1.8rem",
          backgroundColor: "var(--bg-surface)",
          borderBottom: "2px solid var(--border-main)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              fontFamily: "var(--font-mono)",
              color: "var(--primary)",
              fontWeight: 800,
              letterSpacing: "0.1em",
              marginBottom: "0.2rem",
            }}
          >
            // DIAGNOSTICS & HEALTH // MOTOR DE VALIDACIÓN RUST
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <h1
              style={{
                fontSize: "1.3rem",
                fontWeight: 900,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Diagnósticos del Contrato
            </h1>
            <span
              style={{
                fontSize: "0.7rem",
                fontFamily: "var(--font-mono)",
                padding: "0.2rem 0.5rem",
                backgroundColor: "var(--bg-app)",
                border: "1px solid var(--border-main)",
                color: "var(--text-muted)",
              }}
            >
              PROYECTO: {project.name}
            </span>
          </div>
        </div>

        <button
          onClick={runValidation}
          disabled={isValidating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.1rem",
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--border-main)",
            color: "var(--text-main)",
            fontFamily: "var(--font-mono)",
            fontSize: "0.8rem",
            fontWeight: 800,
            cursor: isValidating ? "wait" : "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!isValidating) {
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.color = "var(--primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isValidating) {
              e.currentTarget.style.borderColor = "var(--border-main)";
              e.currentTarget.style.color = "var(--text-main)";
            }
          }}
        >
          <RefreshCw
            size={14}
            style={{
              animation: isValidating ? "spin 1s linear infinite" : "none",
            }}
          />
          {isValidating ? "EVALUANDO..." : "RE-EVALUAR DIAGNÓSTICOS"}
        </button>
      </div>

      {/* Contenedor con Scroll de Métricas y Lista */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem 1.8rem 16rem 1.8rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Tarjetas de Métricas de Diagnóstico */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Card: Total */}
          <div
            onClick={() => setActiveSeverityFilter("all")}
            style={{
              backgroundColor: "var(--bg-surface)",
              border: `2px solid ${activeSeverityFilter === "all" ? "var(--primary)" : "var(--border-main)"}`,
              padding: "1rem 1.2rem",
              boxShadow: activeSeverityFilter === "all" ? "3px 3px 0px 0px var(--primary)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 800 }}>
                TOTAL OBSERVACIONES
              </span>
              <Layers size={16} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "var(--font-mono)" }}>
              {counts.all}
            </div>
          </div>

          {/* Card: Errores */}
          <div
            onClick={() => setActiveSeverityFilter("error")}
            style={{
              backgroundColor: "var(--bg-surface)",
              border: `2px solid ${activeSeverityFilter === "error" ? "#ef4444" : "var(--border-main)"}`,
              padding: "1rem 1.2rem",
              boxShadow: activeSeverityFilter === "error" ? "3px 3px 0px 0px #ef4444" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#f87171", fontWeight: 800 }}>
                ERRORES ESTRUCTURALES
              </span>
              <AlertOctagon size={16} color="#ef4444" />
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: counts.error > 0 ? "#f87171" : "var(--text-main)" }}>
              {counts.error}
            </div>
          </div>

          {/* Card: Advertencias */}
          <div
            onClick={() => setActiveSeverityFilter("warning")}
            style={{
              backgroundColor: "var(--bg-surface)",
              border: `2px solid ${activeSeverityFilter === "warning" ? "#f59e0b" : "var(--border-main)"}`,
              padding: "1rem 1.2rem",
              boxShadow: activeSeverityFilter === "warning" ? "3px 3px 0px 0px #f59e0b" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#fbbf24", fontWeight: 800 }}>
                ADVERTENCIAS DE CONSISTENCIA
              </span>
              <AlertTriangle size={16} color="#f59e0b" />
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: counts.warning > 0 ? "#fbbf24" : "var(--text-main)" }}>
              {counts.warning}
            </div>
          </div>

          {/* Card: Sugerencias */}
          <div
            onClick={() => setActiveSeverityFilter("suggestion")}
            style={{
              backgroundColor: "var(--bg-surface)",
              border: `2px solid ${activeSeverityFilter === "suggestion" ? "#06b6d4" : "var(--border-main)"}`,
              padding: "1rem 1.2rem",
              boxShadow: activeSeverityFilter === "suggestion" ? "3px 3px 0px 0px #06b6d4" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "#38bdf8", fontWeight: 800 }}>
                SUGERENCIAS DE DISEÑO
              </span>
              <Lightbulb size={16} color="#06b6d4" />
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: counts.suggestion > 0 ? "#38bdf8" : "var(--text-main)" }}>
              {counts.suggestion}
            </div>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            padding: "0.8rem 1rem",
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--border-main)",
          }}
        >
          {/* Pestañas de Severidad */}
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {(
              [
                { id: "all", label: "TODOS", count: counts.all },
                { id: "error", label: "ERRORES", count: counts.error },
                { id: "warning", label: "ADVERTENCIAS", count: counts.warning },
                { id: "suggestion", label: "SUGERENCIAS", count: counts.suggestion },
              ] as const
            ).map((tab) => {
              const isActive = activeSeverityFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSeverityFilter(tab.id)}
                  style={{
                    padding: "0.4rem 0.8rem",
                    border: `1px solid ${isActive ? "var(--primary)" : "var(--border-main)"}`,
                    backgroundColor: isActive ? "var(--primary)" : "var(--bg-app)",
                    color: isActive ? "#000" : "var(--text-muted)",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      padding: "0.1rem 0.35rem",
                      fontSize: "0.65rem",
                      backgroundColor: isActive ? "#000" : "var(--bg-surface)",
                      color: isActive ? "var(--primary)" : "var(--text-main)",
                      borderRadius: "2px",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Input de Búsqueda */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "var(--bg-app)",
              border: "1px solid var(--border-main)",
              padding: "0.35rem 0.7rem",
              minWidth: "280px",
              flex: "1 1 280px",
              maxWidth: "420px",
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por código, regla o ruta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-main)",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                width: "100%",
              }}
            />
          </div>
        </div>

        {/* Estado: 0 Observaciones (Contrato 100% Saludable) */}
        {issues.length === 0 && !isValidating && (
          <div
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--success)",
              boxShadow: "4px 4px 0px 0px var(--success)",
            }}
          >
            <CheckCircle2 size={48} color="var(--success)" style={{ margin: "0 auto 1.2rem auto" }} />
            <div
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                color: "var(--success)",
                fontWeight: 900,
                letterSpacing: "0.1em",
                marginBottom: "0.4rem",
              }}
            >
              // CONTRATO 100% SALUDABLE // SIN OBSERVACIONES
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "0.6rem" }}>
              Tu especificación cumple con todas las reglas
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                maxWidth: "600px",
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              No se detectaron errores estructurales (STRUCT-*), advertencias de consistencia (CONS-*) ni sugerencias
              pendientes. La API está lista para ser documentada o exportada a OpenAPI 3.1.
            </p>
          </div>
        )}

        {/* Estado: Filtrado vacío */}
        {issues.length > 0 && filteredIssues.length === 0 && (
          <div
            style={{
              padding: "3rem 2rem",
              textAlign: "center",
              backgroundColor: "var(--bg-surface)",
              border: "2px dashed var(--border-main)",
              color: "var(--text-muted)",
            }}
          >
            <Search size={36} color="var(--text-muted)" style={{ margin: "0 auto 0.8rem auto" }} />
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", margin: 0 }}>
              No se encontraron diagnósticos que coincidan con los criterios de búsqueda o filtro.
            </p>
          </div>
        )}

        {/* Lista de Observaciones */}
        {filteredIssues.map((issue) => {
          const badge = getSeverityBadge(issue.severity);
          const BadgeIcon = badge.icon;
          const nav = parseNavigationTarget(issue.location);

          return (
            <div
              key={issue.id}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: `2px solid ${badge.border}`,
                boxShadow: `3px 3px 0px 0px ${badge.border}`,
                padding: "1.2rem 1.4rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.8rem",
              }}
            >
              {/* Fila Superior: Badges e Identificadores */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.6rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                  {/* Badge de Severidad */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.2rem 0.5rem",
                      backgroundColor: badge.bg,
                      border: `1px solid ${badge.border}`,
                      color: badge.color,
                      fontSize: "0.68rem",
                      fontWeight: 900,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <BadgeIcon size={12} />
                    {badge.label}
                  </span>

                  {/* Código de Regla */}
                  <span
                    style={{
                      padding: "0.2rem 0.5rem",
                      backgroundColor: "var(--bg-app)",
                      border: "1px solid var(--border-strong)",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-main)",
                    }}
                  >
                    {issue.rule_id}
                  </span>

                  {/* Ubicación JSON Pointer */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      fontSize: "0.72rem",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      backgroundColor: "var(--bg-app)",
                      padding: "0.2rem 0.5rem",
                      border: "1px solid var(--border-main)",
                    }}
                  >
                    <Code2 size={12} />
                    {issue.location}
                  </span>
                </div>

                {/* Botón de Navegación 1-Clic al Elemento */}
                {nav && onNavigateToElement && (
                  <button
                    onClick={() => onNavigateToElement(nav.target)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      padding: "0.35rem 0.8rem",
                      backgroundColor: "var(--bg-app)",
                      border: "2px solid var(--border-strong)",
                      color: "var(--text-main)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.72rem",
                      fontWeight: 900,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--primary)";
                      e.currentTarget.style.color = "#000";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-app)";
                      e.currentTarget.style.color = "var(--text-main)";
                    }}
                  >
                    {nav.label}
                    <ArrowUpRight size={13} />
                  </button>
                )}
              </div>

              {/* Título y Mensaje de Diagnóstico */}
              <div>
                <h3
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 900,
                    margin: "0 0 0.35rem 0",
                    letterSpacing: "0.01em",
                  }}
                >
                  {issue.title}
                </h3>
                <p
                  style={{
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {issue.message}
                </p>
              </div>

              {/* Caja de Sugerencia / Acción Recomendada */}
              {issue.suggestion && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    padding: "0.6rem 0.8rem",
                    backgroundColor: "var(--accent-citron-subtle)",
                    border: "1px dashed var(--border-main)",
                    fontSize: "0.8rem",
                    color: "var(--text-main)",
                  }}
                >
                  <Sparkles size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <span style={{ fontWeight: 800, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                      SUGERENCIA DE CORRECCIÓN:{" "}
                    </span>
                    {issue.suggestion}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
