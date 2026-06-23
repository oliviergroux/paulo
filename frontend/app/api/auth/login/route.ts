import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  resolveRoleFromPassword,
} from "@/lib/auth";
import { getBackendUrl } from "@/lib/backend";

type ActiveCommune = {
  id: number;
  name: string;
  postal_code: string;
};

async function fetchActiveCommunes(): Promise<ActiveCommune[]> {
  const response = await fetch(`${getBackendUrl()}/communes/active`, {
    cache: "no-store",
  });

  if (!response.ok) return [];
  return response.json();
}

function resolveMairieCommuneId(
  communes: ActiveCommune[],
  requestedId: unknown
): number | null {
  if (typeof requestedId === "number" && Number.isFinite(requestedId)) {
    if (communes.some((commune) => commune.id === requestedId)) {
      return requestedId;
    }
    return null;
  }

  const envCommuneId = process.env.MAIRIE_COMMUNE_ID;
  if (envCommuneId) {
    const parsed = Number(envCommuneId);
    if (communes.some((commune) => commune.id === parsed)) {
      return parsed;
    }
  }

  if (communes.length === 1) {
    return communes[0].id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const password = body?.password;

  if (typeof password !== "string") {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const role = resolveRoleFromPassword(password);
  if (!role) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  let communeId: number | null = null;

  if (role === "mairie") {
    const communes = await fetchActiveCommunes();
    communeId = resolveMairieCommuneId(communes, body?.commune_id);

    if (communeId === null) {
      return NextResponse.json(
        {
          error: communes.length > 1 ? "select_commune" : "no_active_commune",
          communes,
        },
        { status: 401 }
      );
    }
  }

  const token = await createSessionToken(role, communeId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return NextResponse.json({ ok: true, role, communeId });
}
