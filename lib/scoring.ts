/**
 * Practice scoring logic
 * Based on scoring.md specification
 */

import type { Practice, Time, UserState } from "@/types/practice";

/**
 * Calculate score for a practice based on user state
 * Returns a numeric score (higher is better)
 */
export function scorePractice(practice: Practice, state: UserState): number {
  let score = 0;

  // Ensure state is complete (time is optional)
  if (!state.energy || !state.focus || !state.tension) {
    return 0;
  }

  // 1. Совпадение по энергии
  if (practice.energy.includes(state.energy)) {
    score += 2;
  }

  // 2. Совпадение по фокусу.
  // В каталоге нет практик с focus "normal": при нормальном фокусе он
  // не ограничивает выбор, подходит всё, кроме фокус-практик
  if (
    practice.focus.includes(state.focus) ||
    (state.focus === "normal" && practice.category !== "focus")
  ) {
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

  // 6. Время — «до N минут»: предпочитаем практики, которые занимают
  // хотя бы половину доступного времени
  if (state.time != null && practiceDuration(practice, state.time) * 2 >= state.time) {
    score += 1;
  }

  return score;
}

/**
 * Whether the practice can be done within the available time
 */
export function fitsTime(practice: Practice, time: Time | null): boolean {
  return time == null || practice.time.some((t) => t <= time);
}

/**
 * Timer length for the practice: the longest of its durations that fits the
 * available time. Without a time limit, a random one of its durations.
 */
export function practiceDuration(practice: Practice, time: Time | null): Time {
  if (time == null) {
    return practice.time[Math.floor(Math.random() * practice.time.length)];
  }
  const fitting = practice.time.filter((t) => t <= time);
  return (fitting.length > 0 ? Math.max(...fitting) : Math.min(...practice.time)) as Time;
}
