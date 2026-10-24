import React, { useState, useEffect, useRef } from "react";
import { ViewId, Project, HttpMethod } from "./app/types";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { StatusBar } from "./components/StatusBar";
import { ProjectsView } from "./features/projects/ProjectsView";
import { SchemasView } from "./features/schemas/SchemasView";
import { OperationsView } from "./features/operations/OperationsView";
import { SecurityView } from "./features/security/SecurityView";
import { ValidationView, NavigationTarget } from "./features/validation/ValidationView";
import { DocumentationView } from "./features/documentation/DocumentationView";
import { SettingsView } from "./features/settings/SettingsView";
import { ExportModal } from "./features/openapi/ExportModal";
import { ImportModal } from "./features/openapi/ImportModal";
import { EmptyView } from "./components/EmptyView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import {
  pingBackend,
  getAppInfo,
  saveProject,
  validateDocument,
  normalizeProject,
  AppInfoDto,
} from "./lib/tauri";
import { FileCode2 } from "lucide-react";
import "./styles/theme.css";

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewId>("projects");
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfoDto>({
    name: "CAAD",
    version: "0.1.0",
    description: "Cargando...",
  });
  const [pingStatus, setPingStatus] = useState<string>("conectando...");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [diagnosticsCount, setDiagnosticsCount] = useState<number>(0);

  // Estados para navegación asistida desde diagnósticos
  const [targetSchemaName, setTargetSchemaName] = useState<string | null>(null);
  const [targetOperation, setTargetOperation] = useState<{ path: string; method: HttpMethod } | null>(null);

  // Modales OpenAPI (Hito 7)
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Configuración de autoguardado (FR-014)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Inicializar tema almacenado
    const savedTheme = localStorage.getItem("caad-theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  useEffect(() => {
    if (!activeProject) {
      setDiagnosticsCount(0);
      return;
    }
    let isMounted = true;
    validateDocument(activeProject.document).then((issues) => {
      if (isMounted) setDiagnosticsCount(issues.length);
    });
    return () => {
      isMounted = false;
    };
  }, [activeProject]);

  useEffect(() => {
    async function initTauri() {
      const ping = await pingBackend();
      setPingStatus(ping);
      setIsConnected(ping.startsWith("pong"));

      const info = await getAppInfo();
      setAppInfo(info);
    }

    initTauri();
  }, []);

  // Lógica de autoguardado debounced al modificar el proyecto activo (FR-013)
  const triggerAutoSave = (projectToSave: Project) => {
    if (!autoSaveEnabled) return;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus("saving");
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveProject(projectToSave);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Fallo al guardar proyecto:", err);
        setSaveStatus("error");
      }
    }, 1000);
  };

  const handleManualSave = async () => {
    if (!activeProject) return;
    try {
      setSaveStatus("saving");
      await saveProject(activeProject);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Fallo al guardar:", err);
      setSaveStatus("error");
    }
  };

  const handleOpenProject = (project: Project) => {
    const normalized = normalizeProject(project);
    setActiveProject(normalized);
    setSaveStatus("saved");
    setCurrentView("schemas");
  };

  const renderActiveView = () => {
    switch (currentView) {
      case "projects":
        return (
          <ProjectsView
            activeProjectId={activeProject?.id}
            onOpenProject={handleOpenProject}
            onImportClick={() => setIsImportModalOpen(true)}
          />
        );
      case "metadata":
        return activeProject ? (
          <div style={{ padding: "2rem", maxWidth: "860px", margin: "0 auto", overflowY: "auto", height: "100%" }}>
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "2px solid var(--border-strong)",
                boxShadow: "4px 4px 0px 0px var(--border-strong)",
                padding: "2rem",
              }}
            >
              <div style={{ fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: "0.3rem" }}>
                // SPEC INFO // METADATA CONTRACT
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.02em", marginBottom: "0.4rem" }}>
                Metadatos del Contrato: {activeProject.name}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.8rem" }}>
                Configuración general de título, versión del contrato (semver) y descripción almacenada localmente.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                    TÍTULO DE LA ESPECIFICACIÓN (info.title)
                  </label>
                  <input
                    type="text"
                    value={activeProject.document.info.title}
                    onChange={(e) => {
                      const updated = {
                        ...activeProject,
                        document: {
                          ...activeProject.document,
                          info: { ...activeProject.document.info, title: e.target.value },
                        },
                      };
                      setActiveProject(updated);
                      triggerAutoSave(updated);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      border: "2px solid var(--border-main)",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                    VERSIÓN DEL CONTRATO (info.version)
                  </label>
                  <input
                    type="text"
                    value={activeProject.document.info.version}
                    onChange={(e) => {
                      const updated = {
                        ...activeProject,
                        document: {
                          ...activeProject.document,
                          info: { ...activeProject.document.info, version: e.target.value },
                        },
                      };
                      setActiveProject(updated);
                      triggerAutoSave(updated);
                    }}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      border: "2px solid var(--border-main)",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", marginBottom: "0.35rem" }}>
                    DESCRIPCIÓN DE LA API
                  </label>
                  <textarea
                    value={activeProject.document.info.description ?? ""}
                    onChange={(e) => {
                      const updated = {
                        ...activeProject,
                        document: {
                          ...activeProject.document,
                          info: { ...activeProject.document.info, description: e.target.value },
                        },
                      };
                      setActiveProject(updated);
                      triggerAutoSave(updated);
                    }}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.8rem",
                      border: "2px solid var(--border-main)",
                      backgroundColor: "var(--bg-app)",
                      color: "var(--text-main)",
                      fontSize: "0.85rem",
                      lineHeight: 1.5,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyView
            icon={FileCode2}
            title="Ningún proyecto abierto"
            description="Abre o crea un proyecto desde el directorio para editar sus metadatos de especificación."
            actionLabel="IR AL DIRECTORIO"
            onAction={() => setCurrentView("projects")}
          />
        );
      case "schemas":
        return (
          <SchemasView
            project={activeProject}
            targetSchemaName={targetSchemaName}
            onUpdateProject={(updated) => {
              setActiveProject(updated);
              triggerAutoSave(updated);
            }}
            onNavigateToProjects={() => setCurrentView("projects")}
          />
        );
      case "operations":
        return (
          <OperationsView
            project={activeProject}
            targetOperation={targetOperation}
            onUpdateProject={(updated) => {
              setActiveProject(updated);
              triggerAutoSave(updated);
            }}
            onNavigateToProjects={() => setCurrentView("projects")}
            onNavigateToSchemas={() => setCurrentView("schemas")}
            onNavigateToSecurity={() => setCurrentView("security")}
          />
        );
      case "security":
        return (
          <SecurityView
            project={activeProject}
            onUpdateProject={(updated) => {
              setActiveProject(updated);
              triggerAutoSave(updated);
            }}
            onNavigateToProjects={() => setCurrentView("projects")}
          />
        );
      case "validation":
        return (
          <ValidationView
            project={activeProject}
            onNavigateToProjects={() => setCurrentView("projects")}
            onNavigateToElement={(target: NavigationTarget) => {
              if (target.schemaName) {
                setTargetSchemaName(target.schemaName);
              }
              if (target.operation) {
                setTargetOperation(target.operation);
              }
              setCurrentView(target.view);
            }}
          />
        );
      case "documentation":
        return (
          <DocumentationView
            project={activeProject}
            onNavigateToProjects={() => setCurrentView("projects")}
            onNavigateToOperation={(path, method) => {
              setTargetOperation({ path, method });
              setCurrentView("operations");
            }}
            onNavigateToSchema={(name) => {
              setTargetSchemaName(name);
              setCurrentView("schemas");
            }}
            onExport={activeProject ? () => setIsExportModalOpen(true) : undefined}
          />
        );
      case "settings":
        return (
          <SettingsView
            appInfo={appInfo}
            autoSaveEnabled={autoSaveEnabled}
            onToggleAutoSave={setAutoSaveEnabled}
            onOpenProject={handleOpenProject}
          />
        );
      default:
        return (
          <ProjectsView
            activeProjectId={activeProject?.id}
            onOpenProject={handleOpenProject}
          />
        );
    }
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "var(--bg-app)",
      }}
    >
      {/* Barra lateral de navegación */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        appVersion={appInfo.version}
        schemasCount={activeProject?.document?.schemas ? Object.keys(activeProject.document.schemas).length : undefined}
        operationsCount={activeProject?.document?.operations ? activeProject.document.operations.length : undefined}
        securitySchemesCount={activeProject?.document?.security_schemes ? Object.keys(activeProject.document.security_schemes).length : undefined}
        diagnosticsCount={activeProject ? diagnosticsCount : undefined}
      />

      {/* Contenedor principal de trabajo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <Header
          currentView={currentView}
          activeProjectName={activeProject?.name}
          isBackendConnected={isConnected}
          saveStatus={saveStatus}
          onManualSave={activeProject ? handleManualSave : undefined}
          onExport={activeProject ? () => setIsExportModalOpen(true) : undefined}
          onImport={() => setIsImportModalOpen(true)}
        />

        <main
          style={{
            flex: 1,
            overflow: "hidden",
            backgroundColor: "var(--bg-app)",
          }}
        >
          <ErrorBoundary key={currentView} onResetToProjects={() => setCurrentView("projects")}>
            {renderActiveView()}
          </ErrorBoundary>
        </main>

        <StatusBar
          backendPingStatus={pingStatus}
          diagnosticsCount={diagnosticsCount}
        />
      </div>

      {/* Modales de Exportación e Importación OpenAPI (Hito 7) */}
      {isExportModalOpen && activeProject && (
        <ExportModal
          isOpen={isExportModalOpen}
          project={activeProject}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}

      {isImportModalOpen && (
        <ImportModal
          isOpen={isImportModalOpen}
          activeProject={activeProject}
          onClose={() => setIsImportModalOpen(false)}
          onImportSuccess={(importedProject) => {
            handleOpenProject(importedProject);
          }}
        />
      )}
    </div>
  );
};

export default App;
