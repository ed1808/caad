import React, { useState, useEffect } from "react";
import { AppInfoDto, pingBackend, createExampleProject } from "../../lib/tauri";
import { Project } from "../../app/types";
import {
  Moon,
  Sun,
  Flame,
  Save,
  Sparkles,
  Check,
  RefreshCw,
} from "lucide-react";

interface SettingsViewProps {
  appInfo: AppInfoDto;
  autoSaveEnabled: boolean;
  onToggleAutoSave: (enabled: boolean) => void;
  onOpenProject: (project: Project) => void;
}

export type ThemeOption = "dark" | "light" | "amber";

export const SettingsView: React.FC<SettingsViewProps> = ({
  appInfo,
  autoSaveEnabled,
  onToggleAutoSave,
  onOpenProject,
}) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeOption>(() => {
    return (localStorage.getItem("caad-theme") as ThemeOption) || "dark";
  });
  const [pingStatus, setPingStatus] = useState<string>("Verificando...");
  const [isLoadingPing, setIsLoadingPing] = useState<boolean>(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState<boolean>(false);
  const [demoSuccess, setDemoSuccess] = useState<boolean>(false);

  useEffect(() => {
    checkPing();
  }, []);

  const checkPing = async () => {
    setIsLoadingPing(true);
    try {
      const res = await pingBackend();
      setPingStatus(res);
    } catch (err) {
      setPingStatus(`Error: ${err}`);
    } finally {
      setIsLoadingPing(false);
    }
  };

  const handleChangeTheme = (theme: ThemeOption) => {
    setCurrentTheme(theme);
    localStorage.setItem("caad-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true);
    setDemoSuccess(false);
    try {
      const demo = await createExampleProject();
      setDemoSuccess(true);
      setTimeout(() => {
        onOpenProject(demo);
      }, 700);
    } catch (err) {
      console.error("Error al cargar demo:", err);
    } finally {
      setIsLoadingDemo(false);
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "880px",
        margin: "0 auto",
        overflowY: "auto",
        height: "100%",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "2px solid var(--border-strong)",
          boxShadow: "4px 4px 0px 0px var(--border-strong)",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
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
          // SYSTEM CONFIGURATION // RUNTIME PREFERENCES
        </div>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            marginBottom: "0.4rem",
          }}
        >
          Configuración del Sistema
        </h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
          Ajustes de interfaz de usuario, preferencias de persistencia local y diagnóstico del motor de ejecución de CAAD.
        </p>

        {/* 1. SELECCIÓN DE TEMA CYBER-BRUTALIST */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h3
            style={{
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "var(--text-main)",
              textTransform: "uppercase",
              marginBottom: "0.85rem",
            }}
          >
            1. Tema Visual e Identidad Gráfica
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
            }}
          >
            {/* Dark */}
            <div
              onClick={() => handleChangeTheme("dark")}
              style={{
                backgroundColor: "#101217",
                color: "#f4f5f8",
                border: `2px solid ${currentTheme === "dark" ? "var(--primary)" : "#2c3140"}`,
                boxShadow: currentTheme === "dark" ? "3px 3px 0px 0px var(--primary)" : "none",
                padding: "1rem",
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 800 }}>
                  CYBER DARK
                </span>
                <Moon size={16} style={{ color: "#ff6535" }} />
              </div>
              <p style={{ fontSize: "0.75rem", color: "#8b92a3", lineHeight: 1.4 }}>
                Tema oscuro industrial de alto contraste con acentos naranja reactivo y carbón.
              </p>
            </div>

            {/* Light */}
            <div
              onClick={() => handleChangeTheme("light")}
              style={{
                backgroundColor: "#ffffff",
                color: "#0c0d10",
                border: `2px solid ${currentTheme === "light" ? "var(--primary)" : "#d3cfc5"}`,
                boxShadow: currentTheme === "light" ? "3px 3px 0px 0px var(--primary)" : "none",
                padding: "1rem",
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 800 }}>
                  PARCHMENT LIGHT
                </span>
                <Sun size={16} style={{ color: "#ff5722" }} />
              </div>
              <p style={{ fontSize: "0.75rem", color: "#5e6473", lineHeight: 1.4 }}>
                Estilo arquitectónico sobrio en fondo pergamino y bordes negros definidos.
              </p>
            </div>

            {/* Tactical Amber */}
            <div
              onClick={() => handleChangeTheme("amber")}
              style={{
                backgroundColor: "#1a150b",
                color: "#fffaee",
                border: `2px solid ${currentTheme === "amber" ? "var(--primary)" : "#544421"}`,
                boxShadow: currentTheme === "amber" ? "3px 3px 0px 0px var(--primary)" : "none",
                padding: "1rem",
                cursor: "pointer",
                transition: "all 0.1s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", fontWeight: 800 }}>
                  TACTICAL AMBER
                </span>
                <Flame size={16} style={{ color: "#f59e0b" }} />
              </div>
              <p style={{ fontSize: "0.75rem", color: "#c4b595", lineHeight: 1.4 }}>
                Inspirado en terminales CRT industriales monocromáticas ámbar / cyberpunk.
              </p>
            </div>
          </div>
        </div>

        {/* 2. PERSISTENCIA Y AUTOGUARDADO (FR-013) */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h3
            style={{
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "var(--text-main)",
              textTransform: "uppercase",
              marginBottom: "0.85rem",
            }}
          >
            2. Persistencia y Guardado Automático
          </h3>

          <div
            style={{
              border: "1px solid var(--border-main)",
              backgroundColor: "var(--bg-app)",
              padding: "1.2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <Save size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                  Autoguardado debounced (1.000 ms)
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, maxWidth: "520px" }}>
                Persiste automáticamente las modificaciones del contrato activo en SQLite tras un segundo de inactividad, evitando saturación de I/O en disco.
              </p>
            </div>

            <button
              onClick={() => onToggleAutoSave(!autoSaveEnabled)}
              style={{
                padding: "0.5rem 1.2rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.78rem",
                fontWeight: 800,
                backgroundColor: autoSaveEnabled ? "var(--success)" : "var(--bg-surface)",
                color: autoSaveEnabled ? "#ffffff" : "var(--text-main)",
                border: "2px solid var(--border-strong)",
                boxShadow: "2px 2px 0px 0px var(--border-strong)",
                transition: "all 0.1s ease",
              }}
            >
              {autoSaveEnabled ? "ACTIVADO" : "DESACTIVADO"}
            </button>
          </div>
        </div>

        {/* 3. PROYECTO DE EJEMPLO CANÓNICO (FR-015) */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h3
            style={{
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "var(--text-main)",
              textTransform: "uppercase",
              marginBottom: "0.85rem",
            }}
          >
            3. Demostración y Fixture Oficial
          </h3>

          <div
            style={{
              border: "1px solid var(--border-main)",
              backgroundColor: "var(--accent-citron-subtle)",
              padding: "1.2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                <Sparkles size={16} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: 800, fontFamily: "var(--font-mono)" }}>
                  Workshop API — Proyecto Modelo Canónico
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0, maxWidth: "520px" }}>
                Genera en SQLite un proyecto nuevo con los esquemas Vehicle y WorkOrder, operaciones GET /vehicles/&#123;id&#125; y POST /work-orders completas, listo para pruebas e inspección.
              </p>
            </div>

            <button
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              style={{
                padding: "0.55rem 1.25rem",
                fontFamily: "var(--font-mono)",
                fontSize: "0.8rem",
                fontWeight: 900,
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0px 0px #000000",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                cursor: isLoadingDemo ? "wait" : "pointer",
              }}
            >
              {demoSuccess ? (
                <>
                  <Check size={14} /> ¡CARGADO!
                </>
              ) : isLoadingDemo ? (
                "CREANDO..."
              ) : (
                "CARGAR DEMO"
              )}
            </button>
          </div>
        </div>

        {/* 4. DIAGNÓSTICO Y ESTADO DEL CORE RUST */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <h3
              style={{
                fontSize: "0.85rem",
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: "var(--text-main)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              4. Diagnóstico de Ejecución Core (Tauri 2 + SQLite)
            </h3>

            <button
              onClick={checkPing}
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--font-mono)",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                color: "var(--text-muted)",
              }}
            >
              <RefreshCw size={12} style={{ animation: isLoadingPing ? "spin 1s linear infinite" : "none" }} />
              RE-VERIFICAR IPC
            </button>
          </div>

          <div
            style={{
              backgroundColor: "var(--bg-app)",
              border: "1px solid var(--border-main)",
              padding: "1rem",
              fontFamily: "var(--font-mono)",
              fontSize: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>APLICACIÓN: </span>
              <strong>{appInfo.name} v{appInfo.version}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>DESCRIPCIÓN: </span>
              <span>{appInfo.description}</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>ESTADO IPC TAURI: </span>
              <strong style={{ color: "var(--success)" }}>{pingStatus}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>MOTOR DE ALMACENAMIENTO: </span>
              <span>SQLite 3 (caad.db con WAL y migraciones transaccionales)</span>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>CONFORMIDAD DE ESPECIFICACIÓN: </span>
              <span>OpenAPI Specification 3.1.x / JSON Schema 2020-12</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
