/**
 * A series of three practices for those who have more time (about 15 minutes), as an arc:
 * - opening — a short way in (breathing, grounding), up to 3 minutes;
 * - main — the practice for the person's state, 5–10 minutes;
 * - closing — a short way out (writing, gratitude, quiet), up to 3 minutes.
 *
 * Every step suits the answers, with the same hard filters as a single practice. Within that,
 * preferences come in order — a main practice that can last 10 minutes, short ones of at least
 * 2 minutes, short ones of another category than the main — so the series takes about a quarter
 * of an hour and doesn't repeat itself. Only if nothing at all fits are the least important
 * answers relaxed (focus, then tension, then energy): matching the answers comes first.
 */

import type { Practice, SeriesRole, Time, UserState } from "@/types/practice";
import {
  NO_HISTORY,
  getAllPractices,
  pickFrom,
  suits,
  type SelectionHistory,
} from "@/lib/practice-selector";

export type SeriesStepRole = "opening" | "main" | "closing";

export type SeriesStep = {
  practice: Practice;
  duration: Time;
  role: SeriesStepRole;
};

const isShort = (t: Time) => t <= 3;
const isLong = (t: Time) => t >= 5;

function longest(practice: Practice, allowed: (t: Time) => boolean): Time {
  return Math.max(...practice.time.filter(allowed)) as Time;
}

export function pickSeries(
  state: UserState,
  history: SelectionHistory = NO_HISTORY,
  random: () => number = Math.random,
): SeriesStep[] {
  // The duration answer is the series itself, so time doesn't filter here
  const answers: UserState = { ...state, time: null };
  const relaxations: UserState[] = [
    answers,
    { ...answers, focus: null },
    { ...answers, focus: null, tension: null },
    { ...answers, focus: null, tension: null, energy: null },
  ];
  const used = new Set<string>();

  // The first preference that has candidates wins; answers are relaxed only when none has
  const pickRole = (preferences: ((p: Practice) => boolean)[]): Practice | null => {
    for (const relaxed of relaxations) {
      for (const fits of preferences) {
        const candidates = getAllPractices().filter((p) => !used.has(p.id) && fits(p) && suits(p, relaxed));
        if (candidates.length > 0) {
          const picked = pickFrom(candidates, relaxed, history, random);
          used.add(picked.id);
          return picked;
        }
      }
    }
    return null;
  };

  const main = pickRole([(p) => p.time.includes(10), (p) => p.time.some(isLong)]);

  const shortRole = (role: SeriesRole) => {
    const hasRole = (p: Practice) => !!p.roles?.includes(role) && p.time.some(isShort);
    const notShortest = (p: Practice) => p.time.some((t) => t >= 2 && t <= 3);
    const otherCategory = (p: Practice) => p.category !== main?.category;
    return pickRole([
      (p) => hasRole(p) && notShortest(p) && otherCategory(p),
      (p) => hasRole(p) && notShortest(p),
      (p) => hasRole(p) && otherCategory(p),
      hasRole,
    ]);
  };
  const opening = shortRole("opening");
  const closing = shortRole("closing");

  const steps: SeriesStep[] = [];
  if (opening) steps.push({ practice: opening, duration: longest(opening, isShort), role: "opening" });
  if (main) steps.push({ practice: main, duration: longest(main, isLong), role: "main" });
  if (closing) steps.push({ practice: closing, duration: longest(closing, isShort), role: "closing" });
  return steps;
}

export function seriesMinutes(steps: { duration: Time }[]): number {
  return steps.reduce((sum, step) => sum + step.duration, 0);
}

/** A series travels between screens as two lists in the route: ids and minutes */
export function encodeSeries(steps: SeriesStep[]): { series: string; durations: string } {
  return {
    series: steps.map((s) => s.practice.id).join(","),
    durations: steps.map((s) => s.duration).join(","),
  };
}

export function decodeSeries(series?: string, durations?: string): { ids: string[]; minutes: number[] } {
  const ids = (series ?? "").split(",").filter(Boolean);
  const minutes = (durations ?? "").split(",").map((m) => parseInt(m, 10));
  return { ids, minutes };
}

export const SERIES_ROLE_LABELS: Record<SeriesStepRole, string> = {
  opening: "Вступительная",
  main: "Основная",
  closing: "Завершающая",
};
