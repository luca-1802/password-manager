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

  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.location.href = "/";
    return null;
  }

  return { ok: res.ok, status: res.status, data };
}

export async function apiUploadFile(
  path: string,
  file: File
): Promise<ApiResponse | null> {
  const formData = new FormData();
  formData.append("file", file);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      headers: {
        ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      },
      method: "POST",
      body: formData,
    });
  } catch {
    return { ok: false, status: 0, data: { error: "Network error" } };
  }

  const newToken = res.headers.get("X-CSRF-Token");
  if (newToken) csrfToken = newToken;

  const data = await res.json().catch(() => null);

  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.location.href = "/";
    return null;
  }

  return { ok: res.ok, status: res.status, data };
}

export async function apiUploadFileWithFields(
  path: string,
  file: File,
  fields: Record<string, string>
): Promise<ApiResponse | null> {
  const formData = new FormData();
  formData.append("file", file);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      headers: {
        ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      },
      method: "POST",
      body: formData,
    });
  } catch {
    return { ok: false, status: 0, data: { error: "Network error" } };
  }

  const newToken = res.headers.get("X-CSRF-Token");
  if (newToken) csrfToken = newToken;

  const data = await res.json().catch(() => null);

  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.location.href = "/";
    return null;
  }

  return { ok: res.ok, status: res.status, data };
}

export async function fetchBackups() {
  return apiFetch<{
    vault_backups: Array<{ filename: string; timestamp: string; size: number }>;
    totp_backups: Array<{ filename: string; timestamp: string; size: number }>;
  }>("/backups/");
}

export async function restoreBackup(filename: string, target: "vault" | "totp") {
  return apiFetch("/backups/restore", {
    method: "POST",
    body: { filename, target },
  });
}

export async function apiFetchRaw(
  path: string,
  options: FetchOptions = {}
): Promise<Response | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken && { "X-CSRF-Token": csrfToken }),
      },
      method: options.method,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const newToken = res.headers.get("X-CSRF-Token");
    if (newToken) csrfToken = newToken;
    return res;
  } catch {
    return null;
  }
}