import { useState, useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { pickPractice } from "@/lib/practice-selector";
import { practiceDuration } from "@/lib/scoring";
import type { Practice, UserState, Energy, Focus, Tension, Time } from "@/types/practice";

/**
 * Recommendation Screen - Shows selected practice
 * Design: Minimal, centered, large typography
 */
export default function RecommendationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [practice, setPractice] = useState<Practice | null>(null);
  const [duration, setDuration] = useState<Time | null>(null);

  // Pick the practice and its timer length once per screen instance.
  // Time is an upper bound; without it the practice is not limited by time.
  useEffect(() => {
    const parsedTime = parseInt(params.time as string, 10);
    const state: UserState = {
      energy: params.energy as Energy,
      focus: params.focus as Focus,
      tension: params.tension as Tension,
      time: isNaN(parsedTime) ? null : (parsedTime as Time),
    };
    const selected = pickPractice(state);
    setPractice(selected);
    setDuration(practiceDuration(selected, state.time));
  }, []);

  const triggerMedium = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleStart = () => {
    if (!practice || !duration) return;
    triggerMedium();
    router.push({
      pathname: "/practice",
      params: {
        practice: JSON.stringify(practice),
        selectedTime: duration.toString(),
      },
    });
  };

  if (!practice) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#888888" }}>Загрузка...</Text>
        </View>
      </ScreenContainer>
    );
  }

  // Category labels in Russian
  const categoryLabels: Record<string, string> = {
    recovery: "восстановление",
    activation: "активация",
    focus: "фокус",
    body: "тело",
    creative: "творчество",
    sensory: "сенсорика",
  };

  return (
    <ScreenContainer>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32, justifyContent: "space-between" }}>
        {/* Back button */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            opacity: pressed ? 0.5 : 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          })}
        >
          <Text style={{ fontSize: 28, color: "#4A90E2", lineHeight: 32 }}>‹</Text>
          <Text style={{ fontSize: 17, color: "#4A90E2", fontWeight: "500" }}>Назад</Text>
        </Pressable>

        {/* Practice Display - Centered */}
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 36, fontWeight: "700", color: "#333333", textAlign: "center", paddingHorizontal: 16 }}>
            {practice.title}
          </Text>
          <Text style={{ fontSize: 14, color: "#888888" }}>
            {categoryLabels[practice.category] || practice.category}
          </Text>
        </View>

        {/* Action Button */}
        <Pressable
          onPress={handleStart}
          style={({ pressed }) => ({
            paddingVertical: 16,
            borderRadius: 12,
            backgroundColor: "#4A90E2",
            opacity: pressed ? 0.7 : 1,
            alignItems: "center",
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF" }}>
            Начать
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
