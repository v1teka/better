import { Platform, Pressable, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

import { SeriesProgress } from "@/components/series-progress";
import { requestFeedback } from "@/lib/history";
import { getPracticeById } from "@/lib/practice-selector";
import { SERIES_ROLE_LABELS, decodeSeries, type SeriesStepRole } from "@/lib/series";
import { usePalette } from "@/lib/theme-setting";
import { formatMinutes } from "@/lib/utils";

// A series is always an arc of three (lib/series.ts): the step number tells the role
const ROLE_BY_STEP: SeriesStepRole[] = ["opening", "main", "closing"];

/**
 * A pause between the practices of a series: what comes next, and a button to start it
 * when ready. The series can also be finished here; then only the practices done are rated.
 */
export default function SeriesBreakScreen() {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ series?: string; durations?: string; step?: string }>();
  const { ids, minutes } = decodeSeries(params.series, params.durations);
  const step = parseInt(params.step ?? "", 10);
  const next = getPracticeById(ids[step] ?? "");

  if (!next || isNaN(step) || step <= 0) return <Redirect href="/home" />;

  const handleStart = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace({
      pathname: "/practice",
      params: { series: params.series!, durations: params.durations!, step: String(step) },
    });
  };

  const handleFinish = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await requestFeedback(ids.slice(0, step));
    router.replace("/home");
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={palette.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        style={{
          flex: 1,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          justifyContent: "space-between",
        }}
      >
        <Animated.View entering={FadeIn.duration(500)}>
          <SeriesProgress step={step - 1} total={ids.length} label={`Серия · пройдено ${step} из ${ids.length}`} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={{ alignItems: "center", gap: 14 }}>
          <Text style={{ fontSize: 16, color: palette.muted }}>Можно передохнуть</Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: palette.accent,
            }}
          >
            Следующая практика
          </Text>
          <Text style={{ fontSize: 30, fontWeight: "700", color: palette.text, textAlign: "center" }}>
            {next.title}
          </Text>
          <Text style={{ fontSize: 15, color: palette.muted }}>
            {SERIES_ROLE_LABELS[ROLE_BY_STEP[step] ?? "main"]} · {formatMinutes(minutes[step])}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={{ gap: 16 }}>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => ({
              paddingVertical: 16,
              borderRadius: 12,
              backgroundColor: palette.button,
              opacity: pressed ? 0.7 : 1,
              alignItems: "center",
            })}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: palette.onButton }}>Начать</Text>
          </Pressable>
          <Pressable onPress={handleFinish} hitSlop={10} style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: palette.subtle }}>Закончить серию</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}
