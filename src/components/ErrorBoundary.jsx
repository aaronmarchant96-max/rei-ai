import { Component } from "react";
import { reportError } from "../lib/errorReporter.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      toolName: this.props.toolName || "unknown",
      componentStack: info?.componentStack || "",
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Fallback
          toolName={this.props.toolName || "this tool"}
          message={this.state.error?.message || "Unknown error"}
          onReload={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

function Fallback({ toolName, message, onReload }) {
  var isDark = true;
  try {
    var mode = localStorage.getItem("rei_theme_mode");
    if (mode === "light") isDark = false;
  } catch (e) {}

  var c = {
    bg: isDark ? "#0A0C12" : "#F8F9FA",
    card: isDark ? "#111318" : "#FFFFFF",
    border: isDark ? "rgba(255,255,255,0.08)" : "#E5E5E5",
    text: isDark ? "#E2E8F0" : "#1C1917",
    muted: isDark ? "#94A3B8" : "#767676",
    amber: isDark ? "#F59E0B" : "#B45309",
  };

  return (
    <div style={{
      background: c.bg,
      minHeight: "100vh",
      fontFamily: "Inter, system-ui, sans-serif",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        maxWidth: 560,
        width: "100%",
        padding: "32px 28px",
        borderRadius: "16px",
        background: c.card,
        border: "1px solid " + c.border,
        textAlign: "center",
      }}>
        <div style={{
          fontSize: "36px",
          marginBottom: "16px",
        }}>
          &#x26A0;&#xFE0F;
        </div>
        <h2 style={{
          fontSize: "20px",
          fontWeight: 800,
          color: c.text,
          margin: "0 0 8px",
        }}>
          {toolName === "this tool" ? "Something went wrong" : "Dashboard Unavailable"}
        </h2>
        <p style={{
          fontSize: "14px",
          color: c.muted,
          margin: "0 0 6px",
          lineHeight: 1.5,
        }}>
          {toolName === "this tool"
            ? "A component crashed. The error has been logged."
            : toolName + " hit an error. The rest of the app is still working."}
        </p>
        <p style={{
          fontSize: "12px",
          color: c.amber,
          margin: "0 0 24px",
          fontFamily: "monospace",
          wordBreak: "break-word",
          maxWidth: "100%",
          overflow: "hidden",
        }}>
          {message.length > 120 ? message.slice(0, 120) + "..." : message}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onReload}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, " + c.amber + ", #D97706)",
              color: "#0A0C12",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => { window.location.href = "/"; }}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "1px solid " + c.border,
              background: "transparent",
              color: c.text,
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go Home
          </button>
        </div>
        <p style={{
          fontSize: "11px",
          color: c.muted,
          margin: "16px 0 0",
          opacity: 0.7,
        }}>
          Error details sent to Vercel Logs. Reload usually helps.
        </p>
      </div>
    </div>
  );
}
