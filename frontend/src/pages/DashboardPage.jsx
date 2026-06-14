import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosInstance";
import { useToast } from "../context/ToastContext";

/**
 * DashboardPage - Beautiful study dashboard
 * Lists glowing workspace cards, stats indicators, creation modals,
 * and tracks live guest expiration countdowns.
 */
const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    totalWorkspaces: 0,
    totalNotes: 0,
    totalQuizzes: 0,
  });

  // Expiration countdown
  const [timeRemaining, setTimeRemaining] = useState("");

  // Create Workspace Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("📚");
  const [newColor, setNewColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);

  // Join Workspace Modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Emojis and Colors selections
  const emojis = ["📚", "💡", "🧪", "🎨", "💻", "⚖️", "🩺", "📈", "🌍", "✍️"];
  const colors = [
    { label: "Indigo", hex: "#6366f1" },
    { label: "Emerald", hex: "#10b981" },
    { label: "Amber", hex: "#f59e0b" },
    { label: "Crimson", hex: "#ef4444" },
    { label: "Rose", hex: "#ec4899" },
    { label: "Cyan", hex: "#06b6d4" },
  ];

  // 1. Fetch workspaces & aggregate statistics
  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axiosInstance.get("/workspaces");
      if (res.data && res.data.success) {
        const fetchedList = res.data.data;
        setWorkspaces(fetchedList);

        // Fetch all notes/quizzes across these workspaces to compute stats
        let notesCount = 0;
        let quizzesCount = 0;

        for (const ws of fetchedList) {
          try {
            const notesRes = await axiosInstance.get(`/notes/workspace/${ws._id}`);
            if (notesRes.data?.success) {
              // Use meta.total for accurate count across all pages
              notesCount += notesRes.data.meta?.total ?? notesRes.data.data.length;
            }
            const quizzesRes = await axiosInstance.get(`/quizzes/workspace/${ws._id}`);
            if (quizzesRes.data?.success) {
              quizzesCount += quizzesRes.data.data.length;
            }
          } catch (e) {
            // Ignore workspace-level failures in stats calculation
          }
        }

        setStats({
          totalWorkspaces: fetchedList.length,
          totalNotes: notesCount,
          totalQuizzes: quizzesCount,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load workspaces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  // 2. Countdown Timer for Guest Accounts
  useEffect(() => {
    if (!user || !user.isGuest) return;

    const calculateTimeLeft = () => {
      const createdTime = new Date(user.createdAt).getTime();
      const expirationTime = createdTime + 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();
      const difference = expirationTime - now;

      if (difference <= 0) {
        setTimeRemaining("Expired");
        logout(); // Kick out if expired
        return;
      }

      const hrs = Math.floor(difference / (1000 * 60 * 60));
      const mins = Math.floor((difference / (1000 * 60)) % 60);
      const secs = Math.floor((difference / 1000) % 60);

      setTimeRemaining(`${hrs}h ${mins}m ${secs}s`);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [user, logout]);

  // 3. Join Workspace by Code
  const handleJoinWorkspace = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;

    try {
      setJoining(true);
      const res = await axiosInstance.post("/workspaces/join", { code });
      if (res.data?.success) {
        setShowJoinModal(false);
        setJoinCode("");
        await fetchWorkspaces();
        const joined = res.data.data;
        if (joined?._id) {
          navigate(`/workspace/${joined._id}`);
        }
      }
    } catch (err) {
      toast.error("Failed to join workspace: " + (err.response?.data?.message || err.message));
    } finally {
      setJoining(false);
    }
  };

  // 4. Create Workspace Handler
  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreating(true);
      const res = await axiosInstance.post("/workspaces", {
        title: newTitle.trim(),
        description: newDesc.trim(),
        icon: newIcon,
        color: newColor,
      });

      if (res.data && res.data.success) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDesc("");
        setNewIcon("📚");
        setNewColor("#6366f1");
        fetchWorkspaces(); // Refresh list
      }
    } catch (err) {
      toast.error("Failed to create workspace: " + (err.response?.data?.message || err.message));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="dashboard-container p-4 p-md-5 max-w-1200 mx-auto min-h-screen d-flex flex-column gap-4 animate-fade-in">
      {/* Top Navbar */}
      <div className="dashboard-nav glass-card p-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div className="d-flex align-items-center gap-2">
          <span className="logo-emoji text-3xl">🌌</span>
          <div>
            <h1 className="m-0 font-display text-lg tracking-tight">StudyVault</h1>
            <span className="text-muted text-xxs tracking-wider uppercase font-semibold">Collaborative Study Rooms</span>
          </div>
        </div>

        <div className="d-flex align-items-center gap-3">
          <div className="user-profile-badge glass-card px-3 py-1.5 rounded-pill d-flex align-items-center gap-2">
            <span className="text-lg">{user?.avatar || "👤"}</span>
            <div className="text-start">
              <span className="text-xs text-white d-block font-semibold">{user?.name}</span>
              <span className="text-dim text-xxs">{user?.email}</span>
            </div>
          </div>
          <button className="btn btn-secondary text-xs px-3 py-2" onClick={logout}>
            Log Out
          </button>
        </div>
      </div>

      {/* Guest Account Countdown Warning Banner */}
      {user?.isGuest && (
        <div className="guest-countdown-banner glass-card p-3 d-flex align-items-center justify-content-between flex-wrap gap-3 border-warning">
          <div className="d-flex align-items-center gap-3">
            <span className="banner-icon text-2xl">⏳</span>
            <div className="text-start">
              <h4 className="text-warning m-0 text-sm">Ephemeral Guest Account Mode</h4>
              <p className="text-muted text-xs m-0 mt-0.5">
                This study environment will automatically self-clean in 24 hours to preserve platform storage.
              </p>
            </div>
          </div>
          <div className="countdown-pill glass-card bg-warning-glow px-4 py-2 border-warning rounded-pill text-center min-w-150">
            <span className="text-xxs uppercase tracking-wider text-muted font-semibold d-block">Time Remaining</span>
            <span className="text-warning font-mono font-bold text-sm">{timeRemaining || "--:--:--"}</span>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="stats-strip-grid d-grid gap-4">
        <div className="stat-card glass-card p-3.5 d-flex align-items-center gap-3">
          <span className="stat-icon-bg bg-primary-glow text-primary rounded-12 text-2xl d-flex align-items-center justify-content-center">🌌</span>
          <div>
            <span className="text-muted text-xxs tracking-wider uppercase font-semibold">Study Rooms</span>
            <h3 className="m-0 text-white font-display text-2xl">{stats.totalWorkspaces}</h3>
          </div>
        </div>
        <div className="stat-card glass-card p-3.5 d-flex align-items-center gap-3">
          <span className="stat-icon-bg bg-emerald-glow text-success rounded-12 text-2xl d-flex align-items-center justify-content-center">📝</span>
          <div>
            <span className="text-muted text-xxs tracking-wider uppercase font-semibold">Note Guides</span>
            <h3 className="m-0 text-white font-display text-2xl">{stats.totalNotes}</h3>
          </div>
        </div>
        <div className="stat-card glass-card p-3.5 d-flex align-items-center gap-3">
          <span className="stat-icon-bg bg-amber-glow text-warning rounded-12 text-2xl d-flex align-items-center justify-content-center">🧠</span>
          <div>
            <span className="text-muted text-xxs tracking-wider uppercase font-semibold">Active Quizzes</span>
            <h3 className="m-0 text-white font-display text-2xl">{stats.totalQuizzes}</h3>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
        <h2 className="font-display m-0">Your Vault Workspace Rooms</h2>
        <div className="d-flex gap-2">
          <button className="btn btn-secondary text-sm px-4 py-2" onClick={() => setShowJoinModal(true)}>
            Join with Code
          </button>
          <button className="btn btn-primary text-sm px-4 py-2" onClick={() => setShowCreateModal(true)}>
            + Create Room
          </button>
        </div>
      </div>

      {/* Loading & Empty states */}
      {loading ? (
        <div className="d-flex flex-column align-items-center justify-content-center py-5">
          <div className="loader my-3"></div>
          <span className="text-muted">Opening your study catalog...</span>
        </div>
      ) : workspaces.length === 0 ? (
        <div className="glass-card p-5 text-center my-4">
          <span className="text-4xl d-block mb-3">🌌</span>
          <h3>No study vaults found</h3>
          <p className="text-muted text-sm max-w-400 mx-auto my-3">
            Get started by creating your first collaborative workspace room! Invite partners, draft study sheets, and generate quizzes!
          </p>
          <button className="btn btn-primary mt-2" onClick={() => setShowCreateModal(true)}>
            Create Workspace Room
          </button>
        </div>
      ) : (
        /* Workspaces Grid */
        <div className="workspaces-grid d-grid gap-4 mb-5">
          {workspaces.map((ws) => {
            const ownerId = ws.owner?._id || ws.owner;
            const isOwner = ownerId === user?._id;
            const myRole = isOwner 
              ? "owner" 
              : ws.members?.find((m) => (m.user?._id || m.user) === user?._id)?.role || "member";

            return (
              <div 
                key={ws._id} 
                className="workspace-hover-card glass-card overflow-hidden d-flex flex-column justify-content-between cursor-pointer"
                style={{ borderTop: `4px solid ${ws.color || "#6366f1"}` }}
                onClick={() => navigate(`/workspace/${ws._id}`)}
              >
                <div className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <span className="workspace-card-icon text-3xl">{ws.icon || "📚"}</span>
                    <span className={`role-pill text-xxs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-pill ${
                      myRole === "owner" 
                        ? "bg-emerald-glow text-success" 
                        : myRole === "admin"
                          ? "bg-primary-glow text-primary"
                          : "bg-secondary text-white"
                    }`}>
                      {myRole}
                    </span>
                  </div>

                  <h3 className="workspace-card-title text-white mb-2 text-lg font-display truncate">
                    {ws.title}
                  </h3>
                  <p className="workspace-card-desc text-muted text-xs line-clamp-3">
                    {ws.description || "No description provided. Click to open and configure study topics."}
                  </p>
                </div>

                <div className="workspace-card-footer p-3.5 border-top d-flex justify-content-between align-items-center bg-black-20">
                  <span className="text-xxs text-muted">
                    {ws.members?.length || 1} participant{(ws.members?.length || 1) !== 1 ? "s" : ""}
                    {ws.code && (
                      <span className="d-block mt-0.5 font-mono text-primary">Code: {ws.code}</span>
                    )}
                  </span>
                  <span className="card-enter-arrow text-primary text-xs font-semibold">
                    Enter Room →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-container glass-card p-4 animate-fade-in w-100 max-w-500">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="m-0 font-display">New Study Room</h3>
              <button className="btn btn-secondary py-1 px-2.5 text-xs" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="d-flex flex-column gap-3.5">
              <div className="form-group m-0">
                <label className="form-label">Room Title</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Organic Chemistry 101"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>

              <div className="form-group m-0">
                <label className="form-label">Description</label>
                <textarea
                  className="input-field py-2 text-sm"
                  rows="3"
                  placeholder="Describe the topics, resources, or exam dates..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>

              {/* Icon preset picker */}
              <div className="form-group m-0">
                <label className="form-label mb-1.5">Emoji Icon</label>
                <div className="emoji-presets-grid d-flex flex-wrap gap-2">
                  {emojis.map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={`btn-emoji-preset glass-card text-lg ${newIcon === em ? "active bg-primary border-primary" : ""}`}
                      onClick={() => setNewIcon(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Preset Picker */}
              <div className="form-group m-0">
                <label className="form-label mb-1.5">Color Accent</label>
                <div className="color-presets-grid d-flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      className="btn-color-preset rounded-circle"
                      style={{ 
                        backgroundColor: c.hex,
                        border: newColor === c.hex ? "3px solid #ffffff" : "1px solid var(--border)"
                      }}
                      title={c.label}
                      onClick={() => setNewColor(c.hex)}
                    />
                  ))}
                </div>
              </div>

              <div className="d-flex gap-3 justify-content-end mt-3">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? "Launching Room..." : "Launch Study Room"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="modal-backdrop">
          <div className="modal-container glass-card p-4 animate-fade-in w-100 max-w-400">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 className="m-0 font-display">Join Study Room</h3>
              <button className="btn btn-secondary py-1 px-2.5 text-xs" onClick={() => setShowJoinModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleJoinWorkspace} className="d-flex flex-column gap-3">
              <div className="form-group m-0">
                <label className="form-label">Workspace Join Code</label>
                <input
                  type="text"
                  required
                  className="input-field font-mono text-uppercase"
                  placeholder="e.g. SV9D4A"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={10}
                />
                <p className="text-xxs text-muted mt-1.5 m-0">
                  Demo seed code: <strong className="text-primary">SV9D4A</strong>
                </p>
              </div>

              <div className="d-flex gap-3 justify-content-end">
                <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={joining}>
                  {joining ? "Joining..." : "Join Room"}
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
