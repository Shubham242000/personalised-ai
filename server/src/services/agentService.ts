import { prisma } from "../db/prisma";
import { searchWeb, type WebSource } from "./webSearchService";

type StreamHandlers = {
  onRunStarted?: (payload: { runId: string; conversationId: string }) => void;
  onContextLoaded?: (payload: {
    profileLoaded: boolean;
    memoryLoaded: boolean;
  }) => void;
  onSources?: (payload: { items: Array<Record<string, unknown>> }) => void;
  onChunk?: (payload: { text: string }) => void;
  onRunCompleted?: (payload: { runId: string; messageId: string }) => void;
};

type OpenAIResponsesApiResult = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export type AgentResearchResult = {
  runId: string;
  conversationId: string;
  messageId: string;
  output: string;
  sources: Array<{
    url: string;
    title?: string;
    snippet?: string;
    publishedAt?: Date;
  }>;
  model: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveConversationTitle(prompt: string) {
  const clean = prompt.trim().replace(/\s+/g, " ");
  return clean.length <= 80 ? clean : `${clean.slice(0, 77)}...`;
}

function extractPromptTopics(prompt: string) {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4);

  return Array.from(new Set(words)).slice(0, 5);
}

function buildPrompt(params: {
  userPrompt: string;
  skillMap: Record<string, number>;
  recentTopics: string[];
  memoryItems: Array<{ topic: string; summary: string; coverage: number; confidence: number }>;
  webResults: Array<{ title?: string; url: string; snippet?: string }>;
}) {
  const { userPrompt, skillMap, recentTopics, memoryItems, webResults } = params;

  const profile = Object.entries(skillMap)
    .map(([name, rating]) => `${name}: ${rating}/10`)
    .join("\n");

  const historyContext = recentTopics.length ? recentTopics.join(", ") : "none";

  const memoryContext = memoryItems.length
    ? memoryItems
        .map(
          (item, index) =>
            `${index + 1}. ${item.topic} (coverage ${item.coverage}%, confidence ${item.confidence}%) - ${item.summary}`
        )
        .join("\n")
    : "none";

  const sources = webResults.length
    ? webResults
        .map((item, index) => {
          const title = item.title ?? "Untitled";
          const snippet = item.snippet ?? "";
          return `${index + 1}. ${title}\nURL: ${item.url}\nSnippet: ${snippet}`;
        })
        .join("\n\n")
    : "No external sources available.";

  return [
    "You are a personalized assistant.",
    "Respond with clear, actionable output adapted to the user's profile and prior context.",
    "Keep it concise, structured, and practical.",
    "If web sources are available, ground key points in them.",
    "",
    `User request: ${userPrompt}`,
    "",
    "User capability profile:",
    profile || "none",
    "",
    `Recent conversation topics: ${historyContext}`,
    "",
    "Persisted memory:",
    memoryContext,
    "",
    "Web sources:",
    sources,
  ].join("\n");
}

async function generateWithOpenAI(input: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.AGENT_MODEL || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input,
    }),
  });

  if (!response.ok) {
    const raw = await response.text();
    throw new Error(`OpenAI response failed (${response.status}): ${raw}`);
  }

  const payload = (await response.json()) as OpenAIResponsesApiResult;
  const fallbackText = (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("")
    .trim();
  const text = payload.output_text?.trim() || fallbackText;

  if (!text) {
    throw new Error("Empty output from OpenAI");
  }

  return { text, model };
}

async function resolveConversation(userId: string, conversationId: string | undefined, prompt: string) {
  if (!conversationId) {
    return prisma.conversation.create({
      data: {
        userId,
        title: deriveConversationTitle(prompt),
      },
      select: { id: true },
    });
  }

  const existing = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.conversation.create({
    data: {
      userId,
      title: deriveConversationTitle(prompt),
    },
    select: { id: true },
  });
}

