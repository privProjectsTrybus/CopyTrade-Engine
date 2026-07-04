import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { hmacSha256 } from "@/lib/exchange/signing";

// Fetch with a hard timeout so Vercel functions never hang
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function binanceAccountInfo(apiKey: string, apiSecret: string) {
  const ts = Date.now();
  const qs = `timestamp=${ts}&recvWindow=5000`;
  const sig = await hmacSha256(apiSecret, qs);
  const res = await fetchWithTimeout(
    `https://fapi.binance.com/fapi/v2/account?${qs}&signature=${sig}`,
    { headers: { "X-MBX-APIKEY": apiKey } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => res.status.toString());
    throw new Error(`Binance error ${res.status}: ${text}`);
  }
  const d = await res.json();
  return {
    totalWalletBalance: parseFloat(d.totalWalletBalance ?? "0"),
    availableBalance: parseFloat(d.availableBalance ?? "0"),
    totalUnrealizedPnl: parseFloat(d.totalUnrealizedProfit ?? "0"),
    marginRatio: parseFloat(d.totalMarginBalance ?? "1") > 0
      ? parseFloat(d.totalMaintMargin ?? "0") / parseFloat(d.totalMarginBalance ?? "1") : 0,
    canTrade: d.canTrade ?? false,
    canWithdraw: d.canWithdraw ?? false,
  };
}

async function bybitAccountInfo(apiKey: string, apiSecret: string) {
  const types = ["UNIFIED", "CONTRACT", "SPOT"];
  const errors: string[] = [];

  for (const accountType of types) {
    try {
      const ts = String(Date.now());
      const qs = `accountType=${accountType}`;
      const sig = await hmacSha256(apiSecret, `${ts}${apiKey}5000${qs}`);
      const res = await fetchWithTimeout(
        `https://api.bybit.com/v5/account/wallet-balance?${qs}`,
        { headers: { "X-BAPI-API-KEY": apiKey, "X-BAPI-TIMESTAMP": ts, "X-BAPI-RECV-WINDOW": "5000", "X-BAPI-SIGN": sig } }
      );
      if (!res.ok) { errors.push(`HTTP ${res.status} for ${accountType}`); continue; }
      const json = await res.json();
      if (json.retCode !== 0) { errors.push(`${accountType}: ${json.retMsg}`); continue; }
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
    } catch (e) {
      const msg = String(e).includes("abort") ? `${accountType}: timed out` : `${accountType}: ${e}`;
      errors.push(msg);
    }
  }
  throw new Error(`Bybit connection failed — ${errors.join(" | ")}`);
}


async function okxAccountInfo(apiKey: string, apiSecret: string, passphrase: string) {
  const ts = new Date().toISOString().replace(/\.\d{3}/, ".000");
  const path = "/api/v5/account/balance";
  const msg = `${ts}GET${path}`;
  // OKX sign: base64(hmac-sha256)
  const hexSig = await hmacSha256(apiSecret, msg);
  const bytes = hexSig.match(/.{2}/g)!.map((b: string) => parseInt(b, 16));
  const sig = Buffer.from(bytes).toString("base64");
  const res = await fetchWithTimeout(`https://www.okx.com${path}`, {
    headers: { "OK-ACCESS-KEY": apiKey, "OK-ACCESS-SIGN": sig, "OK-ACCESS-TIMESTAMP": ts, "OK-ACCESS-PASSPHRASE": passphrase, "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error(`OKX HTTP ${res.status}`);
  const json = await res.json();
  if (json.code !== "0") throw new Error(`OKX ${json.code}: ${json.msg}`);
  const account = json.data?.[0] ?? {};
  const totalEq = parseFloat(account.totalEq ?? "0");
  return {
    totalWalletBalance: totalEq,
    availableBalance: parseFloat(account.adjEq ?? String(totalEq)),
    totalUnrealizedPnl: parseFloat(account.upl ?? "0"),
    marginRatio: 0,
    canTrade: true,
    canWithdraw: false,
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const connectionId = new URL(req.url).searchParams.get("connectionId");
  if (!connectionId) return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });

  const conn = await prisma.exchangeConnection.findFirst({ where: { id: connectionId, userId, isActive: true } });
  if (!conn) return NextResponse.json({ error: "Connection not found" }, { status: 404 });

  let apiKey = "", apiSecret = "";
  try {
    const [keyIv, secretIv] = conn.encryptionIv.split("|");
    const [keyTag, secretTag] = conn.encryptionTag.split("|");
    apiKey = decryptSecret({ ciphertext: conn.encryptedApiKey, iv: keyIv, tag: keyTag });
    apiSecret = decryptSecret({ ciphertext: conn.encryptedApiSecret, iv: secretIv, tag: secretTag });
  } catch {
    return NextResponse.json({ error: "Failed to decrypt credentials — reconnect this exchange." }, { status: 500 });
  }

  try {
    const passphrase = conn.exchange === "OKX" ? (() => {
      try { return decryptSecret({ ciphertext: conn.encryptedApiKey, iv: conn.encryptionIv.split("|")[2] ?? "", tag: conn.encryptionTag.split("|")[2] ?? "" }); } catch { return ""; }
    })() : "";
    const info = conn.exchange === "BINANCE"
      ? await binanceAccountInfo(apiKey, apiSecret)
      : conn.exchange === "OKX"
      ? await okxAccountInfo(apiKey, apiSecret, passphrase)
      : await bybitAccountInfo(apiKey, apiSecret);

    await prisma.exchangeConnection.update({
      where: { id: connectionId },
      data: { hasTradePermission: info.canTrade, hasWithdrawPermission: info.canWithdraw, lastSyncedAt: new Date(), lastSyncError: null },
    });

    return NextResponse.json(info, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const errMsg = String(e);
    await prisma.exchangeConnection.update({ where: { id: connectionId }, data: { lastSyncError: errMsg } }).catch(() => {});
    return NextResponse.json({ error: errMsg }, { status: 502 });
  }
}
