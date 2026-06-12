import { NextResponse } from "next/server";

const LOCAL_USER = {
  id: "local-user",
  email: null as string | null,
  role: "user",
  deletedAt: null as Date | null,
};

export async function requireSession() {
  return {
    userId: LOCAL_USER.id,
    session: { user: LOCAL_USER },
    user: LOCAL_USER,
  };
}

export async function requireProjectAccess(projectId: string) {
  return {
    userId: LOCAL_USER.id,
    project: {
      id: projectId,
      userId: LOCAL_USER.id,
    },
    session: { user: LOCAL_USER },
  };
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
