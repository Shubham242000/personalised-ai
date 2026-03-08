import { history, skills } from "../data/learning";
import type { SidebarTab } from "../types/learning";

type SidebarProps = {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
};

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div>
        <p className="logo-label">Personalised Agent</p>
        <h1 className="logo-name">LearnOS</h1>
      </div>

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
                <p className="profile-sub">SDE-2 - 3 years exp</p>
              </div>
            </div>
            <div className="level-row">
              <span className="level-label">Current level</span>
              <span className="level-badge">Intermediate</span>
            </div>
          </section>

          <section>
            <p className="section-label">Skill Profile</p>
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
                        background: skill.gap
                          ? "linear-gradient(90deg, #e8956d, #d4704a)"
                          : "#c4bdb3",
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
          <p className="section-label">Past Conversations</p>
          <div className="history-list">
            {history.map((item) => (
              <article key={item.topic} className="history-item">
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
                          background:
                            item.completion === 100 ? "#4a9e72" : "#d4704a",
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
