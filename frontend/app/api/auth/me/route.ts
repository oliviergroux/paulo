import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE, getSessionContext } from "@/lib/auth";
import { getBackendUrl } from "@/lib/backend";

export async function GET() {
  const cookieStore = await cookies();
  const context = await getSessionContext(cookieStore.get(SESSION_COOKIE)?.value);

  if (!context) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let commune: { id: number; name: string; postal_code: string } | null = null;

  if (context.communeId != null) {
    const response = await fetch(`${getBackendUrl()}/communes/active`, {
      cache: "no-store",
    });
    if (response.ok) {
      const communes = await response.json();
      commune =
        communes.find(
          (item: { id: number }) => item.id === context.communeId
        ) ?? null;
    }
  }

  return NextResponse.json({
    role: context.role,
    communeId: context.communeId,
    commune,
  });
}
