import "server-only";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";

const authFile = path.join(path.resolve(/* turbopackIgnore: true */ process.env.WAARR_ADMIN_DATA_PATH || path.join(process.cwd(), ".data")), "admin-auth.json");
const processSecret = randomBytes(32).toString("hex");
export const cookieName = "waarr_admin_session";
const attempts = new Map();

export async function credentials() {
  if (process.env.WAARR_ADMIN_PASSWORD) return { email: process.env.WAARR_ADMIN_EMAIL || "admin@waarr.local", password: process.env.WAARR_ADMIN_PASSWORD, secret: process.env.WAARR_ADMIN_SESSION_SECRET || processSecret };
  if (process.env.NODE_ENV === "development") return { email: "admin@waarr.com", password: "Admin@123", secret: processSecret, demo: true };
  try { return JSON.parse(await readFile(authFile, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export function verifyPassword(account, password) {
  const salt = account.salt || "waarr-environment-account";
  const expected = account.hash ? Buffer.from(account.hash, "hex") : scryptSync(account.password, salt, 64);
  return timingSafeEqual(scryptSync(password, salt, 64), expected);
}

export async function setSession(account) {
  const payload = Buffer.from(JSON.stringify({ email: account.email, expires: Date.now() + 8 * 3600000 })).toString("base64url");
  const signature = createHmac("sha256", account.secret).update(payload).digest("base64url");
  (await cookies()).set(cookieName, `${payload}.${signature}`, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 8 * 3600 });
}

export async function currentAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  const account = await credentials();
  if (!account) return null;
  try {
    const [payload, signature] = token.split(".");
    const expected = createHmac("sha256", account.secret).update(payload).digest();
    const supplied = Buffer.from(signature || "", "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    return session.email === account.email && session.expires > Date.now() ? { email: session.email } : null;
  } catch { return null; }
}

export function sameOrigin(request) {
  const url = new URL(request.url);
  // Next.js can normalize the internal URL's hostname to localhost.
  // Host preserves the address used by the browser, including its port.
  const host = request.headers.get("host") || url.host;
  return request.headers.get("origin") === `${url.protocol}//${host}`;
}
export function allowAttempt(request) {
  const key = request.headers.get("x-forwarded-for") || "local";
  const now = Date.now();
  for (const [entry, times] of attempts) if (!times.some(time => time > now - 900000)) attempts.delete(entry);
  const recent = (attempts.get(key) || []).filter(time => time > now - 900000);
  if (recent.length >= 10) return false;
  attempts.set(key, [...recent, now]);
  return true;
}
