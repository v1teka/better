import { useMemo } from "react";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedProps,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

/**
 * Energy flowing through the body (the logo switch) when it is switched, after qigong:
 * qi gathers at the crown, pours down the central channel of the body and, below it, parts
 * and turns back up around the body — a torus. Only part of the loop is drawn:
 *
 * - the arrows appear at the sides above the body, sweep over the crown and gather into one;
 * - rush down along the center of the body (drawn in light over the switch);
 * - below the body part again, curling outward and back up — some in wide loops along the
 *   sphere, some in tight swirls — and dissolve on the way, so it stays unclear whether they
 *   flew off to the sides or went back around.
 *
 * Down — cool, as the evening comes (the knob was up); up — the same mirrored, warm, the morning.
 * Two layers: behind the switch in the flow color, and over it in white, clipped to the body.
 */

export type FlowDirection = "down" | "up";

const COLORS: Record<FlowDirection, string> = {
  down: "#6F9CF0",
  up: "#EE9440",
};

/** The stream inside the body: light over the blue switch */
const INNER_COLOR = "#FFFFFF";

/** Where the stream gathers above the body and leaves below it */
const POLE_GAP = 3;

/** A curve leaving a pole: straight `lead`, then a turn of `turn` degrees that tightens by `growth` */
type CurveSpec = { lead: number; radius: number; turn: number; growth: number };

type StrandSpec = {
  /** Which side the loop goes to: 1 — right, -1 — left */
  side: 1 | -1;
  /** How far the stream bows off the axis inside the body */
  bulge: number;
  /** Over the crown into the body */
  in: CurveSpec;
  /** Out of the body, curling back */
  out: CurveSpec;
  /** Where on the way out it starts to dissolve: 0 — right away, 1 — only at the end */
  dissolve: number;
};

// In the "down" orientation; the "up" flow mirrors it.
const STRAND_SPECS: StrandSpec[] = [
  // Wide loops: they turn back up, as if going around along the sphere
  { side: 1, bulge: 0, in: { lead: 6, radius: 16, turn: 120, growth: 0.2 }, out: { lead: 8, radius: 28, turn: 195, growth: 0.2 }, dissolve: 0.6 },
  { side: -1, bulge: 2, in: { lead: 4, radius: 18, turn: 125, growth: 0.1 }, out: { lead: 4, radius: 33, turn: 185, growth: 0.1 }, dissolve: 0.65 },
  // Middle loops
  { side: 1, bulge: 3, in: { lead: 8, radius: 12, turn: 110, growth: 0.4 }, out: { lead: 12, radius: 19, turn: 220, growth: 0.8 }, dissolve: 0.45 },
  { side: -1, bulge: -3, in: { lead: 6, radius: 14, turn: 115, growth: 0.3 }, out: { lead: 10, radius: 22, turn: 210, growth: 0.5 }, dissolve: 0.4 },
  // Tight swirls
  { side: 1, bulge: -2, in: { lead: 8, radius: 9, turn: 95, growth: 0.6 }, out: { lead: 8, radius: 9, turn: 290, growth: 1.5 }, dissolve: 0.45 },
  { side: -1, bulge: 0, in: { lead: 6, radius: 10, turn: 100, growth: 0.5 }, out: { lead: 6, radius: 11, turn: 260, growth: 1.2 }, dissolve: 0.4 },
  // Dissolve soon after parting, as if flying off to the sides
  { side: 1, bulge: 5, in: { lead: 10, radius: 13, turn: 90, growth: 0 }, out: { lead: 14, radius: 24, turn: 130, growth: 0.3 }, dissolve: 0.15 },
  { side: -1, bulge: -5, in: { lead: 10, radius: 15, turn: 92, growth: 0 }, out: { lead: 12, radius: 28, turn: 120, growth: 0.2 }, dissolve: 0.2 },
];

type Arrow = {
  strand: number;
  /** ms from the start of the flow */
  delay: number;
  duration: number;
  /** px */
  length: number;
  width: number;
  opacity: number;
};

