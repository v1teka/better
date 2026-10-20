import { View, Text, ScrollView, Pressable, Platform, AppState } from "react-native";
import { Redirect, useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef } from "react";
import Svg, { Circle } from "react-native-svg";
import { useAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Practice } from "@/types/practice";
import { MarkdownText } from "@/components/markdown-text";
import { CollapsibleCard, GlassCard } from "@/components/glass-card";
import { HintLabel } from "@/components/hint-label";
import { SoundToggle } from "@/components/sound-toggle";
import { getPracticeById } from "@/lib/practice-selector";
import { usePracticeTimer } from "@/lib/practice-timer";
import { useSoundOn } from "@/lib/sound-setting";

const gongSound = require("@/assets/sounds/gong.mp3");
const ambientSound = require("@/assets/sounds/ambient.m4a");

// The background sound stays quiet: it sets the mood, the gong marks the end
const AMBIENT_VOLUME = 0.35;

/** Lower the volume to zero over `ms`, then pause */
function fadeOut(player: AudioPlayer, ms: number) {
  const steps = 10;
  let step = 0;
  const startVolume = player.volume;
  const interval = setInterval(() => {
    step++;
    try {
      player.volume = startVolume * (1 - step / steps);
      if (step >= steps) {
        clearInterval(interval);
        player.pause();
        player.volume = AMBIENT_VOLUME;
      }
    } catch {
      clearInterval(interval);
    }
  }, ms / steps);
}

/**
 * Practice Execution Screen
 * Timer with background sound, the practice steps, the less important parts folded.
 */
export default function PracticeScreen() {
  const params = useLocalSearchParams<{ practiceId?: string; selectedTime?: string }>();
  const practice = getPracticeById(params.practiceId ?? "");
  const minutes = parseInt(params.selectedTime ?? "", 10);
  const duration = isNaN(minutes) || minutes <= 0 ? practice?.time[0] ?? 0 : minutes;

  // A broken link (unknown practice) leads home instead of crashing
  if (!practice) return <Redirect href="/home" />;
  return <PracticeView practice={practice} totalSeconds={duration * 60} />;
}

function PracticeView({ practice, totalSeconds }: { practice: Practice; totalSeconds: number }) {
  const isCompletingRef = useRef(false);
  const soundOn = useSoundOn();
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const gong = useAudioPlayer(gongSound);
  const gongRef = useRef(gong);
  gongRef.current = gong;

  const ambient = useAudioPlayer(ambientSound);
  const ambientRef = useRef(ambient);
  ambientRef.current = ambient;

  const { secondsLeft, isRunning, isDone, start, toggle, stop } = usePracticeTimer({
    totalSeconds,
    notification: { title: practice.title, body: "Время вышло. Можно завершать", sound: soundOn },
    onFinish: (late) => {
      fadeOut(ambientRef.current, 1500);
      // If the app was in the background, the notification has already rung
      if (late) return;
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!soundOnRef.current) return;
      try {
        gongRef.current.seekTo(0);
        gongRef.current.play();
      } catch (_) {}
    },
  });

  // Enable audio in iOS silent mode; the background sound loops quietly
  useEffect(() => {
    if (Platform.OS !== "web") {
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    }
    try {
      ambientRef.current.loop = true;
      ambientRef.current.volume = AMBIENT_VOLUME;
    } catch (_) {}
    return () => {
      try { ambientRef.current.pause(); } catch (_) {}
      try { gongRef.current.remove(); } catch (_) {}
    };
  }, []);

  // The background sound plays while the timer runs and sound is on.
  // iOS pauses it in the background, so it resumes when the app is back.
  useEffect(() => {
    const sync = () => {
      try {
        if (isRunning && soundOn) ambientRef.current.play();
        else if (!isDone) ambientRef.current.pause();
      } catch (_) {}
    };
    sync();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") sync();
    });
    return () => subscription.remove();
  }, [isRunning, isDone, soundOn]);

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
    try { ambientRef.current.pause(); } catch (_) {}
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

  return (
    <View className="flex-1">
      {/* Gradient Background */}
      <LinearGradient
        colors={["#FFE5D9", "#D9F7F1"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="absolute inset-0"
      />

      {/* Top bar below the Dynamic Island / notch: sound switch on the right */}
      <View
        style={{
          paddingTop: insets.top + 4,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <SoundToggle />
      </View>

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
        <View className="items-center mb-6" style={{ gap: 10 }}>
          <HintLabel
            label="Сейчас выполняете"
            hint="Следуйте шагам ниже, пока идёт таймер. Когда время выйдет, прозвучит гонг — даже на заблокированном экране. Закончили раньше — нажмите «Завершить»."
          />
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

        <GlassCard title="Описание">
          <MarkdownText>{practice.description}</MarkdownText>
        </GlassCard>

        <GlassCard title="Первый шаг">
          <MarkdownText>{practice.firstStep}</MarkdownText>
        </GlassCard>

        {/* Less needed during the practice: folded until tapped */}
        <CollapsibleCard title="Завершение">
          <MarkdownText>{practice.finish}</MarkdownText>
        </CollapsibleCard>
        <CollapsibleCard title="Ожидаемый эффект">
          <MarkdownText>{practice.expectedEffect}</MarkdownText>
        </CollapsibleCard>
        <CollapsibleCard title="Упрощённая версия">
          <MarkdownText>{practice.simpleVersion}</MarkdownText>
        </CollapsibleCard>

        {/* Complete Button */}
        <Pressable
          onPress={handleComplete}
          style={({ pressed }) => ({
            marginTop: 16,
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
