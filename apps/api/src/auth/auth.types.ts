export interface AdminSessionPayload {
  sub: 'admin';
  role: 'admin';
  credentialVersion: string;
}

export interface RequestCookies {
  [name: string]: string | undefined;
}
