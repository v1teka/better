import { useState, useEffect } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { HintLabel } from "@/components/hint-label";
import { getSelectionHistory, rememberOffered } from "@/lib/history";
import { pickPractice, practiceDuration } from "@/lib/practice-selector";
import { SERIES_ROLE_LABELS, encodeSeries, pickSeries, seriesMinutes, type SeriesStep } from "@/lib/series";
import { usePalette } from "@/lib/theme-setting";
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

type Params = Record<string, string | string[] | undefined>;

const paramValue = (params: Params, key: string) =>
  typeof params[key] === "string" && params[key] ? (params[key] as string) : null;

function parseState(params: Params): UserState {
  const time = parseInt(paramValue(params, "time") ?? "", 10);
  return {
    energy: paramValue(params, "energy") as Energy | null,
    focus: paramValue(params, "focus") as Focus | null,
    tension: paramValue(params, "tension") as Tension | null,
    time: [2, 5, 10].includes(time) ? (time as SurveyTime) : null,
  };
}

type Offer =
  | { kind: "practice"; practice: Practice; duration: Time }
  | { kind: "series"; steps: SeriesStep[] };

/**
 * Recommendation Screen - Shows the practice picked for the answers,
 * or a series of three when the person chose «Серия»
 * Design: Minimal, centered, large typography
 */
export default function RecommendationScreen() {
  const router = useRouter();
  const palette = usePalette();
  const params = useLocalSearchParams();

  const [offer, setOffer] = useState<Offer | null>(null);

  // Pick once per screen instance, taking into account recent offers and ratings
  useEffect(() => {
    const state = parseState(params);
    const series = paramValue(params, "time") === "series";
    let cancelled = false;
    getSelectionHistory().then((history) => {
      if (cancelled) return;
      if (series) {
        const steps = pickSeries(state, history);
        setOffer({ kind: "series", steps });
        steps.forEach((step) => rememberOffered(step.practice.id));
      } else {
        const practice = pickPractice(state, history);
        setOffer({ kind: "practice", practice, duration: practiceDuration(practice, state.time) });
        rememberOffered(practice.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleStart = () => {
    if (!offer) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (offer.kind === "practice") {
      router.push({
        pathname: "/practice",
        params: { practiceId: offer.practice.id, selectedTime: offer.duration.toString() },
      });
    } else {
      router.push({ pathname: "/practice", params: { ...encodeSeries(offer.steps), step: "0" } });
    }
  };

  if (!offer) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 16, color: palette.muted }}>Подбираем практику…</Text>
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
          <Text style={{ fontSize: 28, color: palette.accent, lineHeight: 32 }}>‹</Text>
          <Text style={{ fontSize: 17, color: palette.accent, fontWeight: "500" }}>Назад</Text>
        </Pressable>

        {offer.kind === "practice" ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 16 }}>
            <HintLabel
              label="Предложено вам"
              hint="Эту практику мы подобрали по вашим ответам. Нажмите «Начать» — откроются таймер и шаги. Не подходит — вернитесь и ответьте по-другому."
            />
            <Text style={{ fontSize: 36, fontWeight: "700", color: palette.text, textAlign: "center", paddingHorizontal: 16 }}>
              {offer.practice.title}
            </Text>
            <Text style={{ fontSize: 15, color: palette.muted }}>
              {formatMinutes(offer.duration)} · {CATEGORY_LABELS[offer.practice.category] || offer.practice.category}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", gap: 20 }}>
            <View style={{ alignItems: "center", gap: 12 }}>
              <HintLabel
                label="Предложено вам"
                hint="Серию мы собрали по вашим ответам: короткий вход, основная практика и спокойное завершение. Между практиками можно передохнуть. Не подходит — вернитесь и ответьте по-другому."
              />
              <Text style={{ fontSize: 32, fontWeight: "700", color: palette.text, textAlign: "center" }}>
                Серия из трёх практик
              </Text>
              <Text style={{ fontSize: 15, color: palette.muted }}>
                Около {formatMinutes(seriesMinutes(offer.steps))}
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {offer.steps.map((step, index) => (
                <View
                  key={step.practice.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: palette.card,
                    borderWidth: 1,
                    borderColor: palette.cardBorder,
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: palette.accent + "24",
                    }}
                  >
                    <Text style={{ fontSize: 15, fontWeight: "700", color: palette.accent }}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: palette.muted,
                      }}
                    >
                      {SERIES_ROLE_LABELS[step.role]} · {formatMinutes(step.duration)}
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: "600", color: palette.text }}>{step.practice.title}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Button */}
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
          <Text style={{ fontSize: 18, fontWeight: "600", color: palette.onButton }}>
            {offer.kind === "series" ? "Начать серию" : "Начать"}
          </Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
