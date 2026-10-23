export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const MAX_BODY_BYTES = 8 * 1024;

const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

export function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...BASE_HEADERS, ...extra } });
}

export function errorResponse(error: HttpError): Response {
  const body = { error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}) } };
  return jsonResponse(body, error.status, error.headers);
}

/**
 * CSRF guard for a cookie-less JSON API. Browsers always attach Origin and
 * Sec-Fetch-Site to cross-site requests, so a mismatch is rejected. Requests
 * with neither header come from non-browser clients, which CSRF cannot target.
 */
export function isSameOrigin(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("host") ?? new URL(req.url).host);
  } catch {
    return false;
  }
}

/** Best-effort client identifier for rate limiting. Trusts the platform's forwarded header. */
export function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || req.headers.get("x-real-ip")?.trim() || "unknown";
  return candidate.slice(0, 64);
}

/** Reads a JSON body without ever buffering more than `maxBytes`. */
export async function readJsonBody(req: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "unsupported_media_type", "Send the request as application/json.");
  }
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new HttpError(413, "payload_too_large", "The request is too large.");

  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "payload_too_large", "The request is too large.");
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "The request body is not valid JSON.");
  }
}
