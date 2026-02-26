import { render, screen } from "@testing-library/react";
import SecurityDashboard from "../../../components/dashboard/SecurityDashboard";
import type { PasswordMap, BreachResults } from "../../../types";

// Mock child components
jest.mock("../../../hooks/useCountUp", () => ({
  useCountUp: (target: number) => target,
}));

jest.mock("../../../styles/effects.module.scss", () => ({
  gradientBorderCard: "gradientBorderCard",
}));

const passwords: PasswordMap = {
  "github.com": [
    { username: "user1", password: "X9!kL#mQ2@pW7&rT" },
    { username: "user2", password: "abc" },
  ],
};

describe("SecurityDashboard", () => {
  const defaultProps = {
    passwords,
    breachResults: null as BreachResults | null,
    checking: false,
    onCheckBreaches: jest.fn().mockResolvedValue(undefined),
    onNavigateToVault: jest.fn(),
  };

  it("renders the Security Dashboard heading", () => {
    render(<SecurityDashboard {...defaultProps} />);
    expect(screen.getByText("Security Dashboard")).toBeInTheDocument();
  });

  it("renders Overall Score section", () => {
    render(<SecurityDashboard {...defaultProps} />);
    expect(screen.getByText("Overall Score")).toBeInTheDocument();
  });

  it("renders Breach Monitoring section", () => {
    render(<SecurityDashboard {...defaultProps} />);
    expect(screen.getByText("Breach Monitoring")).toBeInTheDocument();
  });

  it("renders Password Strength Distribution section", () => {
    render(<SecurityDashboard {...defaultProps} />);
    expect(screen.getByText("Password Strength Distribution")).toBeInTheDocument();
  });

  it("shows empty vault message when no passwords", () => {
    render(<SecurityDashboard {...defaultProps} passwords={{}} />);
    expect(screen.getByText("Your vault is empty")).toBeInTheDocument();
  });

  it("shows 'Looking good!' when no issues found", () => {
    const strongPasswords: PasswordMap = {
      "site1.com": [{ username: "u1", password: "X9!kL#mQ2@pW7&rT" }],
      "site2.com": [{ username: "u2", password: "Y8@jM$nR3!qV6&sU" }],
    };
    render(<SecurityDashboard {...defaultProps} passwords={strongPasswords} />);
    expect(screen.getByText("Looking good!")).toBeInTheDocument();
  });

  it("shows actionable insights when issues found", () => {
    render(<SecurityDashboard {...defaultProps} />);
    // Should show weak passwords insight
    expect(screen.getByText("Actionable Insights")).toBeInTheDocument();
    expect(screen.getByText("Weak Passwords")).toBeInTheDocument();
  });

  it("shows compromised passwords insight with breach results", () => {
    const breachResults: BreachResults = { "github.com:0": 5 };
    render(<SecurityDashboard {...defaultProps} breachResults={breachResults} />);
    expect(screen.getByText("Compromised Passwords")).toBeInTheDocument();
  });
});