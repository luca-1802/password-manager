import type {
  ApiResponse,
  LoginResponse,
  TwoFactorResponse,
  StatusResponse,
  VaultResponse,
} from "./types";

const DEFAULT_BACKEND_URL = "http://localhost:5000";

export async function getBackendUrl(): Promise<string> {
  const result = await chrome.storage.local.get("backendUrl");
  return (result.backendUrl as string) || DEFAULT_BACKEND_URL;
}

export async function getToken(): Promise<string | null> {
  const result = await chrome.storage.session.get("apiToken");
  return (result.apiToken as string) || null;
}

export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await chrome.storage.session.set({ apiToken: token });
  } else {
    await chrome.storage.session.remove("apiToken");
  }
}

async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {}
): Promise<ApiResponse<T>> {
  const baseUrl = await getBackendUrl();
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${baseUrl}/api${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: data as T };
  } catch {
    return {
      ok: false,
      status: 0,
      data: { error: "Cannot connect to vault server" } as T,
    };
  }
}

export async function login(
  masterPassword: string
): Promise<ApiResponse<LoginResponse>> {
  return apiFetch<LoginResponse>("/extension/login", {
    method: "POST",
    body: { master_password: masterPassword },
  });
}

export async function verify2FA(
  pendingToken: string,
  code: string
): Promise<ApiResponse<TwoFactorResponse>> {
  return apiFetch<TwoFactorResponse>("/extension/2fa/verify", {
    method: "POST",
    body: { pending_token: pendingToken, code },
  });
}

export async function logout(): Promise<ApiResponse> {
  const result = await apiFetch("/extension/logout", { method: "POST" });
  await setToken(null);
  return result;
}

export async function checkStatus(): Promise<ApiResponse<StatusResponse>> {
  return apiFetch<StatusResponse>("/extension/status");
}

export async function getAllCredentials(): Promise<ApiResponse<VaultResponse>> {
  return apiFetch<VaultResponse>("/passwords/");
}

export async function saveCredential(data: {
  website: string;
  username: string;
  password: string;
}): Promise<ApiResponse> {
  return apiFetch("/passwords/", { method: "POST", body: data });
}

export async function togglePin(
  type: string,
  key: string,
  index: number,
  pinned: boolean
): Promise<ApiResponse> {
  return apiFetch("/passwords/pin", {
    method: "PUT",
    body: { type, key, index, pinned },
  });
}