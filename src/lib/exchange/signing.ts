// src/lib/exchange/signing.ts
// ----------------------------------------------------------------
// HMAC-SHA256 signing using the Web Crypto API.
// Works both in the browser (where trade execution happens) and in
// Next.js Edge/Node runtime for server-side permission checks.
//
// WHY BROWSER-SIDE: Vercel's servers are geo-blocked by Binance/Bybit
// for trade execution endpoints. By signing requests in the browser
// and sending them directly to the exchange, we bypass the geo-block
// entirely — the same pattern that proved out in CopyTrader Pro.
// ----------------------------------------------------------------

export async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildSignedQuery(
  params: Record<string, string | number | boolean>,
  secret: string
): Promise<string> {
  const qs = Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const signature = await hmacSha256(secret, qs);
  return `${qs}&signature=${signature}`;
}
