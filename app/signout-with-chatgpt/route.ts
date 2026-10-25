import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/server-config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const returnTo = url.searchParams.get("return_to");
  const destination = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const response = NextResponse.redirect(new URL(destination, `${protocol}://${host}`));
  const base = backendApiUrl();

  if (base) {
    try {
      const backendResponse = await fetch(`${base}/api/admin/logout`, {
        method: "POST",
        headers: { cookie: request.headers.get("cookie") || "" },
        cache: "no-store",
      });
      const clearedCookie = backendResponse.headers.get("set-cookie");
      if (clearedCookie) response.headers.append("set-cookie", clearedCookie);
    } catch {
      response.headers.append(
        "set-cookie",
        "solarious_admin_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0",
      );
    }
  }
  return response;
}
