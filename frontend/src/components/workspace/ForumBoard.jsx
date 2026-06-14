import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useToast } from "../../context/ToastContext";
import DOMPurify from "dompurify";

/**
 * ForumBoard - Doubt Clearance Forum Q&A Thread Board.
 * Allows workspace members to post threads, write comments/replies, and
 * mark answers as accepted (resolving the thread).
 */
const ForumBoard = ({ workspaceId, currentUser }) => {
  const { toast, confirm } = useToast();
  
  // Data loading states
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadDetails, setThreadDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Form states
  const [showAskForm, setShowAskForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Fetch all threads
  const loadThreads = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/forum/workspace/${workspaceId}`);
      if (res.data?.success) {
        setThreads(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load forum threads: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fetch single thread details
  const loadThreadDetails = async (id) => {
    try {
      setDetailsLoading(true);
      const res = await axiosInstance.get(`/forum/thread/${id}`);
      if (res.data?.success) {
        setThreadDetails(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load thread discussion: " + (err.response?.data?.message || err.message));
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadThreads();
      setSelectedThreadId(null);
      setThreadDetails(null);
      setShowAskForm(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (selectedThreadId) {
      loadThreadDetails(selectedThreadId);
    } else {
      setThreadDetails(null);
    }
  }, [selectedThreadId]);

  // Submit new thread
  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      setSubmittingQuestion(true);
      const res = await axiosInstance.post("/forum", {
        title: newTitle.trim(),
        content: newContent.trim(),
        workspaceId,
      });

      if (res.data?.success) {
        toast.success("Question posted successfully");
        setNewTitle("");
        setNewContent("");
        setShowAskForm(false);
        // Reload list and select new thread
        await loadThreads();
        setSelectedThreadId(res.data.data._id);
      }
    } catch (err) {
      toast.error("Failed to post question: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Submit reply
  const handlePostReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      setSubmittingReply(true);
      const res = await axiosInstance.post(`/forum/${selectedThreadId}/replies`, {
        content: replyContent.trim(),
      });

      if (res.data?.success) {
        setReplyContent("");
        setThreadDetails(res.data.data);
        // Refresh replies count in threads list
        setThreads((prev) =>
          prev.map((t) => (t._id === selectedThreadId ? { ...t, replies: res.data.data.replies } : t))
        );
        toast.success("Reply posted successfully");
      }
    } catch (err) {
      toast.error("Failed to post reply: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReply(false);
    }
  };

  // Accept reply as best answer
  const handleAcceptReply = async (replyId) => {
    if (!(await confirm("Mark this reply as the best answer? This will resolve the thread.", { title: "Accept Answer" }))) {
      return;
    }

    try {
      const res = await axiosInstance.put(`/forum/${selectedThreadId}/replies/${replyId}/accept`);
      if (res.data?.success) {
        setThreadDetails(res.data.data);
        // Sync resolution in list
        setThreads((prev) =>
          prev.map((t) => (t._id === selectedThreadId ? { ...t, isResolved: true } : t))
        );
        toast.success("Accepted answer selected");
      }
    } catch (err) {
      toast.error("Failed to accept answer: " + (err.response?.data?.message || err.message));
    }
  };

  // Delete thread
  const handleDeleteThread = async (threadId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this discussion thread permanently?", { title: "Delete Thread", confirmLabel: "Delete" }))) {
      return;
    }

    try {
      const res = await axiosInstance.delete(`/forum/${threadId}`);
      if (res.data?.success) {
        toast.success("Thread deleted successfully");
        if (selectedThreadId === threadId) {
          setSelectedThreadId(null);
        }
        loadThreads();
      }
    } catch (err) {
      toast.error("Failed to delete thread: " + (err.response?.data?.message || err.message));
    }
  };

  // Helper to format dates relatively
  const formatTimeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="forum-board h-100 d-flex overflow-hidden border rounded-12 bg-panel-bg-solid glass-card">
      
      {/* Left panel: Threads List */}
      <div className="forum-left-list d-flex flex-column border-right w-300 flex-shrink-0 p-3 overflow-y-auto">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="font-display uppercase tracking-wider text-xs text-muted m-0">Discussions</h4>
          <button
            type="button"
            className="btn btn-primary text-xxs py-1.5 px-3"
            onClick={() => {
              setShowAskForm(true);
              setSelectedThreadId(null);
            }}
          >
            + Ask Doubt
          </button>
        </div>

        <div className="d-flex flex-column gap-2 flex-grow-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center p-4"><div className="loader mini mx-auto"></div></div>
          ) : threads.length === 0 ? (
            <div className="text-center p-4 text-muted text-xs italic">No doubt threads posted yet.</div>
          ) : (
            threads.map((t) => {
              const isSelected = selectedThreadId === t._id;
              const hasAccepted = t.isResolved || t.replies?.some((r) => r.isAccepted);
              return (
                <div
                  key={t._id}
                  className={`forum-thread-card p-3 rounded-8 border cursor-pointer hover-bg-border transition-all ${
                    isSelected ? "bg-primary-glow border-primary-glow" : "border-transparent"
                  }`}
                  onClick={() => {
                    setSelectedThreadId(t._id);
                    setShowAskForm(false);
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                    <span className={`badge text-xxs py-0.5 px-2 rounded-pill font-bold uppercase tracking-wider ${
                      hasAccepted ? "bg-success-glow text-success" : "bg-warning-glow text-warning"
                    }`}>
                      {hasAccepted ? "Resolved 🟢" : "Open 🟡"}
                    </span>
                    {(currentUser._id === t.author?._id || currentUser.role === "admin") && (
                      <button
                        type="button"
                        className="btn-tree-icon text-danger hover-opacity"
                        title="Delete Thread"
                        onClick={(e) => handleDeleteThread(t._id, e)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <h5 className="text-sm font-medium text-white truncate mb-1">{t.title}</h5>
                  <div className="d-flex justify-content-between align-items-center text-xxs text-muted">
                    <span>by {t.author?.name || "Member"}</span>
                    <span>{t.replies?.length || 0} replies · {formatTimeAgo(t.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Detail / Forms */}
      <div className="forum-right-detail flex-grow-1 d-flex flex-column p-4 overflow-hidden position-relative">
        
        {showAskForm ? (
          /* Create thread form */
          <form onSubmit={handleAskQuestion} className="d-flex flex-column gap-3 h-100 overflow-y-auto">
            <h3 className="font-display text-base mb-1">Ask a New Doubt</h3>
            <div className="form-group">
              <label className="form-label text-xxs">Question Title</label>
              <input
                type="text"
                required
                className="input-field text-sm"
                placeholder="Be specific (e.g., How does backpropagation handle weight adjustments?)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="form-group flex-grow-1 d-flex flex-column">
              <label className="form-label text-xxs">Question Details (Markdown supported)</label>
              <textarea
                required
                className="input-field text-sm flex-grow-1 resize-none"
                placeholder="Describe your doubt in detail. Provide code snippets, equations, or logs if necessary..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
              />
            </div>
            <div className="d-flex gap-3 justify-content-end align-items-center mt-2">
              <button
                type="button"
                className="btn btn-secondary text-xs"
                onClick={() => setShowAskForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary text-xs"
                disabled={submittingQuestion}
              >
                {submittingQuestion ? "Posting..." : "Post Doubt"}
              </button>
            </div>
          </form>
        ) : selectedThreadId && threadDetails ? (
          /* Thread detail viewport */
          <div className="d-flex flex-column h-100 overflow-hidden">
            
            {/* Thread Header */}
            <div className="border-bottom pb-3 mb-3 flex-shrink-0">
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="text-base">{threadDetails.author?.avatar || "👤"}</span>
                <div>
                  <h4 className="text-white font-medium text-sm m-0">{threadDetails.author?.name}</h4>
                  <span className="text-xxs text-muted">Asked {formatTimeAgo(threadDetails.createdAt)}</span>
                </div>
                <span className={`badge text-xxs py-0.5 px-2 rounded-pill font-bold uppercase tracking-wider ms-auto ${
                  threadDetails.isResolved ? "bg-success-glow text-success" : "bg-warning-glow text-warning"
                }`}>
                  {threadDetails.isResolved ? "Resolved 🟢" : "Open 🟡"}
                </span>
              </div>
              <h2 className="text-lg font-display text-white mt-1 mb-2">{threadDetails.title}</h2>
              <div
                className="forum-thread-body text-sm text-muted whitespace-pre-wrap max-h-120 overflow-y-auto mt-2 bg-black-20 p-3 rounded-8 border"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(threadDetails.content) }}
              />
            </div>

            {/* Replies List */}
            <div className="forum-replies-feed flex-grow-1 overflow-y-auto mb-3 pr-1 d-flex flex-column gap-3">
              <h4 className="font-display uppercase tracking-wider text-xs text-muted mb-2">
                Replies ({threadDetails.replies?.length || 0})
              </h4>
              
              {threadDetails.replies?.length === 0 ? (
                <p className="text-xs text-muted italic my-4 text-center">No replies yet. Be the first to answer!</p>
              ) : (
                threadDetails.replies.map((reply) => {
                  const isThreadAuthor = currentUser._id === threadDetails.author?._id;
                  return (
                    <div
                      key={reply._id}
                      className={`forum-reply-card p-3 rounded-8 border transition-all ${
                        reply.isAccepted
                          ? "bg-success-glow border-success text-white"
                          : "bg-black-10 border-transparent text-muted"
                      }`}
                    >
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="text-sm">{reply.author?.avatar || "👤"}</span>
                        <div>
                          <span className="text-white font-medium text-xs d-block">{reply.author?.name}</span>
                          <span className="text-xxs text-muted">{formatTimeAgo(reply.createdAt)}</span>
                        </div>

                        {reply.isAccepted && (
                          <span className="badge bg-success text-white text-xxs font-bold py-0.5 px-2 rounded-pill ms-2 uppercase">
                            🏆 Best Answer
                          </span>
                        )}

                        {isThreadAuthor && !reply.isAccepted && (
                          <button
                            type="button"
                            className="btn btn-secondary text-xxs py-1 px-2.5 ms-auto border-success text-success hover-bg-success"
                            onClick={() => handleAcceptReply(reply._id)}
                          >
                            ✓ Accept
                          </button>
                        )}
                      </div>
                      <div
                        className="text-xs text-muted pl-1"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.content) }}
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Post Reply Form */}
            <form onSubmit={handlePostReply} className="forum-reply-form border-top pt-3 flex-shrink-0 d-flex gap-2">
              <input
                type="text"
                required
                className="input-field text-xs py-2 flex-grow-1"
                placeholder="Write a helpful reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary text-xs py-2 px-4"
                disabled={submittingReply}
              >
                {submittingReply ? "..." : "Reply"}
              </button>
            </form>

          </div>
        ) : (
          /* Forum landing overview */
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
            <div className="welcome-glow-badge animate-pulse" style={{ background: "rgba(16, 185, 129, 0.15)" }}>🙋‍♂️</div>
            <h2 className="mt-4 font-display">Doubt Clearance Forum</h2>
            <p className="text-muted text-sm max-w-450 my-3">
              Browse questions asked by your peers in this study room, answer doubts, or post a new question to resolve your concepts.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-3 text-xs"
              onClick={() => setShowAskForm(true)}
            >
              🙋‍♂️ Ask a Doubt
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default ForumBoard;
