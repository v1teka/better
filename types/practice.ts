/**
 * Practice data model
 */

export type Energy = "low" | "normal" | "high";
export type Focus = "scattered" | "stuck" | "normal";
export type Tension = "calm" | "tense";
/** Practice duration, minutes */
export type Time = 1 | 2 | 3 | 5 | 10;
/** Answer to "how much time do you have": 2 → 1–2 min, 5 → 3–5 min, 10 → 10 min */
export type SurveyTime = 2 | 5 | 10;
/** The duration question also offers a series of practices for those with more time */
export type TimeChoice = SurveyTime | "series";
/** Where a short practice fits in a series: the way in or the way out */
export type SeriesRole = "opening" | "closing";
export type Intensity = "soft" | "medium" | "hard";
export type Category = "recovery" | "activation" | "focus" | "body" | "creative" | "sensory";
export type Rating = "bad" | "neutral" | "good";

export interface Practice {
  id: string;
  title: string;
  description: string;
  firstStep: string;
  finish: string;
  expectedEffect: string;
  simpleVersion: string;
  category: Category;
  /** Every duration the practice works at */
  time: Time[];
  /** States the practice suits (not only the ones it targets) */
  energy: Energy[];
  focus: Focus[];
  tension: Tension[];
  intensity: Intensity;
  /** Can open or close a series (lib/series.ts); any long enough practice can be its main one */
  roles?: SeriesRole[];
}

/** Survey answers; every question is optional */
export interface UserState {
  energy: Energy | null;
  focus: Focus | null;
  tension: Tension | null;
  time: SurveyTime | null;
}
