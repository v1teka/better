import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { usePalette } from "@/lib/theme-setting";

/**
 * A small caption with a "?" button that reveals a short explanation.
 * Tells the person where they are, e.g. "offered to you" vs "doing now".
 */
export function HintLabel({ label, hint }: { label: string; hint: string }) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);

  // 0 — folded, 1 — unfolded; the explanation's natural height is measured once it lays out
  const progress = useSharedValue(0);
  const hintHeight = useSharedValue(0);

  const toggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !open;
    setOpen(next);
    progress.value = withTiming(next ? 1 : 0, {
      duration: next ? 240 : 180,
      easing: next ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  };

  const hintStyle = useAnimatedStyle(() => ({
    height: hintHeight.value * progress.value,
    opacity: progress.value,
  }));

  return (
    <View style={{ alignItems: "center" }}>
      <Pressable
        onPress={toggle}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`${label}. Что это значит?`}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: palette.accent,
          }}
        >
          {label}
        </Text>
        {/* A round help button, set apart from the caption so it doesn't read as «Сейчас выполняете?» */}
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: open ? palette.accent : palette.accent + "24",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              lineHeight: 16,
              fontWeight: "800",
              color: open ? palette.onButton : palette.accent,
            }}
          >
            ?
          </Text>
        </View>
      </Pressable>

      {/* The explanation unfolds and folds: its height and opacity are animated, so what is
          below moves smoothly instead of jumping */}
      <Animated.View style={[{ alignSelf: "stretch", overflow: "hidden" }, hintStyle]}>
        <View
          onLayout={(e) => {
            hintHeight.value = e.nativeEvent.layout.height;
          }}
          style={{ position: "absolute", left: 0, right: 0, alignItems: "center", paddingTop: 8 }}
          // Folded, it is still in the tree: keep screen readers off it until it opens
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        >
          <Text
            style={{
              fontSize: 14,
              lineHeight: 20,
              color: palette.textSecondary,
              textAlign: "center",
              maxWidth: 300,
            }}
          >
            {hint}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}
