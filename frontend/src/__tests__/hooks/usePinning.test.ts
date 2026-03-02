import { renderHook, act } from "@testing-library/react";
import { usePinning } from "../../hooks/usePinning";
import * as api from "../../api";

jest.mock("../../api");

const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

describe("usePinning", () => {
  const mockFetchPasswords = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls the pin API endpoint with correct parameters", async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 200, data: { success: true } });
    const { result } = renderHook(() => usePinning(mockFetchPasswords));

    await act(async () => {
      await result.current.togglePin("password", "example.com", 0, true);
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/passwords/pin", {
      method: "PUT",
      body: { type: "password", key: "example.com", index: 0, pinned: true },
    });
  });

  it("refreshes passwords after successful pin toggle", async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 200, data: { success: true } });
    const { result } = renderHook(() => usePinning(mockFetchPasswords));

    await act(async () => {
      await result.current.togglePin("password", "example.com", 0, true);
    });

    expect(mockFetchPasswords).toHaveBeenCalledTimes(1);
  });

  it("supports pinning notes", async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 200, data: { success: true } });
    const { result } = renderHook(() => usePinning(mockFetchPasswords));

    await act(async () => {
      await result.current.togglePin("note", "My Note", 0, true);
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/passwords/pin", {
      method: "PUT",
      body: { type: "note", key: "My Note", index: 0, pinned: true },
    });
  });

  it("supports unpinning (pinned = false)", async () => {
    mockApiFetch.mockResolvedValue({ ok: true, status: 200, data: { success: true } });
    const { result } = renderHook(() => usePinning(mockFetchPasswords));

    await act(async () => {
      await result.current.togglePin("password", "example.com", 0, false);
    });

    expect(mockApiFetch).toHaveBeenCalledWith("/passwords/pin", {
      method: "PUT",
      body: { type: "password", key: "example.com", index: 0, pinned: false },
    });
  });
});