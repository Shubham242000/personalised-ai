import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth";
import { ListMemoryQuerySchema, UpsertMemoryRequestSchema } from "../schema/memorySchema";
import { listMemory, upsertMemory } from "../services/memoryService";

export async function memoryRoute(app: FastifyInstance) {
  app.get("/memory", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = ListMemoryQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid query" });
    }

    try {
      const userId = (request as any).user.userId as string;
      const items = await listMemory(userId, parsed.data);
      return reply.send({ items });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch memory" });
    }
  });

  app.post("/memory", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = UpsertMemoryRequestSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    try {
      const userId = (request as any).user.userId as string;
      const memory = await upsertMemory(userId, parsed.data);
      return reply.send({ memory });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to upsert memory" });
    }
  });
}
