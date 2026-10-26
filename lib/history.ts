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

/**
 * One rating for one or several practices (a series is rated as a whole). Written in one go:
 * separate concurrent writes would each read the old list and only the last would survive.
 */
export async function addFeedback(practiceIds: string[], rating: Rating): Promise<void> {
  try {
    const history = await getFeedbackHistory();
    const at = new Date().toISOString();
    practiceIds.forEach((practiceId) => history.push({ practiceId, rating, at }));
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

const SHOW_FEEDBACK_KEY = "showFeedback";
const FEEDBACK_IDS_KEY = "practiceIds";
// Kept for the rating flow of the versions before series: the single practice id
const LEGACY_FEEDBACK_ID_KEY = "practiceId";

/** After a practice (or a series): the home screen asks how it went */
export async function requestFeedback(practiceIds: string[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [SHOW_FEEDBACK_KEY, "true"],
      [FEEDBACK_IDS_KEY, practiceIds.join(",")],
      [LEGACY_FEEDBACK_ID_KEY, practiceIds[practiceIds.length - 1] ?? ""],
    ]);
  } catch {}
}

/** The practices to rate, if a rating is due; asking once clears the request */
export async function takeFeedbackRequest(): Promise<string[] | null> {
  try {
    const [[, show], [, ids], [, legacyId]] = await AsyncStorage.multiGet([
      SHOW_FEEDBACK_KEY,
      FEEDBACK_IDS_KEY,
      LEGACY_FEEDBACK_ID_KEY,
    ]);
    if (show !== "true") return null;
    await AsyncStorage.removeItem(SHOW_FEEDBACK_KEY);
    const list = (ids ?? "").split(",").filter(Boolean);
    return list.length > 0 ? list : legacyId ? [legacyId] : [];
  } catch {
    return null;
  }
}
