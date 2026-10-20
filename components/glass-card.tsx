import { useState } from "react";
import { Platform, Pressable, Text, View, type ViewProps } from "react-native";
import Animated, { FadeIn, useAnimatedStyle, withTiming } from "react-native-reanimated";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

const cardStyle = {
  borderRadius: 16,
  padding: 16,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.4)",
  backgroundColor: "rgba(255, 255, 255, 0.65)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
} as const;

const titleStyle = { fontSize: 13, fontWeight: "600", color: "#2D3748" } as const;

/** Translucent card with a caption above it */
export function GlassCard({ title, children, style, ...props }: ViewProps & { title: string }) {
  return (
    <View style={[{ marginBottom: 24 }, style]} {...props}>
      <Text style={[titleStyle, { marginBottom: 8 }]}>{title}</Text>
      <View style={cardStyle}>{children}</View>
    </View>
  );
}

/** Same card, folded under its caption until tapped */
export function CollapsibleCard({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withTiming(open ? "180deg" : "0deg", { duration: 200 }) }],
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
          cardStyle,
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 14,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={titleStyle}>{title}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color="#718096" />
        </Animated.View>
      </Pressable>
      {open && (
        <Animated.View entering={FadeIn.duration(250)} style={[cardStyle, { marginTop: 8 }]}>
          {children}
        </Animated.View>
      )}
    </View>
  );
}
