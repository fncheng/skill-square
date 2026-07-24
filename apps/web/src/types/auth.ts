export interface AdminIdentity {
  username: 'admin';
  role: 'admin';
}

export interface AuthSession {
  authenticated: boolean;
  user: AdminIdentity | null;
}

export interface LoginPayload {
  username: string;
  password: string;
}
