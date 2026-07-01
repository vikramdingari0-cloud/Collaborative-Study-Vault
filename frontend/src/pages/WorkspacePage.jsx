import React, { useState, useEffect } from "react";
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

/**
 * WorkspacePage - The full-featured, collaborative, glassmorphic Study Room.
 * Links folder/note trees, real-time cursor synchronizations, member invites,
 * group chat room tabs, AI summarizers, and Active Recall quizzes.
 */
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
  const [expandedFolders, setExpandedFolders] = useState({}); // { [folderId]: boolean }

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Sidebar Toggles
  const [sidebarTab, setSidebarTab] = useState("chat"); // "chat" | "quiz"
  const [showHistory, setShowHistory] = useState(false);

  // Quiz execution states
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);

  // Live online peers (presence)
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Modals / forms states
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

  // AI execution states
  const [summarizing, setSummarizing] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  // Reset flashcard state when note changes
  useEffect(() => {
    setCurrentFlashcardIndex(0);
    setIsFlashcardFlipped(false);
  }, [openNoteId]);

  // WCAG 2.1 - Keyboard trap prevention: Escape closes open modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (showFolderModal) { setShowFolderModal(false); setNewFolderName(""); return; }
      if (showNoteModal)   { setShowNoteModal(false);   setNewNoteTitle(""); return; }
      if (showFileModal)   { setShowFileModal(false);   setSelectedFile(null); return; }
      if (showShortcuts)   { setShowShortcuts(false);   return; }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showFolderModal, showNoteModal, showFileModal, showShortcuts]);

  // 1. Load All Workspace Data & Join Presence Socket
  const loadWorkspaceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch workspace meta
      const wsRes = await axiosInstance.get(`/workspaces/${workspaceId}`);
      if (wsRes.data && wsRes.data.success) {
        setWorkspace(wsRes.data.data);
      }

      // Fetch folders
      const foldersRes = await axiosInstance.get(`/folders/workspace/${workspaceId}`);
      if (foldersRes.data?.success) {
        setFolders(foldersRes.data.data);
      }

      // Fetch notes (page 1)
      const notesRes = await axiosInstance.get(`/notes/workspace/${workspaceId}?page=1&limit=20`);
      if (notesRes.data?.success) {
        setNotes(notesRes.data.data);
        setNotesPage(notesRes.data.pagination?.page || 1);
        setNotesTotalPages(notesRes.data.pagination?.totalPages || 1);
      }

      // Fetch workspace files
      const filesRes = await axiosInstance.get(`/files/workspace/${workspaceId}`);
      if (filesRes.data?.success) {
        setFiles(filesRes.data.data);
      }

      // Fetch workspace quizzes
      const quizzesRes = await axiosInstance.get(`/quizzes/workspace/${workspaceId}`);
      if (quizzesRes.data?.success) {
        setQuizzes(quizzesRes.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load study room.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadWorkspaceData();

      // Establish Socket Connection & Join Presence
      if (!socket.connected) {
        socket.connect();
      }

      const joinPresenceRoom = () => {
        socket.emit("join_presence", { workspaceId });
      };

      socket.on("connect", joinPresenceRoom);

      if (socket.connected) {
        joinPresenceRoom();
      }

      socket.on("presence_update", (users) => {
        setOnlineUsers(users);
      });

      return () => {
        socket.off("connect", joinPresenceRoom);
        socket.emit("leave_presence");
        socket.off("presence_update");
      };
    }
  }, [workspaceId, currentUser]);

  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target?.tagName)) return;
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const copyJoinCode = async () => {
    if (!workspace?.code) return;
    try {
      await navigator.clipboard.writeText(workspace.code);
      setCodeCopied(true);
      toast.success("Join code copied to clipboard");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      toast.error("Could not copy join code");
    }
  };

  // 2. Folder Actions
  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const res = await axiosInstance.post("/folders", {
        name: newFolderName.trim(),
        workspaceId,
        parentFolderId: folderParentId,
      });

      if (res.data && res.data.success) {
        setShowFolderModal(false);
        setNewFolderName("");
        setFolderParentId(null);
        // Reload Folders
        const foldersRes = await axiosInstance.get(`/folders/workspace/${workspaceId}`);
        if (foldersRes.data?.success) setFolders(foldersRes.data.data);
      }
    } catch (err) {
      toast.error("Failed to create folder: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteFolder = async (folderId, e) => {
    e.stopPropagation();
    if (
      !(await confirm(
        "Delete this folder and all nested folders and notes permanently?",
        { title: "Delete folder", confirmLabel: "Delete" }
      ))
    )
      return;

    try {
      const res = await axiosInstance.delete(`/folders/${folderId}`);
      if (res.data?.success) {
        // If the open note was inside this folder, close it
        const folderNotes = notes.filter((n) => n.folder === folderId);
        if (folderNotes.some((n) => n._id === openNoteId)) {
          setOpenNoteId(null);
        }
        loadWorkspaceData(); // Full reload to clear references
      }
    } catch (err) {
      toast.error("Failed to delete folder: " + (err.response?.data?.message || err.message));
    }
  };

  // 3. Note Actions
  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    try {
      const res = await axiosInstance.post("/notes", {
        title: newNoteTitle.trim(),
        workspaceId,
        folderId: noteFolderId,
      });

      if (res.data && res.data.success) {
        setShowNoteModal(false);
        setNewNoteTitle("");
        setNoteFolderId(null);
        setOpenNoteId(res.data.data._id); // Automatically open newly created note!
        // Reload Notes list (reset to page 1)
        const notesRes = await axiosInstance.get(`/notes/workspace/${workspaceId}?page=1&limit=20`);
        if (notesRes.data?.success) {
          setNotes(notesRes.data.data);
          setNotesPage(1);
          setNotesTotalPages(notesRes.data.pagination?.totalPages || 1);
        }
      }
    } catch (err) {
      toast.error("Failed to create note: " + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteNote = async (noteId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this note permanently?", { title: "Delete note", confirmLabel: "Delete" })))
      return;

    try {
      const res = await axiosInstance.delete(`/notes/${noteId}`);
      if (res.data?.success) {
        if (openNoteId === noteId) setOpenNoteId(null);
        // Reload Notes list (reset to page 1)
        const notesRes = await axiosInstance.get(`/notes/workspace/${workspaceId}?page=1&limit=20`);
        if (notesRes.data?.success) {
          setNotes(notesRes.data.data);
          setNotesPage(1);
          setNotesTotalPages(notesRes.data.pagination?.totalPages || 1);
        }
      }
    } catch (err) {
      toast.error("Failed to delete note: " + (err.response?.data?.message || err.message));
    }
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
      if (fileFolderId) {
        formData.append("folderId", fileFolderId);
      }

      const res = await axiosInstance.post("/files", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data && res.data.success) {
        setShowFileModal(false);
        setSelectedFile(null);
        setFileFolderId(null);
        toast.success("File uploaded successfully");
        // Reload files list
        const filesRes = await axiosInstance.get(`/files/workspace/${workspaceId}`);
        if (filesRes.data?.success) setFiles(filesRes.data.data);
      }
    } catch (err) {
      toast.error("Failed to upload file: " + (err.response?.data?.message || err.message));
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile = async (fileId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this file permanently?", { title: "Delete file", confirmLabel: "Delete" })))
      return;

    try {
      const res = await axiosInstance.delete(`/files/${fileId}`);
      if (res.data?.success) {
        setFiles((prev) => prev.filter((f) => f._id !== fileId));
        toast.success("File deleted successfully");
      }
    } catch (err) {
      toast.error("Failed to delete file: " + (err.response?.data?.message || err.message));
    }
  };

  // Toggle Folder expansion state
  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  // 4. Member Management (Invites & Kicks)
  const handleInviteMember = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;

    try {
      setInviting(true);
      const res = await axiosInstance.post(`/workspaces/${workspaceId}/members`, {
        email,
        role: inviteRole,
      });

      if (res.data && res.data.success) {
        toast.success(`Invited ${email} to this study room`);
        setInviteEmail("");
        // Reload workspace meta to show updated member list
        const wsRes = await axiosInstance.get(`/workspaces/${workspaceId}`);
        if (wsRes.data?.success) setWorkspace(wsRes.data.data);
      }
    } catch (err) {
      toast.error("Failed to invite member: " + (err.response?.data?.message || err.message));
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    const isSelf = memberUserId === currentUser._id;
    if (
      !(await confirm(
        isSelf ? "Leave this study room?" : "Remove this member from the workspace?",
        { title: isSelf ? "Leave workspace" : "Remove member", confirmLabel: isSelf ? "Leave" : "Remove" }
      ))
    )
      return;

    try {
      const res = await axiosInstance.delete(`/workspaces/${workspaceId}/members/${memberUserId}`);
      if (res.data?.success) {
        if (isSelf) {
          navigate("/dashboard");
        } else {
          // Reload workspace
          const wsRes = await axiosInstance.get(`/workspaces/${workspaceId}`);
          if (wsRes.data?.success) setWorkspace(wsRes.data.data);
        }
      }
    } catch (err) {
      toast.error("Failed to remove member: " + (err.response?.data?.message || err.message));
    }
  };

  // 5. AI Operations
  const handleTriggerSummary = async () => {
    if (!openNoteId) return;
    try {
      setSummarizing(true);
      const res = await axiosInstance.post("/ai/summarize", { noteId: openNoteId });
      if (res.data && res.data.success) {
        const { aiSummary } = res.data.data;
        setNotes((prev) =>
          prev.map((n) => (n._id === openNoteId ? { ...n, aiSummary } : n))
        );
      }
    } catch (err) {
      toast.error("AI Summary failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSummarizing(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!openNoteId) return;
    try {
      setGeneratingQuiz(true);
      const res = await axiosInstance.post("/quizzes/generate", {
        noteId: openNoteId,
        difficulty: "medium",
      });

      if (res.data && res.data.success) {
        // Prepend new quiz to list
        setQuizzes((prev) => [res.data.data, ...prev]);
        // Switch tab to quiz so they see it
        setSidebarTab("quiz");
        // Automatically open the QuizModal!
        setActiveQuizId(res.data.data._id);
      }
    } catch (err) {
      toast.error("Quiz generation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!openNoteId) return;
    try {
      setGeneratingFlashcards(true);
      const res = await axiosInstance.post("/ai/flashcards", { noteId: openNoteId });
      if (res.data && res.data.success) {
        const { aiFlashcards } = res.data.data;
        setNotes((prev) =>
          prev.map((n) => (n._id === openNoteId ? { ...n, aiFlashcards } : n))
        );
        setCurrentFlashcardIndex(0);
        setIsFlashcardFlipped(false);
      }
    } catch (err) {
      toast.error("Flashcard generation failed: " + (err.response?.data?.message || err.message));
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleDeleteQuiz = async (quizId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this quiz?", { title: "Delete quiz", confirmLabel: "Delete" }))) return;

    try {
      const res = await axiosInstance.delete(`/quizzes/${quizId}`);
      if (res.data?.success) {
        setQuizzes((prev) => prev.filter((q) => q._id !== quizId));
      }
    } catch (err) {
      toast.error("Failed to delete quiz: " + (err.response?.data?.message || err.message));
    }
  };

  // Callback when a note is autosaved or restored
  const handleNoteSaved = (updatedNote) => {
    setNotes((prev) => prev.map((n) => (n._id === updatedNote._id ? updatedNote : n)));
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const res = await axiosInstance.get(`/notes/workspace/${workspaceId}/search?q=${encodeURIComponent(query.trim())}`);
      if (res.data?.success) {
        setSearchResults(res.data.data);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setSearching(false);
    }
  };

  // Load next page of notes (infinite-scroll style)
  const loadMoreNotes = async () => {
    const nextPage = notesPage + 1;
    try {
      const res = await axiosInstance.get(`/notes/workspace/${workspaceId}?page=${nextPage}&limit=20`);
      if (res.data?.success) {
        setNotes((prev) => [...prev, ...res.data.data]);
        setNotesPage(nextPage);
        setNotesTotalPages(res.data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to load more notes:", err);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Entering study room...</p>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="min-h-screen d-flex flex-column align-items-center justify-content-center p-4">
        <div className="glass-card p-5 text-center max-w-500">
          <h2 className="text-danger mb-3">Study Vault Inaccessible</h2>
          <p className="text-muted text-sm">{error || "This study room might have been deleted, or you do not have permission to access it."}</p>
          <Link to="/dashboard" className="btn btn-primary mt-4">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const openNoteObj = notes.find((n) => n._id === openNoteId);
  const ownerId = workspace.owner?._id || workspace.owner;
  const isOwner = ownerId === currentUser?._id;
  const myRole = isOwner ? "owner" : workspace.members?.find((m) => m.user?._id === currentUser._id)?.role || "member";
  const isAdminOrOwner = myRole === "owner" || myRole === "admin";

  return (
    <div className="workspace-page-container h-screen d-flex flex-column overflow-hidden">
      {/* Top Navbar */}
      <div className="workspace-nav p-3 px-4 border-bottom d-flex align-items-center justify-content-between flex-shrink-0 bg-panel-bg-solid" role="banner">
        <div className="d-flex align-items-center gap-3">
          <Link to="/dashboard" className="btn btn-secondary py-1.5 px-3 text-xs" aria-label="Back to dashboard">
            ← Dashboard
          </Link>
          <span className="text-2xl" aria-hidden="true">{workspace.icon || "📚"}</span>
          <div>
            <h2 className="m-0 text-white font-display text-base tracking-tight">{workspace.title}</h2>
            <p className="text-muted text-xxs m-0">
              {workspace.description || "Active revision co-authoring workspace"}
              {workspace.code && (
                <span className="text-primary font-mono ms-2">
                  · Join code: {workspace.code}
                  <button
                    type="button"
                    className={`btn btn-secondary text-xxs py-0 px-2 ms-1 btn-copy-code ${codeCopied ? "copied" : ""}`}
                    onClick={copyJoinCode}
                    aria-label={`Copy join code ${workspace.code}`}
                  >
                    {codeCopied ? "Copied" : "Copy"}
                  </button>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {openNoteId && (
            <button
              type="button"
              className="btn btn-secondary text-xxs py-1.5 px-3 border-danger text-danger hover-bg-danger"
              onClick={() => setOpenNoteId(null)}
              title="Close Note"
            >
              ✕ Close Note
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary text-xxs py-1 px-2"
            onClick={() => setShowShortcuts(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            ?
          </button>
        </div>

        {/* Live session online presence indicator bubbles */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-1.5 glass-card px-2.5 py-1 rounded-pill">
            <span className="live-pill-indicator animate-pulse"></span>
            <span className="text-xxs uppercase tracking-wider text-muted font-bold">Session:</span>
            <div className="d-flex align-items-center -space-x-8">
              {onlineUsers.map((ou) => (
                <span 
                  key={ou._id} 
                  className="presence-bubble-mini glass-card"
                  title={`${ou.name} (${ou.email})`}
                >
                  {ou.avatar || "👤"}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main split work layout */}
      <div className="workspace-main-layout flex-grow-1 d-flex overflow-hidden">
        
        {/* Left Sidebar folder tree & members list */}
        <nav className="workspace-left-sidebar d-flex flex-column border-right flex-shrink-0 bg-panel-bg-solid overflow-y-auto p-3" aria-label="Study library sidebar">
          
          {/* Search bar */}
          <div className="workspace-search-bar mb-3">
            <label htmlFor="note-search" className="sr-only">Search study notes</label>
            <input
              id="note-search"
              type="search"
              className="input-field w-100 text-xs py-1.5 px-3"
              placeholder="🔍 Search study notes..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              aria-label="Search study notes"
            />
          </div>

          {/* Folders & Notes block */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="font-display uppercase tracking-wider text-xs text-muted m-0">Library Trees</h4>
            <div className="d-flex gap-1.5">
              <button 
                className="btn btn-secondary text-xxs p-1 px-2"
                aria-label="Create new folder"
                onClick={() => {
                  setFolderParentId(null);
                  setShowFolderModal(true);
                }}
              >
                + Folder
              </button>
              <button 
                className="btn btn-secondary text-xxs p-1 px-2"
                aria-label="Create new note"
                onClick={() => {
                  setNoteFolderId(null);
                  setShowNoteModal(true);
                }}
              >
                + Note
              </button>
              <button 
                className="btn btn-secondary text-xxs p-1 px-2"
                aria-label="Upload new file"
                onClick={() => {
                  setFileFolderId(null);
                  setShowFileModal(true);
                }}
              >
                + File
              </button>
            </div>
          </div>

          <div className="folder-tree-feed flex-grow-1 overflow-y-auto mb-4" role="region" aria-label="Study library">
            {searchQuery.trim() ? (
              <div className="search-results-block" aria-live="polite" aria-atomic="true">
                <h5 className="text-xxs uppercase tracking-wider text-muted font-bold mb-2">
                  {searching ? "Searching..." : `Search Results (${searchResults.length})`}
                </h5>
                {searchResults.length === 0 ? (
                  <span className="text-xxs text-muted italic pl-1">No matching notes found</span>
                ) : (
                  <ul role="listbox" aria-label="Search results" className="list-unstyled m-0">
                    {searchResults.map((note) => (
                      <li
                        key={note._id}
                        role="option"
                        aria-selected={openNoteId === note._id}
                        className={`note-tree-node d-flex justify-content-between align-items-center p-1.5 rounded-6 hover-bg-border cursor-pointer text-xs mb-1 ${
                          openNoteId === note._id ? "bg-primary-glow border-primary-glow text-white" : "text-muted"
                        }`}
                        onClick={() => {
                          setOpenNoteId(note._id);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setOpenNoteId(note._id); setSearchQuery(""); setSearchResults([]); } }}
                        tabIndex={0}
                      >
                        <span className="truncate max-w-160">📄 {note.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                {/* Render Folders list */}
                {folders.map((fold) => {
                  const isExpanded = !!expandedFolders[fold._id];
                  const folderNotes = notes.filter((n) => n.folder === fold._id);
                  const folderFiles = files.filter((f) => f.folder === fold._id);

                  return (
                    <div key={fold._id} className="folder-tree-node mb-1.5">
                      <div 
                        className="folder-node-header d-flex justify-content-between align-items-center p-2 rounded-8 hover-bg-border cursor-pointer text-sm"
                        onClick={() => toggleFolder(fold._id)}
                      >
                        <div className="d-flex align-items-center gap-2">
                          <span className={`folder-arrow-indicator ${isExpanded ? "expanded" : ""}`}>▶</span>
                          <span className="folder-node-icon">📁</span>
                          <span className="folder-node-name text-white font-medium truncate max-w-140">{fold.name}</span>
                        </div>
                        <div className="folder-node-actions d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn-tree-icon" 
                            title="Add Note"
                            onClick={() => {
                              setNoteFolderId(fold._id);
                              setShowNoteModal(true);
                            }}
                          >
                            ＋
                          </button>
                          <button 
                            className="btn-tree-icon" 
                            title="Upload File"
                            onClick={() => {
                              setFileFolderId(fold._id);
                              setShowFileModal(true);
                            }}
                          >
                            📎
                          </button>
                          <button 
                            className="btn-tree-icon text-danger" 
                            title="Delete Folder"
                            onClick={(e) => handleDeleteFolder(fold._id, e)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Render Folder children notes & files if expanded */}
                      {isExpanded && (
                        <div className="folder-node-children pl-4 border-left ml-3.5 mt-1 d-flex flex-column gap-1">
                          {folderNotes.length === 0 && folderFiles.length === 0 ? (
                            <span className="text-xxs text-muted italic p-1 pl-2">Empty folder</span>
                          ) : (
                            <>
                              {folderNotes.map((note) => (
                                <div 
                                  key={note._id} 
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Open note: ${note.title}`}
                                  aria-pressed={openNoteId === note._id}
                                  className={`note-tree-node d-flex justify-content-between align-items-center p-1.5 rounded-6 hover-bg-border cursor-pointer text-xs ${
                                    openNoteId === note._id ? "bg-primary-glow border-primary-glow text-white" : "text-muted"
                                  }`}
                                  onClick={() => setOpenNoteId(note._id)}
                                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenNoteId(note._id); }}
                                >
                                  <span className="truncate max-w-130">📄 {note.title}</span>
                                  <button 
                                    className="btn-tree-icon text-danger opacity-hover"
                                    aria-label={`Delete note ${note.title}`}
                                    onClick={(e) => handleDeleteNote(note._id, e)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              {folderFiles.map((file) => (
                                <div 
                                  key={file._id} 
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`Open file: ${file.name}`}
                                  className="note-tree-node d-flex justify-content-between align-items-center p-1.5 rounded-6 hover-bg-border cursor-pointer text-xs text-muted"
                                  onClick={() => window.open(file.url, "_blank")}
                                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.open(file.url, "_blank"); }}
                                >
                                  <span className="truncate max-w-130">📎 {file.name}</span>
                                  <button 
                                    className="btn-tree-icon text-danger opacity-hover"
                                    aria-label={`Delete file ${file.name}`}
                                    onClick={(e) => handleDeleteFile(file._id, e)}
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Render Root Notes & Files */}
                <div className="root-notes-block mt-3 border-top pt-3">
                  <h5 className="text-xxs uppercase tracking-wider text-muted font-bold mb-2">Uncategorized Resources</h5>
                  {notes.filter((n) => !n.folder).length === 0 && files.filter((f) => !f.folder).length === 0 ? (
                    <span className="text-xxs text-muted italic pl-1">No loose resources</span>
                  ) : (
                    <>
                      {notes.filter((n) => !n.folder).map((note) => (
                        <div 
                          key={note._id} 
                          role="button"
                          tabIndex={0}
                          aria-label={`Open note: ${note.title}`}
                          aria-pressed={openNoteId === note._id}
                          className={`note-tree-node d-flex justify-content-between align-items-center p-1.5 rounded-6 hover-bg-border cursor-pointer text-xs mb-1 ${
                            openNoteId === note._id ? "bg-primary-glow border-primary-glow text-white" : "text-muted"
                          }`}
                          onClick={() => setOpenNoteId(note._id)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpenNoteId(note._id); }}
                        >
                          <span className="truncate max-w-160">📄 {note.title}</span>
                          <button 
                            className="btn-tree-icon text-danger opacity-hover"
                            aria-label={`Delete note ${note.title}`}
                            onClick={(e) => handleDeleteNote(note._id, e)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {files.filter((f) => !f.folder).map((file) => (
                        <div 
                          key={file._id} 
                          role="button"
                          tabIndex={0}
                          aria-label={`Open file: ${file.name}`}
                          className="note-tree-node d-flex justify-content-between align-items-center p-1.5 rounded-6 hover-bg-border cursor-pointer text-xs mb-1 text-muted"
                          onClick={() => window.open(file.url, "_blank")}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") window.open(file.url, "_blank"); }}
                        >
                          <span className="truncate max-w-160">📎 {file.name}</span>
                          <button 
                            className="btn-tree-icon text-danger opacity-hover"
                            aria-label={`Delete file ${file.name}`}
                            onClick={(e) => handleDeleteFile(file._id, e)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Pagination: Load More */}
                {notesPage < notesTotalPages && (
                  <div className="text-center mt-3 mb-2">
                    <button
                      type="button"
                      className="btn btn-secondary text-xxs py-1.5 px-4 w-100"
                      onClick={loadMoreNotes}
                    >
                      Load More Notes ({notesPage}/{notesTotalPages})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Members Invite panel */}
          <div className="members-invite-panel border-top pt-3 mt-auto">
            <h4 className="font-display uppercase tracking-wider text-xs text-muted mb-2">Study Group Members</h4>
            
            {/* List members */}
            <div className="members-avatars-list mb-3 d-flex flex-column gap-2 max-h-150 overflow-y-auto">
              {workspace.members?.map((m) => (
                <div key={m.user?._id} className="member-avatar-row d-flex justify-content-between align-items-center text-xs">
                  <div className="d-flex align-items-center gap-2">
                    <span className="text-base">{m.user?.avatar || "👤"}</span>
                    <div>
                      <span className="text-white font-medium d-block">{m.user?.name}</span>
                      <span className="text-dim text-xxs uppercase font-semibold">{m.role}</span>
                    </div>
                  </div>
                  {/* Kick action */}
                  {isAdminOrOwner && m.user?._id !== currentUser._id && (
                    <button 
                      className="btn-kick text-danger text-xxs font-semibold bg-transparent border-0 cursor-pointer"
                      onClick={() => handleRemoveMember(m.user?._id)}
                      aria-label={`Remove member ${m.user?.name}`}
                    >
                      Kick
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Invite Form */}
            {isAdminOrOwner && (
              <form onSubmit={handleInviteMember} className="d-flex flex-column gap-2 mt-2">
                <input
                  type="email"
                  required
                  placeholder="Invite by email..."
                  className="input-field text-xs py-1.5"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <div className="d-flex gap-2 justify-content-between align-items-center">
                  <select 
                    className="input-field text-xxs py-1 px-1.5 flex-grow-1"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button type="submit" className="btn btn-primary text-xxs py-1.5 px-3" disabled={inviting}>
                    {inviting ? "Sending..." : "Invite"}
                  </button>
                </div>
              </form>
            )}

            {/* Leave Workspace Button if not Owner */}
            {!isOwner && (
              <button 
                className="btn btn-secondary border-danger text-danger text-xs w-100 py-1.5 mt-3 rounded-pill"
                onClick={() => handleRemoveMember(currentUser._id)}
              >
                🚪 Leave Study Room
              </button>
            )}

          </div>

        </nav>

        {/* Center Panel (markdown editor, whiteboard or Welcome screen) */}
        <div className="workspace-center-panel flex-grow-1 overflow-hidden d-flex flex-column p-3 position-relative">
          {!openNoteId && (
            <div className="center-panel-tabs glass-card d-flex p-1 gap-1 mb-3.5 mx-auto flex-shrink-0" style={{ maxWidth: "560px", width: "100%" }} role="tablist" aria-label="Workspace views">
              <button
                type="button"
                role="tab"
                aria-selected={centerTab === "dashboard"}
                className={`tab-switch-btn flex-grow-1 text-xs py-1.5 rounded-8 ${centerTab === "dashboard" ? "active bg-primary text-white" : "text-muted"}`}
                onClick={() => setCenterTab("dashboard")}
              >
                📊 Room Overview
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={centerTab === "whiteboard"}
                className={`tab-switch-btn flex-grow-1 text-xs py-1.5 rounded-8 ${centerTab === "whiteboard" ? "active bg-primary text-white" : "text-muted"}`}
                onClick={() => setCenterTab("whiteboard")}
              >
                🎨 Live Whiteboard
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={centerTab === "forum"}
                className={`tab-switch-btn flex-grow-1 text-xs py-1.5 rounded-8 ${centerTab === "forum" ? "active bg-primary text-white" : "text-muted"}`}
                onClick={() => setCenterTab("forum")}
              >
                🙋‍♂️ Doubt Forum
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={centerTab === "pastpapers"}
                className={`tab-switch-btn flex-grow-1 text-xs py-1.5 rounded-8 ${centerTab === "pastpapers" ? "active bg-primary text-white" : "text-muted"}`}
                onClick={() => setCenterTab("pastpapers")}
              >
                📝 Past Papers
              </button>
            </div>
          )}

          {openNoteId ? (
            <MarkdownEditor
              noteId={openNoteId}
              currentUser={currentUser}
              onNoteSaved={handleNoteSaved}
              onOpenHistory={() => setShowHistory(true)}
            />
          ) : centerTab === "whiteboard" ? (
            <Whiteboard
              workspaceId={workspaceId}
              currentUser={currentUser}
            />
          ) : centerTab === "forum" ? (
            <ForumBoard
              workspaceId={workspaceId}
              currentUser={currentUser}
            />
          ) : centerTab === "pastpapers" ? (
            <PastPapersBoard
              workspaceId={workspaceId}
              currentUser={currentUser}
              isAdminOrOwner={isAdminOrOwner}
            />
          ) : (
            /* Welcome dashboard dashboard overview */
            <div className="editor-welcome-screen d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
              <div className="welcome-glow-badge animate-pulse">📚</div>
              <h2 className="mt-4 font-display">Welcome to your Collaborative Study Room</h2>
              <p className="text-muted text-sm max-w-450 my-3">
                Select an existing study note guide from the library tree on the left, or create a brand new one to co-author with your classmates!
              </p>
              
              <div className="welcome-stats-grid d-flex flex-wrap justify-content-center gap-4 mt-3">
                <div className="welcome-stat-pill glass-card px-4 py-2 text-center rounded-12 min-w-120">
                  <span className="text-xxs uppercase tracking-wider text-muted font-bold d-block">Peers Live</span>
                  <span className="text-white text-lg font-bold">{onlineUsers.length}</span>
                </div>
                <div className="welcome-stat-pill glass-card px-4 py-2 text-center rounded-12 min-w-120">
                  <span className="text-xxs uppercase tracking-wider text-muted font-bold d-block">Note Guides</span>
                  <span className="text-white text-lg font-bold">{notes.length}</span>
                </div>
                <div className="welcome-stat-pill glass-card px-4 py-2 text-center rounded-12 min-w-120">
                  <span className="text-xxs uppercase tracking-wider text-muted font-bold d-block">Total Quizzes</span>
                  <span className="text-white text-lg font-bold">{quizzes.length}</span>
                </div>
              </div>

              <div className="d-flex gap-3 mt-5">
                <button
                  type="button"
                  className="btn btn-primary py-2 px-4 text-xs"
                  onClick={() => setCenterTab("whiteboard")}
                >
                  🎨 Open Live Whiteboard
                </button>
                <button
                  type="button"
                  className="btn btn-secondary py-2 px-4 text-xs"
                  onClick={() => setCenterTab("forum")}
                >
                  🙋‍♂️ Go to Doubt Forum
                </button>
              </div>
            </div>
          )}

          {/* Version History Drawer Overlay */}
          {showHistory && openNoteId && (
            <VersionHistory
              noteId={openNoteId}
              onClose={() => setShowHistory(false)}
              onVersionRestored={(updatedNote) => {
                handleNoteSaved(updatedNote);
                // Trigger a socket lock release or update
                socket.emit("edit_note", { noteId: openNoteId, content: updatedNote.content });
              }}
            />
          )}

        </div>

        {/* Right Collapsible Tab Panel (Chat window / AI Quiz generator) */}
        <div className="workspace-right-sidebar border-left flex-shrink-0 bg-panel-bg-solid p-3 d-flex flex-column overflow-hidden">
          
          {/* Tabs bar */}
          <div className="sidebar-tabs-switch glass-card d-flex p-1 gap-1 mb-3.5 flex-shrink-0">
            <button
              className={`tab-switch-btn flex-grow-1 text-xs py-1.5 rounded-8 ${sidebarTab === "chat" ? "active bg-primary text-white" : "text-muted"}`}
              onClick={() => setSidebarTab("chat")}
            >
              💬 Group Chat
            </button>
            <button
              className={`tab-switch-btn flex-grow-1 text-xs py-1.5 rounded-8 ${sidebarTab === "quiz" ? "active bg-primary text-white" : "text-muted"}`}
              onClick={() => setSidebarTab("quiz")}
            >
              🧠 Recall Hub
            </button>
          </div>

          {/* Render Chat Panel */}
          {sidebarTab === "chat" && (
            <ChatWindow
              workspaceId={workspaceId}
              currentUser={currentUser}
              openNoteId={openNoteId}
            />
          )}

          {/* Render Quiz/Summary Panel */}
          {sidebarTab === "quiz" && (
            <div className="ai-recall-hub-scroll flex-grow-1 d-flex flex-column overflow-y-auto gap-4">
              
              {/* Note summary section */}
              {openNoteId ? (
                <div className="note-summary-card glass-card p-3">
                  <h4 className="font-display text-xs text-primary uppercase tracking-wider mb-2">⚡ Notes AI summary</h4>
                  {openNoteObj?.aiSummary ? (
                    <div className="ai-summary-viewport text-xs text-muted max-h-180 overflow-y-auto mb-3 whitespace-pre-wrap">
                      {openNoteObj.aiSummary}
                    </div>
                  ) : (
                    <p className="text-xxs text-muted mb-3 italic">No summary generated for this note yet.</p>
                  )}

                  <button
                    className="btn btn-secondary w-100 text-xs py-2 d-flex align-items-center justify-content-center gap-1.5"
                    onClick={handleTriggerSummary}
                    disabled={summarizing}
                  >
                    {summarizing ? "AI summarizing note..." : "⚡ Summarize Note Guide"}
                  </button>
                </div>
              ) : (
                <div className="glass-card p-3 text-center text-muted text-xxs">
                  Open a note guide to trigger AI summary analyses.
                </div>
              )}

              {/* Generate Quiz Card */}
              {openNoteId && (
                <div className="generate-quiz-card glass-card p-3">
                  <h4 className="font-display text-xs text-primary uppercase tracking-wider mb-2">🧠 Active recall quizzes</h4>
                  <p className="text-xxs text-muted mb-3">
                    Instantly analyze note grammar, mask key vocabularies, and compile dynamic testing quizzes!
                  </p>
                  <button
                    className="btn btn-primary w-100 text-xs py-2 d-flex align-items-center justify-content-center gap-1.5"
                    onClick={handleGenerateQuiz}
                    disabled={generatingQuiz}
                  >
                    {generatingQuiz ? "Generating quiz..." : "🧠 Generate Revision Quiz"}
                  </button>
                </div>
              )}

              {/* Generate Flashcards Card */}
              {openNoteId && (
                <div className="flashcards-card glass-card p-3">
                  <h4 className="font-display text-xs text-primary uppercase tracking-wider mb-2">🃏 Active Recall Flashcards</h4>
                  {openNoteObj?.aiFlashcards && openNoteObj.aiFlashcards.length > 0 ? (
                    <div className="flashcards-viewport d-flex flex-column align-items-center">
                      {/* Flashcard container with 3D Flip */}
                      <div 
                        className={`flashcard-3d-container cursor-pointer w-100 ${isFlashcardFlipped ? "flipped" : ""}`}
                        onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}
                      >
                        <div className="flashcard-card-inner">
                          {/* Front Side */}
                          <div className="flashcard-face flashcard-front d-flex flex-column align-items-center justify-content-center text-center p-3">
                            <span className="text-xxs uppercase tracking-wider text-primary font-bold mb-2">FRONT</span>
                            <p className="text-xs text-white font-medium m-0">
                              {openNoteObj.aiFlashcards[currentFlashcardIndex]?.front}
                            </p>
                            <span className="text-xxxs text-muted mt-3">Click to Flip</span>
                          </div>
                          {/* Back Side */}
                          <div className="flashcard-face flashcard-back d-flex flex-column align-items-center justify-content-center text-center p-3">
                            <span className="text-xxs uppercase tracking-wider text-success font-bold mb-2">BACK</span>
                            <p className="text-xs text-muted font-medium m-0">
                              {openNoteObj.aiFlashcards[currentFlashcardIndex]?.back}
                            </p>
                            <span className="text-xxxs text-muted mt-3">Click to Flip</span>
                          </div>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="d-flex align-items-center justify-content-between w-100 mt-3">
                        <button 
                          className="btn btn-secondary text-xxs py-1.5 px-3"
                          disabled={currentFlashcardIndex === 0}
                          onClick={() => {
                            setIsFlashcardFlipped(false);
                            setTimeout(() => {
                              setCurrentFlashcardIndex((prev) => prev - 1);
                            }, 150);
                          }}
                        >
                          ← Prev
                        </button>
                        <span className="text-xxs text-muted font-medium">
                          {currentFlashcardIndex + 1} / {openNoteObj.aiFlashcards.length}
                        </span>
                        <button 
                          className="btn btn-secondary text-xxs py-1.5 px-3"
                          disabled={currentFlashcardIndex === openNoteObj.aiFlashcards.length - 1}
                          onClick={() => {
                            setIsFlashcardFlipped(false);
                            setTimeout(() => {
                              setCurrentFlashcardIndex((prev) => prev + 1);
                            }, 150);
                          }}
                        >
                          Next →
                        </button>
                      </div>

                      {/* Re-generate button */}
                      <button
                        className="btn btn-secondary w-100 text-xxs py-1.5 mt-3 d-flex align-items-center justify-content-center gap-1.5 opacity-hover"
                        onClick={handleGenerateFlashcards}
                        disabled={generatingFlashcards}
                      >
                        {generatingFlashcards ? "Generating cards..." : "🔄 Re-generate Flashcards"}
                      </button>
                    </div>
                  ) : (
                    <div className="no-flashcards-ui text-center py-2">
                      <p className="text-xxs text-muted mb-3 italic">
                        No flashcards generated for this note yet. Build high-retention active recall study sets in seconds!
                      </p>
                      <button
                        className="btn btn-primary w-100 text-xs py-2 d-flex align-items-center justify-content-center gap-1.5"
                        onClick={handleGenerateFlashcards}
                        disabled={generatingFlashcards}
                      >
                        {generatingFlashcards ? "Generating cards..." : "🃏 Generate Flashcards"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Quizzes List */}
              <div className="workspace-quizzes-block">
                <h5 className="text-xxs uppercase tracking-wider text-muted font-bold mb-2.5">Available Practice Quizzes</h5>
                
                {quizzes.length === 0 ? (
                  <div className="glass-card p-4 text-center text-muted text-xxs italic">
                    No quizzes generated. Click "Generate Revision Quiz" to begin active recall!
                  </div>
                ) : (
                  <div className="quizzes-scroll-container d-flex flex-column gap-2 max-h-250 overflow-y-auto">
                    {quizzes.map((q) => (
                      <div 
                        key={q._id} 
                        className="quiz-list-row glass-card p-2.5 d-flex justify-content-between align-items-center hover-bg-border cursor-pointer"
                        onClick={() => setActiveQuizId(q._id)}
                      >
                        <div>
                          <span className="quiz-row-title text-white font-medium text-xs d-block truncate max-w-140">
                            🧠 {q.sourceNote?.title || "Note Quiz"}
                          </span>
                          <span className="text-muted text-xxs text-capitalize">
                            Difficulty: {q.difficulty || "medium"} • {q.questions?.length || 0} Qs
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="btn btn-secondary text-xxs py-1 px-2.5"
                            onClick={() => setActiveQuizId(q._id)}
                          >
                            Play
                          </button>
                          <button
                            className="btn-tree-icon text-danger"
                            onClick={(e) => handleDeleteQuiz(q._id, e)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* 6. MODALS POPUPS */}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-container glass-card p-4 animate-fade-in w-100 max-w-400" role="dialog" aria-modal="true" aria-labelledby="folder-modal-title">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 id="folder-modal-title" className="m-0 font-display">New Study Folder</h3>
              <button className="btn btn-secondary py-1 px-2.5 text-xs" onClick={() => setShowFolderModal(false)} aria-label="Close folder dialog">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="d-flex flex-column gap-3">
              <div className="form-group m-0">
                <label className="form-label">Folder Name</label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  placeholder="e.g. Inorganic compounds"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                />
              </div>
              <div className="d-flex gap-2 justify-content-end mt-2">
                <button type="button" className="btn btn-secondary text-xs" onClick={() => setShowFolderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {showNoteModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-container glass-card p-4 animate-fade-in w-100 max-w-400" role="dialog" aria-modal="true" aria-labelledby="note-modal-title">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 id="note-modal-title" className="m-0 font-display">New Study Note</h3>
              <button className="btn btn-secondary py-1 px-2.5 text-xs" onClick={() => setShowNoteModal(false)} aria-label="Close note dialog">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateNote} className="d-flex flex-column gap-3">
              <div className="form-group m-0">
                <label className="form-label">Note Title</label>
                <input
                  type="text"
                  required
                  className="input-field text-sm"
                  placeholder="e.g. Lecture 4 Notes"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                />
              </div>
              <div className="d-flex gap-2 justify-content-end mt-2">
                <button type="button" className="btn btn-secondary text-xs" onClick={() => setShowNoteModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Create Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showFileModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-container glass-card p-4 animate-fade-in w-100 max-w-400" role="dialog" aria-modal="true" aria-labelledby="file-modal-title">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h3 id="file-modal-title" className="m-0 font-display">Upload Resource File</h3>
              <button 
                type="button"
                className="btn btn-secondary py-1 px-2.5 text-xs" 
                onClick={() => {
                  setShowFileModal(false);
                  setSelectedFile(null);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateFile} className="d-flex flex-column gap-3">
              <div className="form-group m-0">
                <label className="form-label">Select File (Max 10MB)</label>
                <input
                  type="file"
                  required
                  className="input-field text-sm"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                />
              </div>
              <div className="d-flex gap-2 justify-content-end mt-2">
                <button 
                  type="button" 
                  className="btn btn-secondary text-xs" 
                  onClick={() => {
                    setShowFileModal(false);
                    setSelectedFile(null);
                  }}
                  disabled={uploadingFile}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs" disabled={uploadingFile}>
                  {uploadingFile ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Quiz modal Overlay */}
      {activeQuizId && (
        <QuizModal
          quizId={activeQuizId}
          onClose={() => setActiveQuizId(null)}
          onAttemptSaved={async () => {
            const quizzesRes = await axiosInstance.get(`/quizzes/workspace/${workspaceId}`);
            if (quizzesRes.data?.success) setQuizzes(quizzesRes.data.data);
          }}
        />
      )}

      <WorkspaceOnboarding workspaceId={workspaceId} />
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};

export default WorkspacePage;
