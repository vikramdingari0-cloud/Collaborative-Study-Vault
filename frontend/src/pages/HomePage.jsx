import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, MessageSquare, Sparkles, Users, ArrowRight, Library, ShieldCheck, Zap, Brain, PenTool } from "lucide-react";

const features = [
  {
    icon: <Library size={22} />,
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
    title: "Hierarchical Study Vaults",
    desc: "Organize folders and notes in an elegant tree structure. Keep notes, mock exams, and slides perfectly indexed.",
  },
  {
    icon: <BookOpen size={22} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    title: "Version-Controlled Notes",
    desc: "Every edit is tracked. Explore past versions of your markdown guides and restore snapshots with one click.",
  },
  {
    icon: <MessageSquare size={22} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    title: "Real-time Group Chat",
    desc: "Brainstorm live with your study group. Each vault has an integrated chat with AI tutor support.",
  },
  {
    icon: <Users size={22} />,
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    title: "Role-Based Permissions",
    desc: "Invite peers and control access. Set editors, viewers, and admins for each study room independently.",
  },
  {
    icon: <Brain size={22} />,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    title: "AI Active Recall Quizzes",
    desc: "Generate dynamic quizzes from any note using AI. Test yourself with instant adaptive feedback.",
  },
  {
    icon: <PenTool size={22} />,
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.12)",
    title: "Collaborative Whiteboard",
    desc: "Draw, diagram, and brainstorm visually. The live whiteboard includes AI-powered drawing recognition.",
  },
  {
    icon: <Zap size={22} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    title: "AI Summaries & Flashcards",
    desc: "Instantly summarize any note with AI. Generate 3D flip flashcards for high-retention active recall.",
  },
  {
    icon: <ShieldCheck size={22} />,
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
    title: "Secure & Production-Ready",
    desc: "CSRF protection, HttpOnly cookies, and role-based access control keep your study data private and safe.",
  },
];

