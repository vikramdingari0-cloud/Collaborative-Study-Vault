import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { socket } from "../sockets/socket";
import axiosInstance from "../api/axiosInstance";

// Sub-components
import MarkdownEditor from "../components/editor/MarkdownEditor";
import VersionHistory from "../components/editor/VersionHistory";
import ChatWindow from "../components/chat/ChatWindow";
import QuizModal from "../components/workspace/QuizModal";
import Whiteboard from "../components/workspace/Whiteboard";
import ForumBoard from "../components/workspace/ForumBoard";
import PastPapersBoard from "../components/workspace/PastPapersBoard";
import WorkspaceOnboarding from "../components/onboarding/WorkspaceOnboarding";
import KeyboardShortcutsModal from "../components/ui/KeyboardShortcutsModal";
import { useToast } from "../context/ToastContext";
import TextToSpeechButton from "../components/common/TextToSpeechButton";

/* ── useResizablePanel ─────────────────────────────────────── */
function useResizablePanel(defaultWidth, minWidth, maxWidth, direction = "right") {
  const [width, setWidth] = useState(defaultWidth);
  const resizerRef = useRef(null);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(defaultWidth);

  const onMouseDown = useCallback((e) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    if (resizerRef.current) resizerRef.current.classList.add("resizing");
  }, [width]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!isResizing.current) return;
      const delta = e.clientX - startX.current;
      const newWidth = direction === "right"
        ? Math.min(maxWidth, Math.max(minWidth, startWidth.current + delta))
        : Math.min(maxWidth, Math.max(minWidth, startWidth.current - delta));
      setWidth(newWidth);
    };
    const onMouseUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (resizerRef.current) resizerRef.current.classList.remove("resizing");
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [minWidth, maxWidth, direction]);

  return { width, resizerRef, onMouseDown };
}

