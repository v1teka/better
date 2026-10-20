import { useState, useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { HintLabel } from "@/components/hint-label";
import { getSelectionHistory, rememberOffered } from "@/lib/history";
import { pickPractice, practiceDuration } from "@/lib/practice-selector";
import { formatMinutes } from "@/lib/utils";
import type { Practice, UserState, Energy, Focus, Tension, SurveyTime, Time } from "@/types/practice";

const CATEGORY_LABELS: Record<string, string> = {
  recovery: "восстановление",
  activation: "активация",
  focus: "фокус",
  body: "тело",
  creative: "творчество",
  sensory: "чувства",
};

function parseState(params: Record<string, string | string[] | undefined>): UserState {
  const value = (key: string) => (typeof params[key] === "string" && params[key] ? (params[key] as string) : null);
  const time = parseInt(value("time") ?? "", 10);
  return {
    energy: value("energy") as Energy | null,
    focus: value("focus") as Focus | null,
    tension: value("tension") as Tension | null,
    time: [2, 5, 10].includes(time) ? (time as SurveyTime) : null,
  };
}

/**
 * Recommendation Screen - Shows the practice picked for the answers
 * Design: Minimal, centered, large typography
 */
export default function RecommendationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [practice, setPractice] = useState<Practice | null>(null);
  const [duration, setDuration] = useState<Time | null>(null);

  // Pick once per screen instance, taking into account recent offers and ratings
  useEffect(() => {
    const state = parseState(params);
    let cancelled = false;
    getSelectionHistory().then((history) => {
      if (cancelled) return;
      const selected = pickPractice(state, history);
      setPractice(selected);
      setDuration(practiceDuration(selected, state.time));
      rememberOffered(selected.id);
    });
    return () => {
      cancelled = true;
    };
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
        practiceId: practice.id,
        selectedTime: duration.toString(),
      },
    });
  };

  if (!practice || !duration) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: "#888888" }}>Подбираем практику…</Text>
        </View>
      </ScreenContainer>
    );
  }

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
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
          <HintLabel
            label="Предложено вам"
            hint="Эту практику мы подобрали по вашим ответам. Нажмите «Начать» — откроются таймер и шаги. Не подходит — вернитесь и ответьте по-другому."
          />
          <Text style={{ fontSize: 36, fontWeight: "700", color: "#333333", textAlign: "center", paddingHorizontal: 16 }}>
            {practice.title}
          </Text>
          <Text style={{ fontSize: 15, color: "#888888" }}>
            {formatMinutes(duration)} · {CATEGORY_LABELS[practice.category] || practice.category}
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
