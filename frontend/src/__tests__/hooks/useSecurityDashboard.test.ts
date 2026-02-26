import { renderHook } from "@testing-library/react";
import { useSecurityDashboard } from "../../hooks/useSecurityDashboard";
import type { PasswordMap, BreachResults } from "../../types";

const passwords: PasswordMap = {
  "github.com": [
    { username: "user1", password: "X9!kL#mQ2@pW7&rT" }, // strong
    { username: "user2", password: "abc" },                // very weak
  ],
  "google.com": [
    { username: "main", password: "X9!kL#mQ2@pW7&rT" },   // strong (reused)
  ],
  "weak-site.com": [
    { username: "u", password: "1234" },                   // very weak
  ],
};

describe("useSecurityDashboard", () => {
  it("calculates total passwords", () => {
    const { result } = renderHook(() => useSecurityDashboard(passwords, null));
    expect(result.current.totalPasswords).toBe(4);
  });

  it("calculates strength distribution", () => {
    const { result } = renderHook(() => useSecurityDashboard(passwords, null));
    const dist = result.current.strengthDistribution;
    expect(dist.veryWeak + dist.weak + dist.fair + dist.good + dist.strong).toBe(4);
  });

  it("identifies weak entries", () => {
    const { result } = renderHook(() => useSecurityDashboard(passwords, null));
    expect(result.current.weakEntries.length).toBeGreaterThanOrEqual(2);
  });

  it("identifies reused passwords", () => {
    const { result } = renderHook(() => useSecurityDashboard(passwords, null));
    expect(result.current.reusedGroups.length).toBeGreaterThanOrEqual(1);
  });

  it("returns zero breached when no breach results", () => {
    const { result } = renderHook(() => useSecurityDashboard(passwords, null));
    expect(result.current.breachedCount).toBe(0);
    expect(result.current.safeCount).toBe(0);
    expect(result.current.uncheckedCount).toBe(4);
  });

  it("calculates breach counts from results", () => {
    const breachResults: BreachResults = {
      "github.com:0": 5,
      "github.com:1": 0,
      "google.com:0": 0,
      "weak-site.com:0": 10,
    };

    const { result } = renderHook(() => useSecurityDashboard(passwords, breachResults));
    expect(result.current.breachedCount).toBe(2);
    expect(result.current.safeCount).toBe(2);
    expect(result.current.uncheckedCount).toBe(0);
  });

  it("populates breachedEntries with details", () => {
    const breachResults: BreachResults = { "github.com:0": 5 };
    const { result } = renderHook(() => useSecurityDashboard(passwords, breachResults));

    expect(result.current.breachedEntries).toHaveLength(1);
    expect(result.current.breachedEntries[0]).toEqual({
      website: "github.com",
      index: 0,
      username: "user1",
      breachCount: 5,
    });
  });

  it("overall score is between 0 and 100", () => {
    const { result } = renderHook(() => useSecurityDashboard(passwords, null));
    expect(result.current.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.current.overallScore).toBeLessThanOrEqual(100);
  });

  it("returns default metrics for empty vault", () => {
    const { result } = renderHook(() => useSecurityDashboard({}, null));
    expect(result.current.totalPasswords).toBe(0);
    // Empty vault: safeRate=1, avgStrength=1, uniqueness=1 → score=100
    expect(result.current.overallScore).toBe(100);
    expect(result.current.weakEntries).toHaveLength(0);
    expect(result.current.reusedGroups).toHaveLength(0);
  });

  it("masks reused password in group output", () => {
    const { result } = renderHook(() => useSecurityDashboard(passwords, null));
    result.current.reusedGroups.forEach((group) => {
      expect(group.password).toMatch(/\*\*\*$/);
    });
  });
});