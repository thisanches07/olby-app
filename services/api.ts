import { getIdToken } from "./auth.service";

const RAW_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

/** Erro da API com status HTTP acessivel para tratamento granular. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Global 403 plan-error handler.
// Set this from a navigation-aware component (e.g. _layout.tsx)
// to intercept plan-limit errors globally and redirect to paywall.
type PlanErrorHandler = (message: string) => void;
let _planErrorHandler: PlanErrorHandler | null = null;

export function setPlanErrorHandler(handler: PlanErrorHandler | null) {
  _planErrorHandler = handler;
}

function isPlanError(status: number, message: string): boolean {
  return (
    status === 403 &&
    (message.includes("plano") ||
      message.includes("Limite") ||
      message.includes("Assine") ||
      message.includes("limite"))
  );
}

function normalizePath(path: string): string {
  let normalized = path.startsWith("/") ? path : `/${path}`;

  // Evita duplicacao de /v1 quando BASE_URL ja termina com /v1.
  if (BASE_URL.endsWith("/v1") && normalized.startsWith("/v1/")) {
    normalized = normalized.slice(3);
  } else if (BASE_URL.endsWith("/v1") && normalized === "/v1") {
    normalized = "/";
  }

  return normalized;
}

function buildApiUrl(path: string): string {
  return `${BASE_URL}${normalizePath(path)}`;
}

function getRequestId(headers: Headers): string | null {
  return (
    headers.get("x-request-id") ??
    headers.get("request-id") ??
    headers.get("x-correlation-id")
  );
}

function debugApiStatus(
  path: string,
  status: number,
  requestId: string | null,
  ok: boolean,
) {
  if (!__DEV__) return;

  const scope =
    path.startsWith("/subscriptions") || path.startsWith("/billing")
      ? "[billing/subscriptions]"
      : "[api]";
  const requestPart = requestId ? ` requestId=${requestId}` : "";
  // Debug somente em dev para rastrear requestId/status do backend.
  console.debug(
    `${scope} ${ok ? "OK" : "ERR"} status=${status} path=${path}${requestPart}`,
  );
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await getIdToken();
  const normalizedPath = normalizePath(path);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(normalizedPath), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const requestId = getRequestId(response.headers);
    debugApiStatus(normalizedPath, response.status, requestId, false);

    const body = await response.json().catch(() => null);
    const message =
      body?.message ??
      body?.error ??
      `Erro ${response.status}: ${response.statusText}`;

    if (_planErrorHandler && isPlanError(response.status, message)) {
      _planErrorHandler(message);
    }

    throw new ApiError(message, response.status);
  }

  debugApiStatus(
    normalizedPath,
    response.status,
    getRequestId(response.headers),
    true,
  );

  // 204 No Content (e.g. DELETE bulk endpoints) - sem body para parsear.
  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export const api = {
  get: <T = unknown>(path: string): Promise<T> => authFetch(path),

  post: <T = unknown>(path: string, body: unknown): Promise<T> =>
    authFetch(path, { method: "POST", body: JSON.stringify(body) }),

  patch: <T = unknown>(path: string, body: unknown): Promise<T> =>
    authFetch(path, { method: "PATCH", body: JSON.stringify(body) }),

  put: <T = unknown>(path: string, body: unknown): Promise<T> =>
    authFetch(path, { method: "PUT", body: JSON.stringify(body) }),

  delete: <T = unknown>(path: string): Promise<T> =>
    authFetch(path, { method: "DELETE" }),
};

