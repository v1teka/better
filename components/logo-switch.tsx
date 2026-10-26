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
  const scrub = useFrameCallback((frame) => {
    if (scrubbing.value !== 1) return;
    const dt = frame.timeSincePreviousFrame ?? 16;
    const diff = flowAtDistance(dragDistance.value) - flowClock.value;
    const limit = MAX_FLOW_RATE * dt;
    flowClock.value += Math.max(-limit, Math.min(limit, diff * Math.min(1, dt / CATCH_UP_MS)));

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

  // A drag begins: the stream appears and from now on follows the knob
  const beginDrag = () => {
    cancelAnimation(position);
    const origin = down ? 1 : 0;
    dragOrigin.value = origin;
    if (reduceMotion) return;
    cancelAnimation(flowClock);
    // Start the stream where the knob already is, not where a previous run left the clock
    dragDistance.value = Math.abs(position.value - origin);
    flowClock.value = flowAtDistance(dragDistance.value);
    startFlow(origin === 0 ? "down" : "up");
    scrubbing.value = 1;
    scrub.setActive(true);
  };

  // A drag ends: the knob settles where its momentum takes it, the stream plays its ending
  // in real time — or, if the knob goes back, retreats with it
  const endDrag = (toDown: boolean) => {
    scrubbing.value = 0;
    scrub.setActive(false);
    const target = toDown ? 1 : 0;
    position.value = withSpring(target, SETTLE_SPRING);
    if (target !== dragOrigin.value) {
      if (!reduceMotion) {
        const left = Math.max(0, FLOW_DURATION_MS - flowClock.value);
        flowClock.value = withTiming(FLOW_DURATION_MS, { duration: left, easing: Easing.linear });
        endFlowAfter(left);
      }
      ownTarget.current = target;
      onPress?.();
    } else if (!reduceMotion) {
      flowClock.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.quad) });
      endFlowAfter(250);
    }
  };

  const gesture = switchGesture({
    position,
    dragDistance,
    carried: !reduceMotion,
    dragOrigin,
    pressed,
    travel,
    onTap: toggle,
    beginDrag,
    endDrag,
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

/**
 * Tap or drag the knob, as on the iOS switch. Kept outside the component: the handlers run
 * on gestures, not during render.
 */
function switchGesture({
  position,
  dragDistance,
  carried,
  dragOrigin,
  pressed,
  travel,
  onTap,
  beginDrag,
  endDrag,
}: {
  position: SharedValue<number>;
  dragDistance: SharedValue<number>;
  /** The knob is carried by the stream (it follows dragDistance); otherwise it follows itself */
  carried: boolean;
  dragOrigin: SharedValue<number>;
  pressed: SharedValue<number>;
  travel: number;
  onTap: () => void;
  beginDrag: () => void;
  endDrag: (toDown: boolean) => void;
}) {
  let dragFrom = 0;
  let fingerFrom = 0;
  let dragSide = false;

  const press = () => {
    pressed.value = withSpring(1, { damping: 18, stiffness: 260 });
  };
  const release = () => {
    pressed.value = withSpring(0, { damping: 18, stiffness: 200 });
  };

  const tap = Gesture.Tap()
    .runOnJS(true)
    .hitSlop(20)
    .onBegin(press)
    .onEnd((_e, success) => {
      if (!success) return;
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTap();
    })
    .onFinalize(release);

  const drag = Gesture.Pan()
    .runOnJS(true)
    .hitSlop(20)
    .minDistance(3)
    .onStart((e) => {
      dragFrom = position.value;
      // The finger already moved a little before the drag was recognized: start from here,
      // so the knob doesn't jump by that much
      fingerFrom = e.translationY;
      dragSide = position.value > 0.5;
      press();
      beginDrag();
    })
    .onUpdate((e) => {
      const raw = dragFrom + ((e.translationY - fingerFrom) * DRAG_GAIN) / travel;
      // Toward the far end the distance grows past the knob's travel; back past the start it stays 0
      const toward = dragOrigin.value === 0 ? raw : 1 - raw;
      dragDistance.value = Math.max(0, toward);
      if (carried) return;
      // Without the stream (reduced motion) the knob follows the finger by itself
      const next = Math.min(1, Math.max(0, raw));
      position.value = withSpring(next, FOLLOW_SPRING);
      if (next > 0.5 !== dragSide) {
        dragSide = next > 0.5;
        if (Platform.OS !== "web") Haptics.selectionAsync();
      }
    })
    .onEnd((e) => {
      // Where the knob would get with its momentum: a flick carries it over, a slow drag doesn't
      const fingerAt = dragFrom + ((e.translationY - fingerFrom) * DRAG_GAIN) / travel;
      endDrag(fingerAt + (e.velocityY * DRAG_GAIN * 0.12) / travel > 0.5);
    })
    .onFinalize(release);

  return Gesture.Exclusive(drag, tap);
}