/* ── WorkspacePage ─────────────────────────────────────────── */
const WorkspacePage = () => {
  const { id: workspaceId } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast, confirm } = useToast();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Core Room Metadata
  const [workspace, setWorkspace] = useState(null);
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [notesPage, setNotesPage] = useState(1);
  const [notesTotalPages, setNotesTotalPages] = useState(1);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection states
  const [openNoteId, setOpenNoteId] = useState(null);
  const [centerTab, setCenterTab] = useState("dashboard"); // "dashboard" | "whiteboard" | "forum" | "pastpapers"
  const [expandedFolders, setExpandedFolders] = useState({});

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Panel toggles
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [showHistory, setShowHistory] = useState(false);

  // Quiz states
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);

  // Live presence
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderParentId, setFolderParentId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [noteFolderId, setNoteFolderId] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileFolderId, setFileFolderId] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviting, setInviting] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  // AI states
  const [summarizing, setSummarizing] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  // Resizable panels
  const left  = useResizablePanel(260, 180, 420, "right");
  const right = useResizablePanel(320, 240, 480, "left");

  // Reset flashcard on note change
  useEffect(() => {
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
  }, [openNoteId]);

  // Escape closes modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (showFolderModal) { setShowFolderModal(false); setNewFolderName(""); return; }
      if (showNoteModal)   { setShowNoteModal(false);   setNewNoteTitle(""); return; }
      if (showFileModal)   { setShowFileModal(false);   setSelectedFile(null); return; }
      if (showShortcuts)   { setShowShortcuts(false);   return; }
      if (showMembersModal){ setShowMembersModal(false); return; }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showFolderModal, showNoteModal, showFileModal, showShortcuts, showMembersModal]);

  // 1. Load All Workspace Data
  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [wsRes, foldersRes, notesRes, filesRes, quizzesRes] = await Promise.all([
        axiosInstance.get(`/workspaces/${workspaceId}`),
        axiosInstance.get(`/folders/workspace/${workspaceId}`),
        axiosInstance.get(`/notes/workspace/${workspaceId}?page=1&limit=20`),
        axiosInstance.get(`/files/workspace/${workspaceId}`),
        axiosInstance.get(`/quizzes/workspace/${workspaceId}`),
      ]);
      if (wsRes.data?.success)       setWorkspace(wsRes.data.data);
      if (foldersRes.data?.success)  setFolders(foldersRes.data.data);
      if (notesRes.data?.success) {
        setNotes(notesRes.data.data);
        setNotesPage(notesRes.data.pagination?.page || 1);
        setNotesTotalPages(notesRes.data.pagination?.totalPages || 1);
      }
      if (filesRes.data?.success)    setFiles(filesRes.data.data);
      if (quizzesRes.data?.success)  setQuizzes(quizzesRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load study room.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!workspaceId) return;
    loadWorkspaceData();
    if (!socket.connected) socket.connect();
    const joinPresence = () => socket.emit("join_presence", { workspaceId });
    socket.on("connect", joinPresence);
    if (socket.connected) joinPresence();
    socket.on("presence_update", setOnlineUsers);
    return () => {
      socket.off("connect", joinPresence);
      socket.emit("leave_presence");
      socket.off("presence_update");
    };
  }, [workspaceId, currentUser]);

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT","TEXTAREA"].includes(e.target?.tagName)) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) { e.preventDefault(); setShowShortcuts(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copyJoinCode = async () => {
    if (!workspace?.code) return;
    try {
      await navigator.clipboard.writeText(workspace.code);
      setCodeCopied(true);
      toast.success("Join code copied!");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { toast.error("Could not copy join code"); }
  };

  // 2. Folder Actions
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const res = await axiosInstance.post("/folders", { name: newFolderName.trim(), workspaceId, parentFolderId: folderParentId });
      if (res.data?.success) {
        setShowFolderModal(false); setNewFolderName(""); setFolderParentId(null);
        const r = await axiosInstance.get(`/folders/workspace/${workspaceId}`);
        if (r.data?.success) setFolders(r.data.data);
      }
    } catch (err) { toast.error("Failed to create folder: " + (err.response?.data?.message || err.message)); }
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this folder and all nested content permanently?", { title: "Delete folder", confirmLabel: "Delete" }))) return;
    try {
      const res = await axiosInstance.delete(`/folders/${folderId}`);
      if (res.data?.success) {
        const folderNotes = notes.filter((n) => n.folder === folderId);
        if (folderNotes.some((n) => n._id === openNoteId)) setOpenNoteId(null);
        loadWorkspaceData();
      }
    } catch (err) { toast.error("Failed to delete folder: " + (err.response?.data?.message || err.message)); }
  };

  // 3. Note Actions
  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    try {
      const res = await axiosInstance.post("/notes", { title: newNoteTitle.trim(), workspaceId, folderId: noteFolderId });
      if (res.data?.success) {
        setShowNoteModal(false); setNewNoteTitle(""); setNoteFolderId(null);
        setOpenNoteId(res.data.data._id);
        const r = await axiosInstance.get(`/notes/workspace/${workspaceId}?page=1&limit=20`);
        if (r.data?.success) { setNotes(r.data.data); setNotesPage(1); setNotesTotalPages(r.data.pagination?.totalPages || 1); }
      }
    } catch (err) { toast.error("Failed to create note: " + (err.response?.data?.message || err.message)); }
  };

  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this note permanently?", { title: "Delete note", confirmLabel: "Delete" }))) return;
    try {
      const res = await axiosInstance.delete(`/notes/${noteId}`);
      if (res.data?.success) {
        if (openNoteId === noteId) setOpenNoteId(null);
        const r = await axiosInstance.get(`/notes/workspace/${workspaceId}?page=1&limit=20`);
        if (r.data?.success) { setNotes(r.data.data); setNotesPage(1); setNotesTotalPages(r.data.pagination?.totalPages || 1); }
      }
    } catch (err) { toast.error("Failed to delete note: " + (err.response?.data?.message || err.message)); }
  };

  // File Actions
  const handleCreateFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("workspaceId", workspaceId);
      if (fileFolderId) formData.append("folderId", fileFolderId);
      const res = await axiosInstance.post("/files", formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data?.success) {
        setShowFileModal(false); setSelectedFile(null); setFileFolderId(null);
        toast.success("File uploaded successfully");
        const r = await axiosInstance.get(`/files/workspace/${workspaceId}`);
        if (r.data?.success) setFiles(r.data.data);
      }
    } catch (err) { toast.error("Failed to upload file: " + (err.response?.data?.message || err.message)); }
    finally { setUploadingFile(false); }
  };

  const handleDeleteFile = async (fileId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this file permanently?", { title: "Delete file", confirmLabel: "Delete" }))) return;
    try {
      const res = await axiosInstance.delete(`/files/${fileId}`);
      if (res.data?.success) { setFiles((prev) => prev.filter((f) => f._id !== fileId)); toast.success("File deleted"); }
    } catch (err) { toast.error("Failed to delete file: " + (err.response?.data?.message || err.message)); }
  };

  const toggleFolder = (folderId) => setExpandedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));

  // 4. Member Management
  const handleInviteMember = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    try {
      setInviting(true);
      const res = await axiosInstance.post(`/workspaces/${workspaceId}/members`, { email, role: inviteRole });
      if (res.data?.success) {
        toast.success(`Invited ${email}`);
        setInviteEmail("");
        const r = await axiosInstance.get(`/workspaces/${workspaceId}`);
        if (r.data?.success) setWorkspace(r.data.data);
      }
    } catch (err) { toast.error("Failed to invite: " + (err.response?.data?.message || err.message)); }
    finally { setInviting(false); }
  };

  const handleRemoveMember = async (memberUserId) => {
    const isSelf = memberUserId === currentUser._id;
    if (!(await confirm(isSelf ? "Leave this study room?" : "Remove this member?", { title: isSelf ? "Leave" : "Remove member", confirmLabel: isSelf ? "Leave" : "Remove" }))) return;
    try {
      const res = await axiosInstance.delete(`/workspaces/${workspaceId}/members/${memberUserId}`);
      if (res.data?.success) {
        if (isSelf) { navigate("/dashboard"); }
        else { const r = await axiosInstance.get(`/workspaces/${workspaceId}`); if (r.data?.success) setWorkspace(r.data.data); }
      }
    } catch (err) { toast.error("Failed: " + (err.response?.data?.message || err.message)); }
  };

  // 5. AI Operations
  const handleTriggerSummary = async () => {
    if (!openNoteId) return;
    try {
      setSummarizing(true);
      const res = await axiosInstance.post("/ai/summarize", { noteId: openNoteId });
      if (res.data?.success) {
        const { aiSummary } = res.data.data;
        setNotes((prev) => prev.map((n) => n._id === openNoteId ? { ...n, aiSummary } : n));
      }
    } catch (err) { toast.error("AI Summary failed: " + (err.response?.data?.message || err.message)); }
    finally { setSummarizing(false); }
  };

  const handleGenerateQuiz = async () => {
    if (!openNoteId) return;
    try {
      setGeneratingQuiz(true);
      const res = await axiosInstance.post("/quizzes/generate", { noteId: openNoteId, difficulty: "medium" });
      if (res.data?.success) {
        setQuizzes((prev) => [res.data.data, ...prev]);
        setSidebarTab("quiz");
        setActiveQuizId(res.data.data._id);
      }
    } catch (err) { toast.error("Quiz generation failed: " + (err.response?.data?.message || err.message)); }
    finally { setGeneratingQuiz(false); }
  };

  const handleGenerateFlashcards = async () => {
    if (!openNoteId) return;
    try {
      setGeneratingFlashcards(true);
      const res = await axiosInstance.post("/ai/flashcards", { noteId: openNoteId });
      if (res.data?.success) {
        const { aiFlashcards } = res.data.data;
        setNotes((prev) => prev.map((n) => n._id === openNoteId ? { ...n, aiFlashcards } : n));
        setCurrentFlashcardIndex(0);
        setIsFlashcardFlipped(false);
      }
    } catch (err) { toast.error("Flashcard generation failed: " + (err.response?.data?.message || err.message)); }
    finally { setGeneratingFlashcards(false); }
  };

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this quiz?", { title: "Delete quiz", confirmLabel: "Delete" }))) return;
    try {
      const res = await axiosInstance.delete(`/quizzes/${quizId}`);
      if (res.data?.success) setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
    } catch (err) { toast.error("Failed: " + (err.response?.data?.message || err.message)); }
  };

  const handleNoteSaved = (updatedNote) => setNotes((prev) => prev.map((n) => n._id === updatedNote._id ? updatedNote : n));

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) { setSearchResults([]); return; }
    try {
      setSearching(true);
      const res = await axiosInstance.get(`/notes/workspace/${workspaceId}/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data?.success) setSearchResults(res.data.data);
    } catch { /* silent */ } finally { setSearching(false); }
  };

  const loadMoreNotes = async () => {
    const nextPage = notesPage + 1;
    try {
      const res = await axiosInstance.get(`/notes/workspace/${workspaceId}?page=${nextPage}&limit=20`);
      if (res.data?.success) {
        setNotes((prev) => [...prev, ...res.data.data]);
        setNotesPage(nextPage);
        setNotesTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch { /* silent */ }
  };

  // ── Render: Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p style={{ fontSize: "0.85rem" }}>Entering study room...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen d-flex flex-column align-items-center justify-content-center p-4">
        <div className="glass-card p-5 text-center max-w-500">
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔒</div>
          <h2 className="text-danger mb-3">Study Room Inaccessible</h2>
          <p className="text-muted text-sm">{error || "This study room might have been deleted or you lack permission."}</p>
          <Link to="/dashboard" className="btn btn-primary mt-4">← Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const openNoteObj = notes.find((n) => n._id === openNoteId);
  const ownerId = workspace.owner?._id || workspace.owner;
  const isOwner = ownerId === currentUser?._id;
  const myRole = isOwner ? "owner" : workspace.members?.find((m) => m.user?._id === currentUser._id)?.role || "member";
  const isAdminOrOwner = myRole === "owner" || myRole === "admin";

  /* ── CENTER TABS ── */
  const centerTabs = [
    { id: "dashboard",   label: "Overview",   icon: "🏠" },
    { id: "whiteboard",  label: "Whiteboard", icon: "🎨" },
    { id: "forum",       label: "Forum",      icon: "🙋" },
    { id: "pastpapers",  label: "Papers",     icon: "📄" },
  ];

  return (
    <div className="workspace-root animate-fade-in">

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <header className="workspace-topbar">
        <div className="topbar-brand">
          <Link to="/dashboard" style={{ display:"flex", alignItems:"center", gap:"0.5rem", textDecoration:"none" }}>
            <div className="brand-logo">📚</div>
            <div>
              <div style={{ fontSize:"0.85rem", fontWeight:700, color:"#F1F5F9", fontFamily:"var(--font-display)" }}>
                {workspace.icon || "📚"} {workspace.title}
              </div>
              <div style={{ fontSize:"0.6rem", color:"var(--color-text-muted)", letterSpacing:"0.04em" }}>
                Collaborative Study Vault
              </div>
            </div>
          </Link>
        </div>

        {/* Center: online users */}
        <div className="d-flex align-items-center gap-3">
          {onlineUsers.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem", background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:"var(--radius-full)", padding:"0.25rem 0.75rem" }}>
              <span className="live-pill-indicator" style={{ width:6, height:6 }}></span>
              <span style={{ fontSize:"0.7rem", color:"var(--color-success)", fontWeight:600 }}>
                {onlineUsers.length} online
              </span>
              {onlineUsers.slice(0, 4).map((u) => (
                <span key={u._id} title={u.name} style={{ fontSize:"0.9rem" }}>{u.avatar || "👤"}</span>
              ))}
            </div>
          )}

          {/* Join code */}
          {workspace.code && (
            <button
              className="code-badge"
              onClick={copyJoinCode}
              title={codeCopied ? "Copied!" : "Click to copy join code"}
            >
              {codeCopied ? "✓ Copied" : `# ${workspace.code}`}
            </button>
          )}
        </div>

        {/* Right actions */}
        <div className="d-flex align-items-center gap-2">
          {openNoteId && (
            <button className="btn btn-ghost text-xs" onClick={() => setOpenNoteId(null)}>
              ✕ Close Note
            </button>
          )}
          <button
            className="btn btn-ghost text-xs"
            onClick={() => setShowMembersModal(true)}
            title="Members & Invite"
          >
            👥 {workspace.members?.length || 0}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setShowShortcuts(true)}
            title="Keyboard shortcuts (?)"
            style={{ width: 32, height: 32, fontSize: "0.8rem" }}
          >
            ?
          </button>
        </div>
      </header>

      {/* ── BODY: 3-panel layout ─────────────────────────────── */}
      <div className="workspace-body">

        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <div
          className={`workspace-left-panel${leftCollapsed ? " collapsed" : ""}`}
          style={{ width: leftCollapsed ? 0 : left.width }}
        >
          {!leftCollapsed && (
            <>
              {/* Header */}
              <div className="left-panel-header">
                <div className="search-input-wrapper">
                  <span className="search-icon">🔍</span>
                  <input
                    type="search"
                    className="input-field"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    style={{ fontSize:"0.75rem", padding:"0.4rem 0.75rem 0.4rem 1.875rem" }}
                  />
                </div>
              </div>

              {/* Scrollable tree */}
              <div className="left-panel-scroll">
                {/* Section header */}
                <div className="d-flex align-items-center justify-content-between" style={{ padding:"0.25rem 0.25rem 0.5rem" }}>
                  <span className="tree-section-label" style={{ padding:0 }}>Library</span>
                  <div className="d-flex gap-1">
                    <button
                      className="btn btn-ghost"
                      title="New Folder"
                      style={{ padding:"0.2rem 0.45rem", fontSize:"0.7rem", borderRadius:"var(--radius-xs)" }}
                      onClick={() => { setFolderParentId(null); setShowFolderModal(true); }}
                    >📁+</button>
                    <button
                      className="btn btn-ghost"
                      title="New Note"
                      style={{ padding:"0.2rem 0.45rem", fontSize:"0.7rem", borderRadius:"var(--radius-xs)" }}
                      onClick={() => { setNoteFolderId(null); setShowNoteModal(true); }}
                    >📝+</button>
                    <button
                      className="btn btn-ghost"
                      title="Upload File"
                      style={{ padding:"0.2rem 0.45rem", fontSize:"0.7rem", borderRadius:"var(--radius-xs)" }}
                      onClick={() => { setFileFolderId(null); setShowFileModal(true); }}
                    >📎+</button>
                  </div>
                </div>

                {/* Search results */}
                {searchQuery.trim() ? (
                  <div>
                    <div className="tree-section-label">{searching ? "Searching…" : `Results (${searchResults.length})`}</div>
                    {searchResults.length === 0 ? (
                      <span style={{ fontSize:"0.75rem", color:"var(--color-text-muted)", padding:"0 0.5rem" }}>No results</span>
                    ) : searchResults.map((note) => (
                      <div
                        key={note._id}
                        className={`note-tree-node${openNoteId === note._id ? " bg-primary-glow" : ""}`}
                        onClick={() => { setOpenNoteId(note._id); setSearchQuery(""); setSearchResults([]); }}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === "Enter") { setOpenNoteId(note._id); setSearchQuery(""); setSearchResults([]); } }}
                      >
                        <span className="note-name">📄 {note.title}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Folders */}
                    {folders.map((fold) => {
                      const isExpanded = !!expandedFolders[fold._id];
                      const folderNotes = notes.filter((n) => n.folder === fold._id);
                      const folderFiles = files.filter((f) => f.folder === fold._id);
                      return (
                        <div key={fold._id} className="folder-tree-node">
                          <div className="folder-node-header" onClick={() => toggleFolder(fold._id)}>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`folder-arrow-indicator${isExpanded ? " expanded" : ""}`}>▶</span>
                              <span className="folder-node-icon">📁</span>
                              <span className="folder-node-name truncate" style={{ maxWidth:130 }}>{fold.name}</span>
                            </div>
                            <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button className="btn-tree-icon" title="Add Note" onClick={() => { setNoteFolderId(fold._id); setShowNoteModal(true); }}>＋</button>
                              <button className="btn-tree-icon" title="Upload" onClick={() => { setFileFolderId(fold._id); setShowFileModal(true); }}>📎</button>
                              <button className="btn-tree-icon text-danger" title="Delete" onClick={(e) => handleDeleteFolder(fold._id, e)}>🗑</button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="folder-node-children">
                              {folderNotes.length === 0 && folderFiles.length === 0 ? (
                                <span style={{ fontSize:"0.7rem", color:"var(--color-text-dim)", padding:"0.25rem 0.5rem" }}>Empty folder</span>
                              ) : (
                                <>
                                  {folderNotes.map((note) => (
                                    <div
                                      key={note._id}
                                      className={`note-tree-node${openNoteId === note._id ? " bg-primary-glow" : ""}`}
                                      onClick={() => setOpenNoteId(note._id)}
                                      tabIndex={0}
                                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenNoteId(note._id); }}
                                    >
                                      <span className="note-name">📄 {note.title}</span>
                                      <button className="btn-tree-icon text-danger" onClick={(e) => handleDeleteNote(note._id, e)}>✕</button>
                                    </div>
                                  ))}
                                  {folderFiles.map((file) => (
                                    <div
                                      key={file._id}
                                      className="note-tree-node"
                                      onClick={() => window.open(file.url, "_blank")}
                                      tabIndex={0}
                                    >
                                      <span className="note-name">📎 {file.name}</span>
                                      <button className="btn-tree-icon text-danger" onClick={(e) => handleDeleteFile(file._id, e)}>✕</button>
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Root notes */}
                    {notes.filter((n) => !n.folder).length > 0 && (
                      <>
                        <div className="tree-section-label" style={{ marginTop:"0.75rem" }}>Uncategorized</div>
                        {notes.filter((n) => !n.folder).map((note) => (
                          <div
                            key={note._id}
                            className={`note-tree-node${openNoteId === note._id ? " bg-primary-glow" : ""}`}
                            onClick={() => setOpenNoteId(note._id)}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenNoteId(note._id); }}
                          >
                            <span className="note-name">📄 {note.title}</span>
                            <button className="btn-tree-icon text-danger" onClick={(e) => handleDeleteNote(note._id, e)}>✕</button>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Root files */}
                    {files.filter((f) => !f.folder).length > 0 && (
                      <>
                        <div className="tree-section-label" style={{ marginTop:"0.5rem" }}>Files</div>
                        {files.filter((f) => !f.folder).map((file) => (
                          <div key={file._id} className="note-tree-node" onClick={() => window.open(file.url, "_blank")} tabIndex={0}>
                            <span className="note-name">📎 {file.name}</span>
                            <button className="btn-tree-icon text-danger" onClick={(e) => handleDeleteFile(file._id, e)}>✕</button>
                          </div>
                        ))}
                      </>
                    )}

                    {/* Load more */}
                    {notesPage < notesTotalPages && (
                      <button className="btn btn-ghost w-100 text-xs mt-3" style={{ fontSize:"0.7rem" }} onClick={loadMoreNotes}>
                        Load more notes…
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Collapse toggle */}
          <button
            className="panel-collapse-btn right-side"
            onClick={() => setLeftCollapsed((v) => !v)}
            title={leftCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {leftCollapsed ? "›" : "‹"}
          </button>
        </div>

        {/* LEFT RESIZER */}
        {!leftCollapsed && (
          <div
            ref={left.resizerRef}
            className="panel-resizer"
            onMouseDown={left.onMouseDown}
          />
        )}

        {/* ── CENTER PANEL ───────────────────────────────────── */}
        <div className="workspace-center-panel">

          {/* Center tab bar */}
          {!openNoteId && (
            <div className="center-tab-bar" role="tablist">
              {centerTabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={centerTab === tab.id}
                  className={`center-tab-btn${centerTab === tab.id ? " active" : ""}`}
                  onClick={() => setCenterTab(tab.id)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Center content */}
          <div className="center-panel-content">
            {openNoteId ? (
              <MarkdownEditor
                noteId={openNoteId}
                currentUser={currentUser}
                onNoteSaved={handleNoteSaved}
                onOpenHistory={() => setShowHistory(true)}
              />
            ) : centerTab === "whiteboard" ? (
              <Whiteboard workspaceId={workspaceId} currentUser={currentUser} />
            ) : centerTab === "forum" ? (
              <ForumBoard workspaceId={workspaceId} currentUser={currentUser} />
            ) : centerTab === "pastpapers" ? (
              <PastPapersBoard workspaceId={workspaceId} currentUser={currentUser} isAdminOrOwner={isAdminOrOwner} />
            ) : (
              /* ── WELCOME DASHBOARD ── */
              <div className="editor-welcome-screen">
                {/* Background orbs */}
                <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
                  <div style={{ position:"absolute", width:400, height:400, top:"10%", left:"50%", transform:"translateX(-50%)", borderRadius:"50%", background:"radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
                  <div style={{ position:"absolute", width:250, height:250, bottom:"10%", left:"20%", borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)" }} />
                </div>
                <div style={{ position:"relative" }}>
                  <div className="welcome-glow-badge">📚</div>
                  <h2 style={{ marginTop:"1.25rem", fontFamily:"var(--font-display)", fontSize:"1.625rem", background:"linear-gradient(135deg,#F1F5F9,#94A3B8)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                    {workspace.icon} {workspace.title}
                  </h2>
                  <p className="text-muted" style={{ fontSize:"0.9rem", maxWidth:440, margin:"0.75rem auto 2rem" }}>
                    {workspace.description || "Pick a note from the left panel to start co-authoring, or open the whiteboard to brainstorm together."}
                  </p>

                  <div className="welcome-stats-grid">
                    <div className="welcome-stat-pill">
                      <span className="text-xxs uppercase tracking-wider text-muted d-block">Peers Online</span>
                      <span style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--color-success)", fontFamily:"var(--font-display)" }}>{onlineUsers.length}</span>
                    </div>
                    <div className="welcome-stat-pill">
                      <span className="text-xxs uppercase tracking-wider text-muted d-block">Notes</span>
                      <span style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--color-primary)", fontFamily:"var(--font-display)" }}>{notes.length}</span>
                    </div>
                    <div className="welcome-stat-pill">
                      <span className="text-xxs uppercase tracking-wider text-muted d-block">Quizzes</span>
                      <span style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--color-ai-accent)", fontFamily:"var(--font-display)" }}>{quizzes.length}</span>
                    </div>
                    <div className="welcome-stat-pill">
                      <span className="text-xxs uppercase tracking-wider text-muted d-block">Members</span>
                      <span style={{ fontSize:"1.5rem", fontWeight:800, color:"var(--color-highlight)", fontFamily:"var(--font-display)" }}>{workspace.members?.length || 0}</span>
                    </div>
                  </div>

                  <div className="d-flex gap-3 mt-5 justify-content-center flex-wrap">
                    <button className="btn btn-primary" onClick={() => { setNoteFolderId(null); setShowNoteModal(true); }}>
                      📝 New Note
                    </button>
                    <button className="btn btn-ai" onClick={() => setCenterTab("whiteboard")}>
                      🎨 Open Whiteboard
                    </button>
                    <button className="btn btn-secondary" onClick={() => setCenterTab("forum")}>
                      🙋 Doubt Forum
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Version history overlay */}
            {showHistory && openNoteId && (
              <div className="version-history-overlay">
                <VersionHistory
                  noteId={openNoteId}
                  onClose={() => setShowHistory(false)}
                  onVersionRestored={(updatedNote) => {
                    handleNoteSaved(updatedNote);
                    socket.emit("edit_note", { noteId: openNoteId, content: updatedNote.content });
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* RIGHT RESIZER */}
        {!rightCollapsed && (
          <div
            ref={right.resizerRef}
            className="panel-resizer"
            onMouseDown={right.onMouseDown}
          />
        )}

        {/* ── RIGHT PANEL ────────────────────────────────────── */}
        <div
          className={`workspace-right-panel${rightCollapsed ? " collapsed" : ""}`}
          style={{ width: rightCollapsed ? 0 : right.width, position:"relative" }}
        >
          {/* Collapse toggle */}
          <button
            className="panel-collapse-btn left-side"
            onClick={() => setRightCollapsed((v) => !v)}
            title={rightCollapsed ? "Expand AI panel" : "Collapse AI panel"}
          >
            {rightCollapsed ? "‹" : "›"}
          </button>

          {!rightCollapsed && (
            <>
              {/* Tab bar */}
              <div className="right-tab-bar">
                <button
                  className={`right-tab-btn${sidebarTab === "chat" ? " active" : ""}`}
                  onClick={() => setSidebarTab("chat")}
                >
                  💬 Chat
                </button>
                <button
                  className={`right-tab-btn${sidebarTab === "quiz" ? " active" : ""}`}
                  onClick={() => setSidebarTab("quiz")}
                >
                  🧠 AI Recall
                </button>
              </div>

              {/* Chat */}
              {sidebarTab === "chat" && (
                <ChatWindow
                  workspaceId={workspaceId}
                  currentUser={currentUser}
                  openNoteId={openNoteId}
                />
              )}

              {/* AI Recall Hub */}
              {sidebarTab === "quiz" && (
                <div className="right-panel-scroll">

                  {/* AI Summary */}
                  <div className="ai-card">
                    <div className="ai-card-title text-ai">⚡ AI Summary</div>
                    {openNoteId ? (
                      <>
                        {openNoteObj?.aiSummary ? (
                          <>
                            <div className="ai-summary-viewport">{openNoteObj.aiSummary}</div>
                            <TextToSpeechButton text={openNoteObj.aiSummary} className="btn-ghost" style={{ fontSize:"0.7rem" }} />
                          </>
                        ) : (
                          <p style={{ fontSize:"0.75rem", color:"var(--color-text-muted)", marginBottom:"0.625rem" }}>
                            No summary yet. Click below to generate.
                          </p>
                        )}
                        <button
                          className="btn btn-secondary w-100"
                          style={{ fontSize:"0.75rem" }}
                          onClick={handleTriggerSummary}
                          disabled={summarizing}
                        >
                          {summarizing ? "✨ Summarizing…" : "⚡ Summarize Note"}
                        </button>
                      </>
                    ) : (
                      <p style={{ fontSize:"0.75rem", color:"var(--color-text-muted)" }}>Open a note to generate a summary.</p>
                    )}
                  </div>

                  {/* Generate Quiz */}
                  {openNoteId && (
                    <div className="ai-card">
                      <div className="ai-card-title" style={{ color:"var(--color-primary)" }}>🧠 Active Recall Quiz</div>
                      <p style={{ fontSize:"0.75rem", color:"var(--color-text-muted)", marginBottom:"0.625rem" }}>
                        Generate dynamic quiz questions from your note.
                      </p>
                      <button
                        className="btn btn-primary w-100"
                        style={{ fontSize:"0.75rem" }}
                        onClick={handleGenerateQuiz}
                        disabled={generatingQuiz}
                      >
                        {generatingQuiz ? "✨ Generating…" : "🧠 Generate Quiz"}
                      </button>
                    </div>
                  )}

                  {/* Flashcards */}
                  {openNoteId && (
                    <div className="ai-card">
                      <div className="ai-card-title" style={{ color:"var(--color-secondary)" }}>🃏 Flashcards</div>
                      {openNoteObj?.aiFlashcards?.length > 0 ? (
                        <div>
                          <div
                            className={`flashcard-3d-container${isFlashcardFlipped ? " flipped" : ""}`}
                            onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                          >
                            <div className="flashcard-card-inner">
                              <div className="flashcard-face flashcard-front">
                                <span style={{ fontSize:"0.6rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--color-primary)", fontWeight:700, marginBottom:"0.5rem", display:"block" }}>Question</span>
                                <p>{openNoteObj.aiFlashcards[currentFlashcardIndex]?.front}</p>
                                <span style={{ fontSize:"0.6rem", color:"var(--color-text-muted)", marginTop:"0.5rem" }}>Click to flip</span>
                              </div>
                              <div className="flashcard-face flashcard-back">
                                <span style={{ fontSize:"0.6rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"var(--color-secondary)", fontWeight:700, marginBottom:"0.5rem", display:"block" }}>Answer</span>
                                <p>{openNoteObj.aiFlashcards[currentFlashcardIndex]?.back}</p>
                                <div style={{ marginTop:"0.5rem" }} onClick={(e) => e.stopPropagation()}>
                                  <TextToSpeechButton text={openNoteObj.aiFlashcards[currentFlashcardIndex]?.back} />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="d-flex align-items-center justify-content-between mt-3">
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize:"0.7rem", padding:"0.25rem 0.625rem" }}
                              disabled={currentFlashcardIndex === 0}
                              onClick={() => { setIsFlashcardFlipped(false); setTimeout(() => setCurrentFlashcardIndex((p) => p - 1), 150); }}
                            >← Prev</button>
                            <span style={{ fontSize:"0.7rem", color:"var(--color-text-muted)" }}>
                              {currentFlashcardIndex + 1} / {openNoteObj.aiFlashcards.length}
                            </span>
                            <button
                              className="btn btn-secondary"
                              style={{ fontSize:"0.7rem", padding:"0.25rem 0.625rem" }}
                              disabled={currentFlashcardIndex === openNoteObj.aiFlashcards.length - 1}
                              onClick={() => { setIsFlashcardFlipped(false); setTimeout(() => setCurrentFlashcardIndex((p) => p + 1), 150); }}
                            >Next →</button>
                          </div>
                          <button
                            className="btn btn-ghost w-100 mt-2"
                            style={{ fontSize:"0.7rem" }}
                            onClick={handleGenerateFlashcards}
                            disabled={generatingFlashcards}
                          >
                            {generatingFlashcards ? "✨ Generating…" : "🔄 Regenerate Cards"}
                          </button>
                        </div>
                      ) : (
                        <>
                          <p style={{ fontSize:"0.75rem", color:"var(--color-text-muted)", marginBottom:"0.625rem" }}>No flashcards yet.</p>
                          <button
                            className="btn btn-secondary w-100"
                            style={{ fontSize:"0.75rem" }}
                            onClick={handleGenerateFlashcards}
                            disabled={generatingFlashcards}
                          >
                            {generatingFlashcards ? "✨ Generating…" : "🃏 Generate Flashcards"}
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Quizzes List */}
                  <div className="ai-card">
                    <div className="ai-card-title text-muted">📋 Available Quizzes</div>
                    {quizzes.length === 0 ? (
                      <p style={{ fontSize:"0.75rem", color:"var(--color-text-muted)" }}>No quizzes yet. Generate one above!</p>
                    ) : (
                      <div style={{ display:"flex", flexDirection:"column", gap:"0.375rem" }}>
                        {quizzes.map((q) => (
                          <div key={q._id} className="quiz-list-row" onClick={() => setActiveQuizId(q._id)}>
                            <div>
                              <div className="quiz-row-title">🧠 {q.sourceNote?.title || "Quiz"}</div>
                              <div style={{ fontSize:"0.65rem", color:"var(--color-text-muted)" }}>
                                {q.difficulty || "medium"} · {q.questions?.length || 0} questions
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button className="btn btn-secondary" style={{ fontSize:"0.65rem", padding:"0.2rem 0.5rem" }} onClick={() => setActiveQuizId(q._id)}>Play</button>
                              <button className="btn btn-ghost" style={{ fontSize:"0.65rem", padding:"0.2rem" }} onClick={(e) => handleDeleteQuiz(q._id, e)}>🗑</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          )}
        </div>

      </div>{/* end workspace-body */}

      {/* ── MODALS ──────────────────────────────────────────── */}

      {/* Create Folder */}
      {showFolderModal && (
        <div className="modal-backdrop" onClick={() => { setShowFolderModal(false); setNewFolderName(""); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 style={{ margin:0, fontFamily:"var(--font-display)", fontSize:"1.1rem" }}>📁 New Study Folder</h3>
              <button className="btn btn-ghost" style={{ padding:"0.25rem 0.5rem" }} onClick={() => { setShowFolderModal(false); setNewFolderName(""); }}>✕</button>
            </div>
            <form onSubmit={handleCreateFolder} className="d-flex flex-column gap-3">
              <div className="form-group">
                <label className="form-label">Folder Name</label>
                <input type="text" required className="input-field" placeholder="e.g. Organic Chemistry" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} autoFocus />
              </div>
              <div className="d-flex gap-2 justify-content-end mt-1">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowFolderModal(false); setNewFolderName(""); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Folder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Note */}
      {showNoteModal && (
        <div className="modal-backdrop" onClick={() => { setShowNoteModal(false); setNewNoteTitle(""); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 style={{ margin:0, fontFamily:"var(--font-display)", fontSize:"1.1rem" }}>📝 New Study Note</h3>
              <button className="btn btn-ghost" style={{ padding:"0.25rem 0.5rem" }} onClick={() => { setShowNoteModal(false); setNewNoteTitle(""); }}>✕</button>
            </div>
            <form onSubmit={handleCreateNote} className="d-flex flex-column gap-3">
              <div className="form-group">
                <label className="form-label">Note Title</label>
                <input type="text" required className="input-field" placeholder="e.g. Lecture 4 — Thermodynamics" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} autoFocus />
              </div>
              <div className="d-flex gap-2 justify-content-end mt-1">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowNoteModal(false); setNewNoteTitle(""); }}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File */}
      {showFileModal && (
        <div className="modal-backdrop" onClick={() => { setShowFileModal(false); setSelectedFile(null); }}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 style={{ margin:0, fontFamily:"var(--font-display)", fontSize:"1.1rem" }}>📎 Upload Resource</h3>
              <button className="btn btn-ghost" style={{ padding:"0.25rem 0.5rem" }} onClick={() => { setShowFileModal(false); setSelectedFile(null); }}>✕</button>
            </div>
            <form onSubmit={handleCreateFile} className="d-flex flex-column gap-3">
              <div className="form-group">
                <label className="form-label">Select File (Max 10MB)</label>
                <input type="file" required className="input-field" onChange={(e) => setSelectedFile(e.target.files[0])} />
              </div>
              <div className="d-flex gap-2 justify-content-end mt-1">
                <button type="button" className="btn btn-ghost" onClick={() => { setShowFileModal(false); setSelectedFile(null); }} disabled={uploadingFile}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingFile}>
                  {uploadingFile ? "Uploading…" : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Members Modal */}
      {showMembersModal && (
        <div className="modal-backdrop" onClick={() => setShowMembersModal(false)}>
          <div className="modal-container" style={{ maxWidth:520 }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 style={{ margin:0, fontFamily:"var(--font-display)", fontSize:"1.1rem" }}>👥 Study Group Members</h3>
              <button className="btn btn-ghost" style={{ padding:"0.25rem 0.5rem" }} onClick={() => setShowMembersModal(false)}>✕</button>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:"0.375rem", marginBottom:"1.25rem", maxHeight:220, overflowY:"auto" }}>
              {workspace.members?.map((m) => (
                <div key={m.user?._id} className="member-avatar-row">
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize:"1.25rem" }}>{m.user?.avatar || "👤"}</span>
                    <div>
                      <div style={{ fontSize:"0.85rem", fontWeight:600, color:"var(--color-text-main)" }}>{m.user?.name}</div>
                      <div style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--color-text-muted)" }}>{m.role}</div>
                    </div>
                    {onlineUsers.some((ou) => ou._id === m.user?._id) && (
                      <span className="live-pill-indicator" style={{ width:6, height:6 }} title="Online"></span>
                    )}
                  </div>
                  {isAdminOrOwner && m.user?._id !== currentUser._id && (
                    <button className="btn-kick" onClick={() => handleRemoveMember(m.user?._id)}>Kick</button>
                  )}
                </div>
              ))}
            </div>

            {isAdminOrOwner && (
              <>
                <div style={{ borderTop:"1px solid var(--color-border)", paddingTop:"1rem", marginBottom:"0.75rem" }}>
                  <div style={{ fontSize:"0.7rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", color:"var(--color-text-muted)", marginBottom:"0.625rem" }}>
                    Invite Member
                  </div>
                  <form onSubmit={handleInviteMember} className="d-flex flex-column gap-2">
                    <input type="email" required className="input-field" placeholder="colleague@university.edu" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                    <div className="d-flex gap-2">
                      <select className="input-field" style={{ flex:1 }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button type="submit" className="btn btn-primary" style={{ fontSize:"0.8rem" }} disabled={inviting}>
                        {inviting ? "Sending…" : "Invite"}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}

            {!isOwner && (
              <button
                className="btn btn-danger w-100 mt-2"
                style={{ fontSize:"0.8rem" }}
                onClick={() => { setShowMembersModal(false); handleRemoveMember(currentUser._id); }}
              >
                🚪 Leave Study Room
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {activeQuizId && (
        <QuizModal
          quizId={activeQuizId}
          onClose={() => setActiveQuizId(null)}
          onAttemptSaved={async () => {
            const r = await axiosInstance.get(`/quizzes/workspace/${workspaceId}`);
            if (r.data?.success) setQuizzes(r.data.data);
          }}
        />
      )}

      <WorkspaceOnboarding workspaceId={workspaceId} />
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};

export default WorkspacePage;
