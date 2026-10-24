import React from "react";
import { ViewId } from "../app/types";
import {
  Save,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Database,
  ChevronRight,
  Download,
  Upload,
} from "lucide-react";

interface HeaderProps {
  currentView: ViewId;
  activeProjectName?: string;
  isBackendConnected: boolean;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onManualSave?: () => void;
  onExport?: () => void;
  onImport?: () => void;
}

const VIEW_TITLES: Record<ViewId, string> = {
  projects: "DIRECTORIO DE PROYECTOS",
  metadata: "METADATOS & CONTRATO",
  schemas: "MODELADO DE ESQUEMAS",
  operations: "OPERACIONES REST",
  security: "AUTENTICACIÓN & SEGURIDAD",
  validation: "DIAGNÓSTICOS & REGLAS",
  documentation: "DOCUMENTACIÓN OPENAPI",
  settings: "CONFIGURACIÓN DEL SISTEMA",
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  activeProjectName = "Sin proyecto abierto",
  isBackendConnected,
  saveStatus = "idle",
  onManualSave,
  onExport,
  onImport,
}) => {
  const renderSaveIndicator = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--warning)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            <RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} />
            PERSISTIENDO...
          </span>
        );
      case "saved":
        return (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--success)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            <CheckCircle2 size={13} />
            GUARDADO (SQLITE)
          </span>
        );
      case "error":
        return (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--error)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            <AlertCircle size={13} />
            ERROR AL GUARDAR
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header
      style={{
        height: "var(--header-height)",
        backgroundColor: "var(--bg-surface)",
        borderBottom: "2px solid var(--border-strong)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1.25rem",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* Breadcrumb & Section Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 800, color: "var(--text-main)" }}>CAAD</span>
          <ChevronRight size={13} />
          <span style={{ color: "var(--primary)", fontWeight: 700 }}>
            {VIEW_TITLES[currentView]}
          </span>
        </div>

        {activeProjectName && activeProjectName !== "Sin proyecto abierto" && (
          <div
            style={{
              fontSize: "0.75rem",
              padding: "0.2rem 0.65rem",
              backgroundColor: "var(--bg-surface-subtle)",
              color: "var(--text-main)",
              border: "1px solid var(--border-main)",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              whiteSpace: "nowrap",
              maxWidth: "280px",
            }}
          >
            <span style={{ color: "var(--primary)", fontWeight: 800 }}>PROYECTO:</span>
            <span
              style={{
                color: "var(--text-main)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={activeProjectName}
            >
              [{activeProjectName}]
            </span>
          </div>
        )}
      </div>

      {/* Persistence & System Status */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Save Indicator */}
        <div style={{ minWidth: "120px", display: "flex", justifyContent: "flex-end" }}>
          {renderSaveIndicator()}
        </div>

        {onExport && (
          <button
            onClick={onExport}
            style={{
              padding: "0.35rem 0.8rem",
              backgroundColor: "var(--bg-surface-subtle)",
              color: "var(--text-main)",
              fontSize: "0.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              border: "1px solid var(--border-strong)",
              letterSpacing: "0.05em",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--primary)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-surface-subtle)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            title="Exportar especificación OpenAPI (JSON/YAML)"
          >
            <Download size={13} />
            EXPORTAR
          </button>
        )}

        {onImport && (
          <button
            onClick={onImport}
            style={{
              padding: "0.35rem 0.8rem",
              backgroundColor: "var(--bg-surface-subtle)",
              color: "var(--text-main)",
              fontSize: "0.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              border: "1px solid var(--border-strong)",
              letterSpacing: "0.05em",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--primary)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-surface-subtle)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            title="Importar especificación OpenAPI"
          >
            <Upload size={13} />
            IMPORTAR
          </button>
        )}

        {onManualSave && (
          <button
            onClick={onManualSave}
            style={{
              padding: "0.35rem 0.8rem",
              backgroundColor: "var(--text-main)",
              color: "var(--bg-surface)",
              fontSize: "0.75rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              border: "1px solid var(--border-strong)",
              letterSpacing: "0.05em",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--primary)";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--text-main)";
              e.currentTarget.style.color = "var(--bg-surface)";
            }}
          >
            <Save size={13} />
            GUARDAR
          </button>
        )}

        {/* Backend Connectivity Status */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.72rem",
            fontFamily: "var(--font-mono)",
            padding: "0.25rem 0.6rem",
            backgroundColor: "var(--bg-surface-subtle)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Database size={12} style={{ color: isBackendConnected ? "var(--success)" : "var(--error)" }} />
          <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>CORE:</span>
          <span
            style={{
              fontWeight: 800,
              color: isBackendConnected ? "var(--success)" : "var(--error)",
            }}
          >
            {isBackendConnected ? "CONECTADO" : "SIN CONEXIÓN"}
          </span>
        </div>
      </div>
    </header>
  );
};
