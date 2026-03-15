# Personalised Agent - Backend Architecture

## 1. Purpose
This document defines the backend architecture for the **Personalised Agent** so product and engineering can align on one exact target.

This backend must support a personalized assistant experience across multiple domains (engineering, design, writing, strategy), not only “learning”.

---

## 2. Product Requirements (Backend View)
The backend must:
1. Understand the user context (profile, capabilities, past sessions).
2. Execute a research/synthesis workflow for each new request.
3. Personalize responses based on known strengths/gaps and recent history.
4. Stream results in real-time to the UI.
5. Persist conversations, messages, progress, and source references.
6. Support resumable sessions.

---

## 3. Current State (As of now)
Already present in server:
1. Auth routes (`/auth/google/*`).
2. Skills routes (`GET /skills`, `POST /skills`) with auth.
3. History route (`GET /history`) with auth.
4. Prisma + PostgreSQL integration.

Missing core capabilities:
1. Agent orchestration + streaming run endpoint.
2. Conversation/message persistence.
3. Session memory layer for topic coverage and confidence.
4. Source tracking for traceability.
5. Run-level observability (status, errors, timings, usage).

---

## 4. High-Level Architecture

## 4.1 Components
1. **API Layer (Fastify routes)**
- Auth middleware
- Input validation (Zod)
- SSE streaming responses

2. **Application Layer (Services)**
- `profileService` (skills/capabilities)
- `historyService` (recent sessions)
- `memoryService` (covered topics)
- `conversationService` (threads + messages)
- `agentService` (orchestration)
- `sourceService` (citations)
- `runService` (status + telemetry)

3. **LLM + Retrieval Layer**
- LLM client
- Web search provider adapter (Tavily/Perplexity/etc.)
- Optional reranker/summarizer

4. **Data Layer**
- PostgreSQL via Prisma
- Structured models for conversations, memory, runs, sources

## 4.2 Request Flow (Agent Run)
`POST /agent/research/stream`
1. Authenticate user.
2. Create `AgentRun` row (`status=running`).
3. Load user profile/capabilities.
4. Load relevant memory + recent conversation context.
5. Run web search for latest context.
6. Build personalization context (`known`, `gap`, `priority`).
7. Stream synthesized output tokens/chunks.
8. Persist assistant message, sources, memory updates.
9. Mark run `completed` (or `failed` with error metadata).

---

## 5. API Contract (Target)
All routes below are **auth-scoped** (user derived from JWT). No public `:userId` in URLs.

## 5.1 Existing/Keep
1. `GET /health`
2. `GET /skills`
3. `POST /skills`
4. `GET /history`
5. auth routes

## 5.2 New

### Agent
1. `POST /agent/research`
- Non-stream fallback.
- Request: `{ conversationId?: string, prompt: string }`
- Response: `{ runId, conversationId, output, sources[] }`

2. `POST /agent/research/stream`
- SSE endpoint.
- Request: `{ conversationId?: string, prompt: string }`
- SSE events:
  - `run_started` `{ runId, conversationId }`
  - `context_loaded` `{ profileLoaded: boolean, memoryLoaded: boolean }`
  - `sources` `{ items: Source[] }`
  - `chunk` `{ text: string }`
  - `run_completed` `{ runId, messageId }`
  - `error` `{ runId, message }`

### Conversations
1. `POST /conversations`
- Create thread.
- Request: `{ title?: string }`
- Response: `{ conversation }`

2. `GET /conversations`
- List current user’s threads.
- Query: `limit`, `cursor`

3. `GET /conversations/:id`
- Thread + messages.

4. `PATCH /conversations/:id`
- Update metadata (title/completion/archived).

### Memory
1. `GET /memory`
- Query: `topic?`, `limit?`
- Returns user memory entries.

2. `POST /memory`
- Upsert memory points from run outputs.
- Usually internal call from `agentService`, optionally exposed for admin/testing.

### Runs
1. `GET /runs/:id`
- Run status + diagnostics.

---

## 6. Data Model (Prisma Target)

