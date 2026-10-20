import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import Svg, { Circle } from "react-native-svg";
import type { Practice } from "@/types/practice";
import { MarkdownText } from "@/components/markdown-text";
import { usePracticeTimer } from "@/lib/practice-timer";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const gongSound = require("@/assets/sounds/gong.mp3");

/**
 * Practice Execution Screen
 * Displays detailed practice information with glassmorphism cards
 * and a countdown timer based on the user-selected time.
 */
export default function PracticeScreen() {
  const params = useLocalSearchParams();
  const practice: Practice = JSON.parse(params.practice as string);
  const totalSeconds = parseInt(params.selectedTime as string, 10) * 60;
  const isCompletingRef = useRef(false);

  // Audio player for gong sound
  const player = useAudioPlayer(gongSound);
  const playerRef = useRef(player);
  playerRef.current = player;

  const { secondsLeft, isRunning, isDone, start, toggle, stop } = usePracticeTimer({
    totalSeconds,
    notification: { title: practice.title, body: "Время вышло. Можно завершать" },
    onFinish: (late) => {
      // If the app was in the background, the notification has already rung
      if (late) return;
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      try {
        playerRef.current.seekTo(0);
        playerRef.current.play();
      } catch (_) {}
    },
  });

  // Enable audio in iOS silent mode
  useEffect(() => {
    if (Platform.OS !== "web") {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    return () => {
      try { playerRef.current.remove(); } catch (_) {}
    };
  }, []);

  // Start timer automatically when screen mounts
  useEffect(() => {
    start();
  }, [start]);

  const handleComplete = async () => {
    // Prevent double-tap or race condition
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stop();
    try {
      await AsyncStorage.setItem("showFeedback", "true");
      await AsyncStorage.setItem("practiceId", practice.id ?? "");
    } catch (_) {}
    router.replace("/home");
  };

  // Format time as MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Circular progress ring
  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  const insets = useSafeAreaInsets();

  // Category labels
  const categoryLabels: Record<string, string> = {
    recovery: "ВОССТАНОВЛЕНИЕ",
    activation: "АКТИВАЦИЯ",
    focus: "ФОКУС",
    body: "ТЕЛО",
    creative: "ТВОРЧЕСТВО",
    sensory: "ЧУВСТВА",
  };

  return (
    <View className="flex-1">
      {/* Gradient Background */}
      <LinearGradient
        colors={["#FFE5D9", "#D9F7F1"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute inset-0"
      />

      {/* Status Bar Space — respects Dynamic Island / notch */}
      <View style={{ height: insets.top + 16 }} />

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-6">
          <Text
            className="text-[11px] font-semibold tracking-widest uppercase mb-2"
            style={{ color: "#4A90E2" }}
          >
            {categoryLabels[practice.category] || practice.category}
          </Text>
          <Text className="text-[28px] font-bold text-center leading-tight text-[#2D3748]">
            {practice.title}
          </Text>
        </View>

        {/* Timer — tappable: pause/resume while running, exit when done */}
        <View className="items-center mb-8">
          <Pressable
            onPress={() => {
              if (isDone) {
                handleComplete();
              } else {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggle();
              }
            }}
            style={({ pressed }) => ({
              position: "relative",
              width: 108,
              height: 108,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1,
            })}
          >
            {/* Background circle */}
            <Svg width={108} height={108} style={{ position: "absolute" }}>
              <Circle
                cx={54}
                cy={54}
                r={RADIUS}
                stroke="rgba(74,144,226,0.15)"
                strokeWidth={6}
                fill="none"
              />
            </Svg>
            {/* Progress circle */}
            <Svg
              width={108}
              height={108}
              style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
            >
              <Circle
                cx={54}
                cy={54}
                r={RADIUS}
                stroke={isDone ? "#4CAF50" : "#4A90E2"}
                strokeWidth={6}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </Svg>
            {/* Time text */}
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: isDone ? 18 : 26,
                  fontWeight: "700",
                  color: isDone ? "#4CAF50" : "#2D3748",
                  letterSpacing: isDone ? 0 : 1,
                }}
              >
                {isDone ? "Готово" : formatTime(secondsLeft)}
              </Text>
            </View>
          </Pressable>

          {/* Pause / Resume button below the ring */}
          {!isDone && (
            <Pressable
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggle();
              }}
              style={({ pressed }) => ({
                marginTop: 12,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 14, color: "#4A90E2", fontWeight: "500" }}>
                {isRunning ? "Пауза" : "Продолжить"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Section: Description */}
        <View className="mb-6">
          <Text className="text-[13px] font-semibold text-[#2D3748] mb-2">
            Описание
          </Text>
          <View
            className="rounded-2xl p-4 border border-white/40"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <MarkdownText>{practice.description}</MarkdownText>
          </View>
        </View>

        {/* Section: First Step */}
        <View className="mb-6">
          <Text className="text-[13px] font-semibold text-[#2D3748] mb-2">
            Первый шаг
          </Text>
          <View
            className="rounded-2xl p-4 border border-white/40"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <MarkdownText>{practice.firstStep}</MarkdownText>
          </View>
        </View>

        {/* Section: Completion */}
        <View className="mb-6">
          <Text className="text-[13px] font-semibold text-[#2D3748] mb-2">
            Завершение
          </Text>
          <View
            className="rounded-2xl p-4 border border-white/40"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <MarkdownText>{practice.finish}</MarkdownText>
          </View>
        </View>

        {/* Section: Expected Effect */}
        <View className="mb-6">
          <Text className="text-[13px] font-semibold text-[#2D3748] mb-2">
            Ожидаемый эффект
          </Text>
          <View
            className="rounded-2xl p-4 border border-white/40"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <MarkdownText>{practice.expectedEffect}</MarkdownText>
          </View>
        </View>

        {/* Section: Simplified Version */}
        <View className="mb-8">
          <Text className="text-[13px] font-semibold text-[#2D3748] mb-2">
            Упрощённая версия
          </Text>
          <View
            className="rounded-2xl p-4 border border-white/40"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.65)",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <MarkdownText>{practice.simpleVersion}</MarkdownText>
          </View>
        </View>

        {/* Complete Button */}
        <Pressable
          onPress={handleComplete}
          style={({ pressed }) => ({
            paddingVertical: 16,
            borderRadius: 12,
            backgroundColor: "#4A90E2",
            opacity: pressed ? 0.7 : 1,
            alignItems: "center",
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#FFFFFF" }}>
            Завершить
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
