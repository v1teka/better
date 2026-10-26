import { describe, it, expect } from "vitest";
import { suits } from "@/lib/practice-selector";
import { decodeSeries, encodeSeries, pickSeries, seriesMinutes } from "@/lib/series";
import type { Energy, Focus, Tension, UserState } from "@/types/practice";

const ENERGIES: (Energy | null)[] = ["low", "normal", "high", null];
const TENSIONS: (Tension | null)[] = ["calm", "tense", null];
const FOCUSES: (Focus | null)[] = ["scattered", "normal", "stuck", null];

function* answers(): Generator<UserState> {
  for (const energy of ENERGIES)
    for (const tension of TENSIONS)
      for (const focus of FOCUSES) yield { energy, tension, focus, time: null };
}

describe("Series", () => {
  it("is an arc of three different practices: short way in, main, short way out", () => {
    for (const state of answers()) {
      for (let i = 0; i < 5; i++) {
        const steps = pickSeries(state);
        const label = JSON.stringify(state);
        expect(steps.map((s) => s.role), label).toEqual(["opening", "main", "closing"]);
        expect(new Set(steps.map((s) => s.practice.id)).size, label).toBe(3);
        const [opening, main, closing] = steps;
        expect(opening.practice.roles, label).toContain("opening");
        expect(closing.practice.roles, label).toContain("closing");
        expect(opening.duration, label).toBeLessThanOrEqual(3);
        expect(main.duration, label).toBeGreaterThanOrEqual(5);
        expect(closing.duration, label).toBeLessThanOrEqual(3);
        steps.forEach((s) => expect(s.practice.time, label).toContain(s.duration));
      }
    }
  });

  it("matches every answer in every step", () => {
    for (const state of answers()) {
      for (let i = 0; i < 5; i++) {
        for (const step of pickSeries(state)) {
          expect(suits(step.practice, state), `${step.practice.id} for ${JSON.stringify(state)}`).toBe(true);
        }
      }
    }
  });

  it("takes about a quarter of an hour: a 10-minute main practice and short ones of 2–3", () => {
    for (const state of answers()) {
      for (let i = 0; i < 5; i++) {
        const steps = pickSeries(state);
        const label = JSON.stringify(state);
        expect(steps[1].duration, label).toBe(10);
        expect(seriesMinutes(steps), label).toBeGreaterThanOrEqual(13);
        expect(seriesMinutes(steps), label).toBeLessThanOrEqual(16);
      }
    }
  });

  it("gives way to recently offered practices", () => {
    const state: UserState = { energy: "normal", tension: "tense", focus: "scattered", time: null };
    const first = pickSeries(state, undefined, () => 0).map((s) => s.practice.id);
    for (let i = 0; i < 20; i++) {
      const next = pickSeries(state, { recent: first, ratings: {} }).map((s) => s.practice.id);
      expect(next.filter((id) => first.includes(id)).length).toBeLessThan(3);
    }
  });

  it("travels between screens and back unchanged", () => {
    const steps = pickSeries({ energy: "low", tension: "calm", focus: "stuck", time: null });
    const { series, durations } = encodeSeries(steps);
    const { ids, minutes } = decodeSeries(series, durations);
    expect(ids).toEqual(steps.map((s) => s.practice.id));
    expect(minutes).toEqual(steps.map((s) => s.duration));
  });
});