```prisma
model Conversation {
  id            String       @id @default(cuid())
  userId        String
  title         String
  completion    Int          @default(0)
  archived      Boolean      @default(false)
  lastMessageAt DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  user          User         @relation(fields: [userId], references: [id])
  messages      Message[]
  runs          AgentRun[]

  @@index([userId, updatedAt(sort: Desc)])
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  role           String       // "user" | "assistant" | "system"
  content        String
  metadata       Json?
  createdAt      DateTime     @default(now())

  conversation   Conversation @relation(fields: [conversationId], references: [id])

  @@index([conversationId, createdAt])
}

model Memory {
  id            String   @id @default(cuid())
  userId        String
  topic         String
  summary       String
  confidence    Int      @default(50) // 0..100
  coverage      Int      @default(0)  // 0..100
  lastReviewedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id])

  @@index([userId, topic])
}

model AgentRun {
  id             String   @id @default(cuid())
  userId         String
  conversationId String
  prompt         String
  status         String   // "running" | "completed" | "failed"
  model          String?
  errorMessage   String?
  startedAt      DateTime @default(now())
  completedAt    DateTime?
  tokenUsage     Json?
  metrics        Json?

  user           User         @relation(fields: [userId], references: [id])
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  sources        Source[]

  @@index([userId, startedAt(sort: Desc)])
  @@index([conversationId, startedAt(sort: Desc)])
}

model Source {
  id          String   @id @default(cuid())
  runId       String
  url         String
  title       String?
  snippet     String?
  publishedAt DateTime?
  retrievedAt DateTime @default(now())

  run         AgentRun @relation(fields: [runId], references: [id])

  @@index([runId])
}
```

---

## 7. Personalization Logic
For each run:
1. Build a capability map from skills (`topic -> level`).
2. Collect memory coverage for relevant topics.
3. Identify:
- `known_topics`
- `partial_topics`
- `gap_topics`
4. Prompt the model to:
- skip known basics,
- focus on partial/gap areas,
- adapt output style to user profile.
5. Persist post-run memory deltas.

---

## 8. Reliability and Safety
1. **Idempotency key** on `POST /agent/research*` to avoid duplicate runs on retries.
2. **Run status persistence** (`running/completed/failed`) for resilient UI.
3. **Timeout and cancellation** handling for long searches or model calls.
4. **Provider fallback** if search provider fails.
5. **Input limits** (prompt size, max stream duration).
6. **Rate limits** per user.

---

## 9. Security Rules
1. Auth required for all data routes.
2. User can access only own rows.
3. Never accept `userId` from client payload for ownership logic.
4. Validate all payloads with Zod.
5. Redact secrets and provider errors from client responses.

---

## 10. UI Requirements Mapped to Backend (Based on Current UI)
The current UI has:
1. Sidebar tabs: `Profile`, `History`
2. Capability bars with `gap` tags
3. Main prompt composer (`Run Agent`)
4. Continue banner (`resume`) 
5. Quick actions grid

Backend needed for each:

### 10.1 Sidebar - Profile tab
Needs:
1. `GET /skills`
- return capability list normalized to 1..5 for bar rendering.
2. Optional `GET /profile`
- display name, persona metadata, domain tags.

### 10.2 Sidebar - History tab
Needs:
1. `GET /conversations?limit=...`
- topic/title, `updatedAt`, completion.
2. `GET /conversations/:id`
- preview text and messages.

### 10.3 Main Composer
Needs:
1. `POST /agent/research/stream`
- request includes `prompt`, optional `conversationId`.
2. SSE events for run lifecycle + chunks.

### 10.4 Continue Banner
Needs:
1. `GET /conversations?limit=1&incomplete=true`
- fetch most recent incomplete session.

### 10.5 Quick Actions
Needs:
1. `GET /recommendations/quick-actions` (optional) 
- dynamic based on gaps/history; fallback static client list if absent.

### 10.6 Gap Tags under Composer
Needs:
1. `GET /memory` + `GET /skills`
- derive top 2-3 active gaps for UI chips.

---

## 11. Implementation Phases

### Phase 1 (Must-have)
1. Conversations + Messages models and routes.
2. Agent run streaming endpoint.
3. AgentRun + Source persistence.
4. Wire frontend composer to stream endpoint.

### Phase 2
1. Memory model + memory update logic.
2. Gap computation service.
3. Continue banner from real incomplete session.

### Phase 3
1. Dynamic quick action recommendations.
2. Run diagnostics endpoint.
3. Enhanced observability and failure analytics.

---

## 12. Definition of Done (Backend)
1. User can submit prompt and receive streamed response.
2. Conversation and messages are persisted and reloadable.
3. History tab uses real backend data.
4. Profile tab uses real skills/capabilities.
5. Sources for each run are stored and retrievable.
6. Incomplete session can be resumed from banner.
7. All routes are auth-scoped and validated.

