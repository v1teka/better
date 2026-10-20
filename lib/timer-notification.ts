/**
 * Local notification that rings the gong when a practice timer ends while
 * the app is in the background or the screen is locked.
 */

import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const isSupported = Platform.OS !== "web";

if (isSupported) {
  // In the foreground the practice screen plays the gong itself,
  // so a notification arriving then is not shown and makes no sound.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let scheduledId: string | null = null;
// Bumped on every schedule/cancel, so a schedule that resolves after the
// timer was paused or stopped does not leave a stray notification behind.
let generation = 0;

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return requested.granted;
}

export type TimerNotification = { title: string; body: string; sound: boolean };

export async function scheduleTimerEnd(endAt: number, notification: TimerNotification): Promise<void> {
  if (!isSupported) return;
  await cancelTimerEnd();
  const mine = ++generation;
  try {
    if (!(await ensurePermission()) || mine !== generation) return;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        sound: notification.sound ? (Platform.OS === "ios" ? "gong.caf" : true) : false,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endAt },
    });
    if (mine === generation) {
      scheduledId = id;
    } else {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  } catch {
    // Without the notification the timer still works while the app is open
  }
}

export async function cancelTimerEnd(): Promise<void> {
  if (!isSupported) return;
  generation++;
  const id = scheduledId;
  scheduledId = null;
  if (id) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  }
}
