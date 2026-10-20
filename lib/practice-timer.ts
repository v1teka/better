/**
 * Practice countdown that keeps time while the screen is locked.
 *
 * JS timers are suspended in the background, so the remaining time is always
 * derived from the wall clock (the moment the timer ends), and a scheduled
 * local notification rings the gong if the app is not in the foreground then.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { isLateFinish, secondsLeftAt } from "./timer-clock";
import { cancelTimerEnd, scheduleTimerEnd, type TimerNotification } from "./timer-notification";

type Options = {
  totalSeconds: number;
  /** Called once when time runs out; `late` is true if the app was in the background then */
  onFinish: (late: boolean) => void;
  notification: TimerNotification;
};

export function usePracticeTimer({ totalSeconds, onFinish, notification }: Options) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // While running: the wall-clock moment the timer ends; while paused: null
  const endAtRef = useRef<number | null>(null);
  const remainingMsRef = useRef(totalSeconds * 1000);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const notificationRef = useRef(notification);
  notificationRef.current = notification;

  const tick = useCallback(() => {
    const endAt = endAtRef.current;
    if (endAt == null) return;
    const now = Date.now();
    const left = secondsLeftAt(endAt, now);
    setSecondsLeft(left);
    if (left === 0) {
      endAtRef.current = null;
      remainingMsRef.current = 0;
      setIsRunning(false);
      setIsDone(true);
      onFinishRef.current(isLateFinish(endAt, now));
    }
  }, []);

  const start = useCallback(() => {
    if (endAtRef.current != null || remainingMsRef.current <= 0) return;
    const endAt = Date.now() + remainingMsRef.current;
    endAtRef.current = endAt;
    setIsRunning(true);
    scheduleTimerEnd(endAt, notificationRef.current);
  }, []);

  const pause = useCallback(() => {
    const endAt = endAtRef.current;
    if (endAt == null) return;
    remainingMsRef.current = Math.max(0, endAt - Date.now());
    endAtRef.current = null;
    setIsRunning(false);
    cancelTimerEnd();
  }, []);

  const toggle = useCallback(() => {
    if (endAtRef.current != null) pause();
    else start();
  }, [pause, start]);

  /** Stop for good (practice completed or screen left) */
  const stop = useCallback(() => {
    endAtRef.current = null;
    setIsRunning(false);
    cancelTimerEnd();
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(tick, 500);
    // Catch up right away when the app returns from the background
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [isRunning, tick]);

  // Sound switched mid-practice: replace the scheduled notification
  useEffect(() => {
    if (endAtRef.current != null) scheduleTimerEnd(endAtRef.current, notificationRef.current);
  }, [notification.sound]);

  useEffect(() => stop, [stop]);

  return { secondsLeft, isRunning, isDone, start, pause, toggle, stop };
}
