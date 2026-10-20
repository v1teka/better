import { describe, it, expect } from "vitest";
import {
  NO_HISTORY,
  TIME_RANGES,
  getAllPractices,
  getPracticeById,
  pickPractice,
  practiceDuration,
  suits,
} from "@/lib/practice-selector";
import type { Energy, Focus, SurveyTime, Tension, UserState } from "@/types/practice";

const ENERGIES: Energy[] = ["low", "normal", "high"];
const TENSIONS: Tension[] = ["calm", "tense"];
const FOCUSES: Focus[] = ["scattered", "normal", "stuck"];
const TIMES: SurveyTime[] = [2, 5, 10];

function* fullAnswers(): Generator<UserState> {
  for (const energy of ENERGIES)
    for (const tension of TENSIONS)
      for (const focus of FOCUSES)
        for (const time of TIMES) yield { energy, tension, focus, time };
}

const EMPTY: UserState = { energy: null, tension: null, focus: null, time: null };

describe("Catalog", () => {
  it("has at least 3 suitable practices for every combination of answers", () => {
    for (const state of fullAnswers()) {
      const pool = getAllPractices().filter((p) => suits(p, state));
      expect(pool.length, JSON.stringify(state)).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every practice a unique id", () => {
    const ids = getAllPractices().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never offers hard practices with low energy", () => {
    for (const p of getAllPractices().filter((p) => p.intensity === "hard")) {
      expect(suits(p, { ...EMPTY, energy: "low" })).toBe(false);
    }
  });
});

describe("Practice selection", () => {
  it("offers only practices that match every answer", () => {
    for (const state of fullAnswers()) {
      for (let i = 0; i < 10; i++) {
        const practice = pickPractice(state);
        expect(practice.energy, practice.id).toContain(state.energy);
        expect(practice.tension, practice.id).toContain(state.tension);
        expect(practice.focus, practice.id).toContain(state.focus);
        expect(TIME_RANGES[state.time!], practice.id).toContain(practiceDuration(practice, state.time));
      }
    }
  });

  it("restricts only by the questions that were answered", () => {
    const state: UserState = { ...EMPTY, tension: "tense" };
    for (let i = 0; i < 50; i++) {
      expect(pickPractice(state).tension).toContain("tense");
    }
    expect(pickPractice(EMPTY)).toBeDefined();
  });

  it("matches the time range: 2 minutes never gets a 5-minute practice and vice versa", () => {
    for (let i = 0; i < 50; i++) {
      expect(practiceDuration(pickPractice({ ...EMPTY, time: 2 }), 2)).toBeLessThanOrEqual(2);
      expect(practiceDuration(pickPractice({ ...EMPTY, time: 5 }), 5)).toBeGreaterThanOrEqual(3);
      expect(practiceDuration(pickPractice({ ...EMPTY, time: 10 }), 10)).toBe(10);
    }
  });

  it("varies offers: recently offered practices give way to others", () => {
    const state: UserState = { energy: "normal", tension: "tense", focus: "scattered", time: 2 };
    const first = pickPractice(state, NO_HISTORY, () => 0);
    for (let i = 0; i < 30; i++) {
      const next = pickPractice(state, { recent: [first.id], ratings: {} });
      expect(next.id).not.toBe(first.id);
    }
  });

  it("puts badly rated practices below the others", () => {
    const state: UserState = { energy: "low", tension: "tense", focus: "scattered", time: 2 };
    const pool = getAllPractices().filter((p) => suits(p, state));
    const ratings = Object.fromEntries(pool.slice(0, 1).map((p) => [p.id, "bad" as const]));
    for (let i = 0; i < 30; i++) {
      expect(pickPractice(state, { recent: [], ratings }).id).not.toBe(pool[0].id);
    }
  });

  it("times the practice by its longest duration within the range", () => {
    const meditation = getPracticeById("meditate_3m")!;
    expect(meditation.time).toEqual([2, 3, 5, 10]);
    expect(practiceDuration(meditation, 2)).toBe(2);
    expect(practiceDuration(meditation, 5)).toBe(5);
    expect(practiceDuration(meditation, 10)).toBe(10);
    expect(meditation.time).toContain(practiceDuration(meditation, null));
  });

  it("finds practices by id and returns undefined for unknown ids", () => {
    expect(getPracticeById("drink_water")?.title).toBeDefined();
    expect(getPracticeById("fallback_water")).toBeDefined();
    expect(getPracticeById("no_such_practice")).toBeUndefined();
  });
});

describe("formatMinutes", () => {
  it("declines the word for minutes", async () => {
    const { formatMinutes } = await import("@/lib/utils");
    expect(formatMinutes(1)).toBe("1 минута");
    expect(formatMinutes(2)).toBe("2 минуты");
    expect(formatMinutes(3)).toBe("3 минуты");
    expect(formatMinutes(5)).toBe("5 минут");
    expect(formatMinutes(10)).toBe("10 минут");
    expect(formatMinutes(11)).toBe("11 минут");
    expect(formatMinutes(21)).toBe("21 минута");
  });
});
