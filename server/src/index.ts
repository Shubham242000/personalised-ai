import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { skillsRoute } from "./routes/skills";
import { authRoutes } from "./routes/auth";
import { historyRoute } from "./routes/history";
import { conversationsRoute } from "./routes/conversations";
import { agentRoute } from "./routes/agent";
import { memoryRoute } from "./routes/memory";
import { runsRoute } from "./routes/runs";

const app = Fastify({ logger: true });

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  await app.register(cors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowedDevOrigin =
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/.test(origin);

      if (isAllowedDevOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"), false);
    },
    methods: ["GET", "POST", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  app.get("/health", async () => ({ ok: true }));

  await app.register(skillsRoute);
  await app.register(historyRoute);
  await app.register(conversationsRoute);
  await app.register(agentRoute);
  await app.register(memoryRoute);
  await app.register(runsRoute);
  await app.register(authRoutes);

  await app.listen({ port, host });
}

bootstrap();
