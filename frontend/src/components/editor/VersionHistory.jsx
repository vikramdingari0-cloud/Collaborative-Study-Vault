import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useToast } from "../../context/ToastContext";

/**
 * VersionHistory - Interactive Side-Drawer listing historical note versions
 * Allows students to browse, compare, and restore note states.
 */
const VersionHistory = ({ noteId, onClose, onVersionRestored }) => {
  const { toast, confirm } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Selected version to preview
  const [previewVersion, setPreviewVersion] = useState(null);
  const [restoringIdx, setRestoringIdx] = useState(null);

  useEffect(() => {
    const fetchVersionHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axiosInstance.get(`/notes/${noteId}`);
        if (res.data && res.data.success) {
          // Note details include populated versionHistory
          // Reverse history to show latest first
          setHistory([...(res.data.data.versionHistory || [])].reverse());
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load note history.");
      } finally {
        setLoading(false);
      }
    };

    if (noteId) fetchVersionHistory();
  }, [noteId]);

  const handleRestore = async (version, idx) => {
    if (
      !(await confirm(
        "Restore this version? Your current text will be saved to history first.",
        { title: "Restore version", confirmLabel: "Restore" }
      ))
    )
      return;

    try {
      setRestoringIdx(idx);
      const res = await axiosInstance.put(`/notes/${noteId}`, {
        content: typeof version.content === "string" ? version.content : "",
      });

      if (res.data && res.data.success) {
        if (onVersionRestored) {
          onVersionRestored(res.data.data);
        }
        onClose(); // Close history drawer
      }
    } catch (err) {
      toast.error("Failed to restore version: " + (err.response?.data?.message || err.message));
    } finally {
      setRestoringIdx(null);
    }
  };

  return (
    <div className="version-history-drawer glass-card d-flex flex-column animate-fade-in">
      {/* Header */}
      <div className="drawer-header p-3 border-bottom d-flex align-items-center justify-content-between">
        <h4 className="m-0 font-display">Version Logs</h4>
        <button className="btn btn-secondary text-xs px-2.5 py-1" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      {/* Main Drawer split */}
      <div className="drawer-body flex-grow-1 d-flex flex-column overflow-hidden">
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 p-4">
            <div className="loader small-loader mb-2"></div>
            <span className="text-muted text-xs">Retrieving historical save packets...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-danger">
            <p>{error}</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-4 text-center text-muted">
            <span className="text-2xl d-block mb-2 font-semibold">⏳</span>
            <p className="text-xs">No prior versions logged yet.</p>
            <p className="text-xxs text-dim mt-1">Make changes in the editor, and autosave will register your history logs automatically!</p>
          </div>
        ) : (
          <div className="history-list-container flex-grow-1 overflow-y-auto p-3">
            {history.map((version, idx) => {
              const isSelected = previewVersion?._id === version._id;
              const dateObj = new Date(version.editedAt);

              return (
                <div 
                  key={version._id} 
                  className={`version-log-card glass-card p-3 mb-3 ${isSelected ? "border-primary" : ""}`}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="editor-badge text-xxs font-semibold bg-primary-glow text-primary rounded-4 px-1.5 py-0.5 d-inline-block mb-1">
                        👤 {version.editedBy?.name || "Member"}
                      </span>
                      <h5 className="m-0 text-sm text-white">
                        {dateObj.toLocaleDateString()}
                      </h5>
                      <span className="text-dim text-xxs">
                        {dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    <span className="text-xxs text-muted font-mono">v{history.length - idx}</span>
                  </div>

                  {/* Actions */}
                  <div className="d-flex gap-2 justify-content-end mt-3">
                    <button 
                      className={`btn text-xs py-1 px-2.5 ${isSelected ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setPreviewVersion(isSelected ? null : version)}
                    >
                      {isSelected ? "Hide Preview" : "Preview Version"}
                    </button>
                    <button
                      className="btn btn-secondary border-success text-success text-xs py-1 px-2.5"
                      onClick={() => handleRestore(version, idx)}
                      disabled={restoringIdx !== null}
                    >
                      {restoringIdx === idx ? "Restoring..." : "Restore"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview Overlay */}
        {previewVersion && (
          <div className="version-preview-pane border-top p-3 glass-card bg-panel-bg-solid">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="text-xs font-semibold text-primary">Previewing State:</span>
              <button className="btn btn-secondary text-xxs py-0.5 px-2" onClick={() => setPreviewVersion(null)}>
                Hide
              </button>
            </div>
            <div className="preview-viewport text-xs text-muted overflow-y-auto max-h-200 p-2.5 glass-card bg-black-20">
              <pre className="m-0 font-mono whitespace-pre-wrap">{previewVersion.content || "Empty content in this log."}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
