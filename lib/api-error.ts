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
      const message = (await response.text()).trim();
      if (message) return new Error(message);
    }
  } catch {
    // Fall through to the status-aware fallback.
  }
  return new Error(`${fallback} (HTTP ${response.status})`);
}
