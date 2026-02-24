import { useMemo } from "react";
import type { PasswordMap, BreachResults } from "../types";
import { calculatePasswordStrength } from "../lib/passwordStrength";

interface StrengthDistribution {
  veryWeak: number;
  weak: number;
  fair: number;
  good: number;
  strong: number;
}

export interface BreachedEntry {
  website: string;
  index: number;
  username: string;
  breachCount: number;
}

interface SecurityMetrics {
  overallScore: number;
  strengthDistribution: StrengthDistribution;
  totalPasswords: number;
  breachedCount: number;
  safeCount: number;
  uncheckedCount: number;
  breachedEntries: BreachedEntry[];
  reusedGroups: { password: string; sites: { website: string; index: number }[] }[];
  weakEntries: { website: string; index: number; level: number; label: string }[];
}

export function useSecurityDashboard(
  passwords: PasswordMap,
  breachResults: BreachResults | null
): SecurityMetrics {
  return useMemo(() => {
    const distribution: StrengthDistribution = { veryWeak: 0, weak: 0, fair: 0, good: 0, strong: 0 };
    const weakEntries: SecurityMetrics["weakEntries"] = [];
    const breachedEntries: BreachedEntry[] = [];
    const passwordMap = new Map<string, { website: string; index: number }[]>();
    let totalPasswords = 0;
    let strengthSum = 0;
    let breachedCount = 0;
    let safeCount = 0;

    for (const [website, creds] of Object.entries(passwords)) {
      creds.forEach((cred, index) => {
        totalPasswords++;
        const strength = calculatePasswordStrength(cred.password);
        strengthSum += strength.level;

        if (strength.level === 0) distribution.veryWeak++;
        else if (strength.level === 1) distribution.weak++;
        else if (strength.level === 2) distribution.fair++;
        else if (strength.level === 3) distribution.good++;
        else distribution.strong++;

        if (strength.level < 2) {
          weakEntries.push({ website, index, level: strength.level, label: strength.label });
        }

        const existing = passwordMap.get(cred.password);
        if (existing) {
          existing.push({ website, index });
        } else {
          passwordMap.set(cred.password, [{ website, index }]);
        }

        if (breachResults) {
          const key = `${website}:${index}`;
          const count = breachResults[key];
          if (count !== undefined) {
            if (count > 0) {
              breachedCount++;
              breachedEntries.push({ website, index, username: cred.username, breachCount: count });
            } else if (count === 0) {
              safeCount++;
            }
          }
        }
      });
    }

    const reusedGroups = Array.from(passwordMap.entries())
      .filter(([_, sites]) => sites.length > 1)
      .map(([password, sites]) => ({ password: password.slice(0, 2) + "***", sites }));

    const avgStrength = totalPasswords > 0 ? (strengthSum / totalPasswords) / 4 : 1;
    const totalChecked = breachedCount + safeCount;
    const breachFreeRate = totalChecked > 0 ? safeCount / totalChecked : 1;
    const totalUnique = passwordMap.size;
    const uniquenessRate = totalPasswords > 0 ? totalUnique / totalPasswords : 1;

    const overallScore = Math.round(
      (avgStrength * 40 + breachFreeRate * 40 + uniquenessRate * 20)
    );

    const uncheckedCount = totalPasswords - totalChecked;

    return {
      overallScore,
      strengthDistribution: distribution,
      totalPasswords,
      breachedCount,
      safeCount,
      uncheckedCount,
      breachedEntries,
      reusedGroups,
      weakEntries,
    };
  }, [passwords, breachResults]);
}