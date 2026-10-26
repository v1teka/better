import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { usePalette } from "@/lib/theme-setting";

/**
 * A small caption with a "?" button that reveals a short explanation.
 * Tells the person where they are, e.g. "offered to you" vs "doing now".
 */
export function HintLabel({ label, hint }: { label: string; hint: string }) {
  const palette = usePalette();
  const [open, setOpen] = useState(false);

  const toggle = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen((o) => !o);
  };

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
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

      {open && (
        <Animated.Text
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: palette.textSecondary,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          {hint}
        </Animated.Text>
      )}
    </View>
  );
}
