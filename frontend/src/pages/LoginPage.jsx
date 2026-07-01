import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, Sparkles, ShieldAlert } from "lucide-react";

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
    if (!email || !password) { setValError("Please fill in all fields."); return; }
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch { /* handled by AuthContext */ }
  };

  const handleGuestLogin = async () => {
    setValError(""); setError(null);
    try { await guestLogin(); navigate("/dashboard"); }
    catch { /* shown via AuthContext */ }
  };

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="auth-logo">📚</div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your Study Vault</p>

        {(valError || error) && (
          <div className="auth-error">
            <ShieldAlert size={16} />
            <span>{valError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
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
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={16} />
              <input
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width:"100%", padding:"0.75rem", fontSize:"0.95rem", marginTop:"0.25rem" }}
            disabled={loading}
          >
            {loading ? "Authenticating…" : "Sign In →"}
          </button>
        </form>

        <div className="auth-divider">or continue as guest</div>

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
          Don't have an account?{" "}
          <Link to="/register" style={{ color:"var(--color-primary)", fontWeight:600 }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
