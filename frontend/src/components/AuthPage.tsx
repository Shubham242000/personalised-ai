import { useEffect, useRef, useState } from "react";
import { exchangeGoogleIdToken, persistSession } from "../lib/auth";

type AuthPageProps = {
  onAuthenticated: () => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number>
          ) => void;
        };
      };
    };
  }
}

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      setError("Missing VITE_GOOGLE_CLIENT_ID in frontend env.");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) {
        setError("Google Identity SDK failed to load.");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          const idToken = response.credential;

          if (!idToken) {
            setError("Google login failed. No credential received.");
            return;
          }

          try {
            setLoading(true);
            setError("");
            const token = await exchangeGoogleIdToken(idToken);
            persistSession(token);
            onAuthenticated();
          } catch (err: any) {
            setError(err?.message || "Sign in failed.");
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        shape: "pill",
        width: 280,
      });
    };

    script.onerror = () => {
      setError("Unable to load Google login script.");
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [onAuthenticated]);

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="logo-label">Personalised Agent</p>
        <h1 className="logo-name">Personal Assistant</h1>
        <p className="auth-subtext">Sign in to continue your personalized sessions.</p>
        <div ref={buttonRef} className="auth-google-button" />
        {loading ? <p className="auth-status">Signing you in...</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
      </div>
    </div>
  );
}
