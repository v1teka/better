import { describe, it, expect } from "vitest";
import { scorePractice } from "@/lib/scoring";
import { pickPractice } from "@/lib/practice-selector";
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

  it("should filter by time availability", () => {
    const state: UserState = {
      energy: "normal",
      focus: "normal",
      tension: "calm",
      time: 5,
    };
    const practice = pickPractice(state);
    expect(practice.time).toContain(5);
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
