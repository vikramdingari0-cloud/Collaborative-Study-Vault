import React, { useState, useEffect, useRef } from "react";
import { socket } from "../../sockets/socket";
import axiosInstance from "../../api/axiosInstance";

/** Strip markdown for plain chat display */
const toPlainChat = (text) => {
  if (!text) return "";
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
};

const ChatWindow = ({ workspaceId, currentUser, openNoteId = null }) => {
  const [messages, setMessages] = useState([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingIndicator, setTypingIndicator] = useState(null);
  const [chatError, setChatError] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/chats/workspace/${workspaceId}`);
        if (res.data?.success) {
          setMessages(res.data.data);
        }
      } catch (err) {
        setChatError("Could not load chat.");
      } finally {
        setLoading(false);
      }
    };

    if (!workspaceId) return undefined;

    fetchChatHistory();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join_workspace_chat", { workspaceId });

    const onMessage = (messagePacket) => {
      if (messagePacket.type === "system" && /thinking|drafting/i.test(messagePacket.message)) {
        setTypingIndicator(messagePacket);
        return;
      }

      setTypingIndicator(null);
      setMessages((prev) => {
        if (prev.some((m) => m._id === messagePacket._id)) return prev;
        return [...prev, messagePacket];
      });
    };

    const onError = (payload) => {
      setTypingIndicator(null);
      setChatError(payload?.message || "Chat error");
      setTimeout(() => setChatError(""), 4000);
    };

    socket.on("receive_message", onMessage);
    socket.on("error", onError);

    return () => {
      socket.emit("leave_workspace_chat", { workspaceId });
      socket.off("receive_message", onMessage);
      socket.off("error", onError);
    };
  }, [workspaceId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingIndicator]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    const cleanMsg = typedMessage.trim();
    if (!cleanMsg) return;

    setChatError("");
    setTypingIndicator(null);

    socket.emit("send_message", {
      workspaceId,
      message: cleanMsg,
      type: "text",
      noteId: openNoteId || undefined,
    });

    setTypedMessage("");
  };

  return (
    <div className="study-chat-window glass-card d-flex flex-column">
      <div className="chat-header p-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <span className="live-pill-indicator animate-pulse"></span>
          <h4 className="m-0 font-display text-sm">Study Chat</h4>
        </div>
        <span className="text-muted text-xxs">/ai help</span>
      </div>

      {chatError && (
        <div className="px-3 py-2 text-xxs text-warning border-bottom">{chatError}</div>
      )}

      <div className="chat-feed-scroll flex-grow-1 p-3" role="log" aria-live="polite" aria-relevant="additions">
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100">
            <div className="loader small-loader mb-2"></div>
            <span className="text-xxs text-muted">Loading...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center text-muted px-3">
            <span className="text-lg mb-2">💬</span>
            <p className="text-xxs m-0">
              StudyVault AI: <strong>/ai help</strong> · <strong>/ai explain</strong> · <strong>/ai key terms</strong>
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender?._id === currentUser._id;
            const isAI = msg.type === "ai";
            const isSystem = msg.type === "system";
            const senderName = isAI ? "AI" : msg.sender?.name || "Member";
            const senderAvatar = isAI ? "🤖" : msg.sender?.avatar || "👤";
            const body = toPlainChat(msg.message);

            if (isSystem) {
              return (
                <p key={msg._id} className="text-xxs text-center text-muted mb-1 m-0 px-2">
                  {body}
                </p>
              );
            }

            return (
              <div
                key={msg._id}
                className={`chat-bubble-container mb-2 d-flex ${isMe ? "justify-content-end" : "justify-content-start"}`}
              >
                <div className={`chat-bubble-wrapper d-flex gap-2 max-w-85 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                  {!isSystem && (
                    <div className="chat-bubble-avatar glass-card d-flex align-items-center justify-content-center text-sm">
                      {senderAvatar}
                    </div>
                  )}

                  <div className="chat-bubble-body d-flex flex-column">
                    {senderName && (
                      <span className="chat-sender-name text-xxs text-muted mb-0.5 px-1">
                        {senderName} {isMe && "(You)"}
                      </span>
                    )}
                    <div
                      className={`chat-message-bubble px-2 py-1.5 rounded-10 ${
                        isMe ? "bg-primary text-white" : isAI ? "bg-ai-tutor border-ai text-white" : "bg-member text-white"
                      } ${isAI || isSystem ? "text-xxs" : "text-xs"}`}
                    >
                      <p className="m-0" style={{ lineHeight: 1.4 }}>
                        {body}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {typingIndicator && (
          <div className="chat-bubble-container mb-2 d-flex justify-content-start">
            <div className="chat-bubble-wrapper d-flex gap-2 align-items-center">
              <div className="chat-bubble-avatar glass-card text-sm">🤖</div>
              <div className="chat-message-bubble bg-ai-tutor border-ai px-2 py-1 rounded-10 text-xxs text-muted italic">
                AI thinking...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-footer p-2 border-top d-flex gap-2" aria-label="Send chat message">
        <input
          type="text"
          className="input-field flex-grow-1 text-xs py-1.5"
          placeholder="/ai help — app & note only"
          value={typedMessage}
          onChange={(e) => setTypedMessage(e.target.value)}
          aria-label="Chat message"
        />
        <button type="submit" className="btn btn-primary px-2 py-1.5 text-xs" aria-label="Send message">
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
