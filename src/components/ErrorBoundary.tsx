import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, FolderKanban } from "lucide-react";

interface Props {
  children: ReactNode;
  onResetToProjects?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("CAAD Uncaught Render Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    if (this.props.onResetToProjects) {
      this.props.onResetToProjects();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            padding: "2rem",
            backgroundColor: "var(--bg-app)",
            fontFamily: "var(--font-family)",
          }}
        >
          <div
            style={{
              maxWidth: "600px",
              width: "100%",
              backgroundColor: "var(--bg-surface)",
              border: "2px solid var(--error)",
              padding: "2rem",
              boxShadow: "4px 4px 0px 0px var(--error)",
              position: "relative",
            }}
          >
            {/* Header Markers */}
            <div
              style={{
                position: "absolute",
                top: "4px",
                left: "8px",
                fontSize: "0.68rem",
                fontFamily: "var(--font-mono)",
                color: "var(--error)",
                fontWeight: 800,
              }}
            >
              // RUNTIME_PANIC // DIAGNOSTIC_DUMP
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                marginTop: "0.8rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid var(--error)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--error)",
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "1.05rem",
                    fontWeight: 900,
                    letterSpacing: "0.03em",
                    textTransform: "uppercase",
                    color: "var(--text-main)",
                  }}
                >
                  Interrupción en la Vista Activa
                </h3>
                <span
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  Capturado por CAAD Error Boundary
                </span>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                padding: "0.85rem 1rem",
                fontSize: "0.8rem",
                fontFamily: "var(--font-mono)",
                color: "var(--text-main)",
                marginBottom: "1.2rem",
                wordBreak: "break-word",
              }}
            >
              <strong>Error:</strong> {this.state.error?.message || "Error desconocido"}
            </div>

            {this.state.errorInfo?.componentStack && (
              <details
                style={{
                  marginBottom: "1.5rem",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--text-muted)",
                }}
              >
                <summary style={{ cursor: "pointer", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Ver traza del componente
                </summary>
                <pre
                  style={{
                    backgroundColor: "var(--bg-app)",
                    padding: "0.6rem",
                    border: "1px solid var(--border-subtle)",
                    maxHeight: "140px",
                    overflowY: "auto",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.55rem 1rem",
                  backgroundColor: "var(--primary)",
                  color: "#ffffff",
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  border: "2px solid #000000",
                }}
              >
                <RefreshCw size={13} />
                REINTENTAR VISTA
              </button>

              {this.props.onResetToProjects && (
                <button
                  onClick={this.props.onResetToProjects}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 1rem",
                    backgroundColor: "var(--primary)",
                    color: "#ffffff",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    border: "2px solid #000000",
                  }}
                >
                  <FolderKanban size={13} />
                  IR A PROYECTOS
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
