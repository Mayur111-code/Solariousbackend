const backend = (process.env.BACKEND_API_URL || process.env.VITE_API_URL || "").replace(/\/$/, "");

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!backend)
    return Response.json({ error: "Backend service is not configured." }, { status: 503 });
  try {
    const response = await fetch(`${backend}/api/cron/enquiry-report`, {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(55_000),
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "The report service is unavailable." }, { status: 503 });
  }
}
