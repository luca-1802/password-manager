import { renderHook, act } from "@testing-library/react";
import { useTrash } from "../../hooks/useTrash";
import * as api from "../../api";

jest.mock("../../api");

const mockFetchTrash = api.fetchTrash as jest.MockedFunction<typeof api.fetchTrash>;
const mockRestoreTrashItem = api.restoreTrashItem as jest.MockedFunction<typeof api.restoreTrashItem>;
const mockPermanentDeleteTrashItem = api.permanentDeleteTrashItem as jest.MockedFunction<typeof api.permanentDeleteTrashItem>;
const mockEmptyTrash = api.emptyTrash as jest.MockedFunction<typeof api.emptyTrash>;

const trashItems = [
  {
    id: "t1",
    entry_type: "password" as const,
    original_key: "github.com",
    entry: { username: "user", password: "pass" },
    deleted_at: "2024-01-01T00:00:00Z",
    expires_at: "2024-02-01T00:00:00Z",
  },
];

describe("useTrash", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with empty items and not loading", () => {
    const { result } = renderHook(() => useTrash());
    expect(result.current.items).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("loadTrash fetches and populates items", async () => {
    mockFetchTrash.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: trashItems, count: 1 },
    });

    const { result } = renderHook(() => useTrash());

    await act(async () => {
      await result.current.loadTrash();
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]!.id).toBe("t1");
    expect(result.current.loading).toBe(false);
  });

  it("restore calls API and reloads trash", async () => {
    mockRestoreTrashItem.mockResolvedValue({ ok: true, status: 200, data: {} });
    mockFetchTrash.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [], count: 0 },
    });

    const onRestored = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useTrash(onRestored));

    await act(async () => {
      await result.current.restore("t1");
    });

    expect(mockRestoreTrashItem).toHaveBeenCalledWith("t1");
    expect(onRestored).toHaveBeenCalled();
  });

  it("permanentDelete calls API and reloads", async () => {
    mockPermanentDeleteTrashItem.mockResolvedValue({ ok: true, status: 200, data: {} });
    mockFetchTrash.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: [], count: 0 },
    });

    const { result } = renderHook(() => useTrash());

    await act(async () => {
      await result.current.permanentDelete("t1");
    });

    expect(mockPermanentDeleteTrashItem).toHaveBeenCalledWith("t1");
  });

  it("emptyAll clears items on success", async () => {
    mockEmptyTrash.mockResolvedValue({ ok: true, status: 200, data: {} });

    const { result } = renderHook(() => useTrash());

    // Pre-populate via loadTrash
    mockFetchTrash.mockResolvedValue({
      ok: true,
      status: 200,
      data: { items: trashItems, count: 1 },
    });
    await act(async () => {
      await result.current.loadTrash();
    });
    expect(result.current.items).toHaveLength(1);

    await act(async () => {
      await result.current.emptyAll();
    });

    expect(result.current.items).toHaveLength(0);
  });
});