async function loadContext(userId: string, prompt: string) {
  const [skills, recentHistory, memoryItems] = await Promise.all([
    prisma.userSkill.findMany({ where: { userId } }),
    prisma.summaryHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { topics: true },
    }),
    prisma.memory.findMany({
      where: {
        userId,
        OR: [
          { topic: { contains: prompt, mode: "insensitive" } },
          { summary: { contains: prompt, mode: "insensitive" } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { topic: true, summary: true, coverage: true, confidence: true },
    }),
  ]);

  const skillMap = skills.reduce<Record<string, number>>((acc, item) => {
    acc[item.skillName] = item.rating;
    return acc;
  }, {});

  const recentTopics = recentHistory
    .flatMap((item) => {
      const topics = item.topics;
      return Array.isArray(topics)
        ? topics.filter((value): value is string => typeof value === "string")
        : [];
    })
    .slice(0, 5);

  return { skillMap, recentTopics, memoryItems };
}

async function safeSearchWeb(query: string) {
  try {
    const results = await searchWeb(query);
    return { results, failed: false };
  } catch {
    return { results: [] as WebSource[], failed: true };
  }
}

async function persistMemoryFromRun(params: {
  userId: string;
  prompt: string;
  output: string;
  skillMap: Record<string, number>;
  recentTopics: string[];
  sourceCount: number;
}) {
  const { userId, prompt, output, skillMap, recentTopics, sourceCount } = params;
  const loweredPrompt = prompt.toLowerCase();
  const matchedSkills = Object.keys(skillMap).filter((topic) =>
    loweredPrompt.includes(topic.toLowerCase())
  );
  const extractedTopics = extractPromptTopics(prompt);
  const topics = Array.from(new Set([...matchedSkills, ...extractedTopics, ...recentTopics])).slice(
    0,
    5
  );

  const summary = output.slice(0, 500);
  const coverage = clamp(Math.floor(output.length / 40), 20, 100);
  const confidence = clamp(40 + sourceCount * 10 + topics.length * 5, 35, 95);

  if (topics.length === 0) {
    return;
  }

  await Promise.all(
    topics.map((topic) =>
      prisma.memory.upsert({
        where: {
          userId_topic: {
            userId,
            topic,
          },
        },
        update: {
          summary,
          coverage,
          confidence,
          lastReviewedAt: new Date(),
        },
        create: {
          userId,
          topic,
          summary,
          coverage,
          confidence,
          lastReviewedAt: new Date(),
        },
      })
    )
  );

  await prisma.summaryHistory.create({
    data: {
      userId,
      topics,
      result: {
        prompt,
        summary,
        sourceCount,
      },
    },
  });
}

function serializeSources(items: WebSource[]) {
  return items.map((item) => ({
    url: item.url,
    title: item.title,
    snippet: item.snippet,
    publishedAt: item.publishedAt,
  }));
}

export async function runAgentResearch(
  userId: string,
  input: { prompt: string; conversationId?: string },
  handlers?: StreamHandlers
): Promise<AgentResearchResult> {
  const conversation = await resolveConversation(userId, input.conversationId, input.prompt);

  const run = await prisma.agentRun.create({
    data: {
      userId,
      conversationId: conversation.id,
      prompt: input.prompt,
      status: "running",
      model: process.env.AGENT_MODEL || "gpt-4.1-mini",
    },
    select: { id: true, conversationId: true },
  });

  handlers?.onRunStarted?.({ runId: run.id, conversationId: run.conversationId });

  try {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: input.prompt,
      },
    });

    const [{ skillMap, recentTopics, memoryItems }, searched] = await Promise.all([
      loadContext(userId, input.prompt),
      safeSearchWeb(input.prompt),
    ]);
    const webResults = searched.results;

    handlers?.onContextLoaded?.({
      profileLoaded: true,
      memoryLoaded: recentTopics.length > 0 || memoryItems.length > 0,
    });
    handlers?.onSources?.({ items: serializeSources(webResults) as Array<Record<string, unknown>> });

    if (webResults.length > 0) {
      await prisma.source.createMany({
        data: webResults.map((item) => ({
          runId: run.id,
          url: item.url,
          title: item.title,
          snippet: item.snippet,
          publishedAt: item.publishedAt,
        })),
      });
    }

    const prompt = buildPrompt({
      userPrompt: input.prompt,
      skillMap,
      recentTopics,
      memoryItems,
      webResults,
    });

    const generated = await generateWithOpenAI(prompt);

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        model: generated.model,
        metrics: searched.failed ? { webSearchFailed: true } : undefined,
      },
    });

    let fullOutput = "";
    if (handlers?.onChunk) {
      const chunks = generated.text
        .split(/\n/)
        .map((line, index) => (index === 0 ? line : `\n${line}`));

      for (const piece of chunks) {
        fullOutput += piece;
        handlers.onChunk({ text: piece });
        await delay(20);
      }
    } else {
      fullOutput = generated.text;
    }

    const assistantMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: fullOutput,
      },
      select: { id: true },
    });

    await Promise.all([
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      }),
      prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      }),
      persistMemoryFromRun({
        userId,
        prompt: input.prompt,
        output: fullOutput,
        skillMap,
        recentTopics,
        sourceCount: webResults.length,
      }),
    ]);

    handlers?.onRunCompleted?.({ runId: run.id, messageId: assistantMessage.id });

    return {
      runId: run.id,
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      output: fullOutput,
      sources: serializeSources(webResults),
      model: generated.model,
    };
  } catch (error: any) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: error?.message || "Agent run failed",
        completedAt: new Date(),
      },
    });

    throw error;
  }
}

export async function runAgentResearchStream(
  userId: string,
  input: { prompt: string; conversationId?: string },
  handlers: StreamHandlers
) {
  return runAgentResearch(userId, input, handlers);
}
