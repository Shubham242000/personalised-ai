import type {
  ConversationDetailResponse,
  ConversationsResponse,
  RunDetailResponse,
  SkillsResponse,
  StreamHandlers,
} from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function getAuthToken() {
  return localStorage.getItem("token") || "";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  return (await response.json()) as T;
}

export function fetchSkills() {
  return apiFetch<SkillsResponse>("/skills");
}

export function fetchConversations(limit = 20) {
  return apiFetch<ConversationsResponse>(`/conversations?limit=${limit}`);
}

export function fetchConversationById(id: string) {
  return apiFetch<ConversationDetailResponse>(`/conversations/${id}`);
}

export function fetchRunById(id: string) {
  return apiFetch<RunDetailResponse>(`/runs/${id}`);
}

function parseSseChunk(
  rawEvent: string,
  handlers: StreamHandlers
) {
  const lines = rawEvent.split("\n");
  const eventLine = lines.find((line) => line.startsWith("event: "));
  const dataLine = lines.find((line) => line.startsWith("data: "));

  if (!eventLine || !dataLine) {
    return;
  }

  const event = eventLine.replace("event: ", "").trim();
  const dataRaw = dataLine.replace("data: ", "").trim();

  let data: unknown = dataRaw;

  try {
    data = JSON.parse(dataRaw);
  } catch {
    // ignore parse failure and use raw string
  }

  switch (event) {
    case "run_started":
      handlers.onRunStarted?.(data as { runId: string; conversationId: string });
      break;
    case "chunk":
      handlers.onChunk?.(data as { text: string });
      break;
    case "sources":
      handlers.onSources?.(data as { items: Array<Record<string, unknown>> });
      break;
    case "run_completed":
      handlers.onRunCompleted?.(data as { runId: string; messageId: string });
      break;
    case "error":
      handlers.onError?.(data as { message: string });
      break;
    default:
      break;
  }

  handlers.onEvent?.(event as any, data);
}

export async function streamAgentResearch(
  payload: { prompt: string; conversationId?: string },
  handlers: StreamHandlers
) {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/agent/research/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    const text = await response.text();
    throw new Error(text || `Streaming request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      if (buffer.trim()) {
        parseSseChunk(buffer, handlers);
      }
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      if (evt.trim()) {
        parseSseChunk(evt, handlers);
      }
    }
  }
}
