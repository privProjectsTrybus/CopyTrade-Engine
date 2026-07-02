"use client";
// src/context/EngineContext.tsx
// Provides the copy engine singleton to the entire app.
// On mount: fetches decrypted credentials from the server, registers
// exchange clients, loads the user's risk profile, then starts the engine.

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { BinanceClient } from "@/lib/exchange/binance";
import { BybitClient } from "@/lib/exchange/bybit";
import { copyEngine, EngineEvent } from "@/lib/copyEngine";
import type { RiskLimits } from "@/lib/riskEngine";

interface EngineContextValue {
  isRunning: boolean;
  isLoading: boolean;
  events: EngineEvent[];
  start: () => void;
  stop: () => void;
}

const EngineContext = createContext<EngineContextValue>({
  isRunning: false,
  isLoading: true,
  events: [],
  start: () => {},
  stop: () => {},
});

export function EngineProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      try {
        // Load decrypted credentials over authenticated HTTPS session
        const [credsRes, riskRes] = await Promise.all([
          fetch("/api/exchange/credentials"),
          fetch("/api/risk"),
        ]);

        if (credsRes.ok) {
          const creds: Array<{ connectionId: string; exchange: string; apiKey: string; apiSecret: string }> = await credsRes.json();
          for (const c of creds) {
            if (!c.apiKey) continue; // reconnect needed
            const client =
              c.exchange === "BINANCE"
                ? new BinanceClient({ apiKey: c.apiKey, apiSecret: c.apiSecret })
                : new BybitClient({ apiKey: c.apiKey, apiSecret: c.apiSecret });
            copyEngine.registerClient(c.connectionId, client);
          }
        }

        if (riskRes.ok) {
          const risk: RiskLimits = await riskRes.json();
          copyEngine.setRiskLimits(risk);
        }
      } catch (err) {
        console.error("Engine init failed:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    // Subscribe to engine events
    const unsub = copyEngine.onEvent((event) => {
      setEvents((prev) => [event, ...prev].slice(0, 100));
    });

    return () => {
      unsub();
      copyEngine.stop();
    };
  }, []);

  const start = () => {
    copyEngine.start(5000);
    setIsRunning(true);
  };

  const stop = () => {
    copyEngine.stop();
    setIsRunning(false);
  };

  return (
    <EngineContext.Provider value={{ isRunning, isLoading, events, start, stop }}>
      {children}
    </EngineContext.Provider>
  );
}

export const useEngine = () => useContext(EngineContext);
