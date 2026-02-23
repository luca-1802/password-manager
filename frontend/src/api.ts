import type { ApiResponse } from "./types";

const API_BASE = "/api";

let csrfToken = "";

interface FetchOptions {
  method?: string;
  body?: Record<string, unknown>;
}

export async function apiFetch<T = Record<string, unknown>>(
  path: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T> | null> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      },
      method: options.method,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    return { ok: false, status: 0, data: { error: "Network error" } as T };
  }

  const newToken = res.headers.get("X-CSRF-Token");
  if (newToken) csrfToken = newToken;

  const data = await res.json().catch(() => null);

  if (res.status === 401) {
    window.location.href = "/";
    return null;
  }

  return { ok: res.ok, status: res.status, data };
}