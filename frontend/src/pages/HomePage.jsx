import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, MessageSquare, Sparkles, Users, ArrowRight, Library, ShieldCheck } from "lucide-react";

const HomePage = () => {
  const { user, guestLogin, loading } = useAuth();
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    try {
      await guestLogin();
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Decorative Blur Orbs */}
      <div style={styles.blurOrb1}></div>
      <div style={styles.blurOrb2}></div>

      {/* Header / Navbar */}
      <header style={styles.header} className="glass-card">
        <div style={styles.logoContainer}>
          <span style={styles.logoIcon}>📚</span>
          <span style={styles.logoText}>StudyVault</span>
        </div>
        <div style={styles.navActions}>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary" style={styles.btnNav}>
              Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link to="/login" style={styles.linkLogin}>Sign In</Link>
              <Link to="/register" className="btn btn-secondary" style={styles.btnNav}>Sign Up</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main style={styles.heroSection}>
        <div style={styles.badge} className="glass-card">
          <Sparkles size={14} color="#6366f1" /> Powered by Collaborative AI
        </div>
        <h1 style={styles.heroTitle}>
          The Ultimate <span style={styles.heroGradient}>Collaborative</span> Study Environment
        </h1>
        <p style={styles.heroSubtitle}>
          Create shared study vaults, design rich notes with integrated history, collaborate in real-time chats, and leverage AI summaries. Built for modern learners.
        </p>

        {/* Hero Actions */}
        <div style={styles.heroActions}>
          {user ? (
            <button onClick={() => navigate("/dashboard")} className="btn btn-primary" style={styles.ctaButton}>
              Go to Dashboard <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <button 
                onClick={handleGuestLogin} 
                className="btn btn-primary" 
                style={{ ...styles.ctaButton, ...styles.guestBtn }}
                disabled={loading}
              >
                {loading ? "Initializing..." : "1-Click Guest Login 🚀"}
              </button>
              <button onClick={() => navigate("/login")} className="btn btn-secondary" style={styles.ctaButton}>
                Explore Account
              </button>
            </>
          )}
        </div>
      </main>

      {/* Features Grid */}
      <section style={styles.featuresSection}>
        <h2 style={styles.sectionTitle}>Engineered for Impact</h2>
        <div style={styles.featuresGrid}>
          
          <div style={styles.featureCard} className="glass-card">
            <div style={styles.iconCircle}><Library size={22} color="#6366f1" /></div>
            <h3>Hierarchical Study Vaults</h3>
            <p>Organize folders and notes inside an elegant tree structure. Keep notes, mock exam materials, and slides perfectly indexed.</p>
          </div>

          <div style={styles.featureCard} className="glass-card">
            <div style={styles.iconCircle}><BookOpen size={22} color="#10b981" /></div>
            <h3>Version-Controlled Notes</h3>
            <p>Every single edit is tracked. Explore past versions of your markdown study guides and restore old files with one click.</p>
          </div>

          <div style={styles.featureCard} className="glass-card">
            <div style={styles.iconCircle}><MessageSquare size={22} color="#f59e0b" /></div>
            <h3>Group Study Chats</h3>
            <p>Brainstorm topics together. Each study vault comes with an integrated group chat to exchange thoughts in real-time.</p>
          </div>

          <div style={styles.featureCard} className="glass-card">
            <div style={styles.iconCircle}><Users size={22} color="#ef4444" /></div>
            <h3>Member Permissions</h3>
            <p>Invite peers to study rooms and manage their editing permissions. Control who can edit notes or invite others.</p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <p>© 2026 Collaborative Study Vault. Made with ❤️ for modern education.</p>
        <div style={styles.footerBadges}>
          <span style={styles.footerBadge} className="glass-card"><ShieldCheck size={14} /> Production Ready</span>
          <span style={styles.footerBadge} className="glass-card">🔒 Secure Cookies</span>
        </div>
      </footer>
    </div>
  );
};

// Inline Styles to avoid polluting global space and guarantee rich premium styling
const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px",
    position: "relative",
    overflow: "hidden",
  },
  blurOrb1: {
    position: "absolute",
    top: "-10%",
    left: "15%",
    width: "40vw",
    height: "40vw",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0) 70%)",
    zIndex: -1,
  },
  blurOrb2: {
    position: "absolute",
    bottom: "10%",
    right: "10%",
    width: "50vw",
    height: "50vw",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0) 70%)",
    zIndex: -1,
  },
  header: {
    width: "100%",
    maxWidth: "1200px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 28px",
    marginTop: "24px",
    borderRadius: "20px",
  },
  logoContainer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  logoIcon: {
    fontSize: "1.6rem",
  },
  logoText: {
    fontFamily: "var(--font-display)",
    fontSize: "1.3rem",
    fontWeight: 700,
    letterSpacing: "-0.03em",
    color: "#ffffff",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  linkLogin: {
    color: "var(--text-muted)",
    fontWeight: 500,
    fontSize: "0.95rem",
  },
  btnNav: {
    padding: "8px 16px",
    fontSize: "0.9rem",
    borderRadius: "8px",
  },
  heroSection: {
    maxWidth: "800px",
    textAlign: "center",
    padding: "100px 0 60px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 14px",
    borderRadius: "30px",
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: "24px",
    border: "1px solid rgba(99, 102, 241, 0.2)",
    background: "rgba(99, 102, 241, 0.05)",
  },
  heroTitle: {
    fontSize: "clamp(2.5rem, 6vw, 4rem)",
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.04em",
    marginBottom: "20px",
    fontFamily: "var(--font-display)",
  },
  heroGradient: {
    background: "linear-gradient(135deg, #818cf8 0%, #34d399 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSubtitle: {
    fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
    color: "var(--text-muted)",
    marginBottom: "40px",
    lineHeight: 1.6,
  },
  heroActions: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  ctaButton: {
    padding: "14px 28px",
    fontSize: "1rem",
    borderRadius: "12px",
    boxShadow: "var(--shadow-md)",
  },
  guestBtn: {
    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
    border: "none",
  },
  featuresSection: {
    width: "100%",
    maxWidth: "1200px",
    padding: "60px 0 100px",
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: "2rem",
    marginBottom: "48px",
    fontWeight: 700,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "24px",
  },
  featureCard: {
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    borderRadius: "20px",
  },
  iconCircle: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    width: "100%",
    maxWidth: "1200px",
    borderTop: "1px solid var(--border)",
    padding: "32px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginTop: "auto",
    color: "var(--text-dim)",
    fontSize: "0.9rem",
  },
  footerBadges: {
    display: "flex",
    gap: "12px",
  },
  footerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 10px",
    fontSize: "0.8rem",
    borderRadius: "6px",
    color: "var(--text-muted)",
    background: "rgba(255, 255, 255, 0.01)",
  },
};

export default HomePage;