// Short and long arrows; a second, thinner wave follows the first
const ARROWS: Arrow[] = [
  { strand: 0, delay: 0, duration: 1200, length: 34, width: 1.6, opacity: 0.9 },
  { strand: 1, delay: 80, duration: 1250, length: 18, width: 1.3, opacity: 0.75 },
  { strand: 2, delay: 140, duration: 1150, length: 26, width: 1.5, opacity: 0.85 },
  { strand: 3, delay: 60, duration: 1180, length: 14, width: 1.2, opacity: 0.7 },
  { strand: 4, delay: 200, duration: 1100, length: 22, width: 1.4, opacity: 0.8 },
  { strand: 5, delay: 260, duration: 1080, length: 12, width: 1.2, opacity: 0.7 },
  { strand: 6, delay: 120, duration: 1000, length: 20, width: 1.3, opacity: 0.75 },
  { strand: 7, delay: 220, duration: 1020, length: 30, width: 1.5, opacity: 0.85 },

  { strand: 0, delay: 380, duration: 1150, length: 14, width: 1.2, opacity: 0.6 },
  { strand: 1, delay: 420, duration: 1200, length: 30, width: 1.4, opacity: 0.7 },
  { strand: 2, delay: 460, duration: 1100, length: 12, width: 1.1, opacity: 0.55 },
  { strand: 3, delay: 340, duration: 1150, length: 28, width: 1.4, opacity: 0.75 },
  { strand: 4, delay: 500, duration: 1050, length: 12, width: 1.1, opacity: 0.55 },
  { strand: 5, delay: 440, duration: 1080, length: 24, width: 1.3, opacity: 0.65 },
  { strand: 6, delay: 520, duration: 980, length: 10, width: 1, opacity: 0.5 },
  { strand: 7, delay: 480, duration: 1000, length: 16, width: 1.2, opacity: 0.6 },
];

export const FLOW_DURATION_MS = Math.max(...ARROWS.map((a) => a.delay + a.duration));

/**
 * Each arrow's way in three phases, as shares of its duration: gathering over the crown,
 * passing through the body, leaving it and dissolving. The switch knob glides while the
 * leading arrow (the first one, no delay) passes through the body, so they move as one.
 */
const GATHER_SHARE = 0.15;
const PASS_SHARE = 0.35;

/** When the leading arrow reaches the body, and how long it takes to pass it */
export const FLOW_GATHER_MS = ARROWS[0].delay + GATHER_SHARE * ARROWS[0].duration;
export const FLOW_PASS_MS = PASS_SHARE * ARROWS[0].duration;

/** A strand as a polyline with arc lengths, in the "down" orientation, centered on the body */
type Strand = {
  xs: number[];
  ys: number[];
  /** Arc length at each point */
  at: number[];
  length: number;
  /** Where the stream is inside the body */
  centerFrom: number;
  centerTo: number;
  fadeInEnd: number;
  fadeOutFrom: number;
};

const STEP = 2;

/** Points of a curve leaving (x0, y0) along `heading`; `turnSign` picks the way it turns */
function curvePoints(x0: number, y0: number, heading: number, spec: CurveSpec, turnSign: number) {
  const points: [number, number][] = [];
  let x = x0;
  let y = y0;
  let angle = heading;
  const leadSteps = Math.max(1, Math.round(spec.lead / STEP));
  for (let i = 0; i < leadSteps; i++) {
    x += (Math.cos(angle) * spec.lead) / leadSteps;
    y += (Math.sin(angle) * spec.lead) / leadSteps;
    points.push([x, y]);
  }
  const turn = (spec.turn * Math.PI) / 180;
  const arc = (turn * spec.radius) / (1 + spec.growth / 2);
  const steps = Math.max(2, Math.round(arc / STEP));
  const ds = arc / steps;
  for (let i = 0; i < steps; i++) {
    const s = (i + 0.5) * ds;
    angle += (turnSign * ds * (1 + (spec.growth * s) / arc)) / spec.radius;
    x += Math.cos(angle) * ds;
    y += Math.sin(angle) * ds;
    points.push([x, y]);
  }
  return points;
}

