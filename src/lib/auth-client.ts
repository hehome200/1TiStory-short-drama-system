"use client";

import { useCallback, useMemo, useState } from "react";

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
};

export type SessionData = { user: SessionUser; expires: string } | null;

const LOCAL_SESSION_USER: SessionUser = {
  id: "local-user",
  name: "本地使用者",
  email: null,
};

export function useAuthSession() {
  const [session, setSession] = useState<SessionData>({
    user: LOCAL_SESSION_USER,
    expires: "2099-12-31T23:59:59.999Z",
  });
  const [loading] = useState(false);

  const refresh = useCallback(async () => {
    setSession({ user: LOCAL_SESSION_USER, expires: "2099-12-31T23:59:59.999Z" });
  }, []);

  return useMemo(
    () => ({
      session,
      loading,
      user: session?.user ?? null,
      isAuthenticated: true,
      refresh,
    }),
    [loading, refresh, session],
  );
}

export function signIn() {
  return Promise.resolve({ ok: true, error: undefined, status: 200, url: "/" } as const);
}

export function signOut() {
  return Promise.resolve({ ok: true, error: undefined, status: 200, url: "/" } as const);
}
