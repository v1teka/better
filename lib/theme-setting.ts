/**
 * Light or dark theme, chosen with the logo switch on the home screen
 * and remembered on the device. The app starts light until the person switches.
 */

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { PALETTES, type Palette, type Scheme } from "@/constants/palette";

const KEY = "colorScheme";

let scheme: Scheme = "light";
const listeners = new Set<() => void>();

/** Resolves once the saved choice is read, so the first screen opens in the right colors */
export const themeLoaded: Promise<void> = AsyncStorage.getItem(KEY)
  .then((value) => {
    if (value === "dark") setScheme("dark");
  })
  .catch(() => {});

export function setScheme(value: Scheme): void {
  if (value === scheme) return;
  scheme = value;
  listeners.forEach((listener) => listener());
  AsyncStorage.setItem(KEY, value).catch(() => {});
}

export function toggleScheme(): void {
  setScheme(scheme === "dark" ? "light" : "dark");
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useScheme(): Scheme {
  return useSyncExternalStore(subscribe, () => scheme);
}

export function usePalette(): Palette {
  return PALETTES[useScheme()];
}
