import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { AuthPage } from "./components/AuthPage";
import { ChatPanel } from "./components/ChatPanel";
import { MainPanel } from "./components/MainPanel";
import { Sidebar } from "./components/Sidebar";
import { history as fallbackHistory, skills as fallbackSkills } from "./data/learning";
import {
  fetchConversationById,
  fetchConversations,
  fetchRunById,
  fetchSkills,
  streamAgentResearch,
} from "./lib/api";
import { hasValidSession, persistSession } from "./lib/auth";
import type { ConversationListItem, ConversationMessage, RunSource } from "./types/api";
import type { HistoryItem, SidebarTab, Skill } from "./types/learning";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toRelativeTime(isoDate: string) {
  const now = Date.now();
  const ts = new Date(isoDate).getTime();
  const diffMinutes = Math.max(1, Math.floor((now - ts) / (1000 * 60)));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function mapSkillsFromApi(raw: Record<string, number>): Skill[] {
  const items = Object.entries(raw);

  if (items.length === 0) {
    return fallbackSkills;
  }

  return items.map(([name, rating]) => {
    const level = clamp(Math.ceil(rating / 2), 1, 5);

    return {
      name,
      level,
      gap: rating <= 5,
    };
  });
}

function mapConversationsToHistory(items: ConversationListItem[]): HistoryItem[] {
  return items.map((item) => ({
    id: item.id,
    topic: item.title,
    time: toRelativeTime(item.updatedAt),
    completion: clamp(item.completion, 0, 100),
    preview: item.archived ? "Archived conversation" : "Open to view messages and continue",
  }));
}

function deriveConversationTitle(prompt: string) {
  const clean = prompt.trim().replace(/\s+/g, " ");
  return clean.length <= 80 ? clean : `${clean.slice(0, 77)}...`;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(hasValidSession());

  const [view, setView] = useState<"workspace" | "chat">("workspace");
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<SidebarTab>("profile");

  const [skills, setSkills] = useState<Skill[]>(fallbackSkills);
  const [history, setHistory] = useState<HistoryItem[]>(fallbackHistory);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [conversationTitle, setConversationTitle] = useState("New Session");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const [isRunning, setIsRunning] = useState(false);
  const [streamingOutput, setStreamingOutput] = useState("");
  const [error, setError] = useState("");
  const [sourceCount, setSourceCount] = useState(0);
  const [sources, setSources] = useState<RunSource[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | undefined>();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token && !localStorage.getItem("userId")) {
      persistSession(token);
    }
  }, []);

  const continueConversation = useMemo(
    () => history.find((item) => item.completion < 100),
    [history]
  );

  const loadSkills = useCallback(async () => {
    try {
      const response = await fetchSkills();
      setSkills(mapSkillsFromApi(response.skills));
    } catch {
      setSkills(fallbackSkills);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const response = await fetchConversations(20);
      setHistory(mapConversationsToHistory(response.items));
    } catch {
      setHistory(fallbackHistory);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void Promise.all([loadSkills(), loadConversations()]);
  }, [isAuthenticated, loadConversations, loadSkills]);

  const loadConversationDetail = useCallback(async (conversationId: string) => {
    const response = await fetchConversationById(conversationId);
    const detail = response.conversation;

    setSelectedConversationId(conversationId);
    setConversationTitle(detail.title);
    setMessages(detail.messages);
    setStreamingOutput("");
    setError("");
    setView("chat");
    setActiveTab("history");
    setActiveRunId(undefined);

    const lastUserMessage = [...detail.messages].reverse().find((item) => item.role === "user");

    if (lastUserMessage?.content) {
      setInput(lastUserMessage.content);
    }
  }, []);

  const handleSelectHistory = useCallback(
    async (conversationId?: string) => {
      if (!conversationId) {
        return;
      }

      try {
        await loadConversationDetail(conversationId);
      } catch {
        setError("Failed to load conversation details.");
      }
    },
    [loadConversationDetail]
  );

  const handleStartNewSession = useCallback(() => {
    setView("workspace");
    setSelectedConversationId(undefined);
    setConversationTitle("New Session");
    setMessages([]);
    setStreamingOutput("");
    setError("");
    setSourceCount(0);
    setSources([]);
    setInput("");
    setActiveTab("profile");
    setActiveRunId(undefined);
  }, []);

  const handleRunAgent = useCallback(async () => {
    const prompt = input.trim();

    if (!prompt || isRunning) {
      return;
    }

    setIsRunning(true);
    setError("");
    setStreamingOutput("");
    setSourceCount(0);
    setSources([]);
    setView("chat");

    if (!selectedConversationId) {
      setConversationTitle(deriveConversationTitle(prompt));
    }

    const optimisticUserMessage: ConversationMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");

    try {
      let activeConversationId = selectedConversationId;
      let currentRunId = activeRunId;

      await streamAgentResearch(
        {
          prompt,
          conversationId: selectedConversationId,
        },
        {
          onRunStarted: ({ conversationId, runId }) => {
            currentRunId = runId;
            setActiveRunId(runId);
            activeConversationId = conversationId;
            setSelectedConversationId(conversationId);
            setView("chat");
          },
          onSources: ({ items }) => {
            setSourceCount(items.length);
          },
          onChunk: ({ text }) => {
            setStreamingOutput((prev) => prev + text);
          },
          onRunCompleted: async () => {
            if (currentRunId) {
              try {
                const runResponse = await fetchRunById(currentRunId);
                setSources(runResponse.run.sources);
                setSourceCount(runResponse.run.sources.length);
              } catch {
                setSources([]);
              }
            }

            if (activeConversationId) {
              try {
                await loadConversationDetail(activeConversationId);
              } catch {
                setError("Run finished but failed to reload conversation.");
              }
            }

            await loadConversations();
          },
          onError: ({ message }) => {
            setError(message || "Agent run failed.");
          },
        }
      );
    } catch (err: any) {
      setError(err?.message || "Unable to run agent.");
    } finally {
      setIsRunning(false);
    }
  }, [
    input,
    isRunning,
    loadConversationDetail,
    loadConversations,
    selectedConversationId,
  ]);

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="wrap">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewSession={handleStartNewSession}
        skills={skills}
        history={history}
        historyLoading={historyLoading}
        selectedHistoryId={selectedConversationId}
        onSelectHistory={handleSelectHistory}
      />

      {view === "workspace" ? (
        <MainPanel
          input={input}
          focused={focused}
          isRunning={isRunning}
          output={streamingOutput}
          error={error}
          sourceCount={sourceCount}
          onInputChange={setInput}
          onFocusChange={setFocused}
          onContinue={() => {
            if (continueConversation?.id) {
              void handleSelectHistory(continueConversation.id);
              return;
            }

            setInput("Continue from my most recent conversation");
          }}
          onQuickStart={setInput}
          onRunAgent={handleRunAgent}
        />
      ) : (
        <ChatPanel
          title={conversationTitle}
          messages={messages}
          streamingText={streamingOutput}
          sourceCount={sourceCount}
          sources={sources}
          input={input}
          focused={focused}
          isRunning={isRunning}
          error={error}
          onBackToWorkspace={() => setView("workspace")}
          onInputChange={setInput}
          onFocusChange={setFocused}
          onRunAgent={handleRunAgent}
        />
      )}
    </div>
  );
}

export default App;
