// Tiny HTTP client for the campaigns-backend.
//
// Contract (from teammate's API doc):
//  - Every request (except /health and Better Auth endpoints) needs the Better
//    Auth session cookie → ALWAYS send `credentials: "include"`.
//  - No bearer tokens.
//  - Send Content-Type: application/json only when there's a JSON body.
//  - Non-2xx → throw a structured ApiError.

const RAW_BASE = import.meta.env.VITE_CAMPAIGNS_API_URL as string | undefined;

/** Direct backend root (used in production builds + as the dev proxy target). */
const DIRECT_BASE = (RAW_BASE && RAW_BASE.trim()) || "http://63.180.247.78:8080";

/**
 * Campaigns backend root.
 *  - Dev: "/cap-api" → routed same-origin through the Vite proxy (see
 *    vite.config.ts) to dodge the backend's missing CORS headers.
 *  - Prod: the direct backend URL (which must serve proper CORS + HTTPS).
 */
export const API_BASE_URL = import.meta.env.DEV ? "/cap-api" : DIRECT_BASE;

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
  /** 401 → not signed in. */
  get isUnauthorized() {
    return this.status === 401;
  }
  /** 403 → signed in but not allowed (e.g. non-admin hitting /admin). */
  get isForbidden() {
    return this.status === 403;
  }
  /** 404 → in user routes: unavailable / expired / inactive / missing. */
  get isNotFound() {
    return this.status === 404;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  // Some endpoints (204, redirects) may have no JSON body.
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && ("message" in data || "error" in data)
        ? ((data as Record<string, unknown>).message ?? (data as Record<string, unknown>).error)
        : null) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, String(message), data);
  }

  return data as T;
}

/** Convenience JSON-body helpers. */
export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiPatch = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
