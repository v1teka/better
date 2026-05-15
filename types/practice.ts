/**
 * Practice data model
 */

export type Energy = "low" | "normal" | "high";
export type Focus = "scattered" | "stuck" | "normal";
export type Tension = "calm" | "tense";
export type Time = 1 | 2 | 3 | 5 | 10;
export type Intensity = "soft" | "medium" | "hard";
export type Category = "recovery" | "activation" | "focus" | "body" | "creative" | "sensory";

export interface Practice {
  id: string;
  title: string;
  description: string;
  firstStep: string;
  finish: string;
  expectedEffect: string;
  simpleVersion: string;
  category: Category;
  time: Time[];
  energy: Energy[];
  focus: Focus[];
  tension: Tension[];
  intensity: Intensity;
}

export interface UserState {
  energy: Energy | null;
  focus: Focus | null;
  tension: Tension | null;
  time: Time | null;
}

export interface ScoredPractice {
  practice: Practice;
  score: number;
}
