import { View, Text, ScrollView, Pressable, Platform } from "react-native";
import { Redirect, useLocalSearchParams, router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import Svg, { Circle } from "react-native-svg";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Practice } from "@/types/practice";
import { MarkdownText } from "@/components/markdown-text";
import { CollapsibleCard, GlassCard } from "@/components/glass-card";
import { HintLabel } from "@/components/hint-label";
import { SeriesProgress } from "@/components/series-progress";
import { SoundToggle } from "@/components/sound-toggle";
import { requestFeedback } from "@/lib/history";
import { getPracticeById } from "@/lib/practice-selector";
import { usePracticeTimer } from "@/lib/practice-timer";
import { decodeSeries } from "@/lib/series";
import { useSoundOn } from "@/lib/sound-setting";
import { usePalette } from "@/lib/theme-setting";

const gongSound = require("@/assets/sounds/gong.mp3");

/**
 * Practice Execution Screen
 * Timer with a gong at the end, the practice steps, the less important parts folded.
 */
export default function PracticeScreen() {
  const params = useLocalSearchParams<{
    practiceId?: string;
    selectedTime?: string;
    series?: string;
    durations?: string;
    step?: string;
  }>();

  // A step of a series, or a single practice
  const { ids, minutes: seriesMinutesList } = decodeSeries(params.series, params.durations);
  const step = Math.min(Math.max(parseInt(params.step ?? "0", 10) || 0, 0), Math.max(ids.length - 1, 0));
  const inSeries = ids.length > 0;
  const practice = getPracticeById(inSeries ? ids[step] : params.practiceId ?? "");
  const minutes = inSeries ? seriesMinutesList[step] : parseInt(params.selectedTime ?? "", 10);
  const duration = isNaN(minutes) || minutes <= 0 ? practice?.time[0] ?? 0 : minutes;

  // A broken link (unknown practice) leads home instead of crashing
  if (!practice) return <Redirect href="/home" />;
  return (
    <PracticeView
      practice={practice}
      totalSeconds={duration * 60}
      series={inSeries ? { ids, step, series: params.series!, durations: params.durations! } : null}
    />
  );
}

type SeriesPosition = { ids: string[]; step: number; series: string; durations: string };

function PracticeView({
  practice,
  totalSeconds,
  series,
}: {
  practice: Practice;
  totalSeconds: number;
  series: SeriesPosition | null;
}) {
  const lastInSeries = series != null && series.step === series.ids.length - 1;
  const palette = usePalette();
  const isCompletingRef = useRef(false);
  const soundOn = useSoundOn();
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const gong = useAudioPlayer(gongSound);
  const gongRef = useRef(gong);
  gongRef.current = gong;

  const { secondsLeft, isRunning, isDone, start, toggle, stop } = usePracticeTimer({
    totalSeconds,
    notification: { title: practice.title, body: "Время вышло. Можно завершать", sound: soundOn },
    onFinish: (late) => {
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

  // The gong respects the silent switch: in silent mode the end is marked by vibration
  useEffect(() => {
    if (Platform.OS !== "web") {
      setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
    }
    return () => {
      try { gongRef.current.remove(); } catch (_) {}
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
    if (series && !lastInSeries) {
      // A short pause before the next practice of the series
      router.replace({
        pathname: "/series-break",
        params: { series: series.series, durations: series.durations, step: String(series.step + 1) },
      });
      return;
    }
    // One rating for the whole series, or for the single practice
    await requestFeedback(series ? series.ids : [practice.id]);
    router.replace("/home");
  };

  // Paused (not finished): the timer fades back until it goes on
  const paused = !isRunning && !isDone;

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
        colors={palette.gradient}
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
          {series && <SeriesProgress step={series.step} total={series.ids.length} />}
          <HintLabel
            label="Сейчас выполняете"
            hint={
              !series
                ? "Следуйте шагам ниже, пока идёт таймер. Когда время выйдет, прозвучит гонг — даже на заблокированном экране. Закончили раньше — нажмите «Завершить»."
                : lastInSeries
                  ? "Последняя практика серии. Следуйте шагам, пока идёт таймер; когда время выйдет, прозвучит гонг. Нажмите «Завершить серию» — и отметите, как всё прошло."
                  : `Практика ${series.step + 1} из ${series.ids.length} в серии. Следуйте шагам, пока идёт таймер; когда время выйдет, прозвучит гонг. Нажмите «Завершить» — и перейдёте к следующей.`
            }
          />
          <Text className="text-[28px] font-bold text-center leading-tight" style={{ color: palette.text }}>
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
              opacity: (pressed ? 0.75 : 1) * (paused ? 0.45 : 1),
            })}
          >
            {/* Background circle */}
            <Svg width={108} height={108} style={{ position: "absolute" }}>
              <Circle
                cx={54}
                cy={54}
                r={RADIUS}
                stroke={palette.ringTrack}
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
                stroke={isDone ? palette.success : paused ? palette.muted : palette.accent}
                strokeWidth={6}
                fill="none"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </Svg>
            {/* Time text; on pause the ring turns grey and the timer fades back */}
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: isDone ? 18 : 26,
                  fontWeight: "700",
                  color: isDone ? palette.success : paused ? palette.muted : palette.text,
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
              <Text style={{ fontSize: 14, color: palette.accent, fontWeight: "500" }}>
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
        {/* When time is up, how to finish is what's needed next */}
        <CollapsibleCard title="Завершение" openWhen={isDone}>
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
            backgroundColor: palette.button,
            opacity: pressed ? 0.7 : 1,
            alignItems: "center",
          })}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: palette.onButton }}>
            {lastInSeries ? "Завершить серию" : "Завершить"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
