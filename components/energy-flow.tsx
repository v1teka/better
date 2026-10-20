import { useEffect } from "react";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Energy flowing around the body (the logo switch) when it is switched.
 *
 * After qigong: heaven qi is poured in through the crown and flows down through the body
 * to the feet («Поднять ци — излить ци»); earth qi rises from the soles. The body and its
 * qi field form one sphere. So the arrows come in straight along the axis, part at the pole
 * and run around the switch along the meridians of a sphere, gather at the opposite pole
 * and leave straight along the axis.
 *
 * Down — cool, as the evening comes (the knob was up); up — warm, the morning.
 */

export type FlowDirection = "down" | "up";

export const FLOW_DURATION_MS = 1500;

/** Sphere radius around the switch center and the straight stretch beyond each pole */
const R = 62;
const AXIS = 40;

/** Canvas size; the canvas is centered on the switch */
export const FLOW_WIDTH = 2 * R + 16;
export const FLOW_HEIGHT = 2 * (R + AXIS) + 16;

const CX = FLOW_WIDTH / 2;
const CY = FLOW_HEIGHT / 2;

const COLORS: Record<FlowDirection, string> = {
  down: "#6F9CF0",
  up: "#EE9440",
};

/**
 * A track in the "down" orientation (the "up" flow mirrors it):
 * `a` — a meridian from the top pole to the bottom one, bulging by `a` to the side;
 * `from`/`to` — a straight stretch along the axis
 */
type Track = { a: number } | { from: number; to: number };

type Arrow = {
  track: Track;
  /** ms from the tap */
  delay: number;
  duration: number;
  /** Share of the track the arrow covers */
  length: number;
  width: number;
  opacity: number;
};

const IN: Track = { from: -(R + AXIS), to: -R };
const OUT: Track = { from: R, to: R + AXIS };

