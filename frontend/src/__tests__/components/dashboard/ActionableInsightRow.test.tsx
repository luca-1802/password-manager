import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActionableInsightRow from "../../../components/dashboard/ActionableInsightRow";

describe("ActionableInsightRow", () => {
  const defaultProps = {
    severity: "warning" as const,
    title: "Weak Passwords",
    description: "These passwords are easy to crack.",
    count: 5,
    onAction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders title and description", () => {
    render(<ActionableInsightRow {...defaultProps} />);
    expect(screen.getByText("Weak Passwords")).toBeInTheDocument();
    expect(screen.getByText("These passwords are easy to crack.")).toBeInTheDocument();
  });

  it("renders count badge", () => {
    render(<ActionableInsightRow {...defaultProps} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders Review button", () => {
    render(<ActionableInsightRow {...defaultProps} />);
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("calls onAction when Review clicked", async () => {
    render(<ActionableInsightRow {...defaultProps} />);
    await userEvent.click(screen.getByText("Review"));
    expect(defaultProps.onAction).toHaveBeenCalled();
  });

  it("applies critical severity styling", () => {
    const { container } = render(
      <ActionableInsightRow {...defaultProps} severity="critical" />
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toContain("border-red-500/20");
  });

  it("applies warning severity styling", () => {
    const { container } = render(
      <ActionableInsightRow {...defaultProps} severity="warning" />
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toContain("border-amber-500/20");
  });

  it("applies info severity styling", () => {
    const { container } = render(
      <ActionableInsightRow {...defaultProps} severity="info" />
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toContain("border-blue-500/20");
  });

  it("shows expand button when details provided", () => {
    render(
      <ActionableInsightRow
        {...defaultProps}
        details={[{ label: "github.com", meta: "Weak" }]}
      />
    );
    // Should have a chevron button
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("expands to show details when clicked", async () => {
    render(
      <ActionableInsightRow
        {...defaultProps}
        details={[{ label: "github.com", sublabel: "user1", meta: "Very Weak" }]}
      />
    );

    // Click the row area to expand
    const row = screen.getByText("Weak Passwords").closest("div[class]");
    if (row) {
      await userEvent.click(row);
    }
    expect(screen.getByText("github.com")).toBeInTheDocument();
  });

  it("does not show expand button without details", () => {
    render(<ActionableInsightRow {...defaultProps} />);
    // Only the Review button, no chevron
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
  });
});