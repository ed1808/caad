import React from "react";
import { ArrowRight, Boxes, LucideIcon } from "lucide-react";

interface EmptyViewProps {
  title: string;
  description: string;
  badge?: string;
  icon?: LucideIcon | string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  title,
  description,
  badge,
  icon: IconComponent = Boxes,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "2rem",
        textAlign: "center",
        backgroundColor: "var(--bg-app)",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          backgroundColor: "var(--bg-surface)",
          border: "2px solid var(--border-strong)",
          padding: "2.5rem 2rem",
          boxShadow: "4px 4px 0px 0px var(--border-strong)",
          position: "relative",
        }}
      >
        {/* Technical Corner Markers */}
        <div style={{ position: "absolute", top: "6px", left: "10px", fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
          // ESTADO
        </div>
        <div style={{ position: "absolute", top: "6px", right: "10px", fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
          [ PROYECTO REQUERIDO ]
        </div>

        {/* Icon Display */}
        <div
          style={{
            width: "56px",
            height: "56px",
            backgroundColor: "var(--bg-app)",
            border: "2px solid var(--border-strong)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem auto",
            color: "var(--primary)",
          }}
        >
          {typeof IconComponent === "string" ? (
            <span style={{ fontSize: "1.8rem" }}>{IconComponent}</span>
          ) : React.isValidElement(IconComponent) ? (
            IconComponent
          ) : (
            React.createElement(
              IconComponent as React.ComponentType<{ size?: number; strokeWidth?: number }>,
              { size: 28, strokeWidth: 2 }
            )
          )}
        </div>

        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 900,
            letterSpacing: "0.05em",
            marginBottom: "0.6rem",
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            lineHeight: 1.6,
            marginBottom: badge || actionLabel ? "1.5rem" : "0",
          }}
        >
          {description}
        </p>

        {badge && (
          <div
            style={{
              display: "inline-block",
              fontSize: "0.72rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              padding: "0.3rem 0.8rem",
              backgroundColor: "var(--bg-surface-subtle)",
              color: "var(--text-main)",
              border: "1px solid var(--border-main)",
              marginBottom: actionLabel ? "1.5rem" : "0",
            }}
          >
            {badge.toUpperCase()}
          </div>
        )}

        {actionLabel && onAction && (
          <div>
            <button
              onClick={onAction}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.4rem",
                backgroundColor: "var(--primary)",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                border: "2px solid #000000",
                boxShadow: "2px 2px 0px 0px #000000",
                transition: "all 0.1s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translate(-1px, -1px)";
                e.currentTarget.style.boxShadow = "3px 3px 0px 0px #000000";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "2px 2px 0px 0px #000000";
              }}
            >
              <span>{actionLabel}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
