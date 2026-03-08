import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { skillsRoute } from "./routes/skills";
import { authRoutes } from "./routes/auth";
import { historyRoute } from "./routes/history";

const app = Fastify({ logger: true });

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const host = process.env.HOST || "0.0.0.0";

async function bootstrap() {
  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true }));

  await app.register(skillsRoute);
  await app.register(historyRoute);
  await app.register(authRoutes);

  await app.listen({ port, host });
}

bootstrap();
