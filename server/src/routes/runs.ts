import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth";
import { RunParamsSchema } from "../schema/runSchema";
import { getRunById } from "../services/runService";

export async function runsRoute(app: FastifyInstance) {
  app.get("/runs/:id", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = RunParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid run id" });
    }

    try {
      const userId = (request as any).user.userId as string;
      const run = await getRunById(userId, parsed.data.id);

      if (!run) {
        return reply.status(404).send({ error: "Run not found" });
      }

      return reply.send({ run });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch run" });
    }
  });
}
