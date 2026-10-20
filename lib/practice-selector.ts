/**
 * Practice selection logic
 * Based on scoring.md specification
 */

import type { Practice, UserState, ScoredPractice } from "@/types/practice";
import { fitsTime, scorePractice } from "./scoring";
import practicesData from "@/assets/practices.json";

// Load practices from JSON
const practices: Practice[] = practicesData as Practice[];

/**
 * Fallback practices for when no suitable practice is found
 */
const FALLBACK_PRACTICES: Practice[] = [
  {
    id: "fallback_breathing",
    title: "Дыхание 3 минуты",
    description: "Простое дыхательное упражнение для быстрого восстановления",
    firstStep: "Сядь удобно, закрой глаза",
    finish: "Сделай глубокий вдох и открой глаза",
    expectedEffect: "Спокойствие и ясность",
    simpleVersion: "Просто дыши медленно",
    category: "recovery",
    time: [5],
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
    time: [5],
    energy: ["low", "normal", "high"],
    focus: ["scattered", "stuck", "normal"],
    tension: ["calm", "tense"],
    intensity: "soft",
  },
  {
    id: "fallback_sit",
    title: "Просто посидеть без экрана 5 минут",
    description: "Пауза от экранов для восстановления внимания",
    firstStep: "Убери телефон, сядь удобно",
    finish: "Когда почувствуешь готовность, вернись к делам",
    expectedEffect: "Отдых для глаз и ума",
    simpleVersion: "Просто посиди",
    category: "recovery",
    time: [5],
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
    finish: "Вернись когда почувствуешь себя лучше",
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

/**
 * Get a random item from an array
 */
function randomChoice<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/**
 * Get a fallback practice
 */
function getFallbackPractice(): Practice {
  return randomChoice(FALLBACK_PRACTICES);
}

/**
 * Pick a practice based on user state
 * Returns a single practice selected from top-3 candidates
 */
export function pickPractice(state: UserState): Practice {
  // Ensure required fields are present (time is optional)
  if (!state.energy || !state.focus || !state.tension) {
    return getFallbackPractice();
  }

  const candidates: ScoredPractice[] = practices
    // 1. Фильтр по времени: практика укладывается в доступное время
    // (пропускаем, если время не выбрано)
    .filter((p) => fitsTime(p, state.time))

    // 2. Минимальная безопасность
    .filter((p) => {
      if (state.energy === "low" && p.intensity === "hard") return false;
      return true;
    })

    // 3. Scoring
    .map((p) => ({
      practice: p,
      score: scorePractice(p, state),
    }))

    // 4. Сортировка
    .sort((a, b) => b.score - a.score);

  // 5. Fail-safe
  if (candidates.length === 0 || candidates[0].score <= 0) {
    return getFallbackPractice();
  }

  // 6. Вариативность - выбрать из top-3
  const top = candidates.slice(0, 3);
  return randomChoice(top).practice;
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
