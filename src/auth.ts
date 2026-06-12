import { NextResponse } from "next/server";

export type AuthUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type AuthSession = {
  user?: AuthUser | null;
} | null;

const LOCAL_AUTH_USER: AuthUser = {
  id: "local-user",
  email: null,
  name: "本地使用者",
};

export const handlers = {
  GET: async () => NextResponse.json({ error: "Auth disabled in local-first edition" }, { status: 404 }),
  POST: async () => NextResponse.json({ error: "Auth disabled in local-first edition" }, { status: 404 }),
};

export async function auth(): Promise<AuthSession> {
  return { user: LOCAL_AUTH_USER };
}

export async function signIn() {
  return { ok: true, error: undefined, status: 200, url: "/" } as const;
}

export async function signOut() {
  return { ok: true, error: undefined, status: 200, url: "/" } as const;
}
