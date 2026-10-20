import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  EnergyFlowLayer,
  FLOW_DURATION_MS,
  runFlow,
  type FlowDirection,
} from "@/components/energy-flow";

/**
 * The logo: an iOS-style switch standing upright. The light-blue top and the dark-blue
 * bottom meet like the horizon over water; the white knob is the moon above it.
 * Colors are taken from the app icon.
 *
 * `down` moves the knob below the horizon. With `onPress` the logo works as a switch:
 * the knob stretches while pressed, like the iOS one, and springs to the other end,
 * and energy flows through it the way the knob goes (components/energy-flow.tsx).
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
  const flowId = useRef(0);
  const flowClock = useSharedValue(0);

  useEffect(() => {
    position.value = withSpring(down ? 1 : 0, { damping: 16, stiffness: 170, mass: 0.9 });
  }, [down, position]);

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

  const handlePress = () => {
    if (!reduceMotion) {
      // Each tap starts a new run; a tap mid-run restarts it the other way
      const id = ++flowId.current;
      setFlow(down ? "up" : "down");
      runFlow(flowClock);
      setTimeout(() => {
        if (flowId.current === id) setFlow(null);
      }, FLOW_DURATION_MS + 100);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => {
        pressed.value = withTiming(1, { duration: 120 });
      }}
      onPressOut={() => {
        pressed.value = withTiming(0, { duration: 200 });
      }}
      hitSlop={20}
      accessibilityRole="switch"
      accessibilityState={{ checked: down }}
      accessibilityLabel={accessibilityLabel}
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
    </Pressable>
  );
}
