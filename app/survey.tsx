import { useState } from "react";
import { ScrollView, Text, View, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import type { UserState } from "@/types/practice";

type Option<T> = { value: T; label: string };

const QUESTIONS: {
  key: keyof UserState;
  title: string;
  options: Option<UserState[keyof UserState]>[];
}[] = [
  {
    key: "energy",
    title: "Энергия",
    options: [
      { value: "low", label: "Низкая" },
      { value: "normal", label: "Норма" },
      { value: "high", label: "Высокая" },
    ],
  },
  {
    key: "tension",
    title: "Напряжение",
    options: [
      { value: "calm", label: "Спокоен" },
      { value: "tense", label: "Напряжён" },
    ],
  },
  {
    key: "focus",
    title: "Фокус",
    options: [
      { value: "scattered", label: "Рассеян" },
      { value: "normal", label: "Норма" },
      { value: "stuck", label: "Застрял" },
    ],
  },
  {
    key: "time",
    title: "Сколько есть времени?",
    options: [
      { value: 2, label: "1–2 мин" },
      { value: 5, label: "3–5 мин" },
      { value: 10, label: "10 мин" },
    ],
  },
];

/**
 * Survey Screen - User marks their current state
 * Every question is optional: the more answers, the closer the match.
 * Tapping a selected option again clears it.
 */
export default function SurveyScreen() {
  const router = useRouter();
  const [state, setState] = useState<UserState>({
    energy: null,
    focus: null,
    tension: null,
    time: null,
  });

  const answered = Object.values(state).filter((v) => v != null).length;

  const triggerLight = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleBack = () => {
    triggerLight();
    router.replace("/home");
  };

  const handleSelect = (key: keyof UserState, value: UserState[keyof UserState]) => {
    triggerLight();
    setState((s) => ({ ...s, [key]: s[key] === value ? null : value }));
  };

  const handleContinue = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/recommendation",
      params: {
        energy: state.energy ?? "",
        focus: state.focus ?? "",
        tension: state.tension ?? "",
        time: state.time != null ? state.time.toString() : "",
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>
        <View style={{ flex: 1, gap: 28 }}>
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

          {/* Title */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 32, fontWeight: "700", color: "#333333", textAlign: "center" }}>
              Как вы себя чувствуете?
            </Text>
            <Text style={{ fontSize: 15, color: "#718096", textAlign: "center", lineHeight: 21 }}>
              Отметьте то, что знаете о себе сейчас.{"\n"}Можно ответить не на всё.
            </Text>
          </View>

          {QUESTIONS.map((question) => (
            <View key={question.key} style={{ gap: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#333333" }}>{question.title}</Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {question.options.map((option) => {
                  const selected = state[question.key] === option.value;
                  return (
                    <Pressable
                      key={String(option.value)}
                      onPress={() => handleSelect(question.key, option.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 14,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        backgroundColor: selected ? "#4A90E2" : "#F5F5F5",
                        opacity: pressed ? 0.7 : 1,
                        alignItems: "center",
                      })}
                    >
                      <Text style={{ fontSize: 16, fontWeight: "500", color: selected ? "#FFFFFF" : "#333333" }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Continue Button: always available, the hint explains what answers give */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 13, color: "#A0AEC0", textAlign: "center" }}>
              {answered === 0
                ? "Без ответов подберём то, что подходит почти всегда"
                : answered < 4
                  ? "Чем больше ответов, тем точнее подбор"
                  : "Подберём практику точно под ваши ответы"}
            </Text>
            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => ({
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: "#4A90E2",
                opacity: pressed ? 0.7 : 1,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF" }}>
                Продолжить
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
