// src/app/(app)/traders/page.tsx
// /traders without an ID redirects to the marketplace
import { redirect } from "next/navigation";
export default function TradersIndex() {
  redirect("/copy-trading");
}
