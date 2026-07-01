import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an uncaught error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.glassCard}>
            <div style={styles.iconContainer}>⚠️</div>
            <h1 style={styles.title}>Oops! Something went wrong</h1>
            <p style={styles.subtitle}>
              An unexpected error occurred in the application. We've logged the error details.
            </p>
            {this.state.error && (
              <pre style={styles.errorLogs}>
                {this.state.error.toString()}
              </pre>
            )}
            <button style={styles.button} onClick={this.handleReset}>
              Return to Homepage
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    width: "100vw",
    background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    color: "#f8fafc",
    padding: "20px",
    boxSizing: "border-box",
  },
  glassCard: {
    background: "rgba(30, 41, 59, 0.45)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "24px",
    padding: "48px 32px",
    maxWidth: "520px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  },
  iconContainer: {
    fontSize: "64px",
    marginBottom: "24px",
    animation: "bounce 2s infinite",
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    marginBottom: "12px",
    background: "linear-gradient(to right, #f472b6, #38bdf8)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "15px",
    color: "#94a3b8",
    lineHeight: "1.6",
    marginBottom: "24px",
  },
  errorLogs: {
    background: "rgba(15, 23, 42, 0.6)",
    padding: "16px",
    borderRadius: "12px",
    textAlign: "left",
    fontSize: "12px",
    color: "#f43f5e",
    overflowX: "auto",
    marginBottom: "24px",
    maxHeight: "150px",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    fontFamily: "monospace",
  },
  button: {
    background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
    color: "#ffffff",
    border: "none",
    padding: "14px 28px",
    fontSize: "15px",
    fontWeight: "600",
    borderRadius: "12px",
    cursor: "pointer",
    boxShadow: "0 10px 15px -3px rgba(59, 130, 246, 0.3)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
};

export default ErrorBoundary;
