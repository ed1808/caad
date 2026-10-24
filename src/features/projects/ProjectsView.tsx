import React, { useState, useEffect } from "react";
import { ProjectSummaryDto, Project } from "../../app/types";
import {
  listProjects,
  createProject,
  renameProject,
  deleteProject,
  getProject,
  createExampleProject,
} from "../../lib/tauri";
import {
  FolderPlus,
  FolderOpen,
  Edit3,
  Trash2,
  Clock,
  ArrowUpRight,
  Database,
  Layers,
  FileCode2,
  Check,
  X,
  AlertTriangle,
  Upload,
  Sparkles,
} from "lucide-react";

interface ProjectsViewProps {
  activeProjectId?: string;
  onOpenProject: (project: Project) => void;
  onImportClick?: () => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  activeProjectId,
  onOpenProject,
  onImportClick,
}) => {
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Inline de creación
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [createError, setCreateError] = useState<string | null>(null);

  // Renombrado
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");

  // Eliminación
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Carga de Proyecto Demo (Hito 8 / FR-015)
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    setError(null);
    try {
      const demo = await createExampleProject();
      await fetchProjects();
      onOpenProject(demo);
    } catch (err: unknown) {
      console.error("Error al cargar proyecto demo:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listProjects();
      setProjects(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError("El nombre del proyecto no puede estar vacío.");
      return;
    }

    try {
      setCreateError(null);
      const created = await createProject(
        trimmed,
        newDescription.trim() ? newDescription.trim() : undefined
      );
      setNewName("");
      setNewDescription("");
      setIsCreating(false);
      await fetchProjects();
      onOpenProject(created);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpen = async (id: string) => {
    try {
      const proj = await getProject(id);
      if (proj) {
        onOpenProject(proj);
      } else {
        alert("El proyecto no pudo ser cargado.");
      }
    } catch (err: unknown) {
      alert(`Error al abrir: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      alert("El nuevo nombre no puede estar vacío.");
      return;
    }

    try {
      const updated = await renameProject(id, trimmed);
      setRenamingId(null);
      await fetchProjects();
      if (activeProjectId === id) {
        onOpenProject(updated);
      }
    } catch (err: unknown) {
      alert(`Error al renombrar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      setDeletingId(null);
      await fetchProjects();
    } catch (err: unknown) {
      alert(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1080px", margin: "0 auto", overflowY: "auto", height: "100%" }}>
      {/* Top Banner & Title — Cyber-Brutalist Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "1.5rem",
          borderBottom: "2px solid var(--border-strong)",
          paddingBottom: "1.2rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: "0.2rem" }}>
            // WORKSPACE REPOSITORY // SQLITE DB
          </div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 900, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            Directorio de Contratos
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Proyectos de diseño de API REST persistidos localmente con integridad transaccional OpenAPI 3.1.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={handleLoadDemo}
            disabled={isLoadingDemo}
            style={{
              backgroundColor: "var(--accent-citron-subtle)",
              color: "var(--text-main)",
              padding: "0.6rem 1.1rem",
              fontSize: "0.82rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              border: "2px solid var(--border-strong)",
              boxShadow: "3px 3px 0px 0px var(--border-strong)",
              transition: "all 0.1s ease",
              cursor: isLoadingDemo ? "not-allowed" : "pointer",
              opacity: isLoadingDemo ? 0.7 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoadingDemo) {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "4px 4px 0px 0px var(--border-strong)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0px 0px var(--border-strong)";
            }}
            title="Cargar la especificación de taller Workshop API"
          >
            <Sparkles size={16} style={{ color: "var(--primary)" }} />
            {isLoadingDemo ? "CARGANDO..." : "CARGAR DEMO"}
          </button>

          {onImportClick && (
            <button
              onClick={onImportClick}
              style={{
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-main)",
                padding: "0.6rem 1.1rem",
                fontSize: "0.82rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
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
              <Upload size={16} />
              IMPORTAR OPENAPI
            </button>
          )}

          <button
            onClick={() => {
              setIsCreating(true);
              setCreateError(null);
            }}
            style={{
              backgroundColor: "var(--primary)",
              color: "#ffffff",
              padding: "0.6rem 1.25rem",
              fontSize: "0.82rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.05em",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              border: "2px solid #000000",
              boxShadow: "3px 3px 0px 0px #000000",
              transition: "all 0.1s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translate(-1px, -1px)";
              e.currentTarget.style.boxShadow = "4px 4px 0px 0px #000000";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "3px 3px 0px 0px #000000";
            }}
          >
            <FolderPlus size={16} />
            NUEVO PROYECTO
          </button>
        </div>
      </div>

      {/* Cyber-Brutalist Stats Overview (Inspired by Brutalist UI/UX Reference) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--border-strong)",
            padding: "1rem 1.2rem",
            boxShadow: "3px 3px 0px 0px var(--border-strong)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 800 }}>
              TOTAL PROYECTOS
            </span>
            <ArrowUpRight size={14} style={{ color: "var(--primary)" }} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 900, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
            {projects.length < 10 ? `0${projects.length}` : projects.length}
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem", fontFamily: "var(--font-mono)" }}>
            Activos en SQLite local
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--border-strong)",
            padding: "1rem 1.2rem",
            boxShadow: "3px 3px 0px 0px var(--border-strong)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 800 }}>
              ESPECIFICACIÓN API
            </span>
            <FileCode2 size={14} style={{ color: "var(--primary)" }} />
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
            OPENAPI 3.1
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem", fontFamily: "var(--font-mono)" }}>
            JSON Schema 2020-12
          </div>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--border-strong)",
            padding: "1rem 1.2rem",
            boxShadow: "3px 3px 0px 0px var(--border-strong)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)", fontWeight: 800 }}>
              ALMACENAMIENTO
            </span>
            <Database size={14} style={{ color: "var(--success)" }} />
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
            caad.db
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.4rem", fontFamily: "var(--font-mono)" }}>
            PRAGMA user_version = 1
          </div>
        </div>
      </div>

      {/* Banner de Error Global */}
      {error && (
        <div
          style={{
            padding: "0.85rem 1.2rem",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "2px solid var(--error)",
            color: "var(--error)",
            marginBottom: "1.5rem",
            fontSize: "0.82rem",
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Modal / Formulario de Creación de Proyecto */}
      {isCreating && (
        <div
          style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--border-strong)",
            boxShadow: "4px 4px 0px 0px var(--border-strong)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FolderPlus size={18} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: "1rem", fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                Nuevo Proyecto de Contrato
              </h3>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              style={{ color: "var(--text-muted)", padding: "0.2rem" }}
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                NOMBRE DEL PROYECTO *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Workshop API, Billing Service, Inventory System"
                autoFocus
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  border: "2px solid var(--border-main)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.2rem" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                DESCRIPCIÓN DE LA API (OPCIONAL)
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Ej. API para gestión de órdenes de trabajo mecánicas y repuestos"
                style={{
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  border: "2px solid var(--border-main)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-main)",
                  fontSize: "0.85rem",
                }}
              />
            </div>

            {createError && (
              <div
                style={{
                  color: "var(--error)",
                  fontSize: "0.8rem",
                  fontFamily: "var(--font-mono)",
                  marginBottom: "1rem",
                }}
              >
                [ERROR] {createError}
              </div>
            )}

            <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                style={{
                  padding: "0.5rem 1rem",
                  border: "2px solid var(--border-subtle)",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              >
                CANCELAR
              </button>
              <button
                type="submit"
                style={{
                  padding: "0.5rem 1.4rem",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  border: "2px solid #000000",
                  boxShadow: "2px 2px 0px 0px #000000",
                }}
              >
                CREAR EN SQLITE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Proyectos */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          // CONSULTANDO SQLITE (caad.db)...
        </div>
      ) : projects.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 2rem",
            backgroundColor: "var(--bg-surface)",
            border: "2px solid var(--border-strong)",
            boxShadow: "4px 4px 0px 0px var(--border-strong)",
          }}
        >
          <div
            style={{
              width: "50px",
              height: "50px",
              backgroundColor: "var(--bg-app)",
              border: "2px solid var(--border-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.2rem auto",
              color: "var(--primary)",
            }}
          >
            <Layers size={24} />
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 900, textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Sin Proyectos en el Repositorio
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto 1.5rem auto" }}>
            Crea tu primer proyecto para comenzar a modelar esquemas de datos reutilizables y operaciones REST.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setIsCreating(true)}
              style={{
                padding: "0.6rem 1.4rem",
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0px 0px #000000",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FolderPlus size={15} />
              CREAR PRIMER PROYECTO
            </button>

            <button
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              style={{
                padding: "0.6rem 1.4rem",
                backgroundColor: "var(--accent-citron-subtle)",
                color: "var(--text-main)",
                fontSize: "0.82rem",
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                border: "2px solid var(--border-strong)",
                boxShadow: "2px 2px 0px 0px var(--border-strong)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: isLoadingDemo ? "not-allowed" : "pointer",
                opacity: isLoadingDemo ? 0.7 : 1,
              }}
            >
              <Sparkles size={15} style={{ color: "var(--primary)" }} />
              {isLoadingDemo ? "CARGANDO DEMO..." : "CARGAR PROYECTO DEMO (WORKSHOP API)"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {projects.map((proj, idx) => {
            const isActive = activeProjectId === proj.id;
            const isRenaming = renamingId === proj.id;
            const isDeleting = deletingId === proj.id;
            const indexStr = idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`;

            return (
              <div
                key={proj.id}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: `2px solid ${isActive ? "var(--primary)" : "var(--border-strong)"}`,
                  boxShadow: isActive ? "3px 3px 0px 0px var(--primary)" : "2px 2px 0px 0px var(--border-strong)",
                  padding: "1rem 1.2rem",
                  transition: "all 0.1s ease",
                  position: "relative",
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      backgroundColor: "var(--primary)",
                      color: "#ffffff",
                      fontSize: "0.65rem",
                      fontWeight: 800,
                      fontFamily: "var(--font-mono)",
                      padding: "0.15rem 0.6rem",
                    }}
                  >
                    ACTIVO // EN SESIÓN
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "1rem", flex: 1, minWidth: 0 }}>
                    {/* Industrial Index Tag */}
                    <div
                      style={{
                        padding: "0.3rem 0.6rem",
                        backgroundColor: isActive ? "var(--primary)" : "var(--bg-app)",
                        color: isActive ? "#ffffff" : "var(--text-main)",
                        border: "2px solid var(--border-strong)",
                        fontWeight: 900,
                        fontSize: "0.95rem",
                        fontFamily: "var(--font-mono)",
                        height: "fit-content",
                        flexShrink: 0,
                      }}
                    >
                      {indexStr}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isRenaming ? (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(proj.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            style={{
                              padding: "0.35rem 0.6rem",
                              fontSize: "0.9rem",
                              border: "2px solid var(--primary)",
                              backgroundColor: "var(--bg-app)",
                              color: "var(--text-main)",
                              fontFamily: "var(--font-mono)",
                            }}
                          />
                          <button
                            onClick={() => handleRename(proj.id)}
                            style={{
                              padding: "0.35rem 0.6rem",
                              backgroundColor: "var(--primary)",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 800,
                              fontFamily: "var(--font-mono)",
                              border: "1px solid #000000",
                            }}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setRenamingId(null)}
                            style={{
                              padding: "0.35rem 0.6rem",
                              backgroundColor: "var(--bg-app)",
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                              border: "1px solid var(--border-subtle)",
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <h4
                          style={{
                            fontSize: "1.05rem",
                            fontWeight: 800,
                            letterSpacing: "0.02em",
                            color: "var(--text-main)",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {proj.name}
                        </h4>
                      )}

                      <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: "0.6rem" }}>
                        {proj.description || "Sin descripción proporcionada."}
                      </p>

                      {/* Metadata Details Pill Row */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.72rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Clock size={12} />
                          {new Date(proj.updated_at).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span>SCHEMA_VER: {proj.document_schema_version}</span>
                        <span>•</span>
                        <span>ID: {proj.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Button Group */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                    {isDeleting ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          padding: "0.3rem 0.6rem",
                          border: "1px solid var(--error)",
                        }}
                      >
                        <span style={{ fontSize: "0.72rem", color: "var(--error)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                          ¿CONFIRMAR?
                        </span>
                        <button
                          onClick={() => handleDelete(proj.id)}
                          style={{
                            padding: "0.2rem 0.5rem",
                            backgroundColor: "var(--error)",
                            color: "#ffffff",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          SÍ, BORRAR
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          style={{
                            padding: "0.2rem 0.4rem",
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          NO
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpen(proj.id)}
                          style={{
                            padding: "0.45rem 0.9rem",
                            backgroundColor: isActive ? "var(--primary)" : "var(--bg-app)",
                            color: isActive ? "#ffffff" : "var(--text-main)",
                            fontSize: "0.75rem",
                            fontWeight: 900,
                            fontFamily: "var(--font-mono)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            border: "1px solid var(--border-strong)",
                            boxShadow: "2px 2px 0px 0px var(--border-strong)",
                            letterSpacing: "0.03em",
                            cursor: "pointer",
                          }}
                        >
                          <FolderOpen size={13} />
                          {isActive ? "ABIERTO" : "ABRIR"}
                        </button>

                        <button
                          onClick={() => {
                            setRenamingId(proj.id);
                            setRenameValue(proj.name);
                          }}
                          style={{
                            padding: "0.45rem 0.6rem",
                            backgroundColor: "var(--bg-app)",
                            color: "var(--text-main)",
                            border: "1px solid var(--border-main)",
                            fontSize: "0.75rem",
                          }}
                          title="Renombrar proyecto"
                        >
                          <Edit3 size={13} />
                        </button>

                        <button
                          onClick={() => setDeletingId(proj.id)}
                          style={{
                            padding: "0.45rem 0.6rem",
                            backgroundColor: "var(--bg-app)",
                            color: "var(--error)",
                            border: "1px solid var(--border-main)",
                            fontSize: "0.75rem",
                          }}
                          title="Eliminar proyecto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
