import { act, renderHook } from "@testing-library/react-native";
import { FIRST_PRIMING_MS, TAB_PRIMING_MS, useTabPriming } from "./useTabPriming";

describe("useTabPriming", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("primes from the first render, holds for the floor, and waits for real data", async () => {
    const { result, rerender } = await renderHook(({ loading }: { loading: boolean }) => useTabPriming(loading), {
      initialProps: { loading: true },
    });
    expect(result.current).toBe(true);
    await act(async () => void jest.advanceTimersByTime(FIRST_PRIMING_MS + 10));
    expect(result.current).toBe(true); // data still loading
    await rerender({ loading: false });
    expect(result.current).toBe(false);
  });

  it("holds for the floor even when data is already there, then never primes again on revisit", async () => {
    const { result, rerender } = await renderHook(() => useTabPriming(false));
    expect(result.current).toBe(true);
    await act(async () => void jest.advanceTimersByTime(TAB_PRIMING_MS + 10));
    expect(result.current).toBe(false);
    await rerender({});
    expect(result.current).toBe(false); // a later focus does not bring the skeleton back
  });
});
