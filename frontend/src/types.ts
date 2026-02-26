import type { ReactNode } from "react";

export interface RecoveryQuestion {
  question: string;
  answer: string;
}

export interface PasswordHistoryEntry {
  password: string;
  changed_at: string;
}

export interface Credential {
  username: string;
  password: string;
  folder?: string | null;
  notes?: string | null;
  recovery_questions?: RecoveryQuestion[] | null;
  history?: PasswordHistoryEntry[] | null;
}

export type PasswordMap = Record<string, Credential[]>;

export interface SecureNote {
  type: "note";
  content: string;
  folder?: string | null;
  recovery_questions?: RecoveryQuestion[] | null;
}

export type NotesMap = Record<string, SecureNote[]>;

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

export interface BreachCheckResponse {
  results: Record<string, number>;
  total_checked: number;
  total_breached: number;
  errors: number;
}

export type BreachResults = Record<string, number>;

export interface SecureFile {
  type: "file";
  file_id: string;
  original_name: string;
  size: number;
  mime_type?: string;
  description?: string | null;
  folder?: string | null;
  uploaded_at: string;
}

export type FilesMap = Record<string, SecureFile[]>;
export type VaultItemType = "password" | "note" | "file";

export interface VaultItem {
  id: string;
  type: VaultItemType;
  key: string;
  index: number;
  folder?: string | null;
  credential?: Credential;
  note?: SecureNote;
  file?: SecureFile;
}

export type FolderFilter = "all" | "unfiled" | (string & {});

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: ReactNode;
  shortcut?: string;
  action: () => void;
  category: "navigation" | "action" | "vault-item";
}

export interface ActionableItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  count: number;
  action: () => void;
}

export interface TrashItem {
  id: string;
  entry_type: VaultItemType;
  original_key: string;
  entry: Credential | SecureNote | SecureFile;
  deleted_at: string;
  expires_at: string;
}

export interface TrashResponse {
  items: TrashItem[];
  count: number;
}