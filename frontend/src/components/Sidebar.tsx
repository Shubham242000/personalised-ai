import type { HistoryItem, Skill, SidebarTab } from "../types/learning";

type SidebarProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onNewSession: () => void;
  skills: Skill[];
  history: HistoryItem[];
  onSelectHistory: (id?: string) => void;
  selectedHistoryId?: string;
  historyLoading?: boolean;
};

export function Sidebar({
  activeTab,
  onTabChange,
  onNewSession,
  skills,
  history,
  onSelectHistory,
  selectedHistoryId,
  historyLoading,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div>
        <p className="logo-label">Personalised Agent</p>
        <h1 className="logo-name">Personal Assistant</h1>
      </div>

      <button className="new-session-btn" type="button" onClick={onNewSession}>
        + New Session
      </button>

      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === "profile" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange("profile")}
        >
          Profile
        </button>
        <button
          className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange("history")}
        >
          History
        </button>
      </div>

      {activeTab === "profile" ? (
        <>
          <section className="profile-card">
            <div className="profile-row">
              <div className="avatar">S</div>
              <div>
                <p className="profile-name">Shubham</p>
                <p className="profile-sub">Product · Design · Writing</p>
              </div>
            </div>
            <div className="level-row">
              <span className="level-label">Current profile</span>
              <span className="level-badge">Intermediate</span>
            </div>
          </section>

          <section>
            <p className="section-label">Capability Profile</p>
            <div className="skill-row">
              {skills.map((skill) => (
                <article key={skill.name} className="skill-item">
                  <div className="skill-meta">
                    <span className="skill-name">{skill.name}</span>
                    {skill.gap ? <span className="skill-gap">gap</span> : null}
                  </div>
                  <div className="skill-bar-bg">
                    <div
                      className="skill-bar-fill"
                      style={{
                        width: `${(skill.level / 5) * 100}%`,
                        background: skill.gap ? "#ff5c00" : "#9ca3af",
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section>
          <p className="section-label">Recent Sessions</p>
          <div className="history-list">
            {historyLoading ? <p className="history-empty">Loading...</p> : null}
            {!historyLoading && history.length === 0 ? (
              <p className="history-empty">No conversations yet.</p>
            ) : null}
            {history.map((item) => (
              <article
                key={item.id ?? item.topic}
                className={`history-item ${selectedHistoryId === item.id ? "history-item-active" : ""}`}
                onClick={() => onSelectHistory(item.id)}
              >
                <p className="history-topic">{item.topic}</p>
                <p className="history-preview">{item.preview}</p>
                <div className="history-footer">
                  <span className="history-time">{item.time}</span>
                  <div className="progress-row">
                    <div className="progress-mini">
                      <div
                        style={{
                          width: `${item.completion}%`,
                          height: "100%",
                          background: "#388bfd",
                          borderRadius: "1px",
                        }}
                      />
                    </div>
                    <span className="progress-pct">{item.completion}%</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}
