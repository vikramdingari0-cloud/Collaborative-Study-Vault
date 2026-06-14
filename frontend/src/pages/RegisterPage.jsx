import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Lock, Sparkles, ShieldAlert } from "lucide-react";
import { validatePassword, validateEmail, PASSWORD_RULES } from "../utils/validation";
import { getFieldErrors } from "../utils/apiErrors";

const RegisterPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [valError, setValError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const { register, guestLogin, loading, error, setError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValError("");
    setFieldErrors({});
    setError(null);

    if (!name.trim()) {
      setValError("Name is required.");
      return;
    }
    if (name.trim().length < 2) {
      setValError("Name must be at least 2 characters.");
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldErrors({ email: emailErr });
      return;
    }

    const passErr = validatePassword(password);
    if (passErr) {
      setFieldErrors({ password: passErr });
      return;
    }

    try {
      await register(name.trim(), email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length > 0) {
        setFieldErrors(fields);
      }
    }
  };

  const handleGuestLogin = async () => {
    setValError("");
    setFieldErrors({});
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

      <div style={styles.card} className="glass-card">
        <div style={styles.header}>
          <div style={styles.logo}>📚</div>
          <h2 style={styles.title}>Create Account</h2>
          <p style={styles.subtitle}>Sign up to build your collaborative vault</p>
        </div>

        {(valError || error) && (
          <div style={styles.alert} className="animate-fade-in">
            <ShieldAlert size={18} />
            <span>{valError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div style={styles.inputContainer}>
              <User style={styles.inputIcon} size={16} />
              <input
                type="text"
                placeholder="Newton Einstein"
                className="input-field"
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={styles.inputContainer}>
              <Mail style={styles.inputIcon} size={16} />
              <input
                type="email"
                placeholder="physics@vault.com"
                className="input-field"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <p style={styles.fieldError}>{fieldErrors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={styles.inputContainer}>
              <Lock style={styles.inputIcon} size={16} />
              <input
                type="password"
                placeholder="Min 8 chars, upper, lower, number"
                className="input-field"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            {fieldErrors.password ? (
              <p style={styles.fieldError}>{fieldErrors.password}</p>
            ) : (
              <p style={styles.hint}>{PASSWORD_RULES.hint}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerText}>or try without signing up</span>
        </div>

        <button
          onClick={handleGuestLogin}
          className="btn btn-secondary"
          style={styles.guestBtn}
          disabled={loading}
        >
          <Sparkles size={16} color="#6366f1" /> 1-Click Guest Login
        </button>

        <p style={styles.footerLink}>
          Already have an account? <Link to="/login" style={styles.link}>Sign In</Link>
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
    marginBottom: "24px",
  },
  logo: { fontSize: "2.5rem", marginBottom: "12px" },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    marginBottom: "6px",
    fontFamily: "var(--font-display)",
  },
  subtitle: { fontSize: "0.9rem", color: "var(--text-muted)" },
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
  fieldError: {
    fontSize: "0.75rem",
    color: "#ff8080",
    marginTop: "6px",
    marginBottom: 0,
  },
  hint: {
    fontSize: "0.75rem",
    color: "var(--text-dim)",
    marginTop: "6px",
    marginBottom: 0,
  },
  form: { display: "flex", flexDirection: "column", gap: "14px" },
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
  input: { width: "100%", paddingLeft: "42px" },
  submitBtn: {
    marginTop: "8px",
    padding: "12px",
    borderRadius: "10px",
    fontSize: "0.95rem",
  },
  divider: { margin: "24px 0", textAlign: "center" },
  dividerText: {
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
  link: { color: "var(--primary)", fontWeight: 500 },
};

export default RegisterPage;
