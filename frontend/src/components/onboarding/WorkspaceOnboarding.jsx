import React, { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const STEPS = [
  {
    title: "Open a study note",
    body: "Pick a note from the left library tree so the AI tutor has context.",
  },
  {
    title: "Try /ai in chat",
    body: 'Type /ai help for StudyVault tips, or /ai explain for your open note.',
  },
  {
    title: "Generate a quiz",
    body: "Open Recall Hub in the sidebar and create an active-recall quiz from your note.",
  },
];

const storageKey = (workspaceId) => `sv_onboarding_${workspaceId}`;

const WorkspaceOnboarding = ({ workspaceId, onDone }) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef(null);

  useFocusTrap(dialogRef, visible);

  useEffect(() => {
    if (!workspaceId) return;
    const done = localStorage.getItem(storageKey(workspaceId));
    if (!done) setVisible(true);
  }, [workspaceId]);

  const finish = () => {
    localStorage.setItem(storageKey(workspaceId), "1");
    setVisible(false);
    onDone?.();
  };

  const next = () => {
    if (step >= STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  };

  if (!visible) return null;

  const current = STEPS[step];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-labelledby="onboard-title">
      <div ref={dialogRef} className="onboarding-card glass-card">
        <p className="text-xxs text-primary uppercase tracking-wider m-0 mb-1">
          Quick tour · {step + 1}/{STEPS.length}
        </p>
        <h3 id="onboard-title" className="font-display text-base m-0 mb-2">
          {current.title}
        </h3>
        <p className="text-sm text-muted m-0 mb-4">{current.body}</p>
        <div className="d-flex gap-2 justify-content-between">
          <button type="button" className="btn btn-secondary text-xs" onClick={finish}>
            Skip
          </button>
          <button type="button" className="btn btn-primary text-xs" onClick={next}>
            {step < STEPS.length - 1 ? "Next" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceOnboarding;
