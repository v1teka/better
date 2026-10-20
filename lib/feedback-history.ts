/**
 * Ratings given after practices, kept on the device.
 * Not used for selection yet: the base for personalization and for sending feedback.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type Rating = "bad" | "neutral" | "good";

export type FeedbackEntry = {
  practiceId: string;
  rating: Rating;
  /** ISO timestamp */
  at: string;
};

const KEY = "feedbackHistory";
// Enough for personalization, small enough for AsyncStorage
const MAX_ENTRIES = 500;

export async function getFeedbackHistory(): Promise<FeedbackEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

export async function addFeedback(practiceId: string, rating: Rating): Promise<void> {
  try {
    const history = await getFeedbackHistory();
    history.push({ practiceId, rating, at: new Date().toISOString() });
    await AsyncStorage.setItem(KEY, JSON.stringify(history.slice(-MAX_ENTRIES)));
  } catch {}
}
