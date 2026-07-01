import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";
import { useToast } from "../context/ToastContext";

const emojis = ["📚", "💡", "🧪", "🎨", "💻", "⚖️", "🩺", "📈", "🌍", "✍️", "🔬", "🎭"];
const colors = [
  { label: "Indigo",  hex: "#6366f1" },
  { label: "Emerald", hex: "#10b981" },
  { label: "Amber",   hex: "#f59e0b" },
  { label: "Crimson", hex: "#ef4444" },
  { label: "Rose",    hex: "#ec4899" },
  { label: "Cyan",    hex: "#06b6d4" },
  { label: "Violet",  hex: "#8B5CF6" },
  { label: "Sky",     hex: "#0EA5E9" },
];

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [workspaces, setWorkspaces]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [stats, setStats]             = useState({ totalWorkspaces: 0, totalNotes: 0, totalQuizzes: 0 });
  const [timeRemaining, setTimeRemaining] = useState("");

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc,  setNewDesc]  = useState("");
  const [newIcon,  setNewIcon]  = useState("📚");
  const [newColor, setNewColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  // Join modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining,  setJoining]  = useState(false);

  // Fetch workspaces & stats
  const fetchWorkspaces = async () => {
    try {
      setLoading(true); setError(null);
      const res = await axiosInstance.get("/workspaces");
      if (res.data?.success) {
        const list = res.data.data;
        setWorkspaces(list);
        let notesCount = 0, quizzesCount = 0;
        for (const ws of list) {
          try {
            const nr = await axiosInstance.get(`/notes/workspace/${ws._id}`);
            if (nr.data?.success) notesCount += nr.data.meta?.total ?? nr.data.data.length;
            const qr = await axiosInstance.get(`/quizzes/workspace/${ws._id}`);
            if (qr.data?.success) quizzesCount += qr.data.data.length;
          } catch { /* ignore */ }
        }
        setStats({ totalWorkspaces: list.length, totalNotes: notesCount, totalQuizzes: quizzesCount });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load workspaces.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchWorkspaces(); }, []);

  // Guest countdown
  useEffect(() => {
    if (!user?.isGuest) return;
    const tick = () => {
      const expiry = new Date(user.createdAt).getTime() + 24 * 60 * 60 * 1000;
      const diff = expiry - Date.now();
      if (diff <= 0) { setTimeRemaining("Expired"); logout(); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [user, logout]);

  // Escape closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setShowCreateModal(false); setShowJoinModal(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    try {
      setJoining(true);
      const res = await axiosInstance.post("/workspaces/join", { code });
      if (res.data?.success) {
        setShowJoinModal(false); setJoinCode("");
        await fetchWorkspaces();
        if (res.data.data?._id) navigate(`/workspace/${res.data.data._id}`);
      }
    } catch (err) { toast.error("Failed to join: " + (err.response?.data?.message || err.message)); }
    finally { setJoining(false); }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setCreating(true);
      const res = await axiosInstance.post("/workspaces", { title: newTitle.trim(), description: newDesc.trim(), icon: newIcon, color: newColor });
      if (res.data?.success) {
        setShowCreateModal(false); setNewTitle(""); setNewDesc(""); setNewIcon("📚"); setNewColor("#6366f1");
        fetchWorkspaces();
      }
    } catch (err) { toast.error("Failed to create: " + (err.response?.data?.message || err.message)); }
    finally { setCreating(false); }
  };

  const statCards = [
    { icon: "🌌", label: "Study Rooms",   value: stats.totalWorkspaces, color: "#6366f1", bg: "rgba(99,102,241,0.12)"  },
    { icon: "📝", label: "Note Guides",   value: stats.totalNotes,      color: "#10b981", bg: "rgba(16,185,129,0.12)" },
    { icon: "🧠", label: "Active Quizzes",value: stats.totalQuizzes,    color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"var(--color-bg-base)", display:"flex", flexDirection:"column" }}>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(10,15,30,0.92)",
        borderBottom:"1px solid var(--color-border)",
        backdropFilter:"blur(16px)",
        padding:"0.75rem 1.5rem",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:"1rem"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <div style={{
            width:38, height:38, borderRadius:10,
            background:"linear-gradient(135deg, #6366f1, #8B5CF6)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:"1.25rem", boxShadow:"0 4px 12px rgba(99,102,241,0.4)"
          }}>📚</div>
          <div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"1rem", color:"#F1F5F9" }}>
              StudyVault
            </div>
            <div style={{ fontSize:"0.6rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--color-text-muted)", fontWeight:600 }}>
              Collaborative Learning Platform
            </div>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          {/* User badge */}
          <div style={{
            display:"flex", alignItems:"center", gap:"0.625rem",
            background:"rgba(255,255,255,0.05)",
            border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:"var(--radius-full)",
            padding:"0.375rem 0.875rem"
          }}>
            <span style={{ fontSize:"1.1rem" }}>{user?.avatar || "👤"}</span>
            <div>
              <div style={{ fontSize:"0.8rem", fontWeight:600, color:"var(--color-text-main)" }}>{user?.name}</div>
              <div style={{ fontSize:"0.65rem", color:"var(--color-text-muted)" }}>{user?.isGuest ? "Guest Account" : user?.email}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost"
            style={{ fontSize:"0.8rem", padding:"0.4rem 0.875rem", border:"1px solid rgba(255,255,255,0.1)" }}
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div style={{ padding:"2rem 1.5rem", maxWidth:1200, margin:"0 auto", width:"100%", display:"flex", flexDirection:"column", gap:"1.75rem" }}>

        {/* Guest warning */}
        {user?.isGuest && (
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"1rem",
            padding:"1rem 1.25rem",
            background:"rgba(245,158,11,0.08)",
            border:"1px solid rgba(245,158,11,0.2)",
            borderRadius:"var(--radius-lg)",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.875rem" }}>
              <span style={{ fontSize:"1.5rem" }}>⏳</span>
              <div>
                <div style={{ fontWeight:700, color:"var(--color-warning)", fontSize:"0.9rem" }}>Ephemeral Guest Account</div>
                <div style={{ fontSize:"0.78rem", color:"var(--color-text-muted)", marginTop:2 }}>
                  This account auto-deletes in 24h. Register to save your work permanently.
                </div>
              </div>
            </div>
            <div style={{
              textAlign:"center", padding:"0.5rem 1.25rem",
              background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.25)",
              borderRadius:"var(--radius-full)", minWidth:140
            }}>
              <div style={{ fontSize:"0.6rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--color-text-muted)" }}>Time Remaining</div>
              <div style={{ fontFamily:"var(--font-mono)", fontWeight:700, color:"var(--color-warning)", fontSize:"0.9rem" }}>{timeRemaining || "--:--:--"}</div>
            </div>
          </div>
        )}

        {/* Welcome */}
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(1.5rem,3vw,2rem)", fontWeight:800, marginBottom:"0.375rem", background:"linear-gradient(135deg,#F1F5F9,#94A3B8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p style={{ color:"var(--color-text-muted)", fontSize:"0.9rem" }}>
            Here's an overview of your collaborative study activity.
          </p>
        </div>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:"1rem" }}>
          {statCards.map((s) => (
            <div key={s.label} style={{
              background:"rgba(17,24,39,0.8)",
              border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:"var(--radius-lg)",
              padding:"1.25rem 1.5rem",
              display:"flex", alignItems:"center", gap:"1rem",
            }}>
              <div style={{
                width:48, height:48,
                borderRadius:"var(--radius-md)",
                background:s.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:"1.5rem",
                flexShrink:0,
              }}>{s.icon}</div>
              <div>
                <div style={{ fontSize:"1.75rem", fontWeight:800, color:s.color, fontFamily:"var(--font-display)", lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:"0.7rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--color-text-muted)", marginTop:4 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Section header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"0.75rem" }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"1.25rem", fontWeight:700, margin:0 }}>Your Study Rooms</h2>
          <div style={{ display:"flex", gap:"0.625rem" }}>
            <button className="btn btn-secondary" style={{ fontSize:"0.85rem" }} onClick={() => setShowJoinModal(true)}>
              🔑 Join with Code
            </button>
            <button className="btn btn-primary" style={{ fontSize:"0.85rem" }} onClick={() => setShowCreateModal(true)}>
              ✚ Create Room
            </button>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div style={{ padding:"1rem", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"var(--radius-md)", color:"#F87171", fontSize:"0.875rem" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"4rem 0", gap:"0.875rem" }}>
            <div className="loader"></div>
            <span style={{ color:"var(--color-text-muted)", fontSize:"0.85rem" }}>Loading your study rooms…</span>
          </div>
        ) : workspaces.length === 0 ? (
          /* Empty state */
          <div style={{
            background:"rgba(17,24,39,0.8)", border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:"var(--radius-xl)", padding:"4rem 2rem", textAlign:"center"
          }}>
            <div style={{ fontSize:"3.5rem", marginBottom:"1rem", filter:"drop-shadow(0 0 20px rgba(99,102,241,0.4))" }}>🌌</div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.25rem", marginBottom:"0.5rem" }}>No Study Rooms Yet</h3>
            <p style={{ color:"var(--color-text-muted)", fontSize:"0.875rem", maxWidth:400, margin:"0 auto 1.5rem" }}>
              Create your first collaborative workspace to co-author notes, generate AI quizzes, and study with peers.
            </p>
            <div style={{ display:"flex", gap:"0.75rem", justifyContent:"center", flexWrap:"wrap" }}>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>✚ Create Study Room</button>
              <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>🔑 Join with Code</button>
            </div>
          </div>
        ) : (
          /* Workspace grid */
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:"1.25rem", paddingBottom:"2rem" }}>
            {workspaces.map((ws) => {
              const ownerId = ws.owner?._id || ws.owner;
              const isOwner = ownerId === user?._id;
              const myRole = isOwner ? "owner" : (ws.members?.find((m) => (m.user?._id || m.user) === user?._id)?.role || "member");
              const roleColor = myRole === "owner" ? "#10b981" : myRole === "admin" ? "#6366f1" : "#64748B";
              const accentColor = ws.color || "#6366f1";

              return (
                <div
                  key={ws._id}
                  onClick={() => navigate(`/workspace/${ws._id}`)}
                  style={{
                    background:"rgba(17,24,39,0.85)",
                    border:"1px solid rgba(255,255,255,0.07)",
                    borderRadius:"var(--radius-xl)",
                    cursor:"pointer",
                    overflow:"hidden",
                    display:"flex", flexDirection:"column",
                    transition:"all 250ms cubic-bezier(0.4,0,0.2,1)",
                    position:"relative",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.borderColor = `${accentColor}40`;
                    e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}25`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Accent top bar */}
                  <div style={{ height:3, background:`linear-gradient(90deg, ${accentColor}, ${accentColor}99)` }} />

                  <div style={{ padding:"1.25rem", flex:1 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.875rem" }}>
                      <span style={{ fontSize:"2rem", filter:`drop-shadow(0 0 10px ${accentColor}50)` }}>{ws.icon || "📚"}</span>
                      <span style={{
                        fontSize:"0.6rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em",
                        padding:"0.2rem 0.6rem", borderRadius:"var(--radius-full)",
                        background:`${roleColor}18`, color:roleColor,
                        border:`1px solid ${roleColor}30`
                      }}>{myRole}</span>
                    </div>
                    <h3 style={{ fontFamily:"var(--font-display)", fontSize:"1.05rem", fontWeight:700, color:"var(--color-text-main)", marginBottom:"0.375rem", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {ws.title}
                    </h3>
                    <p style={{ fontSize:"0.8rem", color:"var(--color-text-muted)", lineHeight:1.5, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                      {ws.description || "No description. Click to open and start studying!"}
                    </p>
                  </div>

                  <div style={{
                    padding:"0.75rem 1.25rem",
                    borderTop:"1px solid rgba(255,255,255,0.06)",
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    background:"rgba(0,0,0,0.2)"
                  }}>
                    <span style={{ fontSize:"0.72rem", color:"var(--color-text-muted)" }}>
                      {ws.members?.length || 1} member{(ws.members?.length || 1) !== 1 ? "s" : ""}
                      {ws.code && <span style={{ marginLeft:8, fontFamily:"var(--font-mono)", color:accentColor }}>#{ws.code}</span>}
                    </span>
                    <span style={{ fontSize:"0.75rem", fontWeight:600, color:accentColor }}>Enter Room →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────── */}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-container" style={{ maxWidth:520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
              <h3 style={{ margin:0, fontFamily:"var(--font-display)", fontSize:"1.15rem" }}>🚀 Create Study Room</h3>
              <button className="btn btn-ghost" style={{ padding:"0.25rem 0.5rem" }} onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateWorkspace} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <div className="form-group">
                <label className="form-label">Room Title</label>
                <input type="text" required className="input-field" placeholder="e.g. Organic Chemistry 101" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="input-field" rows={3} style={{ resize:"none" }} placeholder="Describe topics, exam dates, resources…" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>

              {/* Emoji picker */}
              <div className="form-group">
                <label className="form-label">Room Icon</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
                  {emojis.map((em) => (
                    <button
                      key={em} type="button"
                      onClick={() => setNewIcon(em)}
                      style={{
                        width:40, height:40, borderRadius:8, fontSize:"1.25rem",
                        background: newIcon === em ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                        border: newIcon === em ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.08)",
                        cursor:"pointer", transition:"all 150ms", display:"flex", alignItems:"center", justifyContent:"center"
                      }}
                    >{em}</button>
                  ))}
                </div>
              </div>

              {/* Color picker */}
              <div className="form-group">
                <label className="form-label">Accent Color</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:"0.5rem" }}>
                  {colors.map((c) => (
                    <button
                      key={c.hex} type="button"
                      onClick={() => setNewColor(c.hex)}
                      title={c.label}
                      style={{
                        width:28, height:28, borderRadius:"50%",
                        background:c.hex,
                        border: newColor === c.hex ? "3px solid white" : "2px solid transparent",
                        boxShadow: newColor === c.hex ? `0 0 0 3px ${c.hex}50` : "none",
                        cursor:"pointer", transition:"all 150ms"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", gap:"0.75rem", justifyContent:"flex-end", marginTop:"0.5rem" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? "Launching…" : "🚀 Launch Study Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="modal-backdrop" onClick={() => setShowJoinModal(false)}>
          <div className="modal-container" style={{ maxWidth:420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1.25rem" }}>
              <h3 style={{ margin:0, fontFamily:"var(--font-display)", fontSize:"1.15rem" }}>🔑 Join Study Room</h3>
              <button className="btn btn-ghost" style={{ padding:"0.25rem 0.5rem" }} onClick={() => setShowJoinModal(false)}>✕</button>
            </div>
            <form onSubmit={handleJoinWorkspace} style={{ display:"flex", flexDirection:"column", gap:"1rem" }}>
              <div className="form-group">
                <label className="form-label">Workspace Join Code</label>
                <input
                  type="text" required className="input-field"
                  style={{ fontFamily:"var(--font-mono)", letterSpacing:"0.12em", textTransform:"uppercase", fontSize:"1.1rem", textAlign:"center" }}
                  placeholder="SV9D4A"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  autoFocus
                />
                <p style={{ fontSize:"0.72rem", color:"var(--color-text-muted)", marginTop:"0.375rem" }}>
                  Demo seed code: <strong style={{ color:"var(--color-primary)", fontFamily:"var(--font-mono)" }}>SV9D4A</strong>
                </p>
              </div>
              <div style={{ display:"flex", gap:"0.75rem", justifyContent:"flex-end" }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowJoinModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={joining}>
                  {joining ? "Joining…" : "Join Room →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
