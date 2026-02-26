import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast } from "../../../components/ui/Toast";

// Mock framer-motion
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function TestComponent() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast("success", "Saved!")}>Success</button>
      <button onClick={() => toast("error", "Failed!")}>Error</button>
      <button onClick={() => toast("info", "FYI")}>Info</button>
    </div>
  );
}

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws when useToast used outside provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      render(<TestComponent />);
    }).toThrow("useToast must be used within ToastProvider");
    spy.mockRestore();
  });

  it("shows success toast", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Success"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();
  });

  it("shows error toast with alert role", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Error"));
    expect(screen.getByRole("alert")).toHaveTextContent("Failed!");
  });

  it("shows info toast with status role", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Info"));
    expect(screen.getByRole("status")).toHaveTextContent("FYI");
  });

  it("auto-dismisses toast after 4 seconds", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Success"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
  });

  it("dismiss button removes toast", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Success"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Dismiss notification"));
    expect(screen.queryByText("Saved!")).not.toBeInTheDocument();
  });

  it("can show multiple toasts", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    await user.click(screen.getByText("Success"));
    await user.click(screen.getByText("Error"));
    expect(screen.getByText("Saved!")).toBeInTheDocument();
    expect(screen.getByText("Failed!")).toBeInTheDocument();
  });
});