import React, { useEffect, useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const SHORTCUTS = [
  { keys: "?", desc: "Show keyboard shortcuts" },
  { keys: "Ctrl + S", desc: "Save note (editor)" },
  { keys: "/ai help", desc: "StudyVault AI — app commands" },
  { keys: "/ai explain", desc: "Explain open note (chat)" },
  { keys: "/ai key terms", desc: "Key terms from open note" },
  { keys: "Esc", desc: "Close modals" },
];

const KeyboardShortcutsModal = ({ open, onClose }) => {
  const ref = useRef(null);
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      onClick={onClose}
    >
      <div
        ref={ref}
        className="confirm-dialog glass-card shortcuts-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="shortcuts-title" className="font-display text-base m-0 mb-3">
          Keyboard shortcuts
        </h3>
        <ul className="shortcuts-list m-0 p-0">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="d-flex justify-content-between gap-3 mb-2 text-sm">
              <kbd className="shortcut-kbd">{s.keys}</kbd>
              <span className="text-muted text-xs text-end">{s.desc}</span>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-primary text-xs w-100 mt-3" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
