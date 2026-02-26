import { renderHook, act } from "@testing-library/react";
import { useClipboard } from "../../hooks/useClipboard";

describe("useClipboard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts with copied as false", () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copied).toBe(false);
  });

  it("copies text to clipboard", async () => {
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copy("secret");
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("secret");
    expect(result.current.copied).toBe(true);
  });

  it("clears clipboard after delay", async () => {
    const { result } = renderHook(() => useClipboard(5000));

    await act(async () => {
      await result.current.copy("secret");
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.copied).toBe(false);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("");
  });

  it("resets timer on subsequent copies", async () => {
    const { result } = renderHook(() => useClipboard(5000));

    await act(async () => {
      await result.current.copy("first");
    });

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await act(async () => {
      await result.current.copy("second");
    });

    // Should still be copied after original delay would have expired
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current.copied).toBe(true);

    // Clears after full delay from last copy
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(result.current.copied).toBe(false);
  });
});