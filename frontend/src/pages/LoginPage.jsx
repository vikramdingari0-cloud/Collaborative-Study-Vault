import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [valError, setValError] = useState("");
  const { login, guestLogin, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValError("");
    setError(null);

    if (!email || !password) {
      setValError("Please fill in all fields.");
      return;
    }

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      // Error handled by AuthContext
    }
  };

  const handleGuestLogin = async () => {
    setValError("");
    setError(null);
    try {
      await guestLogin();
      navigate("/dashboard");
    } catch {
      // Error shown via AuthContext
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.blurOrb}></div>

      {/* Main Login Card */}
      <div style={styles.card} className="glass-card">
        <div style={styles.header}>
          <div style={styles.logo}>📚</div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Enter your study vault credentials</p>
        </div>

        {/* Success/Error Alerts */}
        {(valError || error) && (
          <div style={styles.alert} className="animate-fade-in">
            <ShieldAlert size={18} />
            <span>{valError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={styles.inputContainer}>
              <Mail style={styles.inputIcon} size={16} />
              <input
                type="email"
                placeholder="you@domain.com"
                className="input-field"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputContainer}>
              <Lock style={styles.inputIcon} size={16} />
              <input
                type="password"
                placeholder="••••••••"
                className="input-field"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or continue as recruiter</span>
        </div>

        {/* Guest Access Option */}
        <button
          onClick={handleGuestLogin}
          className="btn btn-secondary"
          style={styles.guestBtn}
          disabled={loading}
        >
          <Sparkles size={16} color="#6366f1" /> 1-Click Guest Login 🚀
        </button>

        <p style={styles.footerLink}>
          Don't have an account? <Link to="/register" style={styles.link}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    position: "relative",
    overflow: "hidden",
  },
  blurOrb: {
    position: "absolute",
    width: "400px",
    height: "400px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0) 70%)",
    zIndex: -1,
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    padding: "40px",
    borderRadius: "24px",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  logo: {
    fontSize: "2.5rem",
    marginBottom: "12px",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    marginBottom: "6px",
    fontFamily: "var(--font-display)",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "var(--text-muted)",
  },
  alert: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 16px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#ff8080",
    borderRadius: "10px",
    fontSize: "0.85rem",
    marginBottom: "20px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  inputContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: "14px",
    color: "var(--text-dim)",
  },
  input: {
    width: "100%",
    paddingLeft: "42px",
  },
  submitBtn: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "0.95rem",
  },
  divider: {
    display: "flex",
    alignItems: "center",
    textAlign: "center",
    margin: "24px 0",
  },
  dividerText: {
    width: "100%",
    fontSize: "0.75rem",
    color: "var(--text-dim)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  guestBtn: {
    padding: "12px",
    borderRadius: "10px",
    fontSize: "0.95rem",
    fontWeight: 600,
    border: "1px solid rgba(99, 102, 241, 0.25)",
    background: "rgba(99, 102, 241, 0.05)",
  },
  footerLink: {
    textAlign: "center",
    marginTop: "24px",
    fontSize: "0.9rem",
    color: "var(--text-dim)",
  },
  link: {
    color: "var(--primary)",
    fontWeight: 500,
  },
};

export default LoginPage;
