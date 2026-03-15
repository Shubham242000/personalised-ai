import { quickStarts } from "../data/learning";

type MainPanelProps = {
  input: string;
  focused: boolean;
  isRunning: boolean;
  output: string;
  error: string;
  sourceCount: number;
  onInputChange: (value: string) => void;
  onFocusChange: (isFocused: boolean) => void;
  onContinue: () => void;
  onQuickStart: (value: string) => void;
  onRunAgent: () => void;
};

export function MainPanel({
  input,
  focused,
  isRunning,
  output,
  error,
  sourceCount,
  onInputChange,
  onFocusChange,
  onContinue,
  onQuickStart,
  onRunAgent,
}: MainPanelProps) {
  return (
    <main className="main">
      <p className="greeting">Good evening, Shubham</p>

      <h2 className="headline">
        What do you want
        <br />
        to <em>work on</em> today?
      </h2>

      <p className="subline">
        I use your profile and past sessions to give focused, context-aware
        output.
      </p>

      <section className={`input-card ${focused ? "focused" : ""}`}>
        <textarea
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          placeholder="e.g. Create a landing page content brief with tone options and CTA ideas..."
        />
        <div className="input-footer">
          <div className="gap-tags">
            <span className="gap-tag">⚡ Research</span>
            <span className="gap-tag">⚡ Strategy</span>
          </div>
          <button
            className={`send-btn ${!input.trim() || isRunning ? "inactive" : ""}`}
            type="button"
            disabled={!input.trim() || isRunning}
            onClick={onRunAgent}
          >
            {isRunning ? "Running..." : "Run Agent →"}
          </button>
        </div>
      </section>

      <button className="continue-banner" type="button" onClick={onContinue}>
        <span>
          ↩ Continue: <strong>"Homepage messaging brief"</strong> - 60%
          complete
        </span>
      </button>

      {error ? <p className="stream-error">{error}</p> : null}

      {output ? (
        <section className="output-card">
          <div className="output-head">
            <span>Agent Output</span>
            <span>{sourceCount} sources</span>
          </div>
          <pre>{output}</pre>
        </section>
      ) : null}

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
