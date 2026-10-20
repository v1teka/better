import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

/**
 * A small caption with a "?" button that reveals a short explanation.
 * Tells the person where they are, e.g. "offered to you" vs "doing now".
 */
export function HintLabel({ label, hint }: { label: string; hint: string }) {
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
          gap: 6,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "600",
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "#4A90E2",
          }}
        >
          {label}
        </Text>
        <Ionicons name={open ? "help-circle" : "help-circle-outline"} size={18} color="#4A90E2" />
      </Pressable>

      {open && (
        <Animated.Text
          entering={FadeIn.duration(250)}
          exiting={FadeOut.duration(150)}
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: "#4A5568",
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
