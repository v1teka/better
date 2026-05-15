import { useState } from "react";
import { ScrollView, Text, View, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import type { Energy, Focus, Tension, Time, UserState } from "@/types/practice";

/**
 * Survey Screen - User selects current state
 * Design: Minimal, clean, follows Apple HIG
 */
export default function SurveyScreen() {
  const router = useRouter();
  const [state, setState] = useState<UserState>({
    energy: null,
    focus: null,
    tension: null,
    time: null,
  });

  const isComplete = state.energy && state.focus && state.tension;

  const triggerLight = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerMedium = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleBack = () => {
    triggerLight();
    router.replace("/home");
  };

  const handleContinue = () => {
    if (!isComplete) return;
    triggerMedium();

    router.push({
      pathname: "/recommendation",
      params: {
        energy: state.energy,
        focus: state.focus,
        tension: state.tension,
        time: state.time != null ? state.time.toString() : "",
      },
    });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}>
        <View style={{ flex: 1, gap: 32 }}>
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
          <Text style={{ fontSize: 32, fontWeight: "700", color: "#333333", textAlign: "center" }}>
            Как вы себя чувствуете?
          </Text>

          {/* Question 1: Energy */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#333333" }}>Энергия</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["low", "normal", "high"] as Energy[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => { triggerLight(); setState({ ...state, energy: option }); }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: state.energy === option ? "#4A90E2" : "#F5F5F5",
                    opacity: pressed ? 0.7 : 1,
                    alignItems: "center",
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "500", color: state.energy === option ? "#FFFFFF" : "#333333" }}>
                    {option === "low" ? "Низкая" : option === "normal" ? "Норма" : "Высокая"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Question 2: Tension */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#333333" }}>Напряжение</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["calm", "tense"] as Tension[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => { triggerLight(); setState({ ...state, tension: option }); }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: state.tension === option ? "#4A90E2" : "#F5F5F5",
                    opacity: pressed ? 0.7 : 1,
                    alignItems: "center",
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "500", color: state.tension === option ? "#FFFFFF" : "#333333" }}>
                    {option === "calm" ? "Спокоен" : "Напряжён"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Question 3: Focus */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#333333" }}>Фокус</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(["scattered", "normal", "stuck"] as Focus[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => { triggerLight(); setState({ ...state, focus: option }); }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: state.focus === option ? "#4A90E2" : "#F5F5F5",
                    opacity: pressed ? 0.7 : 1,
                    alignItems: "center",
                  })}
                >
                  <Text style={{ fontSize: 16, fontWeight: "500", color: state.focus === option ? "#FFFFFF" : "#333333" }}>
                    {option === "scattered" ? "Рассеян" : option === "stuck" ? "Застрял" : "Норма"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Question 4: Time */}
          <View style={{ gap: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#333333" }}>Доступное время</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {([2, 5, 10] as Time[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => { triggerLight(); setState({ ...state, time: option }); }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    borderRadius: 12,
                    backgroundColor: state.time === option ? "#4A90E2" : "#F5F5F5",
                    opacity: pressed ? 0.7 : 1,
                    alignItems: "center",
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: "500", color: state.time === option ? "#FFFFFF" : "#333333" }}>
                    {option} мин
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Spacer */}
          <View style={{ flex: 1 }} />

          {/* Continue Button */}
          <Pressable
            onPress={handleContinue}
            disabled={!isComplete}
            style={({ pressed }) => ({
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: "#4A90E2",
              opacity: !isComplete ? 0.4 : pressed ? 0.7 : 1,
              alignItems: "center",
            })}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF" }}>
              Продолжить
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
