export interface Credential {
  username: string;
  password: string;
}

export type PasswordMap = Record<string, Credential[]>;

export interface AuthStatus {
  authenticated: boolean;
  is_new_vault: boolean;
}

export interface ApiResponse<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
}