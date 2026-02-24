import { useMemo } from "react";
import { calculatePasswordStrength, type StrengthResult } from "../lib/passwordStrength";

export function usePasswordStrength(password: string): StrengthResult {
  return useMemo(() => calculatePasswordStrength(password), [password]);
}