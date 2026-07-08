"use client";
// src/app/(app)/settings/page.tsx
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui";

interface RiskProfile {
  maxAccountExposurePct: number;
  maxTradeRiskPct: number;
  maxDailyLossPct: number;
  maxWeeklyLossPct: number;
  maxMonthlyLossPct: number;
  maxOpenPositions: number;
  isPaused: boolean;
  pausedReason: string | null;
  pausedAt: string | null;
}

interface FieldProps {
  label: string;
  desc: string;
  field: keyof RiskProfile;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (field: keyof RiskProfile, val: number) => void;
}

function RiskField({ label, desc, field, value, min, max, step = 0.5, suffix = "%", onChange }: FieldProps) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-zinc-800 last:border-0">
      <div className="flex-1 pr-8">
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{desc}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(field, parseFloat(e.target.value))}
          className="w-24 bg-black border border-zinc-700 rounded-md px-3 py-1.5 text-white text-sm text-right"
        />
        <span className="text-zinc-500 text-sm w-6">{suffix}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unpausing, setUnpausing] = useState(false);

  useEffect(() => {
    fetch("/api/risk")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setProfile(d); setLoading(false); });
  }, []);

  function set(field: keyof RiskProfile, val: number) {
    setProfile((p) => p ? { ...p, [field]: val } : p);
    setSaved(false);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/risk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        maxAccountExposurePct: profile.maxAccountExposurePct,
        maxTradeRiskPct: profile.maxTradeRiskPct,
        maxDailyLossPct: profile.maxDailyLossPct,
        maxWeeklyLossPct: profile.maxWeeklyLossPct,
        maxMonthlyLossPct: profile.maxMonthlyLossPct,
        maxOpenPositions: profile.maxOpenPositions,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function unpause() {
    setUnpausing(true);
    await fetch("/api/risk", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: false, pausedReason: null, pausedAt: null }),
    });
    setProfile((p) => p ? { ...p, isPaused: false, pausedReason: null } : p);
    setUnpausing(false);
  }

  if (loading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  if (!profile) return <div className="p-6 text-zinc-400">Risk profile not found.</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-2xl font-semibold">Risk Settings</h1>
        <p className="text-zinc-500 text-sm mt-0.5">These limits are enforced before every trade. Breaches pause the engine automatically.</p>
      </div>

      {/* Paused banner */}
      {profile.isPaused && (
        <div className="bg-loss/10 border border-loss/30 rounded-xl p-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-loss font-medium text-sm">Engine Paused</p>
            <p className="text-zinc-400 text-xs mt-1">{profile.pausedReason}</p>
            {profile.pausedAt && (
              <p className="text-zinc-600 text-xs mt-0.5">Paused at {new Date(profile.pausedAt).toLocaleString()}</p>
            )}
          </div>
          <button
            onClick={unpause}
            disabled={unpausing}
            className="bg-white/10 hover:bg-white/20 text-white text-sm px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            {unpausing ? "…" : "Resume Engine"}
          </button>
        </div>
      )}

      {/* Risk limits */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2">
        <RiskField
          label="Max Account Exposure"
          desc="Total notional value of open positions as a percentage of wallet balance."
          field="maxAccountExposurePct" value={profile.maxAccountExposurePct}
          min={5} max={100} step={5} onChange={set}
        />
        <RiskField
          label="Max Trade Risk"
          desc="Maximum loss a single trade can cause (margin × stop-loss distance ÷ wallet)."
          field="maxTradeRiskPct" value={profile.maxTradeRiskPct}
          min={0.1} max={10} step={0.1} onChange={set}
        />
        <RiskField
          label="Max Daily Loss"
          desc="If realized PnL today exceeds this, no new trades open until tomorrow."
          field="maxDailyLossPct" value={profile.maxDailyLossPct}
          min={0.5} max={20} step={0.5} onChange={set}
        />
        <RiskField
          label="Max Weekly Loss"
          desc="If realized PnL this week exceeds this, the engine pauses and requires manual reactivation."
          field="maxWeeklyLossPct" value={profile.maxWeeklyLossPct}
          min={1} max={30} step={1} onChange={set}
        />
        <RiskField
          label="Max Monthly Loss"
          desc="Monthly loss ceiling. Hardest brake — requires manual reactivation plus review."
          field="maxMonthlyLossPct" value={profile.maxMonthlyLossPct}
          min={2} max={50} step={1} onChange={set}
        />
        <RiskField
          label="Max Open Positions"
          desc="Engine will not open new positions once this count is reached."
          field="maxOpenPositions" value={profile.maxOpenPositions}
          min={1} max={50} step={1} suffix="pos" onChange={set}
        />
      </div>

      {/* Defaults note */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 text-sm text-zinc-500">
        <p className="text-white text-sm font-medium mb-1">Defaults</p>
        Exposure 30% · Trade risk 1% · Daily loss 3% · Weekly 7% · Monthly 12% · Max positions 10.
        Regardless of your settings, leverage is hard-capped at 20x platform-wide.
      </div>

      {error && <p className="text-loss text-sm">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {saved && <span className="text-profit text-sm">✓ Saved</span>}
      </div>
    </div>
  );
}
