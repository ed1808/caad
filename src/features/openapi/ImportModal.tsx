import React, { useState, useRef } from "react";
import { Project, ImportReport } from "../../app/types";
import {
  parseOpenApi,
  importProjectFromOpenApi,
  replaceProjectFromOpenApi,
} from "../../lib/tauri";
import {
  X,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: Project | null;
  onImportSuccess: (project: Project) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  onImportSuccess,
}) => {
  const [step, setStep] = useState<"input" | "report">("input");
  const [inputMode, setInputMode] = useState<"upload" | "paste">("paste");
  const [rawContent, setRawContent] = useState<string>("");
  const [fileName, setFileName] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  const [targetMode, setTargetMode] = useState<"new" | "replace">("new");
  const [projectName, setProjectName] = useState<string>("");
  const [isImporting, setIsImporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawContent(text);
      setAnalysisError(null);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = async () => {
    const trimmed = rawContent.trim();
    if (!trimmed) {
      setAnalysisError("Por favor carga un archivo o pega el contenido OpenAPI en JSON o YAML.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const rep = await parseOpenApi(trimmed);
      setReport(rep);
      const suggestedName = rep.document?.info?.title || "API Importada";
      setProjectName(suggestedName);
      setStep("report");
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!report || !rawContent) return;

    setIsImporting(true);
    setAnalysisError(null);

    try {
      let imported: Project;
      if (targetMode === "replace" && activeProject) {
        imported = await replaceProjectFromOpenApi(activeProject.id, rawContent);
      } else {
        const nameToUse = projectName.trim() || report.document?.info?.title || "Nueva API";
        imported = await importProjectFromOpenApi(nameToUse, rawContent);
      }

      onImportSuccess(imported);
      onClose();
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadSampleWorkshop = () => {
    const sampleYaml = `openapi: 3.1.0
info:
  title: Workshop API (Ejemplo)
  version: 1.0.0
  summary: API de gestión de taller mecánico y vehículos
  description: Ejemplo representativo para validación de interoperabilidad OpenAPI 3.1.
servers:
  - url: https://api.workshop.local/v1
    description: Servidor de desarrollo
paths:
  /vehicles/{vehicleId}:
    get:
      operationId: getVehicleById
      summary: Obtener vehículo por ID
      description: Devuelve la información detallada de un vehículo registrado.
      tags:
        - Vehicles
      parameters:
        - name: vehicleId
          in: path
          required: true
          description: Identificador único del vehículo
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Vehículo encontrado exitosamente
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Vehicle'
        '404':
          description: Vehículo no encontrado
components:
  schemas:
    Vehicle:
      type: object
      required:
        - id
        - licensePlate
        - make
      properties:
        id:
          type: string
          format: uuid
          description: Identificador único
        licensePlate:
          type: string
          description: Matrícula
        make:
          type: string
          description: Marca
`;
    setRawContent(sampleYaml);
    setFileName("workshop-api-sample.yaml");
    setAnalysisError(null);
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
              // INTEROPERABILIDAD // IMPORTADOR OPENAPI 3.1 & 3.0
            </div>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 900,
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {step === "input" ? "Importar Especificación OpenAPI" : "Informe de Compatibilidad e Importación"}
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

        {/* Mensaje de error general si ocurre */}
        {analysisError && (
          <div
            style={{
              padding: "0.8rem 1.5rem",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              borderBottom: "1px solid #ef4444",
              color: "#f87171",
              fontSize: "0.82rem",
              fontFamily: "var(--font-mono)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle size={16} />
            <span>{analysisError}</span>
          </div>
        )}

        {/* Paso 1: Entrada de Especificación (Upload o Paste) */}
        {step === "input" && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
          >
            {/* Opciones de Entrada */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setInputMode("paste")}
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    border: `2px solid ${inputMode === "paste" ? "var(--primary)" : "var(--border-main)"}`,
                    backgroundColor: inputMode === "paste" ? "var(--primary)" : "var(--bg-app)",
                    color: inputMode === "paste" ? "#000000" : "var(--text-main)",
                  }}
                >
                  PEGAR TEXTO (YAML / JSON)
                </button>
                <button
                  onClick={() => setInputMode("upload")}
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    border: `2px solid ${inputMode === "upload" ? "var(--primary)" : "var(--border-main)"}`,
                    backgroundColor: inputMode === "upload" ? "var(--primary)" : "var(--bg-app)",
                    color: inputMode === "upload" ? "#000000" : "var(--text-main)",
                  }}
                >
                  SUBIR ARCHIVO (.yaml, .json)
                </button>
              </div>

              <button
                onClick={handleLoadSampleWorkshop}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  padding: "0.4rem 0.8rem",
                  backgroundColor: "var(--accent-citron-subtle)",
                  border: "1px solid var(--border-strong)",
                  color: "var(--text-main)",
                  fontWeight: 800,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Sparkles size={12} color="var(--primary)" />
                CARGAR EJEMPLO (WORKSHOP API)
              </button>
            </div>

            {/* Zona de Carga de Archivo */}
            {inputMode === "upload" && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed var(--border-strong)",
                  backgroundColor: "var(--bg-app)",
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".yaml,.yml,.json"
                  style={{ display: "none" }}
                  onChange={handleFileUpload}
                />
                <Upload size={36} color="var(--primary)" style={{ margin: "0 auto 0.8rem auto" }} />
                <div style={{ fontWeight: 800, fontSize: "0.95rem", marginBottom: "0.3rem" }}>
                  {fileName ? `Archivo seleccionado: ${fileName}` : "Haz clic para seleccionar un archivo OpenAPI"}
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", fontFamily: "var(--font-mono)" }}>
                  Admite archivos .yaml, .yml y .json de OpenAPI 3.1.0 y 3.0.x
                </div>
              </div>
            )}

            {/* Editor de Texto / Pegado */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  marginBottom: "0.4rem",
                }}
              >
                CONTENIDO DE LA ESPECIFICACIÓN:
              </label>
              <textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder="Pega aquí la definición en YAML o JSON..."
                rows={14}
                style={{
                  width: "100%",
                  padding: "0.8rem",
                  backgroundColor: "var(--bg-app)",
                  border: "2px solid var(--border-main)",
                  color: "var(--text-main)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.8rem",
                  lineHeight: 1.5,
                  resize: "vertical",
                }}
              />
            </div>
          </div>
        )}

        {/* Paso 2: Informe de Compatibilidad y Selección de Destino */}
        {step === "report" && report && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.2rem",
            }}
          >
            {/* Tarjeta de Resumen de Especificación */}
            <div
              style={{
                backgroundColor: "var(--bg-app)",
                border: "2px solid var(--border-main)",
                padding: "1.2rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  VERSIÓN DETECTADA
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
                  OpenAPI {report.detected_version}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  ESQUEMAS DETECTADOS
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                  {report.schemas_count} componentes
                </div>
              </div>

              <div>
                <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                  OPERACIONES REST
                </div>
                <div style={{ fontSize: "1.2rem", fontWeight: 900, fontFamily: "var(--font-mono)" }}>
                  {report.operations_count} endpoints
                </div>
              </div>
            </div>

            {/* Lista de Advertencias / Normalizaciones */}
            <div>
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>OBSERVACIONES DE COMPATIBILIDAD ({report.warnings.length}):</span>
                {report.warnings.length === 0 && (
                  <span style={{ color: "var(--success)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <CheckCircle2 size={13} /> 100% COMPATIBLE SIN PÉRDIDA
                  </span>
                )}
              </div>

              {report.warnings.length === 0 ? (
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "var(--success-subtle)",
                    border: "1px solid var(--success)",
                    fontSize: "0.82rem",
                    color: "var(--text-main)",
                  }}
                >
                  Todas las rutas, métodos, parámetros, esquemas y respuestas se integrarán fielmente sin omitir datos.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                    maxHeight: "180px",
                    overflowY: "auto",
                  }}
                >
                  {report.warnings.map((w, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "0.7rem 0.9rem",
                        backgroundColor: "var(--bg-app)",
                        borderLeft: "3px solid #f59e0b",
                        fontSize: "0.8rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.2rem" }}>
                        <AlertTriangle size={13} color="#f59e0b" />
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "#fbbf24" }}>
                          {w.location}
                        </span>
                      </div>
                      <div style={{ color: "var(--text-main)", marginBottom: "0.2rem" }}>{w.message}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                        <strong>Impacto:</strong> {w.impact}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Destino de la Importación */}
            <div
              style={{
                padding: "1.2rem",
                backgroundColor: "var(--bg-app)",
                border: "2px solid var(--border-strong)",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 800 }}>
                DESTINO DE IMPORTACIÓN:
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="targetMode"
                    checked={targetMode === "new"}
                    onChange={() => setTargetMode("new")}
                  />
                  <strong>Crear como nuevo proyecto</strong>
                </label>

                {targetMode === "new" && (
                  <div style={{ marginLeft: "1.6rem" }}>
                    <label style={{ display: "block", fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                      NOMBRE DEL PROYECTO:
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.5rem 0.8rem",
                        backgroundColor: "var(--bg-surface)",
                        border: "2px solid var(--border-main)",
                        color: "var(--text-main)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.85rem",
                      }}
                    />
                  </div>
                )}

                {activeProject && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      marginTop: "0.4rem",
                    }}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      checked={targetMode === "replace"}
                      onChange={() => setTargetMode("replace")}
                    />
                    <span>
                      Reemplazar contrato en proyecto actual: <strong>{activeProject.name}</strong>
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pie con Acciones */}
        <div
          style={{
            padding: "1rem 1.5rem",
            backgroundColor: "var(--bg-surface)",
            borderTop: "2px solid var(--border-main)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {step === "report" ? (
            <button
              onClick={() => setStep("input")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.55rem 1rem",
                backgroundColor: "var(--bg-app)",
                border: "2px solid var(--border-main)",
                color: "var(--text-main)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <ArrowLeft size={14} />
              VOLVER AL EDITOR
            </button>
          ) : (
            <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
              No se modificará ningún proyecto hasta que confirmes el informe de compatibilidad.
            </div>
          )}

          <div style={{ display: "flex", gap: "0.8rem" }}>
            <button
              onClick={onClose}
              style={{
                padding: "0.55rem 1rem",
                backgroundColor: "var(--bg-app)",
                border: "2px solid var(--border-main)",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              CANCELAR
            </button>

            {step === "input" ? (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1.25rem",
                  backgroundColor: "var(--primary)",
                  border: "2px solid #000000",
                  color: "#ffffff",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  cursor: isAnalyzing ? "wait" : "pointer",
                  boxShadow: "3px 3px 0px 0px #000000",
                }}
              >
                {isAnalyzing ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={14} />}
                {isAnalyzing ? "ANALIZANDO..." : "ANALIZAR COMPATIBILIDAD"}
              </button>
            ) : (
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.55rem 1.4rem",
                  backgroundColor: "var(--primary)",
                  border: "2px solid #000000",
                  color: "#ffffff",
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: isImporting ? "wait" : "pointer",
                  boxShadow: "3px 3px 0px 0px #000000",
                }}
              >
                {isImporting ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={14} />}
                {isImporting ? "IMPORTANDO..." : "CONFIRMAR IMPORTACIÓN"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
