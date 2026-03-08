import { FastifyInstance } from "fastify";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma";

const backendRedirectUri =
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  backendRedirectUri
);

function isExtensionRedirectUri(value: string) {
  return value.startsWith("https://") && value.includes(".chromiumapp.org/");
}

function encodeState(data: Record<string, string>) {
  return Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
}

function decodeState(state: string) {
  try {
    return JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      redirectUri?: string;
    };
  } catch {
    return {};
  }
}

async function issueJwtFromGoogleIdToken(idToken: string) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload?.email) {
    throw new Error("Invalid Google token payload");
  }

  const email = payload.email;

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email },
    });
  }

  return jwt.sign({ userId: user.id, email }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.get("/auth/google/start", async (request, reply) => {
    const redirectUri = (request.query as { redirectUri?: string }).redirectUri;

    if (!redirectUri || !isExtensionRedirectUri(redirectUri)) {
      return reply.status(400).send({ error: "Invalid extension redirectUri" });
    }

    const state = encodeState({ redirectUri });

    const authUrl = client.generateAuthUrl({
      access_type: "offline",
      scope: ["openid", "email", "profile"],
      prompt: "consent",
      state,
    });

    return reply.redirect(authUrl);
  });

  app.get("/auth/google/callback", async (request, reply) => {
    const query = request.query as {
      code?: string;
      state?: string;
      error?: string;
    };

    if (!query.state) {
      return reply.status(400).send({ error: "Missing OAuth state" });
    }

    const { redirectUri } = decodeState(query.state);

    if (!redirectUri || !isExtensionRedirectUri(redirectUri)) {
      return reply.status(400).send({ error: "Invalid OAuth state" });
    }

    if (query.error) {
      return reply.redirect(
        `${redirectUri}#error=${encodeURIComponent(query.error)}`
      );
    }

    if (!query.code) {
      return reply.redirect(
        `${redirectUri}#error=${encodeURIComponent("Missing authorization code")}`
      );
    }

    try {
      const { tokens } = await client.getToken(query.code);

      if (!tokens.id_token) {
        throw new Error("Missing Google id_token");
      }

      const token = await issueJwtFromGoogleIdToken(tokens.id_token);

      return reply.redirect(`${redirectUri}#token=${encodeURIComponent(token)}`);
    } catch (err: any) {
      request.log.error(err);
      return reply.redirect(
        `${redirectUri}#error=${encodeURIComponent(
          err?.message || "OAuth callback failed"
        )}`
      );
    }
  });

  app.post("/auth/google", async (request, reply) => {
    const { idToken } = request.body as any;
    try {
      const token = await issueJwtFromGoogleIdToken(idToken);
      return { token };
    } catch {
      return reply.status(400).send({ error: "Invalid Google token" });
    }
  });
}
