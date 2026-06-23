import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { SESSION_COOKIE, getSessionRole } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const role = await getSessionRole(cookieStore.get(SESSION_COOKIE)?.value);

  if (!role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ role });
}
