export async function apiError(
  response: Response,
  fallback: string,
): Promise<Error> {
  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json()) as {
        error?: string | {
          message?: string;
          code?: string;
          retryable?: boolean;
          requestId?: string;
        };
      };
      if (typeof body.error === "string") return new Error(body.error);
      if (body.error?.message) {
        const error = new Error(body.error.message) as Error & {
          code?: string;
          retryable?: boolean;
          requestId?: string;
        };
        error.code = body.error.code;
        error.retryable = body.error.retryable;
        error.requestId = body.error.requestId;
        return error;
      }
    } else {
      const raw = (await response.text()).trim();
      /* Never surface a raw HTML error page (Express renders one for an
         unmatched route) — it would be shown verbatim in the admin banner. */
      const looksLikeMarkup = /<!doctype|<html|<\/body>/i.test(raw);
      const message = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      if (message && !looksLikeMarkup && message.length <= 200) {
        return new Error(message);
      }
    }
  } catch {
    // Fall through to the status-aware fallback.
  }
  return new Error(`${fallback} (HTTP ${response.status})`);
}
