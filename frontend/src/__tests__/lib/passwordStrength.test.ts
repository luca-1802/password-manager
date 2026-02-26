import { calculatePasswordStrength, type StrengthResult } from "../../lib/passwordStrength";

describe("calculatePasswordStrength", () => {
  it("returns level 0 for empty password", () => {
    const result = calculatePasswordStrength("");
    expect(result.level).toBe(0);
    expect(result.score).toBe(0);
    expect(result.label).toBe("Very Weak");
  });

  it("returns level 0 for single repeated character", () => {
    const result = calculatePasswordStrength("aaaaaaaaaa");
    expect(result.level).toBe(0);
    expect(result.score).toBe(0);
  });

  it("returns low score for short simple password", () => {
    const result = calculatePasswordStrength("abc");
    expect(result.level).toBeLessThanOrEqual(1);
  });

  it("returns higher score for longer passwords", () => {
    const short = calculatePasswordStrength("abc123");
    const long = calculatePasswordStrength("abc123def456ghi789");
    expect(long.score).toBeGreaterThan(short.score);
  });

  it("rewards character diversity", () => {
    const lower = calculatePasswordStrength("abcdefgh");
    const mixed = calculatePasswordStrength("aBcD1234");
    expect(mixed.score).toBeGreaterThan(lower.score);
  });

  it("rewards special characters", () => {
    const noSpecial = calculatePasswordStrength("Abcdef12");
    const withSpecial = calculatePasswordStrength("Abcdef!2");
    expect(withSpecial.score).toBeGreaterThan(noSpecial.score);
  });

  it("penalizes two-char repeating patterns", () => {
    const result = calculatePasswordStrength("abababababab");
    expect(result.score).toBeLessThan(50);
  });

  it("returns strong for complex password", () => {
    const result = calculatePasswordStrength("X9!kL#mQ2@pW7&rT");
    expect(result.level).toBe(4);
    expect(result.label).toBe("Strong");
    expect(result.color).toBe("text-emerald-400");
    expect(result.hex).toBe("#34d399");
  });

  it("score is always between 0 and 100", () => {
    const cases = ["", "a", "password", "X9!kL#mQ2@pW7&rT", "aaaa", "aAbBcCdD!@#$1234"];
    for (const pw of cases) {
      const result = calculatePasswordStrength(pw);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it("maps score thresholds correctly", () => {
    // Test level mapping through score ranges
    const result80 = calculatePasswordStrength("X9!kL#mQ2@pW7&rT");
    expect(result80.level).toBeGreaterThanOrEqual(3);
  });

  it("returns correct label for each level", () => {
    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const result = calculatePasswordStrength("X9!kL#mQ2@pW7&rT");
    expect(labels).toContain(result.label);
  });

  it("has consistent structure for all results", () => {
    const result = calculatePasswordStrength("test");
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("label");
    expect(result).toHaveProperty("color");
    expect(result).toHaveProperty("hex");
  });
});