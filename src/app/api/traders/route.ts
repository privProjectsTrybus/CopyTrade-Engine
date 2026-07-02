// src/app/api/traders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get("sortBy") ?? "roi30d";
  const style = searchParams.get("style");
  const riskMax = parseInt(searchParams.get("riskMax") ?? "100");

  const orderMap: Record<string, object> = {
    roi30d: { statistics: { roi30d: "desc" } },
    roi90d: { statistics: { roi90d: "desc" } },
    roi1y: { statistics: { roi1y: "desc" } },
    winRate: { statistics: { winRate: "desc" } },
    drawdown: { statistics: { maxDrawdown: "asc" } },
    followers: { statistics: { followerCount: "desc" } },
    risk: { riskScore: "asc" },
  };

  const traders = await prisma.traderProfile.findMany({
    where: {
      isActive: true,
      riskScore: { lte: riskMax },
      ...(style ? { tradingStyle: style as any } : {}),
    },
    include: { statistics: true },
    orderBy: (orderMap[sortBy] ?? orderMap.roi30d) as any,
    take: 50,
  });

  return NextResponse.json(traders);
}
