import React, { useState } from "react";
import { ViewId } from "../app/types";
import {
  FolderKanban,
  FileCode2,
  Boxes,
  Zap,
  ShieldAlert,
  BookOpen,
  Sliders,
  Terminal,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  LucideIcon,
  Lock,
} from "lucide-react";

interface SidebarProps {
  currentView: ViewId;
  onSelectView: (view: ViewId) => void;
  appVersion: string;
  schemasCount?: number;
  operationsCount?: number;
  securitySchemesCount?: number;
  diagnosticsCount?: number;
}

interface NavItemConfig {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  appVersion,
  schemasCount,
  operationsCount,
  securitySchemesCount,
  diagnosticsCount,
}) => {
  // Estado de colapso persistido en localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("caad_sidebar_collapsed") === "true";
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("caad_sidebar_collapsed", String(next));
      return next;
    });
  };

  const navItems: NavItemConfig[] = [
    { id: "projects", label: "Proyectos", icon: FolderKanban },
    { id: "metadata", label: "Contrato & Info", icon: FileCode2 },
    { id: "schemas", label: "Esquemas de Datos", icon: Boxes, badge: schemasCount },
    { id: "operations", label: "Operaciones REST", icon: Zap, badge: operationsCount },
    { id: "security", label: "Autenticación", icon: Lock, badge: securitySchemesCount },
    { id: "validation", label: "Diagnósticos", icon: ShieldAlert, badge: diagnosticsCount },
    { id: "documentation", label: "Documentación", icon: BookOpen },
    { id: "settings", label: "Configuración", icon: Sliders },
  ];

  const sidebarWidth = isCollapsed ? "68px" : "var(--sidebar-width)";

  return (
    <aside
      style={{
        width: sidebarWidth,
        minWidth: sidebarWidth,
        backgroundColor: "var(--bg-sidebar)",
        color: "var(--text-sidebar)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        borderRight: "2px solid #000000",
        userSelect: "none",
        transition: "width 0.2s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        overflow: "hidden",
      }}
    >
      {/* Brand Header — Cyber-Brutalist Console */}
      <div
        style={{
          height: "var(--header-height)",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          padding: isCollapsed ? "0 0.5rem" : "0 0.85rem",
          borderBottom: "2px solid #000000",
          backgroundColor: "#060709",
          flexShrink: 0,
        }}
      >
        {!isCollapsed ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", whiteSpace: "nowrap" }}>
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  fontFamily: "var(--font-mono)",
                  border: "1px solid #000000",
                  flexShrink: 0,
                }}
              >
                C
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: "0.95rem",
                    letterSpacing: "0.1em",
                    color: "#ffffff",
                    lineHeight: 1.1,
                  }}
                >
                  CAAD
                </span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    color: "var(--primary)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  // REST STUDIO
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.15rem 0.35rem",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "2px",
                whiteSpace: "nowrap",
              }}
              title="Consola en línea"
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  backgroundColor: "var(--success)",
                  borderRadius: "50%",
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontSize: "0.6rem",
                  fontWeight: 800,
                  color: "var(--success)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ONLINE
              </span>
            </div>
          </>
        ) : (
          <div
            style={{
              width: "28px",
              height: "28px",
              backgroundColor: "var(--primary)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "0.9rem",
              fontFamily: "var(--font-mono)",
              border: "1px solid #000000",
              flexShrink: 0,
            }}
            title="CAAD // REST STUDIO (Online)"
          >
            C
          </div>
        )}
      </div>

      {/* Mode Sub-banner */}
      {!isCollapsed ? (
        <div
          style={{
            padding: "0.4rem 1rem",
            backgroundColor: "#13161c",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.65rem",
            fontFamily: "var(--font-mono)",
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span>SPEC // OPENAPI 3.1</span>
          <span style={{ color: "var(--accent-citron)" }}>DRAFT 2020-12</span>
        </div>
      ) : (
        <div
          style={{
            padding: "0.35rem 0",
            backgroundColor: "#13161c",
            borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            textAlign: "center",
            fontSize: "0.65rem",
            fontFamily: "var(--font-mono)",
            color: "var(--accent-citron)",
            fontWeight: 800,
            flexShrink: 0,
          }}
          title="OpenAPI 3.1 (Draft 2020-12)"
        >
          3.1
        </div>
      )}

      {/* Navigation List */}
      <nav style={{ flex: 1, padding: isCollapsed ? "0.6rem 0.35rem" : "0.6rem 0.5rem", overflowY: "auto", overflowX: "hidden" }}>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            const fullTitle = `${item.label}${item.badge !== undefined ? ` (${item.badge})` : ""}`;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onSelectView(item.id)}
                  title={isCollapsed ? fullTitle : undefined}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "space-between",
                    padding: isCollapsed ? "0.65rem 0" : "0.6rem 0.75rem",
                    borderRadius: "2px",
                    border: isActive
                      ? "1px solid var(--primary)"
                      : "1px solid transparent",
                    borderLeft: isActive
                      ? "3px solid var(--primary)"
                      : "1px solid transparent",
                    color: isActive ? "#ffffff" : "var(--text-sidebar)",
                    backgroundColor: isActive ? "var(--bg-sidebar-active)" : "transparent",
                    fontWeight: isActive ? 700 : 500,
                    fontSize: "0.82rem",
                    letterSpacing: "0.02em",
                    transition: "background-color 0.1s ease, color 0.1s ease",
                    cursor: "pointer",
                    position: "relative",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "var(--bg-sidebar-hover)";
                      e.currentTarget.style.color = "#ffffff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "var(--text-sidebar)";
                    }
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 2.3 : 1.8}
                      style={{
                        color: isActive ? "var(--primary)" : "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    />
                    {!isCollapsed && (
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                    {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-6px",
                          right: "-8px",
                          fontSize: "0.6rem",
                          backgroundColor: "var(--primary)",
                          color: "#ffffff",
                          fontWeight: 900,
                          fontFamily: "var(--font-mono)",
                          padding: "0.05rem 0.25rem",
                          borderRadius: "2px",
                          lineHeight: 1,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>

                  {!isCollapsed && item.badge !== undefined && (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        padding: "0.1rem 0.45rem",
                        borderRadius: "2px",
                        backgroundColor: isActive
                          ? "var(--primary)"
                          : "rgba(255, 255, 255, 0.08)",
                        color: isActive ? "#ffffff" : "var(--text-sidebar)",
                        border: isActive
                          ? "1px solid var(--primary)"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                        flexShrink: 0,
                      }}
                    >
                      {item.badge < 10 ? `0${item.badge}` : item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Botón de Expansión / Contracción en la parte inferior */}
      <div
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: "#060709",
          padding: isCollapsed ? "0.5rem 0.35rem" : "0.5rem 0.65rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={toggleCollapse}
          title={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: "0.6rem",
            padding: "0.5rem 0.6rem",
            backgroundColor: "transparent",
            color: "var(--text-sidebar)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: "0.74rem",
            fontFamily: "var(--font-mono)",
            fontWeight: 800,
            cursor: "pointer",
            transition: "all 0.15s ease",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.borderColor = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--text-sidebar)";
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
          }}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          {!isCollapsed && (
            <span style={{ letterSpacing: "0.06em", color: "var(--text-sidebar)" }}>
              CONTRAER MENÚ
            </span>
          )}
        </button>
      </div>

      {/* Footer System Status */}
      {!isCollapsed ? (
        <div
          style={{
            padding: "0.65rem 0.85rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            backgroundColor: "#050608",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            fontSize: "0.68rem",
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Terminal size={12} /> HOST
            </span>
            <span style={{ color: "#ffffff", fontWeight: 700 }}>LINUX // DEV</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Activity size={12} /> BUILD
            </span>
            <span style={{ color: "var(--primary)", fontWeight: 700 }}>v{appVersion}</span>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "0.5rem 0",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            backgroundColor: "#050608",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.62rem",
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          title={`CAAD v${appVersion} (Linux Dev)`}
        >
          <Terminal size={12} color="var(--text-muted)" />
          <span style={{ color: "var(--primary)", fontWeight: 800 }}>v{appVersion}</span>
        </div>
      )}
    </aside>
  );
};
