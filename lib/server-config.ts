import "server-only";

type ServerKey =
  | "BACKEND_API_URL"
  | "VITE_API_URL"
  | "NEXT_PUBLIC_SITE_URL"
  | "FRONTEND_ORIGINS";

export function serverValue(key: ServerKey): string {
  return (process.env[key] ?? "").trim();
}

export function backendApiUrl(): string {
  const raw = (
    serverValue("BACKEND_API_URL") ||
    serverValue("VITE_API_URL") ||
    ""
  ).replace(/\/+$/, "");

  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (!(["http:", "https:"].includes(url.protocol)) || url.pathname !== "/") {
      console.error("Invalid backend API configuration", {
        backendConfigured: Boolean(serverValue("BACKEND_API_URL")),
        compatibilityUrlConfigured: Boolean(serverValue("VITE_API_URL")),
        reason: "The backend URL must be an HTTP(S) origin without an /api path.",
      });
      return "";
    }
    return url.origin;
  } catch {
    console.error("Invalid backend API configuration", {
      backendConfigured: Boolean(serverValue("BACKEND_API_URL")),
      compatibilityUrlConfigured: Boolean(serverValue("VITE_API_URL")),
      reason: "The backend URL is not a valid absolute URL.",
    });
    return "";
  }
}

/**
 * Origins allowed to submit browser admin mutations through the Next proxy.
 * These are explicit configuration values; request Host headers are never
 * treated as trusted origins.
 */
export function trustedFrontendOrigins(): Set<string> {
  const configured = [
    serverValue("NEXT_PUBLIC_SITE_URL"),
    ...serverValue("FRONTEND_ORIGINS").split(","),
  ];
  const origins = new Set<string>();
  for (const value of configured) {
    const candidate = value.trim();
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.pathname !== "/" || url.search || url.hash || !["http:", "https:"].includes(url.protocol)) continue;
      origins.add(url.origin);
    } catch {
      // Invalid origin configuration is ignored; it must not broaden trust.
    }
  }
  return origins;
}
