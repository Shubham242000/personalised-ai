import { useState } from "react";
import "./App.css";
import { MainPanel } from "./components/MainPanel";
import { Sidebar } from "./components/Sidebar";
import type { SidebarTab } from "./types/learning";

function App() {
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("profile");

  return (
    <div className="wrap">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <MainPanel
        input={input}
        focused={focused}
        onInputChange={setInput}
        onFocusChange={setFocused}
        onContinue={() =>
          setInput("Continue TypeScript utility types from where I left off")
        }
        onQuickStart={setInput}
      />
    </div>
  );
}

export default App;
