import { cronAuthorised } from "@/lib/cron-auth";

const backend = (process.env.BACKEND_API_URL || process.env.VITE_API_URL || "").replace(/\/$/, "");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function forward(request: Request) {
  if (!(await cronAuthorised(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!backend) return Response.json({ error: "Backend service is not configured." }, { status: 503 });
  const secret = (process.env.CRON_SECRET || "").trim();
  try {
    const response = await fetch(`${backend}/api/cron/weekly-report`, {
      method: request.method === "POST" ? "POST" : "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "The report service is unavailable." }, { status: 503 });
  }
}

export async function GET(request: Request) {
  return forward(request);
}

export async function POST(request: Request) {
  return forward(request);
}
