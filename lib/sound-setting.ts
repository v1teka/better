/**
 * Whether the app plays sounds (background sound and gong), remembered on the device.
 */

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "soundOn";

let soundOn = true;
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((value) => {
    if (value === "false") setSoundOn(false);
  })
  .catch(() => {});

export function setSoundOn(value: boolean): void {
  if (value === soundOn) return;
  soundOn = value;
  listeners.forEach((listener) => listener());
  AsyncStorage.setItem(KEY, String(value)).catch(() => {});
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundOn(): boolean {
  return useSyncExternalStore(subscribe, () => soundOn);
}
