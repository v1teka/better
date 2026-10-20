/**
 * What the person did before, kept on the device: ratings after practices
 * and recently offered practices. Used to vary and personalize offers.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SelectionHistory } from "@/lib/practice-selector";
import type { Rating } from "@/types/practice";

export type FeedbackEntry = {
  practiceId: string;
  rating: Rating;
  /** ISO timestamp */
  at: string;
};

const FEEDBACK_KEY = "feedbackHistory";
const OFFERED_KEY = "offeredPractices";
// Enough for personalization, small enough for AsyncStorage
const MAX_FEEDBACK = 500;
// Offers in a row before a practice may come back without a penalty
const MAX_OFFERED = 8;

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export async function getFeedbackHistory(): Promise<FeedbackEntry[]> {
  return readList<FeedbackEntry>(FEEDBACK_KEY);
}

export async function addFeedback(practiceId: string, rating: Rating): Promise<void> {
  try {
    const history = await getFeedbackHistory();
    history.push({ practiceId, rating, at: new Date().toISOString() });
    await AsyncStorage.setItem(FEEDBACK_KEY, JSON.stringify(history.slice(-MAX_FEEDBACK)));
  } catch {}
}

export async function rememberOffered(practiceId: string): Promise<void> {
  try {
    const offered = await readList<string>(OFFERED_KEY);
    offered.push(practiceId);
    await AsyncStorage.setItem(OFFERED_KEY, JSON.stringify(offered.slice(-MAX_OFFERED)));
  } catch {}
}

export async function getSelectionHistory(): Promise<SelectionHistory> {
  const [recent, feedback] = await Promise.all([
    readList<string>(OFFERED_KEY),
    getFeedbackHistory(),
  ]);
  // Later entries overwrite earlier ones: the latest rating wins
  const ratings: SelectionHistory["ratings"] = {};
  for (const entry of feedback) ratings[entry.practiceId] = entry.rating;
  return { recent, ratings };
}