// Hand-tuned so the flow reads as one stream: in at the crown, around the body, out below.
// Short and long, straight and curved; a second, thinner wave follows the first.
const ARROWS: Arrow[] = [
  { track: IN, delay: 0, duration: 420, length: 0.8, width: 1.6, opacity: 0.9 },
  { track: IN, delay: 110, duration: 380, length: 0.45, width: 1.3, opacity: 0.7 },
  { track: IN, delay: 210, duration: 340, length: 0.3, width: 1.1, opacity: 0.55 },

  { track: { a: -62 }, delay: 230, duration: 900, length: 0.42, width: 1.6, opacity: 0.9 },
  { track: { a: 62 }, delay: 260, duration: 880, length: 0.18, width: 1.4, opacity: 0.8 },
  { track: { a: -54 }, delay: 300, duration: 950, length: 0.2, width: 1.3, opacity: 0.7 },
  { track: { a: 54 }, delay: 210, duration: 920, length: 0.4, width: 1.6, opacity: 0.9 },
  { track: { a: -44 }, delay: 250, duration: 860, length: 0.34, width: 1.5, opacity: 0.85 },
  { track: { a: 44 }, delay: 340, duration: 900, length: 0.16, width: 1.2, opacity: 0.7 },
  { track: { a: -33 }, delay: 360, duration: 820, length: 0.18, width: 1.2, opacity: 0.6 },
  { track: { a: 33 }, delay: 280, duration: 860, length: 0.36, width: 1.4, opacity: 0.8 },
  { track: { a: -22 }, delay: 320, duration: 800, length: 0.3, width: 1.3, opacity: 0.65 },
  { track: { a: 22 }, delay: 400, duration: 780, length: 0.14, width: 1.1, opacity: 0.55 },

  { track: { a: -62 }, delay: 480, duration: 900, length: 0.16, width: 1.2, opacity: 0.6 },
  { track: { a: 54 }, delay: 520, duration: 880, length: 0.22, width: 1.2, opacity: 0.6 },
  { track: { a: -44 }, delay: 560, duration: 860, length: 0.14, width: 1.1, opacity: 0.55 },
  { track: { a: 33 }, delay: 540, duration: 840, length: 0.2, width: 1.2, opacity: 0.55 },
  { track: { a: 62 }, delay: 600, duration: 820, length: 0.3, width: 1.3, opacity: 0.6 },
  { track: { a: -22 }, delay: 620, duration: 760, length: 0.18, width: 1, opacity: 0.5 },

  { track: OUT, delay: 950, duration: 440, length: 0.8, width: 1.6, opacity: 0.9 },
  { track: OUT, delay: 1040, duration: 400, length: 0.45, width: 1.3, opacity: 0.7 },
  { track: OUT, delay: 1120, duration: 370, length: 0.3, width: 1.1, opacity: 0.55 },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function easeInOut(t: number): number {
  "worklet";
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(from: number, to: number, t: number): number {
  "worklet";
  const x = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return x * x * (3 - 2 * x);
}

function FlowArrow({
  arrow,
  clock,
  flip,
}: {
  arrow: Arrow;
  clock: SharedValue<number>;
  flip: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const raw = (clock.value - arrow.delay) / arrow.duration;
    if (raw <= 0 || raw >= 1) return { d: "M0 0", strokeOpacity: 0 };

    const track = arrow.track;
    const meridian = "a" in track;
    const p = easeInOut(raw);
    // The head stops at the pole and the tail catches up: the arrows gather into a point
    const head = Math.min(1, p * (1 + arrow.length));
    const tail = Math.max(0, p * (1 + arrow.length) - arrow.length);

    const steps = meridian ? 12 : 1;
    let d = "";
    let hx = 0;
    let hy = 0;
    for (let i = 0; i <= steps; i++) {
      const u = tail + ((head - tail) * i) / steps;
      let x = 0;
      let y = 0;
      if ("a" in track) {
        x = track.a * Math.sin(Math.PI * u);
        y = -R * Math.cos(Math.PI * u);
      } else {
        y = track.from + (track.to - track.from) * u;
      }
      hx = CX + x;
      hy = CY + y * flip;
      d += (i === 0 ? "M" : " L") + hx.toFixed(1) + " " + hy.toFixed(1);
    }

    // Direction of travel at the head, for the arrowhead
    let dx = 0;
    let dy = 1;
    if ("a" in track) {
      dx = track.a * Math.cos(Math.PI * head);
      dy = R * Math.sin(Math.PI * head);
    }
    dy *= flip;
    const norm = Math.sqrt(dx * dx + dy * dy);
    if (norm > 0) {
      const bx = -dx / norm;
      const by = -dy / norm;
      // The arrowhead shrinks with the arrow as it gathers into the pole
      const size = (2.2 + arrow.width * 1.6) * Math.max(0.4, Math.min(1, (head - tail) / arrow.length));
      const cos = Math.cos(0.5);
      const sin = Math.sin(0.5);
      const lx = hx + (bx * cos - by * sin) * size;
      const ly = hy + (bx * sin + by * cos) * size;
      const rx = hx + (bx * cos + by * sin) * size;
      const ry = hy + (-bx * sin + by * cos) * size;
      d +=
        " M" + lx.toFixed(1) + " " + ly.toFixed(1) +
        " L" + hx.toFixed(1) + " " + hy.toFixed(1) +
        " L" + rx.toFixed(1) + " " + ry.toFixed(1);
    }

    const fade = smoothstep(0, 0.12, raw) * (1 - smoothstep(0.72, 1, raw));
    return { d, strokeOpacity: arrow.opacity * fade };
  });

  return (
    <AnimatedPath
      animatedProps={animatedProps}
      stroke="currentColor"
      strokeWidth={arrow.width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** A point of light at a pole: where the flow comes in, and where it gathers into one */
function PoleGlow({
  y,
  rise,
  peak,
  fade,
  clock,
}: {
  y: number;
  rise: number;
  peak: number;
  fade: number;
  clock: SharedValue<number>;
}) {
  const animatedProps = useAnimatedProps(() => {
    const t = clock.value;
    const glow = smoothstep(rise, peak, t) * (1 - smoothstep(peak, fade, t));
    return { r: 1.5 + 2.5 * glow, fillOpacity: 0.85 * glow };
  });
  return <AnimatedCircle cx={CX} cy={y} animatedProps={animatedProps} fill="currentColor" />;
}

/** One run of the flow; mount it with a new key to run again */
export function EnergyFlow({ direction }: { direction: FlowDirection }) {
  const clock = useSharedValue(0);

  useEffect(() => {
    clock.value = withTiming(FLOW_DURATION_MS, { duration: FLOW_DURATION_MS, easing: Easing.linear });
  }, [clock]);

  // The qi field: a faint sphere that appears while the flow runs
  const sphereProps = useAnimatedProps(() => {
    const t = clock.value / FLOW_DURATION_MS;
    return {
      r: R * (0.94 + 0.08 * smoothstep(0, 1, t)),
      strokeOpacity: 0.16 * smoothstep(0.05, 0.35, t) * (1 - smoothstep(0.65, 1, t)),
    };
  });

  const flip = direction === "down" ? 1 : -1;

  return (
    <Svg width={FLOW_WIDTH} height={FLOW_HEIGHT} color={COLORS[direction]}>
      <AnimatedCircle
        cx={CX}
        cy={CY}
        animatedProps={sphereProps}
        stroke="currentColor"
        strokeWidth={1}
        fill="none"
      />
      <PoleGlow y={CY - R * flip} rise={200} peak={420} fade={700} clock={clock} />
      <PoleGlow y={CY + R * flip} rise={850} peak={1150} fade={1450} clock={clock} />
      {ARROWS.map((arrow, index) => (
        <FlowArrow key={index} arrow={arrow} clock={clock} flip={flip} />
      ))}
    </Svg>
  );
}
