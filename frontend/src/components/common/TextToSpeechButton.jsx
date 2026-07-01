import React, { useState } from "react";

const TextToSpeechButton = ({ text, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleToggle = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    if (!text) return;
    
    // Stop any existing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <button 
      type="button" 
      onClick={handleToggle}
      className={`btn-tts ${className}`}
      title={isPlaying ? "Stop listening" : "Listen to this text"}
    >
      {isPlaying ? "⏹️ Stop" : "🔊 Listen"}
    </button>
  );
};

export default TextToSpeechButton;
