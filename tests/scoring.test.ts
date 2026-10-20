import { describe, it, expect } from "vitest";
import { practiceDuration, scorePractice } from "@/lib/scoring";
import { getAllPractices, pickPractice } from "@/lib/practice-selector";
import type { Practice, UserState } from "@/types/practice";

describe("Scoring Logic", () => {
  const testPractice: Practice = {
    id: "test",
    title: "Test Practice",
    description: "Test description",
    firstStep: "Test first step",
    finish: "Test finish",
    expectedEffect: "Test effect",
    simpleVersion: "Test simple",
    category: "recovery",
    time: [5, 10],
    energy: ["low", "normal"],
    focus: ["scattered"],
    tension: ["tense"],
    intensity: "soft",
  };

  it("should score practice with matching energy", () => {
    const state: UserState = {
      energy: "low",
      focus: "scattered",
      tension: "tense",
      time: 5,
    };
    const score = scorePractice(testPractice, state);
    expect(score).toBeGreaterThan(0);
  });

  it("should apply penalty for low energy + hard intensity", () => {
    const hardPractice: Practice = {
      ...testPractice,
      intensity: "hard",
      focus: ["normal"], // No focus match to avoid bonus
    };
    const state: UserState = {
      energy: "low",
      focus: "scattered",
      tension: "calm",
      time: 5,
    };
    const score = scorePractice(hardPractice, state);
    // Score should be negative: -3 penalty for low energy + hard
    expect(score).toBeLessThanOrEqual(0);
  });

  it("should give bonus for tense + recovery", () => {
    const state: UserState = {
      energy: "normal",
      focus: "normal",
      tension: "tense",
      time: 5,
    };
    const score = scorePractice(testPractice, state);
    expect(score).toBeGreaterThan(0);
  });

  it("should not penalize non-focus practices when focus is normal", () => {
    // No practice in the catalog lists focus "normal"
    const state: UserState = {
      energy: "low",
      focus: "normal",
      tension: "tense",
      time: null,
    };
    const asFocusPractice: Practice = { ...testPractice, category: "focus" };
    expect(scorePractice(testPractice, state)).toBeGreaterThan(
      scorePractice(asFocusPractice, state),
    );
    expect(scorePractice(testPractice, state)).toBeGreaterThanOrEqual(7);
  });

  it("should time the practice by its longest duration that fits", () => {
    expect(practiceDuration({ ...testPractice, time: [2, 3] }, 5)).toBe(3);
    expect(practiceDuration({ ...testPractice, time: [5, 10] }, 10)).toBe(10);
    expect(practiceDuration({ ...testPractice, time: [5, 10] }, 2)).toBe(5);
    expect([5, 10]).toContain(practiceDuration(testPractice, null));
  });

  it("should return 0 for incomplete state", () => {
    const state: UserState = {
      energy: null,
      focus: null,
      tension: null,
      time: null,
    };
    const score = scorePractice(testPractice, state);
    expect(score).toBe(0);
  });
});

describe("Practice Selection", () => {
  it("should return a practice for valid state", () => {
    const state: UserState = {
      energy: "low",
      focus: "scattered",
      tension: "tense",
      time: 5,
    };
    const practice = pickPractice(state);
    expect(practice).toBeDefined();
    expect(practice.title).toBeDefined();
  });

  it("should return fallback for incomplete state", () => {
    const state: UserState = {
      energy: null,
      focus: null,
      tension: null,
      time: null,
    };
    const practice = pickPractice(state);
    expect(practice).toBeDefined();
    expect(practice.id).toContain("fallback");
  });

  it("should pick a practice that fits the available time", () => {
    const state: UserState = {
      energy: "normal",
      focus: "normal",
      tension: "calm",
      time: 5,
    };
    for (let i = 0; i < 20; i++) {
      const practice = pickPractice(state);
      expect(practiceDuration(practice, 5)).toBeLessThanOrEqual(5);
    }
  });

  it("should treat time as an upper bound, not an exact match", () => {
    // 1- and 3-minute practices used to be unreachable: the survey offers 2, 5 and 10
    const reachable = new Set<string>();
    const energies = ["low", "normal", "high"] as const;
    const tensions = ["calm", "tense"] as const;
    const focuses = ["scattered", "normal", "stuck"] as const;
    const times = [2, 5, 10] as const;
    for (const energy of energies)
      for (const tension of tensions)
        for (const focus of focuses)
          for (const time of times)
            for (let i = 0; i < 30; i++) {
              reachable.add(pickPractice({ energy, tension, focus, time }).id);
            }
    const oneOrThreeMinutes = getAllPractices().filter((p) =>
      p.time.every((t) => t === 1 || t === 3),
    );
    expect(oneOrThreeMinutes.length).toBeGreaterThan(0);
    expect(oneOrThreeMinutes.some((p) => reachable.has(p.id))).toBe(true);
  });

  it("should not select hard practices for low energy", () => {
    const state: UserState = {
      energy: "low",
      focus: "scattered",
      tension: "calm",
      time: 5,
    };
    // Run multiple times to ensure consistency
    for (let i = 0; i < 10; i++) {
      const practice = pickPractice(state);
      if (!practice.id.includes("fallback")) {
        expect(practice.intensity).not.toBe("hard");
      }
    }
  });
});
