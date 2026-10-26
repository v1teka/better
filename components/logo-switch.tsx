import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  type SharedValue,
  Easing,
  cancelAnimation,
  runOnJS,
  useFrameCallback,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  EnergyFlowLayer,
  FLOW_DURATION_MS,
  FLOW_GATHER_MS,
  FLOW_PASS_MS,
  runFlow,
  type FlowDirection,
} from "@/components/energy-flow";

// Settling at an end, after a drag or when the theme changes from elsewhere
const SETTLE_SPRING = { damping: 16, stiffness: 170, mass: 0.9 };
// Following the finger: close to critically damped — smooth, no overshoot, a little behind
const FOLLOW_SPRING = { damping: 26, stiffness: 260, mass: 0.7 };
// The knob moves this much per point of finger travel: a little heavier than the finger
const DRAG_GAIN = 0.65;
// The part of the flow the knob carries while dragged: gathering and passing through the body
const SCRUB_MS = FLOW_GATHER_MS + FLOW_PASS_MS;
// Past the end of the knob's travel the finger keeps playing the rest of the flow:
// one more knob travel of finger movement plays it to the end
const OVERDRAG_TRAVELS = 1;
// While dragged, the stream (and the knob with it) never runs faster than this many times
// real time, however fast the finger moves: a flick makes the switch heavier, not the arrows hectic
const MAX_FLOW_RATE = 1.5;
// How quickly the stream catches up with the finger below that limit, ms
const CATCH_UP_MS = 90;
// On a tap the flow starts with the arrows already gathered over the crown, so the knob
// and the stream move almost at once
const TAP_LEAD_MS = FLOW_GATHER_MS - 40;

/**
 * The logo: an iOS-style switch standing upright. The light-blue top and the dark-blue
 * bottom meet like the horizon over water; the white knob is the moon above it.
 * Colors are taken from the app icon.
 *
 * `down` moves the knob below the horizon. With `onPress` the logo works as a switch, like
 * the iOS one: tap it, or drag the knob — it follows the finger smoothly (a little heavier
 * than the finger), stretches while held, ticks when it crosses the horizon and on release
 * springs to the end its momentum carries it to.
 *
 * Energy flows through it the way the knob goes (components/energy-flow.tsx), together with
 * the knob: on a tap the knob glides exactly while the stream passes through the body; while
 * dragged the stream follows the finger — no faster than MAX_FLOW_RATE × real time — and
 * carries the knob with it; past the end of the travel the finger plays the rest of the stream,
 * and once let go it plays its ending. `onPress` is called when the switch happens: at once on a tap,
 * on release after a drag.
 */
