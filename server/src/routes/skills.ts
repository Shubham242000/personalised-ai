import { FastifyInstance } from "fastify";
import { SkillRequestSchema } from "../schema/skillSchema";
import { getUserSkills, upsertSkill } from "../services/skillService";
import { authMiddleware } from "../middleware/auth";

export async function skillsRoute(app: FastifyInstance) {
  app.post("/skills", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = SkillRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    try {
      const userId = (request as any).user.userId;

      const { skillName, rating } = parsed.data;

      await upsertSkill(userId, skillName, rating);

      return reply.send({ ok: true });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Skill save failed" });
    }
  });


  app.get("/skills", { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const userId = (request as any).user.userId;

      const skills = await getUserSkills(userId);

      return reply.send({ skills });
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch skills" });
    }
  });
}
