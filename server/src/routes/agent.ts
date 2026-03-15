import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth";
import { AgentResearchRequestSchema } from "../schema/agentSchema";
import { runAgentResearch, runAgentResearchStream } from "../services/agentService";

function isAllowedDevOrigin(origin: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/.test(origin);
}

export async function agentRoute(app: FastifyInstance) {
  app.post("/agent/research", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = AgentResearchRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    try {
      const userId = (request as any).user.userId as string;
      const result = await runAgentResearch(userId, parsed.data);

      return reply.send({
        runId: result.runId,
        conversationId: result.conversationId,
        messageId: result.messageId,
        output: result.output,
        sources: result.sources,
      });
    } catch (err: any) {
      request.log.error(err);
      return reply.status(500).send({ error: err?.message || "Agent run failed" });
    }
  });

  app.post("/agent/research/stream", { preHandler: authMiddleware }, async (request, reply) => {
    const parsed = AgentResearchRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request" });
    }

    const userId = (request as any).user.userId as string;
    const origin = request.headers.origin;

    // For SSE responses, set CORS headers explicitly as well.
    if (typeof origin === "string" && isAllowedDevOrigin(origin)) {
      reply.raw.setHeader("Access-Control-Allow-Origin", origin);
      reply.raw.setHeader("Vary", "Origin");
    }

    reply.hijack();
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");

    const sendEvent = (event: string, data: Record<string, unknown>) => {
      reply.raw.write(`event: ${event}\n`);
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      await runAgentResearchStream(userId, parsed.data, {
        onRunStarted: (payload) => sendEvent("run_started", payload),
        onContextLoaded: (payload) => sendEvent("context_loaded", payload),
        onSources: (payload) => sendEvent("sources", payload),
        onChunk: (payload) => sendEvent("chunk", payload),
        onRunCompleted: (payload) => sendEvent("run_completed", payload),
      });

      reply.raw.end();
    } catch (err: any) {
      request.log.error(err);
      sendEvent("error", { message: err?.message || "Agent run failed" });
      reply.raw.end();
    }
  });
}