export function LogoSwitch({
  down,
  width = 32,
  onPress,
  accessibilityLabel,
}: {
  down: boolean;
  width?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const height = Math.round(width * 1.9);
  const pad = width * 0.11;
  const knob = width - pad * 2;
  const travel = height - pad * 2 - knob;
  const stretch = knob * 0.2;
  // In the icon the horizon sits a little below the middle
  const horizon = height * 0.53;

  const position = useSharedValue(down ? 1 : 0);
  const pressed = useSharedValue(0);

  const reduceMotion = useReducedMotion();
  const [flow, setFlow] = useState<FlowDirection | null>(null);
  const flowClock = useSharedValue(0);
  // Each flow run gets a number, so a late cleanup of an old run doesn't hide a new one
  const flowRun = useRef(0);
  // Where this component itself sends the knob; a `down` change it caused is not re-animated
  const ownTarget = useRef<number | null>(null);
  // While dragged, the flow follows the knob from the side it started on
  const scrubbing = useSharedValue(0);
  const dragOrigin = useSharedValue(0);

  useEffect(() => {
    const target = down ? 1 : 0;
    if (ownTarget.current === target) {
      ownTarget.current = null;
      return;
    }
    position.value = withSpring(target, SETTLE_SPRING);
  }, [down, position]);

  // How far the finger has taken the knob from where it started, in knob travels; past 1 the
  // knob rests against the end, but the stream keeps going with the finger
  const dragDistance = useSharedValue(0);

  const tick = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
  };

  // While dragged: the stream follows the finger, no faster than MAX_FLOW_RATE × real time,
  // and the knob is carried by the stream, so the two stay together at any finger speed
  // Called from the frame callback when the stream has arrived; hoisted, so the worklet can
  // capture it before `scrub` below is created
  function stopScrub() {
    scrub.setActive(false);
  }

  // The previous frame of this drag; -1 — none yet
  const lastFrameAt = useSharedValue(-1);
  // After the finger is lifted: 1 — the stream plays on to its end, -1 — it goes back, 0 — dragging
  const releasing = useSharedValue(0);
  // Where a drag started: the finger's offset when it was recognized, and the knob's position;
  // and which side of the horizon the knob was last on (for the tick without the stream)
  const startFinger = useSharedValue(0);
  const startPosition = useSharedValue(0);
  const lastSide = useSharedValue(0);

  const scrub = useFrameCallback((frame) => {
    if (scrubbing.value !== 1) return;
    // Not frame.timeSincePreviousFrame: after the callback was paused between drags it reports
    // the whole pause, and the first frame of a new drag would leap the stream to its end.
    // Long frames are capped too, so a hitch doesn't make the arrows jump.
    const dt = lastFrameAt.value < 0 ? 16 : Math.min(34, Math.max(0, frame.timestamp - lastFrameAt.value));
    lastFrameAt.value = frame.timestamp;
    const diff = flowAtDistance(dragDistance.value) - flowClock.value;
    if (releasing.value !== 0) {
      // Let go: at the stream's own pace forward, or back no faster than while dragged
      const limit = (releasing.value === 1 ? 1 : MAX_FLOW_RATE) * dt;
      flowClock.value += Math.max(-limit, Math.min(limit, diff));
      if (Math.abs(diff) <= limit) {
        scrubbing.value = 0;
        releasing.value = 0;
        runOnJS(stopScrub)();
      }
    } else {
      const limit = MAX_FLOW_RATE * dt;
      flowClock.value += Math.max(-limit, Math.min(limit, diff * Math.min(1, dt / CATCH_UP_MS)));
    }

    const travelled = Math.min(1, flowClock.value / SCRUB_MS);
    const next = dragOrigin.value === 0 ? travelled : 1 - travelled;
    // A tick when the knob crosses the horizon
    if (next > 0.5 !== position.value > 0.5) runOnJS(tick)();
    position.value = next;
  }, false);

  const startFlow = (direction: FlowDirection) => {
    flowRun.current += 1;
    setFlow(direction);
  };

  const endFlowAfter = (ms: number) => {
    const run = flowRun.current;
    setTimeout(() => {
      if (flowRun.current === run) setFlow(null);
    }, ms + 100);
  };

  // A tap: the stream gathers over the crown, and the knob glides while it passes through
  const toggle = () => {
    if (!onPress) return;
    const target = down ? 0 : 1;
    ownTarget.current = target;
    // A tap right after a drag takes the stream over from it
    scrubbing.value = 0;
    releasing.value = 0;
    scrub.setActive(false);
    if (reduceMotion) {
      position.value = withSpring(target, SETTLE_SPRING);
    } else {
      startFlow(target === 1 ? "down" : "up");
      runFlow(flowClock, TAP_LEAD_MS);
      endFlowAfter(FLOW_DURATION_MS - TAP_LEAD_MS);
      position.value = withDelay(
        FLOW_GATHER_MS - TAP_LEAD_MS,
        withTiming(target, { duration: FLOW_PASS_MS, easing: Easing.inOut(Easing.cubic) }),
      );
    }
    onPress();
  };

  // The parts of a drag that belong to React (the stream layer, the frame callback, the theme).
  // Everything about positions and the clock is set on the UI thread in the gesture itself:
  // from the JS thread such writes arrive late, and the very first one could be lost —
  // the stream then started from where the previous run had ended.
  const onDragStart = (origin: number) => {
    if (reduceMotion) return;
    startFlow(origin === 0 ? "down" : "up");
    scrub.setActive(true);
  };

  const onDragEnd = (switching: boolean, target: number, clockAtEnd: number) => {
    if (reduceMotion) {
      scrub.setActive(false);
    } else {
      endFlowAfter(switching ? FLOW_DURATION_MS - clockAtEnd : clockAtEnd / MAX_FLOW_RATE);
    }
    if (switching) {
      ownTarget.current = target;
      onPress?.();
    }
  };

  const gesture = switchGesture({
    shared: {
      position,
      pressed,
      dragDistance,
      dragOrigin,
      flowClock,
      scrubbing,
      releasing,
      lastFrameAt,
      startFinger,
      startPosition,
      lastSide,
    },
    carried: !reduceMotion,
    travel,
    onTap: toggle,
    onDragStart,
    onDragEnd,
    tick,
  });

  // While pressed the knob grows toward the other end, as the iOS switch does
  const knobStyle = useAnimatedStyle(() => {
    const grow = pressed.value * stretch;
    return {
      top: pad + position.value * (travel - grow),
      height: knob + grow,
    };
  });

  const logo = (
    <View
      style={{
        width,
        height,
        borderRadius: width / 2,
        shadowColor: "#4A90E2",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
      }}
    >
      <View style={{ flex: 1, borderRadius: width / 2, overflow: "hidden" }}>
        <LinearGradient
          colors={["#4C8EE3", "#5887E6"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: horizon }}
        />
        <LinearGradient
          colors={["#4B72CA", "#566CCD"]}
          style={{ position: "absolute", top: horizon, left: 0, right: 0, bottom: 0 }}
        />
        <View
          style={{
            position: "absolute",
            top: horizon,
            left: 0,
            right: 0,
            height: StyleSheet.hairlineWidth,
            backgroundColor: "rgba(30, 50, 130, 0.25)",
          }}
        />
        <Animated.View
          style={[
            {
              position: "absolute",
              left: pad,
              width: knob,
              borderRadius: knob / 2,
              backgroundColor: "#FFFFFF",
              shadowColor: "#1A2B6B",
              shadowOffset: { width: 0, height: 1.5 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
              elevation: 3,
            },
            knobStyle,
          ]}
        >
          <LinearGradient
            colors={["#FFFFFF", "#EDF1FC"]}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: knob / 2 }]}
          />
        </Animated.View>
      </View>
    </View>
  );

  if (!onPress) return logo;

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="switch"
        accessibilityState={{ checked: down }}
        accessibilityLabel={accessibilityLabel}
        accessibilityActions={[{ name: "activate" }]}
        onAccessibilityAction={toggle}
      >
      {/* The flow behind the switch, the switch, and the flow through it on top */}
      <View style={{ width, height }}>
        {flow && (
          <EnergyFlowLayer direction={flow} clock={flowClock} layer="back" bodyWidth={width} bodyHeight={height} />
        )}
        {logo}
        {flow && (
          <EnergyFlowLayer direction={flow} clock={flowClock} layer="front" bodyWidth={width} bodyHeight={height} />
        )}
      </View>
      </View>
    </GestureDetector>
  );
}

