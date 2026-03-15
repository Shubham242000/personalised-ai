export type SkillsResponse = {
  skills: Record<string, number>;
};

export type ConversationListItem = {
  id: string;
  title: string;
  completion: number;
  archived: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationsResponse = {
  items: ConversationListItem[];
  nextCursor: string | null;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type ConversationDetail = {
  id: string;
  title: string;
  completion: number;
  archived: boolean;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
};

export type ConversationDetailResponse = {
  conversation: ConversationDetail;
};

export type SseEventName =
  | "run_started"
  | "context_loaded"
  | "sources"
  | "chunk"
  | "run_completed"
  | "error";

export type RunSource = {
  id: string;
  url: string;
  title: string | null;
  snippet: string | null;
  publishedAt: string | null;
  retrievedAt: string;
};

export type AgentRun = {
  id: string;
  conversationId: string;
  prompt: string;
  status: string;
  model: string | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  sources: RunSource[];
};

export type RunDetailResponse = {
  run: AgentRun;
};

export type StreamHandlers = {
  onEvent?: (event: SseEventName, data: unknown) => void;
  onRunStarted?: (payload: { runId: string; conversationId: string }) => void;
  onChunk?: (payload: { text: string }) => void;
  onSources?: (payload: { items: Array<Record<string, unknown>> }) => void;
  onRunCompleted?: (payload: { runId: string; messageId: string }) => void;
  onError?: (payload: { message: string }) => void;
};