function buildStrand(spec: StrandSpec, bodyHeight: number): Strand {
  const top = -(bodyHeight / 2 + POLE_GAP);
  const bottom = bodyHeight / 2 + POLE_GAP;

  // Built leaving the crown upward and turning outward, then reversed: it comes over the crown
  const incoming = curvePoints(0, top, -Math.PI / 2, spec.in, spec.side).reverse();
  const center: [number, number][] = [];
  const centerSteps = Math.round((bottom - top) / STEP);
  for (let i = 0; i <= centerSteps; i++) {
    const v = i / centerSteps;
    center.push([spec.bulge * Math.sin(Math.PI * v), top + (bottom - top) * v]);
  }
  // Leaves below heading down and turns outward, then back up
  const outgoing = curvePoints(0, bottom, Math.PI / 2, spec.out, -spec.side);

  const points = [...incoming, ...center, ...outgoing];
  const xs: number[] = [];
  const ys: number[] = [];
  const at: number[] = [];
  let length = 0;
  points.forEach(([x, y], i) => {
    if (i > 0) length += Math.hypot(x - points[i - 1][0], y - points[i - 1][1]);
    xs.push(x);
    ys.push(y);
    at.push(length);
  });
  const centerFrom = at[incoming.length];
  const centerTo = at[incoming.length + center.length - 1];
  return {
    xs,
    ys,
    at,
    length,
    centerFrom,
    centerTo,
    fadeInEnd: centerFrom * 0.6,
    fadeOutFrom: centerTo + (length - centerTo) * spec.dissolve,
  };
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Restart the flow clock: `from` → FLOW_DURATION_MS in real time */
export function runFlow(clock: SharedValue<number>, from = 0): void {
  clock.value = withSequence(
    withTiming(from, { duration: 0 }),
    withTiming(FLOW_DURATION_MS, { duration: FLOW_DURATION_MS - from, easing: Easing.linear }),
  );
}

/**
 * Where an arrow's head is (arc length) over time: a smooth monotone curve through the
 * phase points (start, enters the body, leaves it, end), at rest at both ends.
 */
type Timing = { ts: number[]; ss: number[]; ms: number[] };

function arrowTiming(arrow: Arrow, strand: Strand): Timing {
  const ts = [0, GATHER_SHARE * arrow.duration, (GATHER_SHARE + PASS_SHARE) * arrow.duration, arrow.duration];
  const ss = [0, strand.centerFrom, strand.centerTo, strand.length];
  const slopes = [0, 1, 2].map((k) => (ss[k + 1] - ss[k]) / (ts[k + 1] - ts[k]));
  // Fritsch–Carlson: harmonic mean of the neighbouring slopes keeps the curve monotone
  const inner = (a: number, b: number) => (a > 0 && b > 0 ? (2 * a * b) / (a + b) : 0);
  const ms = [0, inner(slopes[0], slopes[1]), inner(slopes[1], slopes[2]), 0];
  return { ts, ss, ms };
}

function headAt(timing: Timing, t: number): number {
  "worklet";
  const { ts, ss, ms } = timing;
  const k = t < ts[1] ? 0 : t < ts[2] ? 1 : 2;
  const h = ts[k + 1] - ts[k];
  const u = (t - ts[k]) / h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (
    (2 * u3 - 3 * u2 + 1) * ss[k] +
    (u3 - 2 * u2 + u) * h * ms[k] +
    (-2 * u3 + 3 * u2) * ss[k + 1] +
    (u3 - u2) * h * ms[k + 1]
  );
}

function smoothstep(from: number, to: number, t: number): number {
  "worklet";
  const x = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return x * x * (3 - 2 * x);
}

/** Index of the last point at or before arc length `s` */
function indexAt(strand: Strand, s: number): number {
  "worklet";
  let i = 0;
  while (i < strand.at.length - 2 && strand.at[i + 1] <= s) i++;
  return i;
}

function FlowArrow({
  arrow,
  strand,
  clock,
  flip,
  color,
  insideOnly,
  cx,
  cy,
}: {
  arrow: Arrow;
  strand: Strand;
  clock: SharedValue<number>;
  flip: number;
  color: string;
  /** Skip the arrow while it is outside the body (the layer over the switch) */
  insideOnly: boolean;
  cx: number;
  cy: number;
}) {
  const timing = useMemo(() => arrowTiming(arrow, strand), [arrow, strand]);

  const animatedProps = useAnimatedProps(() => {
    const hidden = { d: "M0 0", strokeOpacity: 0 };
    const local = clock.value - arrow.delay;
    if (local <= 0 || local >= arrow.duration) return hidden;

    const head = headAt(timing, local);
    const tail = Math.max(0, head - arrow.length);
    if (insideOnly && (head < strand.centerFrom || tail > strand.centerTo)) return hidden;

    // Fades in as it comes over the crown, dissolves on the way out
    const mid = (head + tail) / 2;
    const alpha =
      smoothstep(0, strand.fadeInEnd, mid) * (1 - smoothstep(strand.fadeOutFrom, strand.length, mid));
    if (alpha < 0.01) return hidden;

    const pointAt = (s: number): [number, number] => {
      const i = indexAt(strand, s);
      const span = strand.at[i + 1] - strand.at[i];
      const k = span > 0 ? Math.min(1, Math.max(0, (s - strand.at[i]) / span)) : 0;
      return [
        cx + strand.xs[i] + (strand.xs[i + 1] - strand.xs[i]) * k,
        cy + (strand.ys[i] + (strand.ys[i + 1] - strand.ys[i]) * k) * flip,
      ];
    };

    const [tx, ty] = pointAt(tail);
    const [hx, hy] = pointAt(head);
    let d = "M" + tx.toFixed(1) + " " + ty.toFixed(1);
    const last = indexAt(strand, head);
    for (let i = indexAt(strand, tail) + 1; i <= last; i++) {
      d += " L" + (cx + strand.xs[i]).toFixed(1) + " " + (cy + strand.ys[i] * flip).toFixed(1);
    }
    d += " L" + hx.toFixed(1) + " " + hy.toFixed(1);

    // Arrowhead along the direction of travel
    const [px, py] = pointAt(Math.max(0, head - 2));
    const dx = hx - px;
    const dy = hy - py;
    const norm = Math.sqrt(dx * dx + dy * dy);
    if (norm > 0.01) {
      const bx = -dx / norm;
      const by = -dy / norm;
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

    return { d, strokeOpacity: arrow.opacity * alpha };
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

/** A point of light where the stream gathers above the body, and where it parts below */
function PoleGlow({
  cx,
  cy,
  rise,
  peak,
  fade,
  clock,
  color,
}: {
  cx: number;
  cy: number;
  rise: number;
  peak: number;
  fade: number;
  clock: SharedValue<number>;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => {
    const t = clock.value;
    const glow = smoothstep(rise, peak, t) * (1 - smoothstep(peak, fade, t));
    return { r: 1.5 + 2 * glow, fillOpacity: 0.6 * glow };
  });
  return <AnimatedCircle cx={cx} cy={cy} animatedProps={animatedProps} fill={color} />;
}

const strandCache = new Map<number, { strands: Strand[]; width: number; height: number }>();

/** Strands for a body of this height, and the canvas that holds them */
function strandsFor(bodyHeight: number) {
  let entry = strandCache.get(bodyHeight);
  if (!entry) {
    const strands = STRAND_SPECS.map((spec) => buildStrand(spec, bodyHeight));
    let maxX = 0;
    let maxY = 0;
    strands.forEach((strand) => {
      strand.xs.forEach((x) => (maxX = Math.max(maxX, Math.abs(x))));
      strand.ys.forEach((y) => (maxY = Math.max(maxY, Math.abs(y))));
    });
    entry = { strands, width: Math.ceil(2 * (maxX + 10)), height: Math.ceil(2 * (maxY + 10)) };
    strandCache.set(bodyHeight, entry);
  }
  return entry;
}

/**
 * One layer of the flow, centered on the body (`bodyWidth` × `bodyHeight`); put it inside a box
 * of the body's size. `back` goes under the switch, `front` over it: the same arrows, clipped to
 * the body and drawn in light. Both layers follow `clock` (see runFlow).
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
  const { strands, width, height } = useMemo(() => strandsFor(bodyHeight), [bodyHeight]);
  const flip = direction === "down" ? 1 : -1;
  const cx = width / 2;
  const cy = height / 2;
  const pole = bodyHeight / 2 + POLE_GAP;

  const arrows = (color: string, insideOnly: boolean) =>
    ARROWS.map((arrow, index) => (
      <FlowArrow
        key={index}
        arrow={arrow}
        strand={strands[arrow.strand]}
        clock={clock}
        flip={flip}
        color={color}
        insideOnly={insideOnly}
        cx={cx}
        cy={cy}
      />
    ));

  return (
    <Svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        left: (bodyWidth - width) / 2,
        top: (bodyHeight - height) / 2,
        pointerEvents: "none",
      }}
    >
      {layer === "back" ? (
        <>
          <PoleGlow
            cx={cx}
            cy={cy - pole * flip}
            rise={FLOW_GATHER_MS * 0.2}
            peak={FLOW_GATHER_MS + 40}
            fade={FLOW_GATHER_MS + FLOW_PASS_MS * 0.8}
            clock={clock}
            color={COLORS[direction]}
          />
          <PoleGlow
            cx={cx}
            cy={cy + pole * flip}
            rise={FLOW_GATHER_MS + FLOW_PASS_MS * 0.7}
            peak={FLOW_GATHER_MS + FLOW_PASS_MS + 80}
            fade={FLOW_GATHER_MS + FLOW_PASS_MS + 480}
            clock={clock}
            color={COLORS[direction]}
          />
          {arrows(COLORS[direction], false)}
        </>
      ) : (
        <>
          <Defs>
            <ClipPath id="logo-body">
              <Rect
                x={cx - bodyWidth / 2}
                y={cy - bodyHeight / 2}
                width={bodyWidth}
                height={bodyHeight}
                rx={bodyWidth / 2}
              />
            </ClipPath>
          </Defs>
          <G clipPath="url(#logo-body)">{arrows(INNER_COLOR, true)}</G>
        </>
      )}
    </Svg>
  );
}
