import { describe, it, expect } from "vitest";
import { isLateFinish, LATE_FINISH_MS, secondsLeftAt } from "@/lib/timer-clock";

describe("Practice timer clock", () => {
  const endAt = 1_000_000;

  it("counts down from the wall clock, rounding partial seconds up", () => {
    expect(secondsLeftAt(endAt, endAt - 120_000)).toBe(120);
    expect(secondsLeftAt(endAt, endAt - 119_001)).toBe(120);
    expect(secondsLeftAt(endAt, endAt - 1)).toBe(1);
  });

  it("never goes below zero when the app wakes up after the end", () => {
    expect(secondsLeftAt(endAt, endAt)).toBe(0);
    expect(secondsLeftAt(endAt, endAt + 5 * 60_000)).toBe(0);
  });

  it("treats a finish noticed long after the end as late (screen was locked)", () => {
    expect(isLateFinish(endAt, endAt + 400)).toBe(false);
    expect(isLateFinish(endAt, endAt + LATE_FINISH_MS + 1)).toBe(true);
    expect(isLateFinish(endAt, endAt + 3 * 60_000)).toBe(true);
  });
});
