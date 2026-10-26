/**
 * Practice selection
 *
 * The offer must match what the person answered:
 * - every answered question is a hard filter: a practice is offered only if it
 *   suits each answer; an unanswered question doesn't restrict anything;
 * - time is a range, not an upper bound: "2" → 1–2 min, "5" → 3–5 min, "10" → 10 min;
 * - hard practices are never offered with low energy.
 *
 * Among the suitable ones, practices made for this state come first (one that suits
 * only tension outranks one that suits any state); recently offered and badly rated
 * practices go down. The pick is random among the best few, so offers vary.
 */

import type { Practice, Rating, SurveyTime, Time, UserState } from "@/types/practice";
import practicesData from "@/assets/practices.json";

const practices: Practice[] = practicesData as Practice[];

export const TIME_RANGES: Record<SurveyTime, Time[]> = {
  2: [1, 2],
  5: [3, 5],
  10: [10],
};

/** What the person did before, used to vary and personalize offers */
export type SelectionHistory = {
  /** Ids of recently offered practices, oldest first */
  recent: string[];
  /** Latest rating per practice id */
  ratings: Record<string, Rating>;
};

export const NO_HISTORY: SelectionHistory = { recent: [], ratings: {} };

// How many of the best-scored practices the random pick is made from
const TOP_CANDIDATES = 4;

/**
 * Used only if nothing in the catalog fits (the catalog is checked by tests
 * to cover every combination of answers, so this should not happen)
 */
const FALLBACK_PRACTICES: Practice[] = [
  {
    id: "fallback_breathing",
    title: "Медленно подышать",
    description: "Простое дыхательное упражнение для быстрого восстановления",
    firstStep: "Сядь удобно, закрой глаза",
    finish: "Сделай глубокий вдох и открой глаза",
    expectedEffect: "Спокойствие и ясность",
    simpleVersion: "Просто дыши медленно",
    category: "recovery",
    time: [2, 5],
    energy: ["low", "normal", "high"],
    focus: ["scattered", "stuck", "normal"],
    tension: ["calm", "tense"],
    intensity: "soft",
  },
  {
    id: "fallback_water",
    title: "Стакан воды медленно",
    description: "Осознанное питьё воды для возвращения в настоящий момент",
    firstStep: "Возьми стакан воды",
    finish: "Допей воду до конца",
    expectedEffect: "Заземление и свежесть",
    simpleVersion: "Просто выпей воды",
    category: "recovery",
    time: [1, 2],
    energy: ["low", "normal", "high"],
    focus: ["scattered", "stuck", "normal"],
    tension: ["calm", "tense"],
    intensity: "soft",
  },
  {
    id: "fallback_walk",
    title: "Медленная прогулка",
    description: "Спокойная прогулка для перезагрузки",
    firstStep: "Выйди на улицу",
    finish: "Вернись, когда почувствуешь себя лучше",
    expectedEffect: "Свежесть и ясность мысли",
    simpleVersion: "Просто пройдись",
    category: "recovery",
    time: [5, 10],
    energy: ["low", "normal", "high"],
    focus: ["scattered", "stuck", "normal"],
    tension: ["calm", "tense"],
    intensity: "soft",
  },
];

export function suits(practice: Practice, state: UserState): boolean {
  if (state.energy && !practice.energy.includes(state.energy)) return false;
  if (state.tension && !practice.tension.includes(state.tension)) return false;
  if (state.focus && !practice.focus.includes(state.focus)) return false;
  if (state.time && !practice.time.some((t) => TIME_RANGES[state.time!].includes(t))) return false;
  if (state.energy === "low" && practice.intensity === "hard") return false;
  return true;
}

function score(practice: Practice, state: UserState, history: SelectionHistory): number {
  let result = 0;

  // The fewer states a practice suits, the more it is made for this one
  if (state.energy) result += 1 / practice.energy.length;
  if (state.tension) result += 1 / practice.tension.length;
  if (state.focus) result += 1 / practice.focus.length;

  const rating = history.ratings[practice.id];
  if (rating === "good") result += 0.5;
  if (rating === "bad") result -= 2;

  // Recently offered practices give way to others; the latest ones the most
  const recentIndex = history.recent.lastIndexOf(practice.id);
  if (recentIndex !== -1) {
    result -= 3 + recentIndex / history.recent.length;
  }

  return result;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Pick one of suitable `candidates`: the best-scored few for these answers and history,
 * a random one among them, so offers vary
 */
export function pickFrom(
  candidates: Practice[],
  state: UserState,
  history: SelectionHistory,
  random: () => number,
): Practice {
  // Shuffle first, so equal scores are ordered randomly by the stable sort
  const ranked = shuffle(candidates, random).sort(
    (a, b) => score(b, state, history) - score(a, state, history),
  );
  const top = ranked.slice(0, TOP_CANDIDATES);
  return top[Math.floor(random() * top.length)];
}

/**
 * Pick a practice for the answers. If nothing fits, the least important answers
 * are relaxed one by one (focus, then tension, then energy), time is kept.
 */
export function pickPractice(
  state: UserState,
  history: SelectionHistory = NO_HISTORY,
  random: () => number = Math.random,
): Practice {
  const relaxations: UserState[] = [
    state,
    { ...state, focus: null },
    { ...state, focus: null, tension: null },
    { ...state, focus: null, tension: null, energy: null },
  ];

  for (const relaxed of relaxations) {
    const candidates = practices.filter((p) => suits(p, relaxed));
    if (candidates.length > 0) return pickFrom(candidates, relaxed, history, random);
  }

  const fallbacks = FALLBACK_PRACTICES.filter((p) => suits(p, { ...state, focus: null, tension: null, energy: null }));
  const pool = fallbacks.length > 0 ? fallbacks : FALLBACK_PRACTICES;
  return pool[Math.floor(random() * pool.length)];
}

/**
 * Timer length: the longest duration of the practice within the chosen time range.
 * Without a time answer — a random one of its durations.
 */
export function practiceDuration(
  practice: Practice,
  time: SurveyTime | null,
  random: () => number = Math.random,
): Time {
  if (time == null) {
    return practice.time[Math.floor(random() * practice.time.length)];
  }
  const inRange = practice.time.filter((t) => TIME_RANGES[time].includes(t));
  return (inRange.length > 0 ? Math.max(...inRange) : Math.min(...practice.time)) as Time;
}

/**
 * Find a practice (including fallbacks) by id
 */
export function getPracticeById(id: string): Practice | undefined {
  return practices.find((p) => p.id === id) ?? FALLBACK_PRACTICES.find((p) => p.id === id);
}

/**
 * Get all practices (for testing/debugging)
 */
export function getAllPractices(): Practice[] {
  return practices;
}
