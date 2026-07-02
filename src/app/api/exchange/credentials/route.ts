// src/app/api/exchange/credentials/route.ts
//
// SECURITY RATIONALE:
// Decrypted API keys are returned to the authenticated browser session over
// HTTPS. This is intentional — the alternative would be to proxy every
// exchange request through Vercel, which (a) triggers geo-blocking and
// (b) means Vercel's logs would contain signed request URLs.
//
// The browser holds keys in React state (memory only, not localStorage).
// Keys are cleared when the tab is closed. No key material appears in
// Next.js server logs because this route logs only connection IDs.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;

  const connections = await prisma.exchangeConnection.findMany({
    where: { userId, isActive: true },
  });

  const decrypted = connections.map((conn) => {
    const [keyIv, secretIv] = conn.encryptionIv.split("|");
    const [keyTag, secretTag] = conn.encryptionTag.split("|");

    let apiKey = "", apiSecret = "";
    try {
      apiKey = decryptSecret({ ciphertext: conn.encryptedApiKey, iv: keyIv, tag: keyTag });
      apiSecret = decryptSecret({ ciphertext: conn.encryptedApiSecret, iv: secretIv, tag: secretTag });
    } catch {
      // Decryption failure — key was stored with a different encryption key.
      // Return empty strings; the browser will show a "reconnect" prompt.
    }

    return {
      connectionId: conn.id,
      exchange: conn.exchange,
      label: conn.label,
      apiKey,
      apiSecret,
    };
  });

  // Disable all caching — credentials must never be cached at any layer
  return NextResponse.json(decrypted, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
    },
  });
}
