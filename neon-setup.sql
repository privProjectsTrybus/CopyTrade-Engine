-- CopyTrade Engine — full schema migration
-- Run this in Neon SQL Editor to create all tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING_VERIFICATION');
CREATE TYPE "ExchangeName" AS ENUM ('BINANCE', 'BYBIT');
CREATE TYPE "TradingStyle" AS ENUM ('FUTURES_SCALPER', 'FUTURES_SWING', 'SPOT_SWING', 'SPOT_LONG_TERM');
CREATE TYPE "AllocationType" AS ENUM ('FIXED_AMOUNT', 'PERCENTAGE_OF_ACCOUNT');
CREATE TYPE "SizingMode" AS ENUM ('EXACT_MIRROR', 'SCALED_MIRROR', 'FIXED_DOLLAR');
CREATE TYPE "TradeSide" AS ENUM ('LONG', 'SHORT');
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'OPEN', 'CLOSED', 'FAILED', 'REJECTED_BY_RISK_ENGINE');
CREATE TYPE "NotificationChannel" AS ENUM ('BROWSER', 'EMAIL', 'TELEGRAM', 'DISCORD');
CREATE TYPE "ApprovalMode" AS ENUM ('FULL_AUTO', 'SEMI_AUTO', 'MANUAL');
CREATE TYPE "StrategyType" AS ENUM ('TREND_FOLLOWING', 'MOMENTUM', 'BREAKOUT', 'MEAN_REVERSION');
CREATE TYPE "AiSignalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED');

-- User
CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT,
  "email" TEXT UNIQUE,
  "emailVerified" TIMESTAMP,
  "image" TEXT,
  "passwordHash" TEXT,
  "role" "Role" NOT NULL DEFAULT 'USER',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  "twoFactorSecret" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE("provider", "providerAccountId")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expires" TIMESTAMP NOT NULL
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP NOT NULL,
  UNIQUE("identifier", "token")
);

CREATE TABLE "TrustedDevice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "deviceHash" TEXT NOT NULL,
  "label" TEXT,
  "lastSeenAt" TIMESTAMP NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMP NOT NULL,
  UNIQUE("userId", "deviceHash")
);

CREATE TABLE "ExchangeConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "exchange" "ExchangeName" NOT NULL,
  "label" TEXT,
  "encryptedApiKey" TEXT NOT NULL,
  "encryptedApiSecret" TEXT NOT NULL,
  "encryptionIv" TEXT NOT NULL,
  "encryptionTag" TEXT NOT NULL,
  "hasWithdrawPermission" BOOLEAN NOT NULL DEFAULT false,
  "hasTradePermission" BOOLEAN NOT NULL DEFAULT false,
  "hasReadPermission" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP,
  "lastSyncError" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "ExchangeConnection_userId_idx" ON "ExchangeConnection"("userId");

CREATE TABLE "TraderProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "bio" TEXT,
  "exchange" "ExchangeName" NOT NULL,
  "tradingStyle" "TradingStyle" NOT NULL,
  "riskScore" INTEGER NOT NULL DEFAULT 50,
  "specialties" TEXT[] NOT NULL DEFAULT '{}',
  "isVerified" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "TraderStatistics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "traderProfileId" TEXT NOT NULL UNIQUE REFERENCES "TraderProfile"("id") ON DELETE CASCADE,
  "winRate" FLOAT NOT NULL DEFAULT 0,
  "roi30d" FLOAT NOT NULL DEFAULT 0,
  "roi90d" FLOAT NOT NULL DEFAULT 0,
  "roi1y" FLOAT NOT NULL DEFAULT 0,
  "avgLeverage" FLOAT NOT NULL DEFAULT 1,
  "followerCount" INTEGER NOT NULL DEFAULT 0,
  "maxDrawdown" FLOAT NOT NULL DEFAULT 0,
  "avgHoldingHours" FLOAT NOT NULL DEFAULT 0,
  "monthlyReturns" JSONB NOT NULL DEFAULT '[]',
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "TraderSignal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "traderProfileId" TEXT NOT NULL REFERENCES "TraderProfile"("id") ON DELETE CASCADE,
  "symbol" TEXT NOT NULL,
  "side" "TradeSide" NOT NULL,
  "size" FLOAT NOT NULL,
  "entryPrice" FLOAT NOT NULL,
  "leverage" FLOAT NOT NULL DEFAULT 1,
  "stopLossPrice" FLOAT,
  "takeProfitPrice" FLOAT,
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "openedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "closedAt" TIMESTAMP
);
CREATE INDEX "TraderSignal_traderProfileId_isOpen_idx" ON "TraderSignal"("traderProfileId", "isOpen");

CREATE TABLE "CopyRelationship" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "traderProfileId" TEXT NOT NULL REFERENCES "TraderProfile"("id") ON DELETE CASCADE,
  "exchangeConnectionId" TEXT NOT NULL REFERENCES "ExchangeConnection"("id") ON DELETE CASCADE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "allocationType" "AllocationType" NOT NULL DEFAULT 'FIXED_AMOUNT',
  "allocationValue" FLOAT NOT NULL,
  "sizingMode" "SizingMode" NOT NULL DEFAULT 'SCALED_MIRROR',
  "riskMultiplier" FLOAT NOT NULL DEFAULT 1.0,
  "maxPositionSize" FLOAT,
  "maxLeverage" FLOAT,
  "allowedSymbols" TEXT[] NOT NULL DEFAULT '{}',
  "blockedSymbols" TEXT[] NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "CopyRelationship_userId_idx" ON "CopyRelationship"("userId");
