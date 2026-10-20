import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * "1 минута", "2 минуты", "5 минут"
 */
export function formatMinutes(minutes: number): string {
  const lastTwo = minutes % 100;
  const last = minutes % 10;
  let word = "минут";
  if (lastTwo < 11 || lastTwo > 14) {
    if (last === 1) word = "минута";
    else if (last >= 2 && last <= 4) word = "минуты";
  }
  return `${minutes} ${word}`;
}
