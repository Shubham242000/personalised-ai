import { quickStarts } from "../data/learning";

type MainPanelProps = {
  input: string;
  focused: boolean;
  onInputChange: (value: string) => void;
  onFocusChange: (isFocused: boolean) => void;
  onContinue: () => void;
  onQuickStart: (value: string) => void;
};

export function MainPanel({
  input,
  focused,
  onInputChange,
  onFocusChange,
  onContinue,
  onQuickStart,
}: MainPanelProps) {
  return (
    <main className="main">
      <p className="greeting">Good evening, Shubham</p>

      <h2 className="headline">
        What do you want
        <br />
        to <em>learn</em> today?
      </h2>

      <p className="subline">
        I know your gaps - I remember where you left off - I adapt to your
        level
      </p>

      <section className={`input-card ${focused ? "focused" : ""}`}>
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder="e.g. Research TypeScript generics, focus on what I'm missing..."
        />
        <div className="input-footer">
          <div className="gap-tags">
            <span className="gap-tag">⚡ TypeScript gap</span>
            <span className="gap-tag">⚡ System Design gap</span>
          </div>
          <button className={`send-btn ${!input.trim() ? "inactive" : ""}`} type="button">
            Start Learning →
          </button>
        </div>
      </section>

      <button className="continue-banner" type="button" onClick={onContinue}>
        <span>
          ↩ Continue: <strong>"TypeScript utility types"</strong> - 60%
          complete
        </span>
      </button>

      <section className="quick-section">
        <p className="section-label section-label-main">Suggested for you</p>
        <div className="quick-grid">
          {quickStarts.map((item) => (
            <button
              key={item.label}
              className="quick-btn"
              type="button"
              onClick={() => onQuickStart(item.label)}
            >
              <span className="quick-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