/** The flow clock for a drag distance (in knob travels): gather and pass, then the rest */
function flowAtDistance(distance: number): number {
  "worklet";
  if (distance <= 1) return distance * SCRUB_MS;
  const beyond = Math.min(1, (distance - 1) / OVERDRAG_TRAVELS);
  return SCRUB_MS + beyond * (FLOW_DURATION_MS - SCRUB_MS);
}

type SwitchShared = {
  position: SharedValue<number>;
  pressed: SharedValue<number>;
  dragDistance: SharedValue<number>;
  dragOrigin: SharedValue<number>;
  flowClock: SharedValue<number>;
  scrubbing: SharedValue<number>;
  releasing: SharedValue<number>;
  lastFrameAt: SharedValue<number>;
  startFinger: SharedValue<number>;
  startPosition: SharedValue<number>;
  lastSide: SharedValue<number>;
};

/**
 * Tap or drag the knob, as on the iOS switch. The tap is handled in JS; the drag runs on the
 * UI thread, so the knob and the stream answer the finger at once, and calls into React
 * (`onDragStart`, `onDragEnd`, `tick`) only for what React owns.
 */
function switchGesture({
  shared,
  carried,
  travel,
  onTap,
  onDragStart,
  onDragEnd,
  tick,
}: {
  shared: SwitchShared;
  /** The knob is carried by the stream (it follows dragDistance); otherwise it follows itself */
  carried: boolean;
  travel: number;
  onTap: () => void;
  onDragStart: (origin: number) => void;
  onDragEnd: (switching: boolean, target: number, clockAtEnd: number) => void;
  tick: () => void;
}) {
  const {
    position,
    pressed,
    dragDistance,
    dragOrigin,
    flowClock,
    scrubbing,
    releasing,
    lastFrameAt,
    startFinger,
    startPosition,
    lastSide,
  } = shared;

  const tap = Gesture.Tap()
    .runOnJS(true)
    .hitSlop(20)
    .onBegin(() => {
      pressed.value = withSpring(1, { damping: 18, stiffness: 260 });
    })
    .onEnd((_e, success) => {
      if (!success) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTap();
    })
    .onFinalize(() => {
      pressed.value = withSpring(0, { damping: 18, stiffness: 200 });
    });

  const drag = Gesture.Pan()
    .hitSlop(20)
    .minDistance(3)
    .onStart((e) => {
      cancelAnimation(position);
      cancelAnimation(flowClock);
      // The drag starts from where the knob is, not from what the theme says
      const origin = position.value > 0.5 ? 1 : 0;
      dragOrigin.value = origin;
      // The finger already moved a little before the drag was recognized: count from here,
      // so the knob doesn't jump by that much
      dragDistance.value = Math.abs(position.value - origin);
      startFinger.value = e.translationY;
      startPosition.value = position.value;
      lastSide.value = origin;
      pressed.value = withSpring(1, { damping: 18, stiffness: 260 });
      if (carried) {
        flowClock.value = flowAtDistance(dragDistance.value);
        releasing.value = 0;
        lastFrameAt.value = -1;
        scrubbing.value = 1;
      }
      runOnJS(onDragStart)(origin);
    })
    .onUpdate((e) => {
      const raw = startPosition.value + ((e.translationY - startFinger.value) * DRAG_GAIN) / travel;
      // Toward the far end the distance grows past the knob's travel; back past the start it stays 0
      const toward = dragOrigin.value === 0 ? raw : 1 - raw;
      dragDistance.value = Math.max(0, toward);
      if (carried) return;
      // Without the stream (reduced motion) the knob follows the finger by itself
      const next = Math.min(1, Math.max(0, raw));
      position.value = withSpring(next, FOLLOW_SPRING);
      const side = next > 0.5 ? 1 : 0;
      if (side !== lastSide.value) {
        lastSide.value = side;
        runOnJS(tick)();
      }
    })
    .onEnd((e) => {
      // Where the knob would get with its momentum: a flick carries it over, a slow drag doesn't
      const fingerAt = startPosition.value + ((e.translationY - startFinger.value) * DRAG_GAIN) / travel;
      const target = fingerAt + (e.velocityY * DRAG_GAIN * 0.12) / travel > 0.5 ? 1 : 0;
      const switching = target !== dragOrigin.value;
      if (carried) {
        // The stream keeps carrying the knob: on to its end, or back home
        releasing.value = switching ? 1 : -1;
        dragDistance.value = switching ? 1 + OVERDRAG_TRAVELS : 0;
      } else {
        scrubbing.value = 0;
        position.value = withSpring(target, SETTLE_SPRING);
      }
      runOnJS(onDragEnd)(switching, target, flowClock.value);
    })
    .onFinalize(() => {
      pressed.value = withSpring(0, { damping: 18, stiffness: 200 });
    });

  return Gesture.Exclusive(drag, tap);
}
