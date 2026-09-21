export interface Session {
  token: string;
  email: string;
  expiresAt: number;
}
const key = 'taskflow.session';

// #region Decode only for display and local expiry; the backend verifies authenticity
// The browser never has JWT_SECRET. Reading a payload is not verifying its signature.
// A forged token may pass this shape check, but Spring rejects it and the UI signs out.
// sessionStorage preserves reloads within this tab. Failure to access storage falls
// back to Redux memory. No password is ever persisted.
// #endregion
export function sessionFromToken(token: string): Session | null {
  try {
    const pieces = token.split('.');
    if (pieces.length !== 3) return null;
    const base64 = pieces[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')), (c) =>
      c.charCodeAt(0),
    );
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || typeof payload !== 'object' || !('sub' in payload) || !('exp' in payload))
      return null;
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp)
    )
      return null;
    if (payload.exp * 1000 <= Date.now()) return null;
    return { token, email: payload.sub, expiresAt: payload.exp * 1000 };
  } catch {
    return null;
  }
}
export function readSession(): Session | null {
  try {
    return sessionFromToken(sessionStorage.getItem(key) || '');
  } catch {
    return null;
  }
}
export function persistSession(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(key, session.token);
    else sessionStorage.removeItem(key);
  } catch {
    /* Private browsing/storage policies may disable persistence; memory still works. */
  }
}
