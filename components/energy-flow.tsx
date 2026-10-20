import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Energy flowing through and around the body (the logo switch) when it is switched.
 *
 * After qigong («Поднять ци — излить ци»): qi is gathered from around the body and poured in
 * through the crown, down the central channel of the body to the feet; earth qi rises the other
 * way. The body and its qi field form one sphere. So the stream comes in along the axis above
 * the crown, parts there: the straight core goes right through the middle of the body, the
 * narrow arcs pass through it as well (meridians in front of and behind the body), the wide arcs
 * go around it and shape the sphere. All of it gathers at the opposite pole and leaves along
 * the axis.
 *
 * Down — cool, as the evening comes (the knob was up); up — warm, the morning.
 * The flow is drawn in two layers: behind the switch in the flow color, and over it in white,
 * clipped to the body, so the stream reads as light passing through it.
 */

export type FlowDirection = "down" | "up";

export const FLOW_DURATION_MS = 1500;

/** Sphere radius around the switch center and the straight stretch beyond each pole */
const R = 54;
const AXIS = 36;

/** Canvas size; the canvas is centered on the switch */
export const FLOW_WIDTH = 2 * R + 16;
export const FLOW_HEIGHT = 2 * (R + AXIS) + 16;

const CX = FLOW_WIDTH / 2;
const CY = FLOW_HEIGHT / 2;

const COLORS: Record<FlowDirection, string> = {
  down: "#6F9CF0",
  up: "#EE9440",
};

/** The stream inside the body: light over the blue switch */
const INNER_COLOR = "#FFFFFF";

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
/** The central channel: straight through the whole body, above the crown to below the feet */
const CORE: Track = { from: -(R + AXIS), to: R + AXIS };

// Hand-tuned so the flow reads as one stream: in at the crown, through and around the body,
// out below. Short and long, straight and curved; a second, thinner wave follows the first.
const ARROWS: Arrow[] = [
  // The stream comes in from above
  { track: IN, delay: 0, duration: 380, length: 0.8, width: 1.6, opacity: 0.9 },
  { track: IN, delay: 120, duration: 340, length: 0.4, width: 1.2, opacity: 0.65 },

  // Straight through the middle of the body
  { track: CORE, delay: 60, duration: 1000, length: 0.3, width: 1.7, opacity: 0.95 },
  { track: CORE, delay: 260, duration: 950, length: 0.12, width: 1.3, opacity: 0.75 },
  { track: CORE, delay: 420, duration: 980, length: 0.22, width: 1.5, opacity: 0.85 },
  { track: CORE, delay: 560, duration: 900, length: 0.1, width: 1.1, opacity: 0.6 },

  // Narrow arcs through the body
  { track: { a: -8 }, delay: 300, duration: 820, length: 0.3, width: 1.3, opacity: 0.75 },
  { track: { a: 9 }, delay: 380, duration: 800, length: 0.18, width: 1.2, opacity: 0.65 },
  { track: { a: -16 }, delay: 340, duration: 860, length: 0.16, width: 1.2, opacity: 0.65 },
  { track: { a: 17 }, delay: 260, duration: 860, length: 0.34, width: 1.4, opacity: 0.8 },

  // Wide arcs around the body: the sphere
  { track: { a: -54 }, delay: 230, duration: 900, length: 0.36, width: 1.5, opacity: 0.85 },
  { track: { a: 54 }, delay: 300, duration: 880, length: 0.18, width: 1.3, opacity: 0.7 },
  { track: { a: -42 }, delay: 280, duration: 900, length: 0.2, width: 1.3, opacity: 0.7 },
  { track: { a: 42 }, delay: 220, duration: 920, length: 0.4, width: 1.6, opacity: 0.9 },
  { track: { a: -30 }, delay: 260, duration: 860, length: 0.32, width: 1.4, opacity: 0.8 },
  { track: { a: 30 }, delay: 360, duration: 840, length: 0.16, width: 1.2, opacity: 0.65 },

  // Second wave
  { track: { a: -54 }, delay: 520, duration: 860, length: 0.16, width: 1.1, opacity: 0.55 },
  { track: { a: 42 }, delay: 560, duration: 840, length: 0.22, width: 1.2, opacity: 0.6 },
  { track: { a: -30 }, delay: 600, duration: 800, length: 0.14, width: 1.1, opacity: 0.5 },
  { track: { a: 17 }, delay: 620, duration: 780, length: 0.2, width: 1.1, opacity: 0.55 },

  // Gathered into one, it leaves below
  { track: OUT, delay: 960, duration: 420, length: 0.8, width: 1.6, opacity: 0.9 },
  { track: OUT, delay: 1060, duration: 380, length: 0.4, width: 1.2, opacity: 0.65 },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Restart the flow clock: 0 → FLOW_DURATION_MS in real time */
export function runFlow(clock: SharedValue<number>): void {
  clock.value = withSequence(
    withTiming(0, { duration: 0 }),
    withTiming(FLOW_DURATION_MS, { duration: FLOW_DURATION_MS, easing: Easing.linear }),
  );
}

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
  color,
}: {
  arrow: Arrow;
  clock: SharedValue<number>;
  flip: number;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const raw = (clock.value - arrow.delay) / arrow.duration;
    if (raw <= 0 || raw >= 1) return { d: "M0 0", strokeOpacity: 0 };

    const track = arrow.track;
    const p = easeInOut(raw);
    // The head stops at the end and the tail catches up: the arrows gather into a point
    const head = Math.min(1, p * (1 + arrow.length));
    const tail = Math.max(0, p * (1 + arrow.length) - arrow.length);

    const steps = "a" in track ? 12 : 1;
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
      stroke={color}
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
  color,
}: {
  y: number;
  rise: number;
  peak: number;
  fade: number;
  clock: SharedValue<number>;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const t = clock.value;
    const glow = smoothstep(rise, peak, t) * (1 - smoothstep(peak, fade, t));
    return { r: 1.5 + 2.5 * glow, fillOpacity: 0.85 * glow };
  });
  return <AnimatedCircle cx={CX} cy={y} animatedProps={animatedProps} fill={color} />;
}

