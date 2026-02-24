export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export interface LoginResponse {
  success?: boolean;
  token?: string;
  requires_2fa?: boolean;
  pending_token?: string;
  error?: string;
  locked_until?: number;
}

export interface TwoFactorResponse {
  success?: boolean;
  token?: string;
  error?: string;
  locked_until?: number;
}

export interface StatusResponse {
  authenticated: boolean;
}

export interface VaultResponse {
  passwords: PasswordMap;
  notes: Record<string, unknown[]>;
  files: Record<string, unknown[]>;
  folders: string[];
}

export interface Credential {
  username: string;
  password: string;
  folder?: string | null;
  notes?: string | null;
}

export type PasswordMap = Record<string, Credential[]>;

export type MessageType =
  | "GET_AUTH_STATUS"
  | "LOGIN"
  | "LOGIN_2FA"
  | "LOGOUT"
  | "GET_CREDENTIALS"
  | "GET_CREDENTIALS_FOR_DOMAIN"
  | "SAVE_CREDENTIAL"
  | "FILL_CREDENTIAL"
  | "FORM_SUBMITTED"
  | "GET_PENDING_SAVE"
  | "DISMISS_PENDING_SAVE"
  | "LOCK_VAULT";

export interface ExtensionMessage {
  type: MessageType;
  payload?: unknown;
}