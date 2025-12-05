export interface LoginRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface LoginResponse {
  ok?: boolean;
  access_token?: string;
  user?: UserMe;
  error?: string;
  message?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface RegisterResponse {
  ok?: boolean;
  access_token?: string;
  user?: UserMe;
  error?: string;
  message?: string;
}

export interface RefreshResponse {
  ok?: boolean;
  access_token?: string;
  user?: UserMe;
  error?: string;
  message?: string;
}

export interface LogoutResponse {
  ok?: boolean;
  error?: string;
  message?: string;
}

export interface UserMe {
  id?: string | number;
  email?: string;
  name?: string;
  tg_id?: string;
  access_token?: string;
  role?: string;
  type?: string;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
  status?: string;
}