/** Does the track cross the body (centered, `halfWidth` to each side)? */
function crossesBody(track: Track, halfWidth: number): boolean {
  if ("a" in track) return Math.abs(track.a) < halfWidth;
  return track.from < 0 && track.to > 0;
}

/**
 * One layer of the flow. `back` goes under the switch, `front` over it: the same arrows,
 * clipped to the body (`bodyWidth` × `bodyHeight`, centered) and drawn in light.
 * Both layers follow `clock` (see runFlow).
 */
export function EnergyFlowLayer({
  direction,
  clock,
  layer,
  bodyWidth,
  bodyHeight,
}: {
  direction: FlowDirection;
  clock: SharedValue<number>;
  layer: "back" | "front";
  bodyWidth: number;
  bodyHeight: number;
}) {
  const flip = direction === "down" ? 1 : -1;

  if (layer === "back") {
    const color = COLORS[direction];
    return (
      <Svg width={FLOW_WIDTH} height={FLOW_HEIGHT}>
        <PoleGlow y={CY - R * flip} rise={200} peak={420} fade={700} clock={clock} color={color} />
        <PoleGlow y={CY + R * flip} rise={850} peak={1150} fade={1450} clock={clock} color={color} />
        {ARROWS.map((arrow, index) => (
          <FlowArrow key={index} arrow={arrow} clock={clock} flip={flip} color={color} />
        ))}
      </Svg>
    );
  }

  return (
    <Svg width={FLOW_WIDTH} height={FLOW_HEIGHT}>
      <Defs>
        <ClipPath id="logo-body">
          <Rect
            x={CX - bodyWidth / 2}
            y={CY - bodyHeight / 2}
            width={bodyWidth}
            height={bodyHeight}
            rx={bodyWidth / 2}
          />
        </ClipPath>
      </Defs>
      <G clipPath="url(#logo-body)">
        {ARROWS.map((arrow, index) =>
          crossesBody(arrow.track, bodyWidth / 2) ? (
            <FlowArrow key={index} arrow={arrow} clock={clock} flip={flip} color={INNER_COLOR} />
          ) : null,
        )}
      </G>
    </Svg>
  );
}
