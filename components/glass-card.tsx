import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View, type ViewProps } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { FOLD, UNFOLD } from "@/constants/motion";
import type { Palette } from "@/constants/palette";
import { usePalette } from "@/lib/theme-setting";

function cardStyle(palette: Palette) {
  return {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    backgroundColor: palette.glass,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  } as const;
}

function titleStyle(palette: Palette) {
  return { fontSize: 13, fontWeight: "600", color: palette.text } as const;
}

/** Translucent card with a caption above it */
export function GlassCard({ title, children, style, ...props }: ViewProps & { title: string }) {
  const palette = usePalette();
  return (
    <View style={[{ marginBottom: 24 }, style]} {...props}>
      <Text style={[titleStyle(palette), { marginBottom: 8 }]}>{title}</Text>
      <View style={cardStyle(palette)}>{children}</View>
    </View>
  );
}

/**
 * Same card, folded under its caption until tapped.
 * `openWhen` unfolds it when it becomes true (it can still be folded back by hand).
 */
export function CollapsibleCard({
  title,
  children,
  openWhen = false,
}: {
  title: string;
  children: React.ReactNode;
  openWhen?: boolean;
}) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);
  // 0 — folded, 1 — unfolded; the content's natural height is measured once it lays out
  const progress = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  useEffect(() => {
    if (openWhen) setOpen(true);
  }, [openWhen]);

  // Opened by hand or by `openWhen`, it unfolds the same way the hints do
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, open ? UNFOLD : FOLD);
  }, [open]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${progress.value * 180}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    height: contentHeight.value * progress.value,
    opacity: progress.value,
    // Takes back the room left under the card for its shadow, only as much as it is open
    marginBottom: -10 * progress.value,
  }));

  const toggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen((o) => !o);
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          cardStyle(palette),
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={titleStyle(palette)}>{title}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color={palette.muted} />
        </Animated.View>
      </Pressable>
      {/* Height and opacity are animated, so what is below moves smoothly. The clip box is
          10 px wider on each side and lower, so the card's shadow isn't cut off */}
      <Animated.View
        style={[{ overflow: "hidden", marginHorizontal: -10 }, contentStyle]}
      >
        <View
          onLayout={(e) => {
            contentHeight.value = e.nativeEvent.layout.height;
          }}
          style={{ position: "absolute", left: 0, right: 0, paddingTop: 8, paddingHorizontal: 10, paddingBottom: 10 }}
          accessibilityElementsHidden={!open}
          importantForAccessibility={open ? "auto" : "no-hide-descendants"}
        >
          <View style={cardStyle(palette)}>{children}</View>
        </View>
      </Animated.View>
    </View>
  );
}
