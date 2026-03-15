import { prisma } from "../db/prisma";
import type { ListConversationsQuery, UpdateConversationRequest } from "../schema/conversationSchema";

export async function createConversation(userId: string, title?: string) {
  return prisma.conversation.create({
    data: {
      userId,
      title: title ?? "New Conversation",
    },
  });
}

export async function listConversations(userId: string, query: ListConversationsQuery) {
  const take = query.limit ?? 20;

  const items = await prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take,
    ...(query.cursor
      ? {
          cursor: { id: query.cursor },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      title: true,
      completion: true,
      archived: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const nextCursor = items.length === take ? items[items.length - 1]?.id : null;

  return { items, nextCursor };
}

export async function getConversationById(userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function updateConversation(
  userId: string,
  conversationId: string,
  data: UpdateConversationRequest
) {
  const existing = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  return prisma.conversation.update({
    where: { id: conversationId },
    data,
    select: {
      id: true,
      title: true,
      completion: true,
      archived: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
