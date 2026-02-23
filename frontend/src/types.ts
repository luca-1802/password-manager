export interface Credential {
  username: string;
  password: string;
  folder?: string | null;
}

export type PasswordMap = Record<string, Credential[]>;

export type ExportFormat = "json" | "csv" | "encrypted";

export interface AuthStatus {
  authenticated: boolean;
  is_new_vault: boolean;
  pending_2fa: boolean;
  totp_enabled: boolean;
}

export interface TotpSetupResponse {
  secret: string;
  uri: string;
  qr_code: string;
}

export interface TotpStatusResponse {
  enabled: boolean;
  backup_codes_remaining: number;
}

export interface BackupCodesResponse {
  success: boolean;
  backup_codes: string[];
}

export interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
}