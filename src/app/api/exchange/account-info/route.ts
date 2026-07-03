// Server-side exchange proxy — avoids browser CORS blocks from Bybit/Binance.
// Decrypts keys, calls exchange server-side, returns sanitised result.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { hmacSha256 } from "@/lib/exchange/signing";

async function binanceAccountInfo(apiKey: string, apiSecret: string) {
  const ts = Date.now();
  const qs = `timestamp=${ts}&recvWindow=5000`;
  const sig = await hmacSha256(apiSecret, qs);
  const res = await fetch(`https://fapi.binance.com/fapi/v2/account?${qs}&signature=${sig}`, {
    headers: { "X-MBX-APIKEY": apiKey },
  });
  if (!res.ok) throw new Error(`Binance ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    totalWalletBalance: parseFloat(d.totalWalletBalance ?? "0"),
    availableBalance: parseFloat(d.availableBalance ?? "0"),
    totalUnrealizedPnl: parseFloat(d.totalUnrealizedProfit ?? "0"),
    marginRatio: parseFloat(d.totalMarginBalance ?? "1") > 0
      ? parseFloat(d.totalMaintMargin ?? "0") / parseFloat(d.totalMarginBalance ?? "1") : 0,
    canTrade: d.canTrade,
    canWithdraw: d.canWithdraw,
  };
}

async function bybitAccountInfo(apiKey: string, apiSecret: string) {
  const types = ["UNIFIED", "CONTRACT", "SPOT"];
  for (const accountType of types) {
    try {
      const ts = String(Date.now());
      const qs = `accountType=${accountType}`;
      const sig = await hmacSha256(apiSecret, `${ts}${apiKey}5000${qs}`);
      const res = await fetch(`https://api.bybit.com/v5/account/wallet-balance?${qs}`, {
        headers: { "X-BAPI-API-KEY": apiKey, "X-BAPI-TIMESTAMP": ts, "X-BAPI-RECV-WINDOW": "5000", "X-BAPI-SIGN": sig },
      });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.retCode !== 0) continue;
      const account = json.result?.list?.[0] ?? {};
      const walletBalance = parseFloat(account.totalWalletBalance ?? account.totalEquity ?? "0");
      return {
        totalWalletBalance: walletBalance,
        availableBalance: parseFloat(account.totalAvailableBalance ?? String(walletBalance)),
        totalUnrealizedPnl: parseFloat(account.totalPerpUPL ?? account.totalUnrealisedPnl ?? "0"),
        marginRatio: 0,
        canTrade: true,
        canWithdraw: false,
      };
    } catch {}
  }
  throw new Error("Could not connect to Bybit. Check your API key permissions.");
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("connectionId");
  if (!connectionId) return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });

  const conn = await prisma.exchangeConnection.findFirst({ where: { id: connectionId, userId, isActive: true } });
  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  const [keyIv, secretIv] = conn.encryptionIv.split("|");
  const [keyTag, secretTag] = conn.encryptionTag.split("|");
  let apiKey = "", apiSecret = "";
  try {
    apiKey = decryptSecret({ ciphertext: conn.encryptedApiKey, iv: keyIv, tag: keyTag });
    apiSecret = decryptSecret({ ciphertext: conn.encryptedApiSecret, iv: secretIv, tag: secretTag });
  } catch {
    return NextResponse.json({ error: "Failed to decrypt credentials. Reconnect this exchange." }, { status: 500 });
  }

  try {
    const info = conn.exchange === "BINANCE"
      ? await binanceAccountInfo(apiKey, apiSecret)
      : await bybitAccountInfo(apiKey, apiSecret);

    // Update permission flags
    await prisma.exchangeConnection.update({
      where: { id: connectionId },
      data: { hasTradePermission: info.canTrade, hasWithdrawPermission: info.canWithdraw ?? false, lastSyncedAt: new Date(), lastSyncError: null },
    });

    return NextResponse.json(info, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    await prisma.exchangeConnection.update({ where: { id: connectionId }, data: { lastSyncError: String(e) } });
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
