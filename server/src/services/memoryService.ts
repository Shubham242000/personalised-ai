import { prisma } from "../db/prisma";
import type { ListMemoryQuery, UpsertMemoryRequest } from "../schema/memorySchema";

export async function listMemory(userId: string, query: ListMemoryQuery) {
  const take = query.limit ?? 20;

  return prisma.memory.findMany({
    where: {
      userId,
      ...(query.topic ? { topic: { equals: query.topic, mode: "insensitive" } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
  });
}

export async function upsertMemory(userId: string, input: UpsertMemoryRequest) {
  return prisma.memory.upsert({
    where: {
      userId_topic: {
        userId,
        topic: input.topic,
      },
    },
    update: {
      summary: input.summary,
      confidence: input.confidence ?? undefined,
      coverage: input.coverage ?? undefined,
      lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : undefined,
    },
    create: {
      userId,
      topic: input.topic,
      summary: input.summary,
      confidence: input.confidence ?? 50,
      coverage: input.coverage ?? 0,
      lastReviewedAt: input.lastReviewedAt ? new Date(input.lastReviewedAt) : undefined,
    },
  });
}
