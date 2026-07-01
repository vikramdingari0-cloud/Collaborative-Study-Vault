import React, { useState, useEffect } from "react";
import axiosInstance from "../../api/axiosInstance";
import { useToast } from "../../context/ToastContext";
import TextToSpeechButton from "../common/TextToSpeechButton";

/**
 * QuizModal - Beautiful Glassmorphic Active Recall Quiz Overlay
 * Displays questions, shuffles choices, grades selections, prints answers + AI explanations,
 * and saves attempt history scores directly to Mongoose storage.
 */
const QuizModal = ({ quizId, onClose, onAttemptSaved }) => {
  const { toast } = useToast();
  const [quiz, setQuiz] = React.useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quiz execution state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null); // null, 0, 1, 2, 3
  const [hasAnswered, setHasAnswered] = useState(false);
  const [numCorrect, setNumCorrect] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [attemptSavedSuccess, setAttemptSavedSuccess] = useState(false);

  // Load quiz on mount
  React.useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/quizzes/${quizId}`);
        if (res.data && res.data.success) {
          setQuiz(res.data.data);
        } else {
          setError("Failed to load quiz details.");
        }
      } catch (err) {
        setError(err.response?.data?.message || "Error fetching quiz.");
      } finally {
        setLoading(false);
      }
    };
    if (quizId) fetchQuiz();
  }, [quizId]);

  if (loading) {
    return (
      <div className="quiz-modal-backdrop">
        <div className="quiz-modal-container glass-card animate-fade-in text-center">
          <div className="loader mx-auto my-4"></div>
          <p>Analyzing note structure and generating questions...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="quiz-modal-backdrop">
        <div className="quiz-modal-container glass-card animate-fade-in text-center">
          <h3>Oops! Quiz Unavailable</h3>
          <p className="text-danger my-3">{error || "No questions found in this quiz."}</p>
          <button className="btn btn-secondary" onClick={onClose}>Close Quiz</button>
        </div>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIdx];
  const totalQuestions = quiz.questions.length;

  const handleSelectOption = (idx) => {
    if (hasAnswered) return; // Prevent double selecting
    setSelectedOption(idx);
    setHasAnswered(true);

    if (idx === currentQuestion.correctAnswer) {
      setNumCorrect((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setHasAnswered(false);

    if (currentIdx + 1 < totalQuestions) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setCompleted(true);
    }
  };

  const calculatePercentage = () => {
    return Math.round((numCorrect / totalQuestions) * 100);
  };

  const handleSaveAttempt = async () => {
    try {
      setSubmittingAttempt(true);
      const score = calculatePercentage();
      const res = await axiosInstance.post(`/quizzes/${quizId}/attempt`, {
        correctAnswers: numCorrect,
        score,
      });
      if (res.data && res.data.success) {
        setAttemptSavedSuccess(true);
        if (onAttemptSaved) onAttemptSaved();
      }
    } catch (err) {
      toast.error("Failed to save quiz attempt: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAttempt(false);
    }
  };

  // Render Completion Screen
  if (completed) {
    const pct = calculatePercentage();
    let scoreTier = "Keep Practicing! 📚";
    let tierColor = "#ef4444";
    if (pct >= 90) {
      scoreTier = "Brilliant Mastermind! 🏆🚀";
      tierColor = "#10b981";
    } else if (pct >= 70) {
      scoreTier = "Solid Understanding! 🧠💪";
      tierColor = "#6366f1";
    } else if (pct >= 50) {
      scoreTier = "Passing Grade! 📈👍";
      tierColor = "#f59e0b";
    }

    return (
      <div className="quiz-modal-backdrop">
        <div className="quiz-modal-container glass-card animate-fade-in score-screen">
          <div className="score-badge-halo animate-pulse" style={{ borderColor: tierColor }}>
            <span className="score-percentage" style={{ color: tierColor }}>{pct}%</span>
          </div>

          <h2 className="mt-4">{scoreTier}</h2>
          <p className="text-muted mb-4">
            You got <strong>{numCorrect}</strong> out of <strong>{totalQuestions}</strong> questions correct.
          </p>

          <div className="attempts-history-card glass-card p-3 mb-4">
            <h4 className="mb-2 text-start">Quiz Attempt Stats</h4>
            <div className="d-flex justify-content-between mb-1">
              <span>Note Reference:</span>
              <span className="text-white">{quiz.sourceNote?.title || "Note Content"}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
              <span>Difficulty:</span>
              <span className="text-warning text-capitalize">{quiz.difficulty || "Medium"}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>Correct Answers:</span>
              <span className="text-success">{numCorrect} / {totalQuestions}</span>
            </div>
          </div>

          {/* Past Attempts history */}
          {quiz.attempts && quiz.attempts.length > 0 && (
            <div className="past-attempts-log mb-4 text-start">
              <h4 className="mb-2">Your Past Performance</h4>
              <div className="attempts-list-scroll">
                {quiz.attempts.map((att, idx) => (
                  <div key={idx} className="attempt-row d-flex justify-content-between border-bottom py-1 text-sm text-muted">
                    <span>{new Date(att.completedAt).toLocaleDateString()} at {new Date(att.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className={att.score >= 70 ? "text-success font-semibold" : att.score >= 50 ? "text-warning" : "text-danger"}>
                      {att.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="d-flex gap-3 justify-content-center">
            {attemptSavedSuccess ? (
              <span className="btn btn-secondary cursor-default border-success text-success">
                ✅ Score Grade Recorded
              </span>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSaveAttempt}
                disabled={submittingAttempt}
              >
                {submittingAttempt ? "Recording Score..." : "Submit & Log Attempt"}
              </button>
            )}
            <button className="btn btn-secondary" onClick={onClose}>Close Quiz</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-modal-backdrop">
      <div className="quiz-modal-container glass-card animate-fade-in">
        {/* Header info */}
        <div className="quiz-header d-flex justify-content-between align-items-center mb-4">
          <div>
            <span className="difficulty-pill text-capitalize text-sm font-semibold mb-1 d-inline-block">
              {quiz.difficulty || "medium"} active recall
            </span>
            <h3>Workspace Practice Session</h3>
          </div>
          <div className="progress-counter">
            <span className="text-white">{currentIdx + 1}</span>
            <span className="text-muted"> / {totalQuestions}</span>
          </div>
        </div>

        {/* ProgressBar */}
        <div className="quiz-progress-bar-bg mb-4">
          <div 
            className="quiz-progress-bar-fill"
            style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
          ></div>
        </div>

        {/* Question bubble */}
        <div className="quiz-question-bubble mb-4">
          <p className="question-text">{currentQuestion.question}</p>
        </div>

        {/* Answer Options Grid */}
        <div className="options-grid mb-4">
          {currentQuestion.options.map((option, idx) => {
            let optionClass = "option-card glass-card";
            if (hasAnswered) {
              if (idx === currentQuestion.correctAnswer) {
                optionClass += " option-correct";
              } else if (idx === selectedOption) {
                optionClass += " option-incorrect";
              } else {
                optionClass += " option-disabled";
              }
            } else if (selectedOption === idx) {
              optionClass += " option-selected";
            }

            return (
              <button
                key={idx}
                className={optionClass}
                onClick={() => handleSelectOption(idx)}
                disabled={hasAnswered}
              >
                <span className="option-letter">{["A", "B", "C", "D"][idx]}.</span>
                <span className="option-body">{option}</span>
              </button>
            );
          })}
        </div>

        {/* Pedagogical Explanation Reveal */}
        {hasAnswered && (
          <div className="explanation-reveal-card glass-card p-3 mb-4 animate-fade-in">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge-bullet" style={{ background: selectedOption === currentQuestion.correctAnswer ? "var(--success)" : "var(--danger)" }}></span>
              <h4 style={{ color: selectedOption === currentQuestion.correctAnswer ? "var(--success)" : "var(--danger)" }}>
                {selectedOption === currentQuestion.correctAnswer ? "Correct! Well Done" : "Incorrect Answer"}
              </h4>
            </div>
            <p className="explanation-text text-sm text-muted mt-2">
              {currentQuestion.explanation || "No explanation provided."}
            </p>
            {currentQuestion.explanation && (
              <div className="mt-2 d-flex justify-content-end">
                <TextToSpeechButton text={currentQuestion.explanation} className="btn-secondary px-2 py-0.5 text-xs" />
              </div>
            )}
          </div>
        )}

        {/* Actions Footer */}
        <div className="quiz-actions-footer d-flex justify-content-between align-items-center">
          <button className="btn btn-secondary" onClick={onClose}>Abandon Quiz</button>
          
          {hasAnswered && (
            <button className="btn btn-primary" onClick={handleNext}>
              {currentIdx + 1 < totalQuestions ? "Next Question →" : "See Final Score 🚀"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizModal;
