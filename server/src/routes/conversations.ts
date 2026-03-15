import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth";
import {
  ConversationParamsSchema,
  CreateConversationRequestSchema,
  ListConversationsQuerySchema,
  UpdateConversationRequestSchema,
} from "../schema/conversationSchema";
import {
  createConversation,
  getConversationById,
  listConversations,
  updateConversation,
} from "../services/conversationService";

export async function conversationsRoute(app: FastifyInstance) {
  app.post("/conversations", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = CreateConversationRequestSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    try {
      const userId = (request as any).user.userId as string;
      const conversation = await createConversation(userId, parsed.data.title);

      return reply.send({ conversation });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to create conversation" });
    }
  });

  app.get("/conversations", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = ListConversationsQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    try {
      const userId = (request as any).user.userId as string;
      const result = await listConversations(userId, parsed.data);

      return reply.send(result);
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch conversations" });
    }
  });

  app.get(
    "/conversations/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const paramsParsed = ConversationParamsSchema.safeParse(request.params);

      if (!paramsParsed.success) {
        return reply.status(400).send({ error: "Invalid conversation id" });
      }

      try {
        const userId = (request as any).user.userId as string;
        const conversation = await getConversationById(userId, paramsParsed.data.id);

        if (!conversation) {
          return reply.status(404).send({ error: "Conversation not found" });
        }

        return reply.send({ conversation });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: "Failed to fetch conversation" });
      }
    }
  );

  app.patch(
    "/conversations/:id",
    { preHandler: authMiddleware },
    async (request, reply) => {
      const paramsParsed = ConversationParamsSchema.safeParse(request.params);
      const bodyParsed = UpdateConversationRequestSchema.safeParse(request.body);

      if (!paramsParsed.success || !bodyParsed.success) {
        return reply.status(400).send({ error: "Invalid request" });
      }

      try {
        const userId = (request as any).user.userId as string;
        const updated = await updateConversation(
          userId,
          paramsParsed.data.id,
          bodyParsed.data
        );

        if (!updated) {
          return reply.status(404).send({ error: "Conversation not found" });
        }

        return reply.send({ conversation: updated });
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: "Failed to update conversation" });
      }
    }
  );
}
