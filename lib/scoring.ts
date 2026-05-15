/**
 * Practice scoring logic
 * Based on scoring.md specification
 */

import type { Practice, UserState } from "@/types/practice";

/**
 * Calculate score for a practice based on user state
 * Returns a numeric score (higher is better)
 */
export function scorePractice(practice: Practice, state: UserState): number {
  let score = 0;

  // Ensure state is complete
  if (!state.energy || !state.focus || !state.tension || !state.time) {
    return 0;
  }

  // 1. Совпадение по энергии
  if (practice.energy.includes(state.energy)) {
    score += 2;
  }

  // 2. Совпадение по фокусу
  if (practice.focus.includes(state.focus)) {
    score += 2;
  }

  // 3. Совпадение по напряжению
  if (practice.tension.includes(state.tension)) {
    score += 2;
  }

  // 4. Контекстные бонусы

  // Низкая энергия → мягкая активация
  if (
    state.energy === "low" &&
    practice.category === "activation" &&
    practice.intensity !== "hard"
  ) {
    score += 1;
  }

  // Высокое напряжение → восстановление
  if (state.tension === "tense" && practice.category === "recovery") {
    score += 1;
  }

  // Застревание → фокус
  if (state.focus === "stuck" && practice.category === "focus") {
    score += 1;
  }

  // 5. Штрафы (очень важно)

  // Низкая энергия + жёсткая практика
  if (state.energy === "low" && practice.intensity === "hard") {
    score -= 3;
  }

  // Напряжение + жёсткая активация
  if (
    state.tension === "tense" &&
    practice.category === "activation" &&
    practice.intensity === "hard"
  ) {
    score -= 3;
  }

  // Нормальный фокус → не навязывать фокус-практики
  if (state.focus === "normal" && practice.category === "focus") {
    score -= 1;
  }

  return score;
}
