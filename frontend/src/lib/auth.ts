const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type JwtPayload = {
  userId?: string;
  email?: string;
  exp?: number;
};

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  return atob(padded);
}

export function parseJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payloadRaw = decodeBase64Url(parts[1]);
    return JSON.parse(payloadRaw) as JwtPayload;
  } catch {
    return null;
  }
}

export async function exchangeGoogleIdToken(idToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Auth failed (${response.status})`);
  }

  const data = (await response.json()) as { token: string };

  if (!data.token) {
    throw new Error("Auth token missing in response");
  }

  return data.token;
}

export function persistSession(token: string) {
  const payload = parseJwt(token);

  localStorage.setItem("token", token);

  if (payload?.userId) {
    localStorage.setItem("userId", payload.userId);
  }

  if (payload?.email) {
    localStorage.setItem("userEmail", payload.email);
  }

  return payload;
}

export function hasValidSession() {
  const token = localStorage.getItem("token");

  if (!token) {
    return false;
  }

  const payload = parseJwt(token);

  if (!payload?.exp) {
    return true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds;
}
