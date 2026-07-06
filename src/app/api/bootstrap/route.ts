// src/app/api/bootstrap/route.ts
// Called automatically on first load. Creates any missing tables, columns, and user rows.
// Safe to call multiple times — all operations are idempotent.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id as string;

  const errors: string[] = [];

  // 1. Ensure all required enums exist
  const enums = [
    `DO $$ BEGIN CREATE TYPE "Role" AS ENUM ('USER','ADMIN'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "UserStatus" AS ENUM ('ACTIVE','DISABLED','PENDING_VERIFICATION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "ExchangeName" AS ENUM ('BINANCE','BYBIT','OKX'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN ALTER TYPE "ExchangeName" ADD VALUE IF NOT EXISTS 'OKX'; EXCEPTION WHEN others THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "TradingStyle" AS ENUM ('FUTURES_SCALPER','FUTURES_SWING','SPOT_SWING','SPOT_LONG_TERM'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "TradeSide" AS ENUM ('LONG','SHORT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "TradeStatus" AS ENUM ('PENDING','OPEN','CLOSED','FAILED','REJECTED_BY_RISK_ENGINE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "NotificationChannel" AS ENUM ('BROWSER','EMAIL','TELEGRAM','DISCORD'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "AllocationType" AS ENUM ('FIXED_AMOUNT','PERCENTAGE_OF_ACCOUNT'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "SizingMode" AS ENUM ('EXACT_MIRROR','SCALED_MIRROR','FIXED_DOLLAR'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "ApprovalMode" AS ENUM ('FULL_AUTO','SEMI_AUTO','MANUAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "StrategyType" AS ENUM ('TREND_FOLLOWING','MOMENTUM','BREAKOUT','MEAN_REVERSION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "AiSignalStatus" AS ENUM ('PENDING','APPROVED','REJECTED','EXPIRED','EXECUTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  ];

  for (const sql of enums) {
    await prisma.$executeRawUnsafe(sql).catch(e => errors.push(`enum: ${e.message}`));
  }

  // 2. Ensure all tables exist
  const tables = [
    `CREATE TABLE IF NOT EXISTS "Account" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, type TEXT NOT NULL,
      provider TEXT NOT NULL, "providerAccountId" TEXT NOT NULL,
      refresh_token TEXT, access_token TEXT, expires_at INTEGER,
      token_type TEXT, scope TEXT, id_token TEXT, session_state TEXT,
      UNIQUE(provider, "providerAccountId")
    )`,
    `CREATE TABLE IF NOT EXISTS "Session" (
      id TEXT PRIMARY KEY, "sessionToken" TEXT UNIQUE NOT NULL,
      "userId" TEXT NOT NULL, expires TIMESTAMP NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS "VerificationToken" (
      identifier TEXT NOT NULL, token TEXT UNIQUE NOT NULL, expires TIMESTAMP NOT NULL,
      UNIQUE(identifier, token)
    )`,
    `CREATE TABLE IF NOT EXISTS "TrustedDevice" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "deviceHash" TEXT NOT NULL,
      label TEXT, "lastSeenAt" TIMESTAMP DEFAULT now(), "expiresAt" TIMESTAMP NOT NULL,
      UNIQUE("userId", "deviceHash")
    )`,
    `CREATE TABLE IF NOT EXISTS "ExchangeConnection" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, exchange "ExchangeName" NOT NULL,
      label TEXT, "encryptedApiKey" TEXT NOT NULL, "encryptedApiSecret" TEXT NOT NULL,
      "encryptionIv" TEXT NOT NULL, "encryptionTag" TEXT NOT NULL,
      "hasWithdrawPermission" BOOLEAN DEFAULT false, "hasTradePermission" BOOLEAN DEFAULT false,
      "hasReadPermission" BOOLEAN DEFAULT false, "isActive" BOOLEAN DEFAULT true,
      "lastSyncedAt" TIMESTAMP, "lastSyncError" TEXT,
      "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "TraderProfile" (
      id TEXT PRIMARY KEY, "displayName" TEXT NOT NULL, "avatarUrl" TEXT, bio TEXT,
      exchange "ExchangeName" NOT NULL, "tradingStyle" "TradingStyle" NOT NULL,
      "riskScore" INTEGER DEFAULT 50, specialties TEXT[] DEFAULT '{}',
      "isVerified" BOOLEAN DEFAULT false, "isActive" BOOLEAN DEFAULT true,
      "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "TraderStatistics" (
      id TEXT PRIMARY KEY, "traderProfileId" TEXT UNIQUE NOT NULL,
      "winRate" FLOAT DEFAULT 0, "roi30d" FLOAT DEFAULT 0, "roi90d" FLOAT DEFAULT 0,
      "roi1y" FLOAT DEFAULT 0, "avgLeverage" FLOAT DEFAULT 1, "followerCount" INTEGER DEFAULT 0,
      "maxDrawdown" FLOAT DEFAULT 0, "avgHoldingHours" FLOAT DEFAULT 0,
      "monthlyReturns" JSONB DEFAULT '[]', "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "TraderSignal" (
      id TEXT PRIMARY KEY, "traderProfileId" TEXT NOT NULL, symbol TEXT NOT NULL,
      side "TradeSide" NOT NULL, size FLOAT NOT NULL, "entryPrice" FLOAT NOT NULL,
      leverage FLOAT DEFAULT 1, "stopLossPrice" FLOAT, "takeProfitPrice" FLOAT,
      "isOpen" BOOLEAN DEFAULT true, "openedAt" TIMESTAMP DEFAULT now(), "closedAt" TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "RiskProfile" (
      id TEXT PRIMARY KEY, "userId" TEXT UNIQUE NOT NULL,
      "maxAccountExposurePct" FLOAT DEFAULT 30, "maxTradeRiskPct" FLOAT DEFAULT 1,
      "maxDailyLossPct" FLOAT DEFAULT 3, "maxWeeklyLossPct" FLOAT DEFAULT 7,
      "maxMonthlyLossPct" FLOAT DEFAULT 12, "maxOpenPositions" INTEGER DEFAULT 10,
      "isPaused" BOOLEAN DEFAULT false, "pausedReason" TEXT, "pausedAt" TIMESTAMP,
      "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "CopyRelationship" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "traderProfileId" TEXT NOT NULL,
      "exchangeConnectionId" TEXT NOT NULL, "isActive" BOOLEAN DEFAULT true,
      "allocationType" "AllocationType" DEFAULT 'FIXED_AMOUNT', "allocationValue" FLOAT NOT NULL,
      "sizingMode" "SizingMode" DEFAULT 'SCALED_MIRROR', "riskMultiplier" FLOAT DEFAULT 1,
      "maxPositionSize" FLOAT, "maxLeverage" FLOAT,
      "allowedSymbols" TEXT[] DEFAULT '{}', "blockedSymbols" TEXT[] DEFAULT '{}',
      "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "Trade" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "exchangeConnectionId" TEXT NOT NULL,
      "copyRelationshipId" TEXT, symbol TEXT NOT NULL, side "TradeSide" NOT NULL,
      status "TradeStatus" DEFAULT 'PENDING', "requestedSize" FLOAT NOT NULL,
      "executedSize" FLOAT, "entryPrice" FLOAT, "stopLossPrice" FLOAT, "takeProfitPrice" FLOAT,
      "failureReason" TEXT, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "OpenPosition" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "exchangeConnectionId" TEXT NOT NULL,
      symbol TEXT NOT NULL, side "TradeSide" NOT NULL, size FLOAT NOT NULL,
      "entryPrice" FLOAT NOT NULL, "markPrice" FLOAT, leverage FLOAT DEFAULT 1,
      "unrealizedPnl" FLOAT DEFAULT 0, "stopLossPrice" FLOAT, "takeProfitPrice" FLOAT,
      "openedAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "ClosedPosition" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "exchangeConnectionId" TEXT NOT NULL,
      symbol TEXT NOT NULL, side "TradeSide" NOT NULL, size FLOAT NOT NULL,
      "entryPrice" FLOAT NOT NULL, "exitPrice" FLOAT NOT NULL, "realizedPnl" FLOAT NOT NULL,
      leverage FLOAT DEFAULT 1, "openedAt" TIMESTAMP NOT NULL, "closedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "Notification" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, channel "NotificationChannel" NOT NULL,
      title TEXT NOT NULL, body TEXT NOT NULL, "isRead" BOOLEAN DEFAULT false,
      "createdAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "AuditLog" (
      id TEXT PRIMARY KEY, "userId" TEXT, action TEXT NOT NULL,
      metadata JSONB, "ipHash" TEXT, "createdAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "NotificationSettings" (
      id TEXT PRIMARY KEY, "userId" TEXT UNIQUE NOT NULL,
      "browserEnabled" BOOLEAN DEFAULT true, "emailEnabled" BOOLEAN DEFAULT false,
      "telegramEnabled" BOOLEAN DEFAULT false, "telegramChatId" TEXT,
      "telegramBotToken" TEXT,
      "discordEnabled" BOOLEAN DEFAULT false, "discordWebhookUrl" TEXT,
      "onTradeOpen" BOOLEAN DEFAULT true, "onTradeClose" BOOLEAN DEFAULT true,
      "onStopLossHit" BOOLEAN DEFAULT true, "onRiskBreach" BOOLEAN DEFAULT true,
      "onExchangeError" BOOLEAN DEFAULT true, "onAiSignal" BOOLEAN DEFAULT true,
      "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "AiStrategy" (
      id TEXT PRIMARY KEY, "userId" TEXT NOT NULL, name TEXT NOT NULL,
      "strategyType" "StrategyType" NOT NULL, "isActive" BOOLEAN DEFAULT false,
      "approvalMode" "ApprovalMode" DEFAULT 'MANUAL', "allocationPct" FLOAT DEFAULT 10,
      "maxLeverage" FLOAT DEFAULT 3, symbols TEXT[] DEFAULT '{}',
      "parametersJson" JSONB DEFAULT '{}',
      "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS "AiSignal" (
      id TEXT PRIMARY KEY, "aiStrategyId" TEXT NOT NULL, symbol TEXT NOT NULL,
      side "TradeSide" NOT NULL, confidence FLOAT NOT NULL, "entryPrice" FLOAT NOT NULL,
      "stopLossPrice" FLOAT NOT NULL, "takeProfitPrice" FLOAT NOT NULL,
      leverage FLOAT DEFAULT 1, rationale TEXT NOT NULL,
      status "AiSignalStatus" DEFAULT 'PENDING',
      "expiresAt" TIMESTAMP NOT NULL, "executedAt" TIMESTAMP,
      "createdAt" TIMESTAMP DEFAULT now()
    )`,
  ];

  for (const sql of tables) {
    await prisma.$executeRawUnsafe(sql).catch(e => errors.push(`table: ${e.message?.slice(0, 80)}`));
  }

  // 3. Add any missing columns to existing tables
  const columns = [
    `ALTER TABLE "NotificationSettings" ADD COLUMN IF NOT EXISTS "telegramBotToken" TEXT`,
    `ALTER TABLE "TraderProfile" ADD COLUMN IF NOT EXISTS bio TEXT`,
    `ALTER TABLE "TraderProfile" ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}'`,
    `ALTER TABLE "TraderStatistics" ADD COLUMN IF NOT EXISTS "monthlyReturns" JSONB DEFAULT '[]'`,
  ];
  for (const sql of columns) {
    await prisma.$executeRawUnsafe(sql).catch(() => {});
  }

  // 4. Ensure current user has RiskProfile and NotificationSettings rows
  await prisma.$executeRawUnsafe(`
    INSERT INTO "RiskProfile" (id, "userId", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, now())
    ON CONFLICT ("userId") DO NOTHING
  `, userId).catch(e => errors.push(`riskprofile: ${e.message}`));

  await prisma.$executeRawUnsafe(`
    INSERT INTO "NotificationSettings" (id, "userId", "updatedAt")
    VALUES (gen_random_uuid()::text, $1, now())
    ON CONFLICT ("userId") DO NOTHING
  `, userId).catch(e => errors.push(`notif: ${e.message}`));

  return NextResponse.json({ ok: true, errors: errors.length > 0 ? errors : undefined });
}
