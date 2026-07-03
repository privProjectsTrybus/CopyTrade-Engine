-- Trader seed data

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('4527034c-a1d8-4784-b54c-1977da85edc2','AlphaWave','BTC/ETH swing trader. Risk-first approach with max 3x leverage.','BINANCE','FUTURES_SWING',28,'{"BTCUSDT","ETHUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('f6630841-7364-4371-bc04-bcd2f638f981','4527034c-a1d8-4784-b54c-1977da85edc2',71.4,12.3,38.2,124.5,2.8,3421,8.2,18.5,'[{"month":"2025-02","roi":3.21},{"month":"2025-03","roi":1.3},{"month":"2025-04","roi":7.3},{"month":"2025-05","roi":7.97},{"month":"2025-06","roi":6.19},{"month":"2025-07","roi":3.41},{"month":"2025-08","roi":2.47},{"month":"2025-09","roi":3.89},{"month":"2025-10","roi":3.95},{"month":"2025-11","roi":8.18},{"month":"2025-12","roi":2.45},{"month":"2026-01","roi":4.72},{"month":"2026-02","roi":6.32},{"month":"2026-03","roi":8.56},{"month":"2026-04","roi":5.24},{"month":"2026-05","roi":2.56},{"month":"2026-06","roi":9.49},{"month":"2026-07","roi":6.8}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('fe74ec42-fefa-4d9c-ab1c-f7f3dc45c138','4527034c-a1d8-4784-b54c-1977da85edc2','BTCUSDT','LONG',0.12,67400,3,65000,72000,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('44781a69-ef30-497a-8b45-d251d6713776','GhostScalp','High-frequency BTC scalper. 50-100 trades/day.','BINANCE','FUTURES_SCALPER',62,'{"BTCUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('b89ba445-2f4e-4288-b7dc-c8b620302195','44781a69-ef30-497a-8b45-d251d6713776',64.8,18.7,52.1,189.3,8.2,1820,14.1,0.4,'[{"month":"2025-02","roi":5.22},{"month":"2025-03","roi":2.61},{"month":"2025-04","roi":11.52},{"month":"2025-05","roi":11.36},{"month":"2025-06","roi":11.4},{"month":"2025-07","roi":11.98},{"month":"2025-08","roi":11},{"month":"2025-09","roi":7.05},{"month":"2025-10","roi":-0.27},{"month":"2025-11","roi":14.68},{"month":"2025-12","roi":12.86},{"month":"2026-01","roi":4.11},{"month":"2026-02","roi":14.13},{"month":"2026-03","roi":7.63},{"month":"2026-04","roi":-0.03},{"month":"2026-05","roi":12.16},{"month":"2026-06","roi":0.4},{"month":"2026-07","roi":6.67}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('29fe013b-cb18-4162-a393-6c9057424165','44781a69-ef30-497a-8b45-d251d6713776','BTCUSDT','SHORT',0.05,67600,8,68200,66800,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('ed5b665b-6df9-4278-92fe-1281f9afac0d','StellarMomentum','Multi-asset futures. Trend-following with ATR-based stops.','BYBIT','FUTURES_SWING',35,'{"BTCUSDT","SOLUSDT","ETHUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('70d74065-f001-41ed-9cbf-07147beb636d','ed5b665b-6df9-4278-92fe-1281f9afac0d',58.2,9.1,29.8,97.4,3.5,2104,11.3,36.2,'[{"month":"2025-02","roi":5.33},{"month":"2025-03","roi":1.94},{"month":"2025-04","roi":0.84},{"month":"2025-05","roi":4.62},{"month":"2025-06","roi":3.27},{"month":"2025-07","roi":3.8},{"month":"2025-08","roi":5.36},{"month":"2025-09","roi":0.97},{"month":"2025-10","roi":6.34},{"month":"2025-11","roi":4.42},{"month":"2025-12","roi":3.33},{"month":"2026-01","roi":1.33},{"month":"2026-02","roi":5.61},{"month":"2026-03","roi":3.49},{"month":"2026-04","roi":0.72},{"month":"2026-05","roi":4.25},{"month":"2026-06","roi":5.73},{"month":"2026-07","roi":6.95}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('6e3b2cd7-e23f-4fc1-b900-9f4efd8234e5','ed5b665b-6df9-4278-92fe-1281f9afac0d','SOLUSDT','LONG',4.5,172,3,162,196,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('3cbaf63f-8e8f-498f-bc49-6eeb1ff0fa2c','IronVault','Conservative spot/futures blend. Max 2x leverage.','BINANCE','SPOT_SWING',18,'{"BTCUSDT","ETHUSDT","BNBUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('d1ab640d-da43-454b-95eb-86ec25cdda3a','3cbaf63f-8e8f-498f-bc49-6eeb1ff0fa2c',74.1,6.2,21.4,67.8,1.5,5812,5.1,72,'[{"month":"2025-02","roi":0.04},{"month":"2025-03","roi":3.73},{"month":"2025-04","roi":0.73},{"month":"2025-05","roi":4.66},{"month":"2025-06","roi":3.83},{"month":"2025-07","roi":0.86},{"month":"2025-08","roi":1.86},{"month":"2025-09","roi":0.82},{"month":"2025-10","roi":1.62},{"month":"2025-11","roi":2.03},{"month":"2025-12","roi":3.35},{"month":"2026-01","roi":2.75},{"month":"2026-02","roi":0.45},{"month":"2026-03","roi":1.09},{"month":"2026-04","roi":0.76},{"month":"2026-05","roi":4.21},{"month":"2026-06","roi":2.92},{"month":"2026-07","roi":4.8}]'::jsonb,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('08da6f1b-1a92-45af-a1de-67d2dd731158','NeonBreak','Breakout specialist. Waits for clear structure breaks.','BYBIT','FUTURES_SWING',44,'{"BTCUSDT","AVAXUSDT","LINKUSDT"}',false,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('a3eb2ab8-cbf6-46a9-b4bd-7cece0745b91','08da6f1b-1a92-45af-a1de-67d2dd731158',52.6,14.8,43.1,138.7,5,987,18.9,14,'[{"month":"2025-02","roi":9.69},{"month":"2025-03","roi":9.11},{"month":"2025-04","roi":6.48},{"month":"2025-05","roi":8.02},{"month":"2025-06","roi":10.02},{"month":"2025-07","roi":8.3},{"month":"2025-08","roi":1.28},{"month":"2025-09","roi":0.62},{"month":"2025-10","roi":2.25},{"month":"2025-11","roi":9.56},{"month":"2025-12","roi":0.43},{"month":"2026-01","roi":8.89},{"month":"2026-02","roi":9.38},{"month":"2026-03","roi":7.17},{"month":"2026-04","roi":8.6},{"month":"2026-05","roi":8.96},{"month":"2026-06","roi":8.69},{"month":"2026-07","roi":0.12}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('95103a31-5b7d-4b6f-a5ba-f96e3d9b5500','08da6f1b-1a92-45af-a1de-67d2dd731158','AVAXUSDT','LONG',12,38.4,5,35.8,44.2,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('aeab01f2-470c-4931-8157-f3aad1c02f82','QuantDelta','Algorithmic mean-reversion. Bollinger Bands + RSI.','BINANCE','FUTURES_SCALPER',51,'{"ETHUSDT","SOLUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('156cac26-345b-406e-95a5-80170b2a96c9','aeab01f2-470c-4931-8157-f3aad1c02f82',67.3,11.4,33.9,108.2,6.1,1456,12.7,1.8,'[{"month":"2025-02","roi":1.04},{"month":"2025-03","roi":5.13},{"month":"2025-04","roi":6.28},{"month":"2025-05","roi":2.4},{"month":"2025-06","roi":8.43},{"month":"2025-07","roi":1.77},{"month":"2025-08","roi":-0.31},{"month":"2025-09","roi":4.17},{"month":"2025-10","roi":5.8},{"month":"2025-11","roi":6.84},{"month":"2025-12","roi":0.67},{"month":"2026-01","roi":1.89},{"month":"2026-02","roi":0.83},{"month":"2026-03","roi":4.84},{"month":"2026-04","roi":-0.08},{"month":"2026-05","roi":-0.25},{"month":"2026-06","roi":6.09},{"month":"2026-07","roi":3.97}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('fc568f6d-be4a-4aed-85c6-f2a93f55ccd8','aeab01f2-470c-4931-8157-f3aad1c02f82','ETHUSDT','SHORT',0.2,3510,5,3600,3400,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('3956636a-b41b-4b9a-8775-eaff04af850c','TideRider','Macro-driven long-only. Holds positions days to weeks.','BYBIT','SPOT_LONG_TERM',22,'{"BTCUSDT","ETHUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('fdfca647-f7b4-42da-8977-e5b47da4e3e6','3956636a-b41b-4b9a-8775-eaff04af850c',79.4,4.8,18.1,58.4,1,8234,6.3,168,'[{"month":"2025-02","roi":1.76},{"month":"2025-03","roi":1.37},{"month":"2025-04","roi":0.14},{"month":"2025-05","roi":0.31},{"month":"2025-06","roi":2.59},{"month":"2025-07","roi":3.13},{"month":"2025-08","roi":0.79},{"month":"2025-09","roi":3.5},{"month":"2025-10","roi":2.51},{"month":"2025-11","roi":0.35},{"month":"2025-12","roi":-0.12},{"month":"2026-01","roi":3.61},{"month":"2026-02","roi":3.07},{"month":"2026-03","roi":2.67},{"month":"2026-04","roi":1.01},{"month":"2026-05","roi":3.66},{"month":"2026-06","roi":0.7},{"month":"2026-07","roi":2.21}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('9c8729fe-eea7-4b08-9cf7-f5a0546a26d5','3956636a-b41b-4b9a-8775-eaff04af850c','BTCUSDT','LONG',0.08,66900,1,60000,80000,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('98ab4157-7c42-49a2-87cc-e3c1418cc738','CryptoNova','Altcoin futures hunter. Catches breakouts on mid-caps.','BYBIT','FUTURES_SCALPER',78,'{"SUIUSDT","ARBUSDT"}',false,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('ab427033-f630-4e30-9aa1-bde0e4ef4e24','98ab4157-7c42-49a2-87cc-e3c1418cc738',48.1,28.4,71.2,241.8,12,642,32.4,0.8,'[{"month":"2025-02","roi":11.15},{"month":"2025-03","roi":15.61},{"month":"2025-04","roi":20.33},{"month":"2025-05","roi":9.87},{"month":"2025-06","roi":2},{"month":"2025-07","roi":12.03},{"month":"2025-08","roi":6.06},{"month":"2025-09","roi":11.91},{"month":"2025-10","roi":2.86},{"month":"2025-11","roi":14.3},{"month":"2025-12","roi":-0.64},{"month":"2026-01","roi":11.41},{"month":"2026-02","roi":14.62},{"month":"2026-03","roi":18.12},{"month":"2026-04","roi":2.77},{"month":"2026-05","roi":18.41},{"month":"2026-06","roi":0.11},{"month":"2026-07","roi":16.8}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('b24dcc1d-1ff5-41d4-a483-77618fe1046a','98ab4157-7c42-49a2-87cc-e3c1418cc738','SUIUSDT','LONG',180,1.06,10,0.98,1.24,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('fc938711-2676-41a3-91f4-ddf60738a082','ZenTrend','Patient trend follower. 200 EMA + MACD. Never chases.','BINANCE','FUTURES_SWING',31,'{"BTCUSDT","ETHUSDT","BNBUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('e198ee91-08f4-4101-bea8-e7c5f25b11ea','fc938711-2676-41a3-91f4-ddf60738a082',62.7,8.4,26.2,84.3,2.5,3102,9.8,48,'[{"month":"2025-02","roi":2.32},{"month":"2025-03","roi":6.01},{"month":"2025-04","roi":0.56},{"month":"2025-05","roi":0.37},{"month":"2025-06","roi":5.14},{"month":"2025-07","roi":0.67},{"month":"2025-08","roi":-0.03},{"month":"2025-09","roi":1.67},{"month":"2025-10","roi":3.57},{"month":"2025-11","roi":0.7},{"month":"2025-12","roi":4.24},{"month":"2026-01","roi":4.58},{"month":"2026-02","roi":4.01},{"month":"2026-03","roi":-0.17},{"month":"2026-04","roi":-0.03},{"month":"2026-05","roi":1.06},{"month":"2026-06","roi":5.81},{"month":"2026-07","roi":1.2}]'::jsonb,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('1afc1425-8e16-49b6-b1db-afb7d10d331d','PulseTrack','Order flow analyst. Reads liquidation maps and funding rates.','BYBIT','FUTURES_SWING',47,'{"BTCUSDT","ETHUSDT"}',true,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('c8078882-b983-4ced-92af-88db8d31d083','1afc1425-8e16-49b6-b1db-afb7d10d331d',61.1,15.2,41.8,132.6,4.8,2287,16.2,8,'[{"month":"2025-02","roi":1.01},{"month":"2025-03","roi":4.85},{"month":"2025-04","roi":0.72},{"month":"2025-05","roi":6.57},{"month":"2025-06","roi":0.36},{"month":"2025-07","roi":9.77},{"month":"2025-08","roi":5.81},{"month":"2025-09","roi":8.85},{"month":"2025-10","roi":7.27},{"month":"2025-11","roi":0.13},{"month":"2025-12","roi":9.63},{"month":"2026-01","roi":9.2},{"month":"2026-02","roi":11.8},{"month":"2026-03","roi":8.14},{"month":"2026-04","roi":5.42},{"month":"2026-05","roi":0.34},{"month":"2026-06","roi":11.31},{"month":"2026-07","roi":2.36}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('0fcb625f-2f96-4e1b-98ba-47dca61fdd18','1afc1425-8e16-49b6-b1db-afb7d10d331d','BTCUSDT','LONG',0.09,67100,5,65500,70500,true,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('8131ca2e-5c1d-48e6-9554-d4d041f48a34','ColdLogic','Systematic delta-neutral trader. Profits from volatility.','BINANCE','FUTURES_SCALPER',55,'{"BTCUSDT","ETHUSDT"}',false,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('065b53f9-c825-4c22-88dd-a3ba1993c167','8131ca2e-5c1d-48e6-9554-d4d041f48a34',71.8,7.3,22.4,76.1,5.5,894,7.6,2.4,'[{"month":"2025-02","roi":5.73},{"month":"2025-03","roi":2.52},{"month":"2025-04","roi":1.66},{"month":"2025-05","roi":3.04},{"month":"2025-06","roi":0.49},{"month":"2025-07","roi":-0.18},{"month":"2025-08","roi":0.1},{"month":"2025-09","roi":3.2},{"month":"2025-10","roi":3.38},{"month":"2025-11","roi":-0.05},{"month":"2025-12","roi":4.47},{"month":"2026-01","roi":5.41},{"month":"2026-02","roi":5.58},{"month":"2026-03","roi":1.9},{"month":"2026-04","roi":5.62},{"month":"2026-05","roi":-0.16},{"month":"2026-06","roi":-0.08},{"month":"2026-07","roi":1.59}]'::jsonb,now());

INSERT INTO "TraderProfile" (id,"displayName",bio,exchange,"tradingStyle","riskScore",specialties,"isVerified","isActive","createdAt","updatedAt")
VALUES ('565a0b6c-5cdc-4e0c-a44a-6279867df532','VelocityX','News + sentiment driven. Fast entries on macro events.','BYBIT','FUTURES_SWING',68,'{"BTCUSDT","ETHUSDT","SOLUSDT"}',false,true,now(),now());

INSERT INTO "TraderStatistics" (id,"traderProfileId","winRate","roi30d","roi90d","roi1y","avgLeverage","followerCount","maxDrawdown","avgHoldingHours","monthlyReturns","updatedAt")
VALUES ('c330df07-206f-424c-8c5f-b1540919db8e','565a0b6c-5cdc-4e0c-a44a-6279867df532',54.9,21.6,58.4,196.2,7.4,1134,24.7,6,'[{"month":"2025-02","roi":3.71},{"month":"2025-03","roi":12.16},{"month":"2025-04","roi":11.49},{"month":"2025-05","roi":2.08},{"month":"2025-06","roi":2.76},{"month":"2025-07","roi":13.63},{"month":"2025-08","roi":15.09},{"month":"2025-09","roi":11.44},{"month":"2025-10","roi":11.09},{"month":"2025-11","roi":0.26},{"month":"2025-12","roi":3.44},{"month":"2026-01","roi":0.09},{"month":"2026-02","roi":2.09},{"month":"2026-03","roi":13.87},{"month":"2026-04","roi":14.64},{"month":"2026-05","roi":11.19},{"month":"2026-06","roi":9.02},{"month":"2026-07","roi":-0.42}]'::jsonb,now());
INSERT INTO "TraderSignal" (id,"traderProfileId",symbol,side,size,"entryPrice",leverage,"stopLossPrice","takeProfitPrice","isOpen","openedAt")
VALUES ('e633ddd2-564b-40b2-9789-945197d6c200','565a0b6c-5cdc-4e0c-a44a-6279867df532','SOLUSDT','SHORT',8,175,7,183,160,true,now());
