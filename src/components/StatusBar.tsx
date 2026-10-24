import React from "react";
import { Cpu, ShieldCheck, ShieldAlert, HardDrive, Terminal } from "lucide-react";

interface StatusBarProps {
  backendPingStatus: string;
  diagnosticsCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  backendPingStatus,
  diagnosticsCount,
}) => {
  const isOk = backendPingStatus.startsWith("pong");

  return (
    <footer
      style={{
        height: "var(--statusbar-height)",
        backgroundColor: "#060709",
        borderTop: "2px solid #000000",
        color: "#8b92a3",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 1rem",
        fontSize: "0.68rem",
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        {/* IPC Status */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Cpu size={12} style={{ color: isOk ? "var(--success)" : "var(--warning)" }} />
          <span>IPC:</span>
          <strong style={{ color: isOk ? "var(--success)" : "var(--warning)" }}>
            [{backendPingStatus.toUpperCase()}]
          </strong>
        </div>

        {/* Diagnostics Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {diagnosticsCount > 0 ? (
            <ShieldAlert size={12} style={{ color: "var(--error)" }} />
          ) : (
            <ShieldCheck size={12} style={{ color: "var(--success)" }} />
          )}
          <span>DIAGNÓSTICOS:</span>
          <strong
            style={{
              color: diagnosticsCount > 0 ? "var(--error)" : "var(--success)",
              padding: "0.05rem 0.35rem",
              backgroundColor: diagnosticsCount > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
              border: `1px solid ${diagnosticsCount > 0 ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
            }}
          >
            {diagnosticsCount < 10 ? `0${diagnosticsCount}` : diagnosticsCount}
          </strong>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <Terminal size={12} style={{ color: "var(--primary)" }} />
          <span>TARGET:</span>
          <strong style={{ color: "#ffffff" }}>OPENAPI 3.1.0</strong>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <HardDrive size={12} style={{ color: "var(--accent-citron)" }} />
          <span>STORAGE:</span>
          <strong style={{ color: "#ffffff" }}>SQLITE_LOCAL (v1)</strong>
        </div>
      </div>
    </footer>
  );
};