CREATE INDEX "CopyRelationship_traderProfileId_idx" ON "CopyRelationship"("traderProfileId");

CREATE TABLE "RiskProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "maxAccountExposurePct" FLOAT NOT NULL DEFAULT 30,
  "maxTradeRiskPct" FLOAT NOT NULL DEFAULT 1,
  "maxDailyLossPct" FLOAT NOT NULL DEFAULT 3,
  "maxWeeklyLossPct" FLOAT NOT NULL DEFAULT 7,
  "maxMonthlyLossPct" FLOAT NOT NULL DEFAULT 12,
  "maxOpenPositions" INTEGER NOT NULL DEFAULT 10,
  "isPaused" BOOLEAN NOT NULL DEFAULT false,
  "pausedReason" TEXT,
  "pausedAt" TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "Trade" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "exchangeConnectionId" TEXT NOT NULL REFERENCES "ExchangeConnection"("id") ON DELETE CASCADE,
  "copyRelationshipId" TEXT,
  "symbol" TEXT NOT NULL,
  "side" "TradeSide" NOT NULL,
  "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
  "requestedSize" FLOAT NOT NULL,
  "executedSize" FLOAT,
  "entryPrice" FLOAT,
  "stopLossPrice" FLOAT,
  "takeProfitPrice" FLOAT,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");
CREATE INDEX "Trade_status_idx" ON "Trade"("status");

CREATE TABLE "OpenPosition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "exchangeConnectionId" TEXT NOT NULL REFERENCES "ExchangeConnection"("id") ON DELETE CASCADE,
  "symbol" TEXT NOT NULL,
  "side" "TradeSide" NOT NULL,
  "size" FLOAT NOT NULL,
  "entryPrice" FLOAT NOT NULL,
  "markPrice" FLOAT,
  "leverage" FLOAT NOT NULL DEFAULT 1,
  "unrealizedPnl" FLOAT NOT NULL DEFAULT 0,
  "stopLossPrice" FLOAT,
  "takeProfitPrice" FLOAT,
  "openedAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "OpenPosition_userId_idx" ON "OpenPosition"("userId");

CREATE TABLE "ClosedPosition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "exchangeConnectionId" TEXT NOT NULL REFERENCES "ExchangeConnection"("id") ON DELETE CASCADE,
  "symbol" TEXT NOT NULL,
  "side" "TradeSide" NOT NULL,
  "size" FLOAT NOT NULL,
  "entryPrice" FLOAT NOT NULL,
  "exitPrice" FLOAT NOT NULL,
  "realizedPnl" FLOAT NOT NULL,
  "leverage" FLOAT NOT NULL DEFAULT 1,
  "openedAt" TIMESTAMP NOT NULL,
  "closedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "ClosedPosition_userId_idx" ON "ClosedPosition"("userId");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "channel" "NotificationChannel" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "ipHash" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

CREATE TABLE "AiStrategy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "strategyType" "StrategyType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "approvalMode" "ApprovalMode" NOT NULL DEFAULT 'MANUAL',
  "allocationPct" FLOAT NOT NULL DEFAULT 10,
  "maxLeverage" FLOAT NOT NULL DEFAULT 3,
  "symbols" TEXT[] NOT NULL DEFAULT '{}',
  "parametersJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "AiSignal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "aiStrategyId" TEXT NOT NULL REFERENCES "AiStrategy"("id") ON DELETE CASCADE,
  "symbol" TEXT NOT NULL,
  "side" "TradeSide" NOT NULL,
  "confidence" FLOAT NOT NULL,
  "entryPrice" FLOAT NOT NULL,
  "stopLossPrice" FLOAT NOT NULL,
  "takeProfitPrice" FLOAT NOT NULL,
  "leverage" FLOAT NOT NULL DEFAULT 1,
  "rationale" TEXT NOT NULL,
  "status" "AiSignalStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP NOT NULL,
  "executedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE "NotificationSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "browserEnabled" BOOLEAN NOT NULL DEFAULT true,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "telegramEnabled" BOOLEAN NOT NULL DEFAULT false,
  "telegramChatId" TEXT,
  "discordEnabled" BOOLEAN NOT NULL DEFAULT false,
  "discordWebhookUrl" TEXT,
  "onTradeOpen" BOOLEAN NOT NULL DEFAULT true,
  "onTradeClose" BOOLEAN NOT NULL DEFAULT true,
  "onStopLossHit" BOOLEAN NOT NULL DEFAULT true,
  "onRiskBreach" BOOLEAN NOT NULL DEFAULT true,
  "onExchangeError" BOOLEAN NOT NULL DEFAULT true,
  "onAiSignal" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) NOT NULL PRIMARY KEY,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);

-- Admin user + required related rows
INSERT INTO "User" (id, name, email, "passwordHash", role, status, "twoFactorEnabled", "createdAt", "updatedAt")
VALUES (
  'admin-user-001',
  'Admin',
  'admin@copytrade.app',
  '$2a$12$xeJqFbfOEaEsRLLiTMcvoulLPcbc62cMb6aa8QzV0BZxtLlGPTGqu',
  'ADMIN',
  'ACTIVE',
  false,
  now(),
  now()
);

INSERT INTO "RiskProfile" (id, "userId", "updatedAt")
VALUES ('riskprofile-admin-001', 'admin-user-001', now());

INSERT INTO "NotificationSettings" (id, "userId", "updatedAt")
VALUES ('notif-admin-001', 'admin-user-001', now());
