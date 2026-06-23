export const SESSION_COOKIE = "paulo_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type UserRole = "admin" | "mairie";

function secretForRole(role: UserRole): string | null {
  if (role === "admin") return process.env.ADMIN_PASSWORD || null;
  return process.env.MAIRIE_PASSWORD || null;
}

async function signPayload(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createSessionToken(role: UserRole): Promise<string> {
  const secret = secretForRole(role);
  if (!secret) {
    throw new Error(`${role} password is not configured`);
  }

  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${role}:${expiresAt}`;
  return `${payload}.${await signPayload(payload, secret)}`;
}

export async function getSessionRole(
  token: string | undefined
): Promise<UserRole | null> {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const [roleRaw, expiresRaw] = payload.split(":");
  if (roleRaw !== "admin" && roleRaw !== "mairie") return null;

  const role = roleRaw as UserRole;
  const secret = secretForRole(role);
  if (!secret) return null;

  const expected = await signPayload(payload, secret);
  if (!safeEqual(signature, expected)) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return role;
}

export function resolveRoleFromPassword(password: string): UserRole | null {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const mairiePassword = process.env.MAIRIE_PASSWORD;

  if (adminPassword && safeEqual(password, adminPassword)) return "admin";
  if (mairiePassword && safeEqual(password, mairiePassword)) return "mairie";
  return null;
}

export const ADMIN_ONLY_PATHS = ["/", "/partners", "/devenir-partenaire"];

export function isAdminOnlyPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/partners")) return true;
  if (pathname === "/devenir-partenaire") return true;
  return false;
}

export function defaultPathForRole(role: UserRole): string {
  return role === "mairie" ? "/mairie" : "/";
}
