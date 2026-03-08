import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth";
import { getHistory } from "../services/historyService";

export async function historyRoute(app: FastifyInstance) {
  app.get("/history", { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const userId = (request as any).user.userId as string;
      const limitRaw = (request.query as { limit?: string }).limit;
      const limit = limitRaw ? Number(limitRaw) : 20;

      const items = await getHistory(userId, Number.isNaN(limit) ? 20 : limit);

      return reply.send({ items });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch history" });
    }
  });
}
