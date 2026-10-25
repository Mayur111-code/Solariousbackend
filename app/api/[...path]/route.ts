import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { backendApiUrl, trustedFrontendOrigins } from "@/lib/server-config";

const methodsWithBody = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const creativeTimeoutMs = 115_000;

async function forward(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const base = backendApiUrl();
  if (!base) {
    return NextResponse.json(
      { error: "Backend API is not configured. Set BACKEND_API_URL in the frontend environment." },
      { status: 503 },
    );
  }

  const { path } = await params;
  const pathname = `/api/${path.join("/")}`;
  const isAdminMutation = pathname.startsWith("/api/admin/") && methodsWithBody.has(request.method);
  const origin = request.headers.get("origin");
  const trustedOrigins = trustedFrontendOrigins();
  if (isAdminMutation && origin && !trustedOrigins.has(origin)) {
    return NextResponse.json({ error: "Cross-origin admin request denied." }, { status: 403 });
  }
  const target = new URL(`${pathname}${new URL(request.url).search}`, base);
  const isCreativeGeneration =
    request.method === "POST" &&
    (pathname === "/api/admin/creatives" ||
      pathname === "/api/admin/creatives/festival" ||
      /^\/api\/admin\/creatives\/[^/]+\/(?:generate-image|regenerate)$/.test(
        pathname,
      ));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), isCreativeGeneration ? creativeTimeoutMs : 30_000);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("authorization");
  // The browser request has already passed the configured trusted-origin check above.
  // This is now a trusted server-to-server hop, so do not make the backend CORS
  // allowlist depend on every Vercel preview or custom frontend hostname.
  headers.delete("origin");

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    cache: "no-store",
    signal: controller.signal,
  };
  if (methodsWithBody.has(request.method) && request.body) {
    init.body = request.body;
    init.duplex = "half";
  }

  try {
    const started = Date.now();
    const response = await fetch(target, init);
    if (response.ok && isAdminMutation && (/^\/api\/admin\/settings\//.test(pathname) || pathname.startsWith("/api/admin/locations") || pathname === "/api/admin/resources")) {
      try {
        revalidatePath("/", "layout");
      } catch (revalidationError) {
        console.error("CMS cache revalidation failed", {
          pathname,
          detail: revalidationError instanceof Error ? revalidationError.message : "unknown error",
        });
      }
    }
    if (isCreativeGeneration) console.error("[creative-proxy]", { backendHost: target.host, status: response.status, durationMs: Date.now() - started });
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    const detail = timedOut ? "timeout" : error instanceof Error ? error.message : "unknown connection error";
    if (isCreativeGeneration) console.error("[creative-proxy]", { backendHost: target.host, status: timedOut ? 504 : 503, durationMs: creativeTimeoutMs, detail });
    else console.error("Backend proxy failed", { target: target.origin, detail });
    return NextResponse.json(
      isCreativeGeneration
        ? {
            success: false,
            error: {
              code: timedOut ? "PROVIDER_TIMEOUT" : "PROVIDER_UNAVAILABLE",
              message: timedOut
                ? "Creative generation timed out. Please check generation history before retrying."
                : "The creative service is temporarily unavailable.",
              retryable: true,
            },
          }
        : { error: "Backend service is unavailable." },
      { status: timedOut ? 408 : 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const maxDuration = 120;

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
