import { renderHook } from "@testing-library/react";
import { useKeyboardNavigation } from "../../hooks/useKeyboardNavigation";
import type { VaultItem } from "../../types";

const items: VaultItem[] = [
  { id: "1", type: "password", key: "github.com", index: 0, credential: { username: "u1", password: "p1" } },
  { id: "2", type: "password", key: "google.com", index: 0, credential: { username: "u2", password: "p2" } },
  { id: "3", type: "note", key: "API Keys", index: 0, note: { type: "note", content: "key" } },
];

describe("useKeyboardNavigation", () => {
  const onSelect = jest.fn();
  const onClear = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("selects next item on ArrowDown", () => {
    renderHook(() => useKeyboardNavigation(items, items[0]!, onSelect, onClear));

    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    window.dispatchEvent(event);

    expect(onSelect).toHaveBeenCalledWith(items[1]);
  });

  it("selects previous item on ArrowUp", () => {
    renderHook(() => useKeyboardNavigation(items, items[1]!, onSelect, onClear));

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    window.dispatchEvent(event);

    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("wraps to first item from last on ArrowDown", () => {
    renderHook(() => useKeyboardNavigation(items, items[2]!, onSelect, onClear));

    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    window.dispatchEvent(event);

    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("wraps to last item from first on ArrowUp", () => {
    renderHook(() => useKeyboardNavigation(items, items[0]!, onSelect, onClear));

    const event = new KeyboardEvent("keydown", { key: "ArrowUp" });
    window.dispatchEvent(event);

    expect(onSelect).toHaveBeenCalledWith(items[2]);
  });

  it("clears selection on Escape", () => {
    renderHook(() => useKeyboardNavigation(items, items[0]!, onSelect, onClear));

    const event = new KeyboardEvent("keydown", { key: "Escape" });
    window.dispatchEvent(event);

    expect(onClear).toHaveBeenCalled();
  });

  it("selects first item when nothing selected on ArrowDown", () => {
    renderHook(() => useKeyboardNavigation(items, null, onSelect, onClear));

    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    window.dispatchEvent(event);

    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("does nothing for ArrowDown with empty items", () => {
    renderHook(() => useKeyboardNavigation([], null, onSelect, onClear));

    const event = new KeyboardEvent("keydown", { key: "ArrowDown" });
    window.dispatchEvent(event);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("ignores events from input elements", () => {
    renderHook(() => useKeyboardNavigation(items, items[0]!, onSelect, onClear));

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true });
    input.dispatchEvent(event);

    expect(onSelect).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useKeyboardNavigation(items, null, onSelect, onClear));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});