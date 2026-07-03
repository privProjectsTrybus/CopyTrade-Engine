import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  try {
    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return NextResponse.json(settings);
  } catch {
    // Row might already exist from a race — just fetch it
    const settings = await prisma.notificationSettings.findUnique({ where: { userId } });
    if (settings) return NextResponse.json(settings);
    return NextResponse.json({ error: "Could not load notification settings" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;
  const body = await req.json();
  const allowed = ["browserEnabled","emailEnabled","telegramEnabled","telegramChatId","discordEnabled","discordWebhookUrl","onTradeOpen","onTradeClose","onStopLossHit","onRiskBreach","onExchangeError","onAiSignal"];
  const data: Record<string, unknown> = {};
  for (const key of allowed) { if (key in body) data[key] = body[key]; }
  const settings = await prisma.notificationSettings.upsert({ where:{userId}, update:data, create:{userId,...data} });
  return NextResponse.json(settings);
}
