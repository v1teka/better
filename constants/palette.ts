/**
 * App colors for the light and the dark theme.
 * Light is the original design (warm dawn gradient, dark text);
 * dark is the same calm in the night: a night sky over dark water, light text.
 */

export type Scheme = "light" | "dark";

export type Palette = {
  /** Top and bottom of the screen gradient */
  gradient: [string, string];
  /** Soft round spots over the gradient on the home screen */
  blobs: [string, string, string, string];
  /** Plain screens (survey, recommendation) */
  screen: string;
  text: string;
  textSecondary: string;
  muted: string;
  subtle: string;
  /** Blue text and icons: links, captions, the changing word */
  accent: string;
  button: string;
  buttonPressed: string;
  onButton: string;
  success: string;
  /** Unselected survey option */
  option: string;
  /** The rating card */
  card: string;
  cardBorder: string;
  /** Translucent cards on the practice screen */
  glass: string;
  glassBorder: string;
  /** Round backgrounds under emoji and icons */
  bubble: string;
  chip: string;
  iconCircle: string;
  ringTrack: string;
  dotInactive: string;
  rule: string;
  warmCircle: string;
  warmIcon: string;
  statusBar: "light" | "dark";
};

export const PALETTES: Record<Scheme, Palette> = {
  light: {
    gradient: ["#FFE5D9", "#D9F7F1"],
    blobs: [
      "rgba(255, 255, 255, 0.35)",
      "rgba(152, 216, 200, 0.25)",
      "rgba(255, 182, 193, 0.2)",
      "rgba(255, 255, 255, 0.3)",
    ],
    screen: "#FFFFFF",
    text: "#2D3748",
    textSecondary: "#4A5568",
    muted: "#718096",
    subtle: "#A0AEC0",
    accent: "#4A90E2",
    button: "#4A90E2",
    buttonPressed: "#3A7BD5",
    onButton: "#FFFFFF",
    success: "#4CAF50",
    option: "#F5F5F5",
    card: "rgba(255, 255, 255, 0.92)",
    cardBorder: "rgba(255, 255, 255, 0.6)",
    glass: "rgba(255, 255, 255, 0.65)",
    glassBorder: "rgba(255, 255, 255, 0.4)",
    bubble: "rgba(255, 255, 255, 0.9)",
    chip: "rgba(255, 255, 255, 0.6)",
    iconCircle: "rgba(255, 255, 255, 0.75)",
    ringTrack: "rgba(74, 144, 226, 0.15)",
    dotInactive: "rgba(74, 144, 226, 0.25)",
    rule: "rgba(45, 55, 72, 0.15)",
    warmCircle: "rgba(246, 173, 85, 0.25)",
    warmIcon: "#DD6B20",
    statusBar: "dark",
  },
  dark: {
    gradient: ["#1B1F3B", "#0F2A33"],
    blobs: [
      "rgba(255, 255, 255, 0.05)",
      "rgba(79, 209, 197, 0.08)",
      "rgba(159, 122, 234, 0.1)",
      "rgba(255, 255, 255, 0.04)",
    ],
    screen: "#151A2E",
    text: "#E2E8F0",
    textSecondary: "#CBD5E0",
    muted: "#A0AEC0",
    subtle: "#718096",
    accent: "#7AB3F5",
    button: "#4A90E2",
    buttonPressed: "#3A7BD5",
    onButton: "#FFFFFF",
    success: "#68D391",
    option: "rgba(255, 255, 255, 0.08)",
    card: "rgba(31, 38, 66, 0.94)",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    glass: "rgba(255, 255, 255, 0.07)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
    bubble: "rgba(255, 255, 255, 0.12)",
    chip: "rgba(255, 255, 255, 0.1)",
    iconCircle: "rgba(255, 255, 255, 0.1)",
    ringTrack: "rgba(122, 179, 245, 0.18)",
    dotInactive: "rgba(122, 179, 245, 0.25)",
    rule: "rgba(226, 232, 240, 0.15)",
    warmCircle: "rgba(246, 173, 85, 0.18)",
    warmIcon: "#F6AD55",
    statusBar: "light",
  },
};
