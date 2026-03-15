import { useEffect, useRef } from "react";
import type { ConversationMessage, RunSource } from "../types/api";

type ChatPanelProps = {
  title: string;
  messages: ConversationMessage[];
  streamingText: string;
  sourceCount: number;
  sources: RunSource[];
  input: string;
  focused: boolean;
  isRunning: boolean;
  error: string;
  onBackToWorkspace: () => void;
  onInputChange: (value: string) => void;
  onFocusChange: (isFocused: boolean) => void;
  onRunAgent: () => void;
};

function formatTime(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel({
  title,
  messages,
  streamingText,
  sourceCount,
  sources,
  input,
  focused,
  isRunning,
  error,
  onBackToWorkspace,
  onInputChange,
  onFocusChange,
  onRunAgent,
}: ChatPanelProps) {
  const threadRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!threadRef.current) {
      return;
    }

    threadRef.current.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streamingText]);

  return (
    <main className="chat-main">
      <header className="chat-head">
        <button className="chat-back-btn" type="button" onClick={onBackToWorkspace}>
          ← Workspace
        </button>
        <div className="chat-title-wrap">
          <p className="chat-title-label">Conversation</p>
          <h2 className="chat-title">{title || "New Session"}</h2>
        </div>
        <p className="chat-meta">{sourceCount > 0 ? `${sourceCount} sources` : "No sources"}</p>
      </header>

      <section ref={threadRef} className="chat-thread">
        {messages.length === 0 && !streamingText ? (
          <p className="chat-empty">Start by asking for help with your current task.</p>
        ) : null}

        {messages.map((message) => {
          const isUser = message.role === "user";

          return (
            <article
              key={message.id}
              className={`chat-message ${isUser ? "chat-message-user" : "chat-message-assistant"}`}
            >
              <p className="chat-message-role">{isUser ? "You" : "Assistant"}</p>
              <pre className="chat-message-content">{message.content}</pre>
              <p className="chat-message-time">{formatTime(message.createdAt)}</p>
            </article>
          );
        })}

        {streamingText ? (
          <article className="chat-message chat-message-assistant chat-message-streaming">
            <p className="chat-message-role">Assistant</p>
            <pre className="chat-message-content">{streamingText}</pre>
            <p className="chat-message-time">Streaming...</p>
          </article>
        ) : null}
      </section>

      {sources.length > 0 ? (
        <section className="chat-sources-card">
          <p className="chat-sources-title">Sources ({sourceCount})</p>
          <div className="chat-sources-list">
            {sources.map((source) => (
              <a
                key={source.id}
                className="chat-source-item"
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                <p className="chat-source-name">{source.title || source.url}</p>
                {source.snippet ? <p className="chat-source-snippet">{source.snippet}</p> : null}
                <p className="chat-source-url">{source.url}</p>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {error ? <p className="stream-error chat-stream-error">{error}</p> : null}

      <section className={`input-card chat-input-card ${focused ? "focused" : ""}`}>
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder="Type your follow-up..."
        />
        <div className="input-footer">
          <div className="gap-tags">
            <span className="gap-tag">⚡ Context-aware</span>
            <span className="gap-tag">⚡ Personalized</span>
          </div>
          <button
            className={`send-btn ${!input.trim() || isRunning ? "inactive" : ""}`}
            type="button"
            disabled={!input.trim() || isRunning}
            onClick={onRunAgent}
          >
            {isRunning ? "Running..." : "Send →"}
          </button>
        </div>
      </section>
    </main>
  );
}
