import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Input from "../../../components/ui/Input";

describe("Input", () => {
  it("renders an input element", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders with label", () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("displays error message", () => {
    render(<Input error="Required field" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Required field");
  });

  it("sets aria-invalid when error is present", () => {
    render(<Input error="Error" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("links error with aria-describedby", () => {
    render(<Input error="Error msg" />);
    const input = screen.getByRole("textbox");
    const errorId = input.getAttribute("aria-describedby");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent("Error msg");
  });

  it("renders icon", () => {
    render(<Input icon={<span data-testid="input-icon">I</span>} />);
    expect(screen.getByTestId("input-icon")).toBeInTheDocument();
  });

  it("handles text input", async () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);
    await userEvent.type(screen.getByRole("textbox"), "hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("shows password toggle for password type", () => {
    render(<Input type="password" />);
    expect(screen.getByLabelText("Show password")).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    render(<Input type="password" value="secret" readOnly />);
    const input = document.querySelector("input")!;
    expect(input.type).toBe("password");

    await userEvent.click(screen.getByLabelText("Show password"));
    expect(input.type).toBe("text");

    await userEvent.click(screen.getByLabelText("Hide password"));
    expect(input.type).toBe("password");
  });

  it("does not show toggle for non-password types", () => {
    render(<Input type="text" />);
    expect(screen.queryByLabelText("Show password")).not.toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(<Input className="custom" />);
    const input = document.querySelector("input")!;
    expect(input.className).toContain("custom");
  });

  it("forwards placeholder", () => {
    render(<Input placeholder="Enter email..." />);
    expect(screen.getByPlaceholderText("Enter email...")).toBeInTheDocument();
  });
});