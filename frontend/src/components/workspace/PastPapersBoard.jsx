import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useToast } from "../../context/ToastContext";

/**
 * PastPapersBoard - Shared past examinations PDF archive.
 * Groups uploads by subject and sorts by year.
 */
const PastPapersBoard = ({ workspaceId, currentUser, isAdminOrOwner }) => {
  const { toast, confirm } = useToast();
  
  // Data loading states
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Upload modal/form states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Load papers list
  const loadPapers = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/pastpapers/workspace/${workspaceId}`);
      if (res.data?.success) {
        setPapers(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load past papers: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      loadPapers();
      setShowUploadModal(false);
      setTitle("");
      setSubject("");
      setFile(null);
    }
  }, [workspaceId]);

  // Upload past paper
  const handleUploadPaper = async (e) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !year || !file) {
      toast.error("Please fill in all fields and select a PDF file");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("subject", subject.trim());
      formData.append("year", year);
      formData.append("workspaceId", workspaceId);
      formData.append("file", file);

      const res = await axiosInstance.post("/pastpapers", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data?.success) {
        toast.success("Past paper PDF uploaded successfully");
        setTitle("");
        setSubject("");
        setYear(new Date().getFullYear());
        setFile(null);
        setShowUploadModal(false);
        loadPapers(); // Reload
      }
    } catch (err) {
      toast.error("Failed to upload past paper: " + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  // Delete past paper
  const handleDeletePaper = async (paperId, e) => {
    e.stopPropagation();
    if (!(await confirm("Delete this past paper permanently?", { title: "Delete Past Paper", confirmLabel: "Delete" }))) {
      return;
    }

    try {
      const res = await axiosInstance.delete(`/pastpapers/${paperId}`);
      if (res.data?.success) {
        toast.success("Past paper deleted");
        setPapers((prev) => prev.filter((p) => p._id !== paperId));
      }
    } catch (err) {
      toast.error("Failed to delete past paper: " + (err.response?.data?.message || err.message));
    }
  };

  // Group papers by subject
  const getGroupedPapers = () => {
    const groups = {};
    papers.forEach((p) => {
      const subj = p.subject || "Uncategorized";
      if (!groups[subj]) {
        groups[subj] = [];
      }
      groups[subj].push(p);
    });
    return groups;
  };

  const groupedPapers = getGroupedPapers();
  const subjectsList = Object.keys(groupedPapers).sort();

  return (
    <div className="past-papers-board h-100 d-flex flex-column p-4 overflow-y-auto bg-panel-bg-solid glass-card rounded-12">
      
      {/* Header section */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="font-display text-base m-0">Past Examination Archive</h3>
          <p className="text-muted text-xxs m-0">Reference previous midterm and final exams uploaded by members</p>
        </div>
        {isAdminOrOwner && (
          <button
            type="button"
            className="btn btn-primary text-xs py-1.5 px-3"
            onClick={() => setShowUploadModal(true)}
          >
            ➕ Upload Exam PDF
          </button>
        )}
      </div>

      {/* Grid of subject folders */}
      <div className="flex-grow-1 overflow-y-auto">
        {loading ? (
          <div className="text-center p-5"><div className="loader mx-auto"></div></div>
        ) : papers.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
            <span className="welcome-glow-badge" style={{ background: "rgba(99, 102, 241, 0.15)" }}>📝</span>
            <h4 className="mt-4 font-display text-sm">Exam Repository is Empty</h4>
            <p className="text-muted text-xs max-w-360 my-2">No past papers have been uploaded to this study room yet.</p>
            {isAdminOrOwner && (
              <button
                type="button"
                className="btn btn-secondary text-xs mt-2"
                onClick={() => setShowUploadModal(true)}
              >
                Upload first paper
              </button>
            )}
          </div>
        ) : (
          <div className="d-flex flex-column gap-4">
            {subjectsList.map((subjectName) => (
              <div key={subjectName} className="subject-section glass-card p-4 rounded-8 border border-hover">
                <h4 className="font-display text-sm text-primary mb-3 d-flex align-items-center gap-2">
                  📁 {subjectName}
                  <span className="badge text-xxs bg-black-20 text-muted rounded-pill px-2 py-0.5">
                    {groupedPapers[subjectName].length} items
                  </span>
                </h4>
                
                <div className="d-grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {groupedPapers[subjectName].map((paper) => (
                    <div
                      key={paper._id}
                      className="past-paper-card p-3 rounded-6 bg-black-20 border d-flex justify-content-between align-items-center hover-bg-border cursor-pointer"
                      onClick={() => window.open(paper.url, "_blank")}
                      title="Click to view/download PDF"
                    >
                      <div className="d-flex align-items-center gap-2.5 overflow-hidden">
                        <span className="text-lg">📄</span>
                        <div className="overflow-hidden">
                          <h5 className="text-xs text-white font-medium truncate m-0">{paper.title}</h5>
                          <span className="text-xxs text-muted">Year: {paper.year} · by {paper.uploadedBy?.name || "Member"}</span>
                        </div>
                      </div>
                      
                      <div className="d-flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-tree-icon text-muted hover-text-white"
                          title="Open/Download"
                          onClick={() => window.open(paper.url, "_blank")}
                        >
                          📥
                        </button>
                        {(currentUser._id === paper.uploadedBy?._id || isAdminOrOwner) && (
                          <button
                            type="button"
                            className="btn-tree-icon text-danger hover-opacity"
                            title="Delete paper"
                            onClick={(e) => handleDeletePaper(paper._id, e)}
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Paper Modal (with blurred glass backdrop) */}
      {showUploadModal && (
        <div className="confirm-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="confirm-dialog glass-card p-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-display text-sm mb-3">Upload Past Paper PDF</h4>
            
            <form onSubmit={handleUploadPaper} className="d-flex flex-column gap-3">
              <div className="form-group">
                <label className="form-label text-xxs">Exam Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination"
                  className="input-field text-xs"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xxs">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operating Systems"
                  className="input-field text-xs"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xxs">Year</label>
                <input
                  type="number"
                  required
                  min="2000"
                  max="2035"
                  className="input-field text-xs"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xxs">PDF File</label>
                <input
                  type="file"
                  required
                  accept="application/pdf"
                  className="input-field text-xs"
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>

              <div className="d-flex gap-2 justify-content-end align-items-center mt-3">
                <button
                  type="button"
                  className="btn btn-secondary text-xxs"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xxs"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PastPapersBoard;
