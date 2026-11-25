import { json, errorResponse, withSecurityHeaders } from "./utils/response.js";
import { validatePublicWebUrl } from "./utils/validation.js";
import { createIsolateRateLimiter } from "./security/rate-limit.js";
import { createAuditEvent } from "./security/audit-log.js";

const limiter = createIsolateRateLimiter({
  limit: 120,
  windowMs: 60_000
});

const ALLOWED_EVENT_TYPES = new Set([
  "visibilitychange",
  "focus",
  "blur",
  "pageshow",
  "pagehide",
  "initialized",
  "url_rejected",
  "navigation_started"
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return withSecurityHeaders(await handleApi(request, env, url));
    }

    // Serve static assets for all non-API requests.
    const assetResponse = await env.ASSETS.fetch(request);
    return withSecurityHeaders(assetResponse);
  }
};

async function handleApi(request, env, url) {
  if (!["GET", "POST", "OPTIONS"].includes(request.method)) {
    return errorResponse("Method not allowed", 405, {
      Allow: "GET, POST, OPTIONS"
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Allow": "GET, POST, OPTIONS",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "600"
      }
    });
  }

  // Same-origin API only. Do not enable wildcard CORS for this app.
  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) {
    return errorResponse("Cross-origin requests are not allowed", 403);
  }

  const clientKey = request.headers.get("CF-Connecting-IP") || "unknown";
  const rate = limiter.check(clientKey);

  if (!rate.allowed) {
    return errorResponse("Rate limit exceeded", 429, {
      "Retry-After": String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)))
    });
  }

  if (url.pathname === "/api/health" && request.method === "GET") {
    return json({
      status: "ok",
      app: env.APP_NAME || "Anura Browser",
      version: env.APP_VERSION || "3.0.0",
      timestamp: new Date().toISOString()
    }, 200, {
      "Cache-Control": "no-store"
    });
  }

  if (url.pathname === "/api/security/status" && request.method === "GET") {
    return json({
      status: "active",
      modules: {
        urlValidation: true,
        securityHeaders: true,
        apiRateLimit: "isolate-local-fallback",
        visibilityMonitor: "client-side"
      },
      note: "The in-memory rate limiter is isolate-local, not a global distributed limit."
    }, 200, {
      "Cache-Control": "no-store"
    });
  }

  if (url.pathname === "/api/security/validate-url" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.ok) return errorResponse(body.error, 400);

    const result = validatePublicWebUrl(body.value.url, url.origin);
    return json(result, result.valid ? 200 : 400, {
      "Cache-Control": "no-store"
    });
  }

  if (url.pathname === "/api/security/events" && request.method === "POST") {
    const body = await readJson(request);
    if (!body.ok) return errorResponse(body.error, 400);

    const event = body.value;
    if (!event || !ALLOWED_EVENT_TYPES.has(event.type)) {
      return errorResponse("Unsupported event type", 400);
    }

    const safeEvent = createAuditEvent({
      type: event.type,
      visibility: event.visibility,
      hidden: event.hidden,
      focused: event.focused
    });

    // Deliberately do not persist visitor events or sensitive data.
    // Connect authenticated storage only if durable audit history is required.
    return json({
      accepted: true,
      event: safeEvent
    }, 202, {
      "Cache-Control": "no-store"
    });
  }

  return errorResponse("API endpoint not found", 404);
}

async function readJson(request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { ok: false, error: "Content-Type must be application/json" };
  }

  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 4096) {
    return { ok: false, error: "Request body too large" };
  }

  try {
    const text = await request.text();
    if (text.length > 4096) {
      return { ok: false, error: "Request body too large" };
    }
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}
