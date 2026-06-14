import React, { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { socket } from "../../sockets/socket";
import axiosInstance from "../../api/axiosInstance";
import { useToast } from "../../context/ToastContext";

/**
 * MarkdownEditor - Premium Real-time Co-authoring Markdown Editor
 * Features split screen edit/preview, debounced autosaving,
 * custom markdown rendering, edit-locking safety gates, and live presence indicator bubbles.
 */
const MarkdownEditor = ({ noteId, currentUser, onNoteSaved, onOpenHistory }) => {
  const { toast } = useToast();
  const [note, setNote] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Interface view mode
  const [viewMode, setViewMode] = useState("split"); // "edit" | "preview" | "split"
  const [isSaving, setIsSaving] = useState(false);

  // Edit locking state
  const [lockedBy, setLockedBy] = useState(null); // { name, userId }
  const [hasLock, setHasLock] = useState(false);

  // Peer cursor presence state
  const [activePeers, setActivePeers] = useState([]); // Array of { socketId, user }

  const textareaRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const handleExportMarkdown = () => {
    if (!note) return;
    const body = `# ${note.title}\n\n${content || ""}`;
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (note.title || "note").replace(/[^\w\-]+/g, "_").slice(0, 60);
    a.href = url;
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const blocked = lockedBy && lockedBy.userId !== currentUser?._id;
        if (!blocked && note) saveNote(content);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [content, note, lockedBy, currentUser]);

  // 1. Fetch note details & connect/join WebSockets
  useEffect(() => {
    const fetchNoteDetails = async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await axiosInstance.get(`/notes/${noteId}`);
        if (res.data && res.data.success) {
          setNote(res.data.data);
          setContent(typeof res.data.data.content === "string" ? res.data.data.content : "");
        }
      } catch (err) {
        setLoadError(err.response?.data?.message || "Failed to load note content.");
      } finally {
        setLoading(false);
      }
    };

    if (noteId) {
      fetchNoteDetails();

      // Ensure socket is active
      if (!socket.connected) {
        socket.connect();
      }

      // Join note room
      socket.emit("join_note", { noteId });

      // ---- Websocket listeners ----

      // Check if note is locked by someone
      socket.on("note_locked", ({ lockedBy: name, userId }) => {
        if (userId !== currentUser._id) {
          setLockedBy({ name, userId });
          setHasLock(false);
        }
      });

      // Clear lock status
      socket.on("note_unlocked", () => {
        setLockedBy(null);
      });

      // Sync typing modifications
      socket.on("note_update", ({ content: newContent }) => {
        setContent(newContent);
      });

      // Peer cursor tracking
      socket.on("cursor_update", ({ socketId, user, position }) => {
        setActivePeers((prev) => {
          const rest = prev.filter((p) => p.socketId !== socketId);
          return [...rest, { socketId, user, position }];
        });
      });

      return () => {
        // Leave room and release lock on unmount
        socket.emit("leave_note", { noteId });
        socket.off("note_locked");
        socket.off("note_unlocked");
        socket.off("note_update");
        socket.off("cursor_update");
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [noteId, currentUser]);

  // 2. Clear disconnected cursor indicators
  useEffect(() => {
    const handlePresenceUpdate = (currentUsers) => {
      // Clear peers who left the general workspace presence
      setActivePeers((prev) => 
        prev.filter((peer) => currentUsers.some((u) => u._id === peer.user._id))
      );
    };

    socket.on("presence_update", handlePresenceUpdate);
    return () => {
      socket.off("presence_update", handlePresenceUpdate);
    };
  }, []);

  // 3. Save Note Handler (Manual or Debounced)
  const saveNote = async (updatedText = content) => {
    setIsSaving(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    const payload = typeof updatedText === "string" ? updatedText : "";
    try {
      const res = await axiosInstance.put(`/notes/${noteId}`, {
        content: payload,
      });
      if (res.data && res.data.success) {
        setNote(res.data.data);
        if (onNoteSaved) onNoteSaved(res.data.data);
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        (err.response?.status === 503
          ? "Database not connected. Set MONGO_URI in backend/.env to your MongoDB Atlas string and restart the server."
          : err.message);
      console.error("Save failed:", msg);
      toast.error("Save failed: " + msg);
    } finally {
      setIsSaving(false);
    }
  };

  const triggerAutosave = (updatedText) => {
    setIsSaving(true);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveNote(updatedText);
    }, 2000); // 2 second delay
  };

  // 4. Input changed handler
  const handleTextChange = (e) => {
    const val = e.target.value;
    setContent(val);

    // Sync content to co-authors
    socket.emit("edit_note", { noteId, content: val });

    // Trigger save
    triggerAutosave(val);
  };

  const handleKeyDown = (e) => {
    // Intercept Ctrl+S / Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveNote(content);
    }
  };

  // 5. Request edit lock
  const handleRequestLock = () => {
    if (lockedBy && lockedBy.userId !== currentUser._id) return; // Locked by someone else
    if (hasLock) return;

    socket.emit("lock_note", { noteId });
    setHasLock(true);
    setLockedBy({ name: currentUser.name, userId: currentUser._id });
  };

  // 6. Release lock
  const handleReleaseLock = () => {
    socket.emit("unlock_note", { noteId });
    setHasLock(false);
    setLockedBy(null);
  };

  // 7. Track and broadcast cursor position
  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const { selectionStart } = textareaRef.current;
    
    // Simple line and character index calculations
    const textBefore = content.substring(0, selectionStart);
    const lines = textBefore.split("\n");
    const line = lines.length - 1;
    const ch = lines[lines.length - 1].length;

    socket.emit("cursor_move", {
      noteId,
      user: currentUser,
      position: { line, ch, index: selectionStart },
    });
  };

  // 8. Custom lightweight markdown renderer (sanitized with DOMPurify to prevent XSS)
  const renderMarkdown = (mdText) => {
    if (!mdText) return `<p class="text-dim italic">Empty note. Click edit to draft some notes!</p>`;

    let html = mdText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Headings
    html = html.replace(/^### (.*?)$/gm, "<h3 class=\'md-h3\'>$1</h3>");
    html = html.replace(/^## (.*?)$/gm, "<h2 class=\'md-h2\'>$1</h2>");
    html = html.replace(/^# (.*?)$/gm, "<h1 class=\'md-h1\'>$1</h1>");

    // Bold text
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Italic text
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, "<pre class=\'md-code\'><code>$1</code></pre>");

    // Inline code
    html = html.replace(/`(.*?)`/g, "<code class=\'md-inline-code\'>$1</code>");

    // Task lists
    html = html.replace(/^- \[x\] (.*?)$/gm, "<div class=\'md-task-item checked\'><input type=\'checkbox\' checked disabled /> <span>$1</span></div>");
    html = html.replace(/^- \[ \] (.*?)$/gm, "<div class=\'md-task-item\'><input type=\'checkbox\' disabled /> <span>$1</span></div>");

    // Unordered lists
    html = html.replace(/^- (.*?)$/gm, "<li class=\'md-li\'>$1</li>");

    // Line breaks
    html = html.replace(/\n/g, "<br />");

    // Sanitize the final HTML to prevent XSS attacks
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ["h1", "h2", "h3", "strong", "em", "pre", "code", "div", "span", "input", "li", "br", "p"],
      ALLOWED_ATTR: ["class", "type", "checked", "disabled"],
    });
  };

  if (loading) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 min-h-400">
        <div className="loader"></div>
        <p className="mt-3 text-muted">Retrieving study note contents...</p>
      </div>
    );
  }

  if (loadError || !note) {
    return (
      <div className="glass-card p-5 text-center my-5">
        <h3 className="text-danger mb-3">Error Loading Note</h3>
        <p>{loadError || "Note object could not be initialized."}</p>
      </div>
    );
  }

  const isLockedByOther = lockedBy && lockedBy.userId !== currentUser._id;

  return (
    <div className="workspace-markdown-editor glass-card d-flex flex-column animate-fade-in">
      {/* Editor top status header */}
      <div className="editor-header p-3 border-bottom d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3">
          <span className="note-emoji-header text-2xl">📝</span>
          <div>
            <h3 className="m-0 text-white font-display text-base">{note.title}</h3>
            <span className="text-muted text-xxs d-block">
              Last saved: {new Date(note.updatedAt).toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Lock indicators, saving stats, view switches */}
        <div className="d-flex align-items-center gap-3">
          {isSaving ? (
            <span className="saving-indicator text-xs text-muted">⚡ Saving...</span>
          ) : (
            <span className="saving-indicator text-xs text-muted">✓ Saved</span>
          )}

          <button
            className="btn btn-secondary text-xs py-1.5 px-3 rounded-pill d-flex align-items-center gap-1.5"
            onClick={() => saveNote(content)}
            disabled={isSaving || isLockedByOther}
          >
            💾 Save
          </button>

          {/* Edit Lock Panel */}
          {isLockedByOther ? (
            <span className="badge btn-danger text-xs px-3 py-1.5 rounded-pill d-flex align-items-center gap-1.5">
              🔒 Locked by {lockedBy.name}
            </span>
          ) : hasLock ? (
            <button className="btn btn-secondary text-xs py-1.5 px-3 rounded-pill d-flex align-items-center gap-1.5" onClick={handleReleaseLock}>
              🔓 Release Edit Lock
            </button>
          ) : (
            <button className="btn btn-primary text-xs py-1.5 px-3 rounded-pill d-flex align-items-center gap-1.5" onClick={handleRequestLock}>
              ✍️ Acquire Lock to Edit
            </button>
          )}

          {/* History Sidebar Button */}
          {onOpenHistory && (
            <button
              type="button"
              className="btn btn-secondary text-xs py-1.5 px-3 rounded-pill"
              onClick={onOpenHistory}
              aria-label="Open version history"
            >
              ⏳ History
            </button>
          )}

          <button
            type="button"
            className="btn btn-secondary text-xs py-1.5 px-3 rounded-pill"
            onClick={handleExportMarkdown}
            aria-label="Download note as Markdown file"
          >
            ⬇ .md
          </button>

          {/* View splits switches */}
          <div className="view-switch-group glass-card d-flex p-1 gap-1">
            {["edit", "split", "preview"].map((mode) => (
              <button
                key={mode}
                className={`view-switch-btn text-xs py-1 px-2.5 text-capitalize rounded-8 ${
                  viewMode === mode ? "active bg-primary text-white" : "text-muted"
                }`}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Editor warning lockout banner */}
      {isLockedByOther && (
        <div className="lockout-warning-banner p-2.5 bg-danger-glow border-bottom text-center text-xs text-white d-flex align-items-center justify-content-center gap-2">
          <span>🔒</span>
          <span>
            <strong>{lockedBy.name}</strong> is currently co-authoring. Changes are synchronized live, but writing is locked out to avoid overrides.
          </span>
        </div>
      )}

      {/* Collaboration peers strip */}
      {activePeers.length > 0 && (
        <div className="collab-peers-strip px-3 py-2 border-bottom d-flex align-items-center gap-2">
          <span className="text-xxs text-muted uppercase tracking-wider font-semibold">Editing live:</span>
          <div className="d-flex align-items-center gap-1.5">
            {activePeers.map((peer) => (
              <div key={peer.socketId} className="peer-badge-avatar glass-card d-flex align-items-center gap-1 px-2 py-0.5 rounded-pill text-xxs" title={peer.user.email}>
                <span>{peer.user.avatar || "👤"}</span>
                <span className="text-white font-medium">{peer.user.name}</span>
                <span className="text-muted italic">({peer.position ? `L${peer.position.line}:C${peer.position.ch}` : "reading"})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Split workspace */}
      <div className="editor-workspace-split flex-grow-1 d-flex">
        {/* Left: Input Textarea */}
        {(viewMode === "edit" || viewMode === "split") && (
          <div className="textarea-editor-pane flex-grow-1 p-3">
            <textarea
              ref={textareaRef}
              className="raw-markdown-textarea h-100 w-100"
              placeholder="Start drafting notes in markdown style (e.g. # Hello, - [ ] Task)..."
              value={content}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onFocus={handleRequestLock}
              onKeyUp={handleCursorMove}
              onClick={handleCursorMove}
              disabled={isLockedByOther}
            />
          </div>
        )}

        {/* Right: Render Preview */}
        {(viewMode === "preview" || viewMode === "split") && (
          <div className="rendered-preview-pane flex-grow-1 p-3 border-left">
            <div 
              className="compiled-markdown-viewport h-100 w-100"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownEditor;
