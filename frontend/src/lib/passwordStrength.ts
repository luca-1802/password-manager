export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface StrengthResult {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
  hex: string;
}

const STRENGTH_CONFIG: Record<StrengthLevel, { label: string; color: string; hex: string }> = {
  0: { label: "Very Weak", color: "text-red-500",    hex: "#ef4444" },
  1: { label: "Weak",      color: "text-orange-500", hex: "#f97316" },
  2: { label: "Fair",      color: "text-amber-400",  hex: "#fbbf24" },
  3: { label: "Good",      color: "text-lime-400",   hex: "#a3e635" },
  4: { label: "Strong",    color: "text-emerald-400", hex: "#34d399" },
};

function shannonEntropy(s: string): number {
  const chars = [...s];
  const len = chars.length;
  if (len === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of chars) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function scoreToLevel(score: number): StrengthLevel {
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  if (score >= 20) return 1;
  return 0;
}

export function calculatePasswordStrength(password: string): StrengthResult {
  const raw = password;
  const chars = [...raw];
  const charLen = chars.length;

  if (charLen === 0) {
    return { level: 0, score: 0, ...STRENGTH_CONFIG[0] };
  }

  const lengthScore = Math.min(40, charLen * 2);
  const hasLower   = /[a-z]/.test(raw);
  const hasUpper   = /[A-Z]/.test(raw);
  const hasDigit   = /[0-9]/.test(raw);
  const hasSpecial = /[^a-zA-Z0-9]/.test(raw);

  const diversityScore =
    (hasLower ? 8 : 0) +
    (hasUpper ? 8 : 0) +
    (hasDigit ? 8 : 0) +
    (hasSpecial ? 11 : 0);

  const entropyPerChar = shannonEntropy(raw);
  const totalBitEntropy = entropyPerChar * charLen;
  const entropyBonus = Math.min(25, totalBitEntropy / 3);

  let score = lengthScore + diversityScore + entropyBonus;

  const uniqueChars = new Set(chars);
  if (uniqueChars.size === 1) {
    score = 0;
  }

  const repeatingTwoChar = /^(.{2})\1+$/u.test(raw);
  if (repeatingTwoChar) {
    score *= 0.3;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const level = scoreToLevel(score);

  return { level, score, ...STRENGTH_CONFIG[level] };
}