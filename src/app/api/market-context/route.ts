import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [fearRes, btcRes, globalRes] = await Promise.allSettled([
      fetch("https://api.alternative.me/fng/?limit=1"),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true"),
      fetch("https://api.coingecko.com/api/v3/global"),
    ]);
    let fearGreed=null, btcPrice=null, btcChange=null, btcDominance=null;
    if(fearRes.status==="fulfilled"&&fearRes.value.ok){ const d=await fearRes.value.json(); fearGreed={value:parseInt(d.data?.[0]?.value??"50"),label:d.data?.[0]?.value_classification??"Neutral"}; }
    if(btcRes.status==="fulfilled"&&btcRes.value.ok){ const d=await btcRes.value.json(); btcPrice=d.bitcoin?.usd; btcChange=d.bitcoin?.usd_24h_change; }
    if(globalRes.status==="fulfilled"&&globalRes.value.ok){ const d=await globalRes.value.json(); btcDominance=d.data?.bitcoin_dominance_percentage; }
    return NextResponse.json({fearGreed,btcPrice,btcChange,btcDominance},{headers:{"Cache-Control":"public, max-age=300"}});
  } catch { return NextResponse.json({fearGreed:null,btcPrice:null,btcChange:null,btcDominance:null}); }
}
