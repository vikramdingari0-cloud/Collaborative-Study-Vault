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
    setValError(""); setFieldErrors({}); setError(null);
    if (!name.trim()) { setValError("Name is required."); return; }
    if (name.trim().length < 2) { setValError("Name must be at least 2 characters."); return; }
    const emailErr = validateEmail(email);
    if (emailErr) { setFieldErrors({ email: emailErr }); return; }
    const passErr = validatePassword(password);
    if (passErr) { setFieldErrors({ password: passErr }); return; }
    try {
      await register(name.trim(), email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length > 0) setFieldErrors(fields);
    }
  };

  const handleGuestLogin = async () => {
    setValError(""); setFieldErrors({}); setError(null);
    try { await guestLogin(); navigate("/dashboard"); }
    catch { /* shown via AuthContext */ }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">📚</div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join your Collaborative Study Vault</p>

        {(valError || error) && (
          <div className="auth-error">
            <ShieldAlert size={16} />
            <span>{valError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"0.875rem" }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <div className="auth-input-wrapper">
              <User className="auth-input-icon" size={16} />
              <input
                type="text"
                className="auth-input"
                placeholder="e.g. Newton Einstein"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" size={16} />
              <input
                type="email"
                className="auth-input"
                placeholder="you@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
              />
            </div>
            {fieldErrors.email && <p style={{ fontSize:"0.75rem", color:"#F87171", marginTop:"0.25rem" }}>{fieldErrors.email}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={16} />
              <input
                type="password"
                className="auth-input"
                placeholder="Min 8 chars with upper, number…"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            {fieldErrors.password ? (
              <p style={{ fontSize:"0.75rem", color:"#F87171", marginTop:"0.25rem" }}>{fieldErrors.password}</p>
            ) : (
              <p style={{ fontSize:"0.72rem", color:"var(--color-text-dim)", marginTop:"0.25rem" }}>{PASSWORD_RULES?.hint}</p>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width:"100%", padding:"0.75rem", fontSize:"0.95rem", marginTop:"0.25rem" }}
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account →"}
          </button>
        </form>

        <div className="auth-divider">or try without signing up</div>

        <button
          onClick={handleGuestLogin}
          className="btn btn-secondary"
          style={{ width:"100%", padding:"0.75rem", fontSize:"0.9rem", border:"1px solid rgba(99,102,241,0.25)", background:"rgba(99,102,241,0.06)" }}
          disabled={loading}
        >
          <Sparkles size={16} color="#8B5CF6" />
          <span>1-Click Guest Access 🚀</span>
        </button>

        <p style={{ textAlign:"center", marginTop:"1.5rem", fontSize:"0.875rem", color:"var(--color-text-muted)" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color:"var(--color-primary)", fontWeight:600 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
