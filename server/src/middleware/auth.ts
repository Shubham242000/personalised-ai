import jwt from "jsonwebtoken";
import { FastifyRequest, FastifyReply } from "fastify";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const auth = request.headers.authorization;

  if (!auth) {
    return reply.status(401).send({ error: "Missing auth header" });
  }

  const token = auth.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);

    (request as any).user = payload;

  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}