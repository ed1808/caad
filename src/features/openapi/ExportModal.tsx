import React, { useState, useEffect } from "react";
import { Project, DesignIssue } from "../../app/types";
import { exportDocumentJson, exportDocumentYaml, validateDocument, saveExportedFile, openExportFolder } from "../../lib/tauri";
import {
  X,
  Copy,
  Check,
  Download,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
  FolderOpen,
} from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
}) => {
  const [format, setFormat] = useState<"yaml" | "json">("yaml");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [issues, setIssues] = useState<DesignIssue[]>([]);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportNotice, setExportNotice] = useState<{
    type: "success" | "info" | "error";
    text: string;
    savedPath?: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const [text, validationResult] = await Promise.all([
          format === "yaml"
            ? exportDocumentYaml(project.document)
            : exportDocumentJson(project.document),
          validateDocument(project.document),
        ]);

        if (isMounted) {
          setContent(text);
          setIssues(validationResult);
        }
      } catch (err) {
        console.error("Error al exportar documento:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, format, project]);

  if (!isOpen) return null;

  const errorsCount = issues.filter((i) => i.severity === "error").length;
  const warningsCount = issues.filter((i) => i.severity === "warning").length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar al portapapeles:", err);
    }
  };

  const handleDownload = async () => {
    setIsExporting(true);
    setExportNotice(null);
    const filename = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-openapi.${format}`;

    try {
      const res = await saveExportedFile(filename, format, content);
      if (res.success) {
        setExportNotice({
          type: "success",
          text: res.message,
          savedPath: res.saved_path,
        });
      } else {
        setExportNotice({
          type: "error",
          text: res.message || "No se pudo completar la exportación del archivo.",
        });
      }
    } catch (err) {
      setExportNotice({
        type: "error",
        text: `Error al exportar archivo: ${err}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "2px solid var(--border-strong)",
          boxShadow: "6px 6px 0px 0px var(--border-strong)",
          width: "100%",
          maxWidth: "850px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: "1.2rem 1.5rem",
            backgroundColor: "var(--bg-surface)",
            borderBottom: "2px solid var(--border-main)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
              // INTEROPERABILIDAD // EXPORTADOR OPENAPI 3.1
            </div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Exportar Contrato: {project.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: "0.4rem",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Toolbar de Formato y Validación */}
        <div
          style={{
            padding: "0.8rem 1.5rem",
            backgroundColor: "var(--bg-app)",
            borderBottom: "1px solid var(--border-main)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.8rem",
          }}
        >
          {/* Selector de Formato */}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setFormat("yaml")}
              style={{
                padding: "0.4rem 0.9rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: 800,
                cursor: "pointer",
                border: `2px solid ${format === "yaml" ? "var(--primary)" : "var(--border-main)"}`,
                backgroundColor: format === "yaml" ? "var(--primary)" : "var(--bg-surface)",
                color: format === "yaml" ? "#000000" : "var(--text-main)",
                transition: "all 0.15s ease",
              }}
            >
              YAML (OPENAPI 3.1)
            </button>
            <button
              onClick={() => setFormat("json")}
              style={{
                padding: "0.4rem 0.9rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
                fontWeight: 800,
                cursor: "pointer",
                border: `2px solid ${format === "json" ? "var(--primary)" : "var(--border-main)"}`,
                backgroundColor: format === "json" ? "var(--primary)" : "var(--bg-surface)",
                color: format === "json" ? "#000000" : "var(--text-main)",
                transition: "all 0.15s ease",
              }}
            >
              JSON (PRETTY PRINT)
            </button>
          </div>

          {/* Banner de Estado de Validación */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {errorsCount > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  color: "var(--error)",
                  backgroundColor: "var(--error-subtle)",
                  border: "1px solid var(--error)",
                  padding: "0.25rem 0.6rem",
                }}
              >
                <AlertTriangle size={13} />
                {errorsCount} ERROR{errorsCount > 1 ? "ES" : ""} ESTRUCTURAL{errorsCount > 1 ? "ES" : ""}
              </span>
            ) : warningsCount > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  color: "var(--warning)",
                  backgroundColor: "var(--warning-subtle)",
                  border: "1px solid var(--warning)",
                  padding: "0.25rem 0.6rem",
                }}
              >
                <AlertTriangle size={13} />
                {warningsCount} OBSERVACI{warningsCount > 1 ? "ONES" : "ÓN"} DE DISEÑO
              </span>
            ) : (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  color: "var(--success)",
                  backgroundColor: "var(--success-subtle)",
                  border: "1px solid var(--success)",
                  padding: "0.25rem 0.6rem",
                }}
              >
                <CheckCircle2 size={13} />
                ESPECIFICACIÓN 100% VÁLIDA
              </span>
            )}
          </div>
        </div>

        {/* Visor de Código */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            backgroundColor: "#0d0e11",
            padding: "1rem 1.2rem",
            position: "relative",
          }}
        >
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "300px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.85rem",
                gap: "0.6rem",
              }}
            >
              <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
              GENERANDO DOCUMENTO OPENAPI 3.1...
            </div>
          ) : (
            <pre
              style={{
                margin: 0,
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                lineHeight: 1.5,
                color: "#e2e8f0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              <code>{content}</code>
            </pre>
          )}
        </div>

        {/* Banner de Resultado de Exportación */}
        {exportNotice && (
          <div
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor:
                exportNotice.type === "success"
                  ? "var(--success-subtle)"
                  : exportNotice.type === "error"
                  ? "var(--error-subtle)"
                  : "var(--bg-app)",
              borderTop: `1px solid ${
                exportNotice.type === "success"
                  ? "var(--success)"
                  : exportNotice.type === "error"
                  ? "var(--error)"
                  : "var(--border-main)"
              }`,
              color:
                exportNotice.type === "success"
                  ? "var(--success)"
                  : exportNotice.type === "error"
                  ? "var(--error)"
                  : "var(--text-main)",
              fontFamily: "var(--font-mono)",
              fontSize: "0.78rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.8rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "260px" }}>
              {exportNotice.type === "success" ? (
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              ) : exportNotice.type === "error" ? (
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              ) : (
                <Info size={16} style={{ flexShrink: 0 }} />
              )}
              <span style={{ wordBreak: "break-all" }}>{exportNotice.text}</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {exportNotice.savedPath && (
                <button
                  onClick={() => openExportFolder(exportNotice.savedPath)}
                  title="Abrir carpeta contenedora en el explorador de archivos del sistema"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-strong)",
                    color: "var(--text-main)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.3rem 0.65rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--primary)";
                    e.currentTarget.style.color = "var(--primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                    e.currentTarget.style.color = "var(--text-main)";
                  }}
                >
                  <FolderOpen size={13} />
                  ABRIR EN CARPETA
                </button>
              )}
              <button
                onClick={() => setExportNotice(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "inherit",
                  cursor: "pointer",
                  padding: "0.2rem",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Barra de Acciones del Pie */}
        <div
          style={{
            padding: "1rem 1.5rem",
            backgroundColor: "var(--bg-surface)",
            borderTop: "2px solid var(--border-main)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.8rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            <span>Exporta hacia tu sistema o a <code>~/.local/share/caad/exports/</code></span>
            <button
              onClick={() => openExportFolder()}
              title="Abrir directorio ~/.local/share/caad/exports/"
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <FolderOpen size={12} />
              abrir carpeta
            </button>
          </div>

          <div style={{ display: "flex", gap: "0.8rem" }}>
            <button
              onClick={handleCopy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                backgroundColor: "var(--bg-app)",
                border: "2px solid var(--border-strong)",
                color: "var(--text-main)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                fontWeight: 800,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.color = "var(--primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-strong)";
                e.currentTarget.style.color = "var(--text-main)";
              }}
            >
              {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
              {copied ? "COPIADO" : "COPIAR"}
            </button>

            <button
              onClick={handleDownload}
              disabled={isExporting}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1.2rem",
                backgroundColor: "var(--primary)",
                border: "2px solid #000000",
                color: "#ffffff",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                fontWeight: 800,
                cursor: isExporting ? "wait" : "pointer",
                boxShadow: "3px 3px 0px 0px #000000",
                transition: "all 0.15s ease",
                opacity: isExporting ? 0.8 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isExporting) {
                  e.currentTarget.style.transform = "translate(-1px, -1px)";
                  e.currentTarget.style.boxShadow = "4px 4px 0px 0px #000000";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "3px 3px 0px 0px #000000";
              }}
            >
              {isExporting ? (
                <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Download size={14} />
              )}
              {isExporting ? "GUARDANDO..." : `GUARDAR .${format.toUpperCase()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
