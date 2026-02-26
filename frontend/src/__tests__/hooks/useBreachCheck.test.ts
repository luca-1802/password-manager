import { renderHook, act } from "@testing-library/react";
import { useBreachCheck } from "../../hooks/useBreachCheck";
import * as api from "../../api";

jest.mock("../../api");

const mockApiFetch = api.apiFetch as jest.MockedFunction<typeof api.apiFetch>;

describe("useBreachCheck", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with null results and not checking", () => {
    const { result } = renderHook(() => useBreachCheck());
    expect(result.current.breachResults).toBeNull();
    expect(result.current.checking).toBe(false);
    expect(result.current.lastChecked).toBeNull();
  });

  it("checkBreaches calls API and updates results", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      data: { results: { "github.com:0": 5 }, total_checked: 1, total_breached: 1, errors: 0 },
    });

    const { result } = renderHook(() => useBreachCheck());

    await act(async () => {
      await result.current.checkBreaches();
    });

    expect(result.current.breachResults).toEqual({ "github.com:0": 5 });
    expect(result.current.lastChecked).toBeInstanceOf(Date);
    expect(result.current.checking).toBe(false);
  });

  it("getBreachCount returns count for matching key", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      data: { results: { "github.com:0": 3 }, total_checked: 1, total_breached: 1, errors: 0 },
    });

    const { result } = renderHook(() => useBreachCheck());

    await act(async () => {
      await result.current.checkBreaches();
    });

    expect(result.current.getBreachCount("github.com", 0)).toBe(3);
  });

  it("getBreachCount returns null when results not loaded", () => {
    const { result } = renderHook(() => useBreachCheck());
    expect(result.current.getBreachCount("github.com", 0)).toBeNull();
  });

  it("getBreachCount returns null for non-existent key", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      data: { results: {}, total_checked: 0, total_breached: 0, errors: 0 },
    });

    const { result } = renderHook(() => useBreachCheck());

    await act(async () => {
      await result.current.checkBreaches();
    });

    expect(result.current.getBreachCount("unknown.com", 0)).toBeNull();
  });

  it("clearBreachResults resets state", async () => {
    mockApiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      data: { results: { "x:0": 1 }, total_checked: 1, total_breached: 1, errors: 0 },
    });

    const { result } = renderHook(() => useBreachCheck());

    await act(async () => {
      await result.current.checkBreaches();
    });

    act(() => result.current.clearBreachResults());

    expect(result.current.breachResults).toBeNull();
    expect(result.current.lastChecked).toBeNull();
  });
});