// AI Signal Scoring — pure math, no external API

export interface ScoredSignal {
  score: number; // 0-100
  grade: "STRONG" | "NEUTRAL" | "WEAK";
  reasons: string[];
}

export function scoreSignal(
  trader: {
    winRate: number;
    roi: number;
    maxDrawdown?: number | null;
    followers?: number;
  },
  position: {
    leverage: number;
    roe: number;
    side: string;
  }
): ScoredSignal {
  let score = 50;
  const reasons: string[] = [];

  // Win rate (±25)
  if (trader.winRate >= 70) {
    score += 25;
    reasons.push(`High win rate ${trader.winRate.toFixed(0)}%`);
  } else if (trader.winRate >= 60) {
    score += 12;
    reasons.push(`Good win rate ${trader.winRate.toFixed(0)}%`);
  } else if (trader.winRate > 0 && trader.winRate < 45) {
    score -= 15;
    reasons.push(`Low win rate ${trader.winRate.toFixed(0)}%`);
  }

  // ROI (±20)
  if (trader.roi > 80) {
    score += 20;
    reasons.push(`Strong ROI +${trader.roi.toFixed(0)}%`);
  } else if (trader.roi > 30) {
    score += 10;
    reasons.push(`Good ROI +${trader.roi.toFixed(0)}%`);
  } else if (trader.roi < 0) {
    score -= 15;
    reasons.push(`Negative ROI`);
  }

  // Drawdown (±20)
  if (trader.maxDrawdown != null) {
    if (trader.maxDrawdown > 30) {
      score -= 20;
      reasons.push(`High drawdown ${trader.maxDrawdown.toFixed(0)}%`);
    } else if (trader.maxDrawdown > 15) {
      score -= 8;
      reasons.push(`Moderate drawdown ${trader.maxDrawdown.toFixed(0)}%`);
    } else if (trader.maxDrawdown < 8) {
      score += 10;
      reasons.push(`Low drawdown ${trader.maxDrawdown.toFixed(0)}%`);
    }
  }

  // Leverage (±15)
  if (position.leverage > 10) {
    score -= 15;
    reasons.push(`High leverage ${position.leverage}x`);
  } else if (position.leverage > 5) {
    score -= 5;
  } else if (position.leverage <= 3) {
    score += 12;
    reasons.push(`Conservative leverage ${position.leverage}x`);
  }

  // Current ROE (±10)
  if (position.roe > 15) {
    score += 10;
    reasons.push(`Strong ROE +${position.roe.toFixed(1)}%`);
  } else if (position.roe > 5) {
    score += 5;
  } else if (position.roe < -10) {
    score -= 10;
    reasons.push(`Position underwater`);
  }

  // Followers trust signal (±5)
  if ((trader.followers ?? 0) > 3000) {
    score += 5;
    reasons.push(`${trader.followers?.toLocaleString()} followers`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade =
    score >= 70
      ? "STRONG"
      : score >= 45
      ? "NEUTRAL"
      : "WEAK";

  return { score, grade, reasons };
}

export function gradeColor(grade: string) {
  return grade === "STRONG"
    ? "var(--profit)"
    : grade === "NEUTRAL"
    ? "var(--yellow)"
    : "var(--loss)";
}

export function gradeEmoji(grade: string) {
  return grade === "STRONG"
    ? "🟢"
    : grade === "NEUTRAL"
    ? "🟡"
    : "🔴";
}
