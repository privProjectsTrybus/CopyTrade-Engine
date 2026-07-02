// src/app/api/notifications/test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dispatch } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  await dispatch({
    userId,
    event: "TRADE_OPEN",
    title: "Test Notification",
    body: "CopyTrade Engine notification test — all configured channels are working.",
  });

  return NextResponse.json({ success: true });
}
