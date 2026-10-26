import { cookies } from "next/headers";
import { credentials, currentAdmin, verifyPassword, setSession, sameOrigin, allowAttempt, cookieName } from "@/lib/admin-auth";

const json = (value, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const account = await credentials();
  return json({ user: await currentAdmin(), demoLogin: account?.demo ? { email: account.email, password: account.password } : null });
}
export async function POST(request) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  if (!allowAttempt(request)) return json({ error: "Too many attempts. Please try again in 15 minutes." }, 429);
  if (Number(request.headers.get("content-length")) > 4000) return json({ error: "Request too large." }, 413);
  let input; try { input = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }
  if (typeof input?.email !== "string" || typeof input?.password !== "string" || input.password.length > 200 || input.email.length > 254) return json({ error: "Enter your email and password." }, 400);
  const email = input.email.trim().toLowerCase();
  if (input.action && input.action !== "login") return json({ error: "Account creation is unavailable. Please sign in." }, 403);
  const account = await credentials();
  if (!account || !verifyPassword(account, input.password) || email !== account.email) return json({ error: "Email or password is incorrect." }, 401);
  await setSession(account);
  return json({ user: { email: account.email } });
}
export async function DELETE(request) {
  if (!sameOrigin(request)) return json({ error: "Invalid request origin." }, 403);
  (await cookies()).delete(cookieName);
  return json({ ok: true });
}