const HomePage = () => {
  const { user, guestLogin, loading } = useAuth();
  const navigate = useNavigate();

  const handleGuestLogin = async () => {
    try { await guestLogin(); navigate("/dashboard"); }
    catch (err) { console.error(err); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg-base)", display:"flex", flexDirection:"column", alignItems:"center", position:"relative", overflow:"hidden" }}>

      {/* Background orbs */}
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", zIndex:0 }}>
        <div style={{ position:"absolute", width:"70vw", height:"70vw", top:"-30%", left:"50%", transform:"translateX(-50%)", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.09) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", width:"50vw", height:"50vw", bottom:"0", right:"-10%", borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)" }} />
        <div style={{ position:"absolute", width:"40vw", height:"40vw", top:"30%", left:"-10%", borderRadius:"50%", background:"radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)" }} />
      </div>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position:"sticky", top:0, zIndex:50, width:"100%",
        background:"rgba(10,15,30,0.88)",
        borderBottom:"1px solid rgba(255,255,255,0.06)",
        backdropFilter:"blur(16px)",
        padding:"0.875rem 2rem",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <div style={{
            width:36, height:36, borderRadius:8,
            background:"linear-gradient(135deg,#6366f1,#8B5CF6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1.1rem", boxShadow:"0 4px 12px rgba(99,102,241,0.4)"
          }}>📚</div>
          <span style={{ fontFamily:"var(--font-display)", fontSize:"1.15rem", fontWeight:800, letterSpacing:"-0.03em", color:"#F1F5F9" }}>
            StudyVault
          </span>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"1rem" }}>
          {user ? (
            <Link to="/dashboard" className="btn btn-primary" style={{ fontSize:"0.875rem", padding:"0.5rem 1.125rem" }}>
              Dashboard <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link to="/login" style={{ color:"var(--color-text-muted)", fontWeight:500, fontSize:"0.9rem", textDecoration:"none" }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ fontSize:"0.875rem", padding:"0.5rem 1.125rem" }}>
                Get Started →
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <main style={{ maxWidth:860, textAlign:"center", padding:"6rem 1.5rem 4rem", zIndex:1 }} className="animate-fade-in">

        {/* Badge */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:"0.4rem",
          padding:"0.375rem 1rem",
          borderRadius:"var(--radius-full)",
          background:"rgba(99,102,241,0.1)",
          border:"1px solid rgba(99,102,241,0.25)",
          color:"#818cf8", fontSize:"0.78rem", fontWeight:600,
          letterSpacing:"0.04em", textTransform:"uppercase",
          marginBottom:"1.75rem"
        }}>
          <Sparkles size={13} />
          Powered by Collaborative AI
        </div>

        <h1 style={{
          fontFamily:"var(--font-display)",
          fontSize:"clamp(2.5rem,6vw,4.25rem)",
          fontWeight:800, lineHeight:1.08,
          letterSpacing:"-0.04em",
          marginBottom:"1.25rem",
          color:"#F1F5F9"
        }}>
          The Ultimate{" "}
          <span style={{ background:"linear-gradient(135deg, #818cf8 0%, #34d399 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Collaborative
          </span>{" "}
          Study Environment
        </h1>

        <p style={{
          fontSize:"clamp(1rem,2vw,1.2rem)",
          color:"var(--color-text-muted)",
          maxWidth:620, margin:"0 auto 2.5rem",
          lineHeight:1.7,
        }}>
          Create shared study vaults, co-author notes in real-time, draw on a live whiteboard,
          and let AI generate quizzes, flashcards, and summaries — all in one place.
        </p>

        {/* CTAs */}
        <div style={{ display:"flex", gap:"1rem", flexWrap:"wrap", justifyContent:"center" }}>
          {user ? (
            <button onClick={() => navigate("/dashboard")} className="btn btn-primary" style={{ padding:"0.875rem 2rem", fontSize:"1rem" }}>
              Go to Dashboard <ArrowRight size={18} />
            </button>
          ) : (
            <>
              <button
                onClick={handleGuestLogin}
                className="btn btn-primary"
                style={{ padding:"0.875rem 2rem", fontSize:"1rem", minWidth:210 }}
                disabled={loading}
              >
                {loading ? "Initializing…" : "1-Click Guest Access 🚀"}
              </button>
              <button onClick={() => navigate("/register")} className="btn btn-secondary" style={{ padding:"0.875rem 2rem", fontSize:"1rem" }}>
                Create Account
              </button>
            </>
          )}
        </div>

        {/* Social proof pills */}
        <div style={{ display:"flex", justifyContent:"center", gap:"0.75rem", flexWrap:"wrap", marginTop:"2.5rem" }}>
          {["✅ No credit card required","🔒 Secure & encrypted","⚡ Instant setup"].map((t) => (
            <span key={t} style={{
              fontSize:"0.75rem", color:"var(--color-text-muted)", fontWeight:500,
              padding:"0.25rem 0.75rem",
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"var(--radius-full)"
            }}>{t}</span>
          ))}
        </div>
      </main>

      {/* ── FEATURES GRID ───────────────────────────────────── */}
      <section style={{ width:"100%", maxWidth:1180, padding:"2rem 1.5rem 6rem", zIndex:1 }}>
        <div style={{ textAlign:"center", marginBottom:"3rem" }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(1.75rem,3vw,2.25rem)", fontWeight:800, marginBottom:"0.625rem", color:"#F1F5F9" }}>
            Engineered for{" "}
            <span style={{ background:"linear-gradient(135deg,#6366f1,#8B5CF6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
              Modern Learners
            </span>
          </h2>
          <p style={{ color:"var(--color-text-muted)", fontSize:"1rem", maxWidth:520, margin:"0 auto" }}>
            Every feature is designed to reduce study friction and maximise retention.
          </p>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:"1.25rem" }}>
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background:"rgba(17,24,39,0.8)",
                border:"1px solid rgba(255,255,255,0.07)",
                borderRadius:"var(--radius-xl)",
                padding:"1.75rem",
                display:"flex", flexDirection:"column", gap:"0.875rem",
                transition:"all 250ms cubic-bezier(0.4,0,0.2,1)",
                cursor:"default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${f.color}35`;
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = `0 12px 30px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{
                width:48, height:48, borderRadius:"var(--radius-md)",
                background:f.bg, border:`1px solid ${f.color}25`,
                display:"flex", alignItems:"center", justifyContent:"center",
                color:f.color, flexShrink:0
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1rem", fontWeight:700, color:"#F1F5F9", margin:0 }}>
                {f.title}
              </h3>
              <p style={{ fontSize:"0.85rem", color:"var(--color-text-muted)", lineHeight:1.65, margin:0 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────── */}
      <section style={{
        width:"100%", maxWidth:1180, padding:"0 1.5rem 6rem", zIndex:1
      }}>
        <div style={{
          background:"linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)",
          border:"1px solid rgba(99,102,241,0.2)",
          borderRadius:"var(--radius-xl)",
          padding:"3rem 2rem",
          textAlign:"center",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", top:"-40%", left:"50%", transform:"translateX(-50%)", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)", pointerEvents:"none" }} />
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, marginBottom:"0.75rem", color:"#F1F5F9", position:"relative" }}>
            Ready to study smarter?
          </h2>
          <p style={{ color:"var(--color-text-muted)", fontSize:"1rem", marginBottom:"2rem", position:"relative" }}>
            Join thousands of students who have upgraded their study workflow.
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:"1rem", flexWrap:"wrap", position:"relative" }}>
            <button onClick={() => navigate("/register")} className="btn btn-primary" style={{ padding:"0.875rem 2rem", fontSize:"1rem" }}>
              Create Free Account →
            </button>
            <button onClick={handleGuestLogin} className="btn btn-secondary" style={{ padding:"0.875rem 2rem", fontSize:"1rem" }} disabled={loading}>
              Try as Guest
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer style={{
        width:"100%", maxWidth:1180,
        borderTop:"1px solid rgba(255,255,255,0.06)",
        padding:"2rem 1.5rem",
        display:"flex", justifyContent:"space-between", alignItems:"center",
        flexWrap:"wrap", gap:"1rem",
        color:"var(--color-text-muted)", fontSize:"0.85rem",
        zIndex:1, marginTop:"auto"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
          <span>📚</span>
          <span>© 2026 Collaborative Study Vault. Made with ❤️ for modern education.</span>
        </div>
        <div style={{ display:"flex", gap:"0.75rem" }}>
          {[
            { icon:<ShieldCheck size={13} />, label:"Production Ready" },
            { icon:"🔒", label:"Secure Cookies" },
          ].map((b) => (
            <span key={b.label} style={{
              display:"inline-flex", alignItems:"center", gap:"0.375rem",
              padding:"0.25rem 0.625rem", fontSize:"0.75rem",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"var(--radius-sm)", color:"var(--color-text-muted)"
            }}>
              {b.icon} {b.label}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
