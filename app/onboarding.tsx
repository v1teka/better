import { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";

import { LogoSwitch } from "@/components/logo-switch";
import { markOnboardingDone } from "@/lib/onboarding";
import { usePalette, useScheme } from "@/lib/theme-setting";
import { requestTimerPermission } from "@/lib/timer-notification";

const STEPS: { icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }[] = [
  { icon: "options-outline", text: "Отметьте, как вы себя чувствуете — можно не всё" },
  { icon: "sparkles-outline", text: "Получите практику, которая подходит именно сейчас" },
  { icon: "timer-outline", text: "Выполните её под таймер и отметьте, как прошло" },
];

const PAGES = 3;

/**
 * Onboarding - shown once on the first launch.
 * Three short pages: what the app gives, how it works, and why notifications
 * (asked with context, right before the system prompt). Skippable at any point.
 */
export default function OnboardingScreen() {
  const router = useRouter();
  const scheme = useScheme();
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  // Pages of a horizontal scroll don't stretch vertically by themselves
  const [pageHeight, setPageHeight] = useState(0);

  const finish = async () => {
    await markOnboardingDone();
    router.replace("/home");
  };

  const goTo = (next: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const handleAllowNotifications = async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await requestTimerPermission();
    finish();
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={palette.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Skip — always available */}
        <View style={{ height: 44, paddingHorizontal: 24, alignItems: "flex-end", justifyContent: "center" }}>
          {page < PAGES - 1 && (
            <Pressable onPress={finish} hitSlop={12}>
              <Text style={{ fontSize: 16, color: palette.muted }}>Пропустить</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
          style={{ flex: 1 }}
        >
          {/* 1. What it gives */}
          <View style={{ width, height: pageHeight, paddingHorizontal: 32, justifyContent: "center", alignItems: "center", gap: 24 }}>
            <View style={{ height: 100, justifyContent: "center" }}>
              <LogoSwitch down={scheme === "dark"} />
            </View>
            <Text style={{ fontSize: 34, fontWeight: "700", color: palette.text, textAlign: "center" }}>
              Немного лучше — за пару минут
            </Text>
            <Text style={{ fontSize: 17, lineHeight: 25, color: palette.textSecondary, textAlign: "center" }}>
              Короткие практики под ваше состояние: от одной до десяти минут, без подготовки и где угодно.
            </Text>
          </View>

          {/* 2. How it works */}
          <View style={{ width, height: pageHeight, paddingHorizontal: 32, justifyContent: "center", gap: 28 }}>
            <Text style={{ fontSize: 30, fontWeight: "700", color: palette.text, textAlign: "center" }}>
              Как это работает
            </Text>
            {STEPS.map((step, index) => (
              <View key={step.icon} style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: palette.iconCircle,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name={step.icon} size={26} color={palette.accent} />
                </View>
                <Text style={{ flex: 1, fontSize: 17, lineHeight: 24, color: palette.text }}>
                  <Text style={{ fontWeight: "700" }}>{index + 1}. </Text>
                  {step.text}
                </Text>
              </View>
            ))}
          </View>

          {/* 3. Why notifications */}
          <View style={{ width, height: pageHeight, paddingHorizontal: 32, justifyContent: "center", alignItems: "center", gap: 24 }}>
            <View
              style={{
                width: 96,
                height: 96,
                borderRadius: 48,
                backgroundColor: palette.warmCircle,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="notifications-outline" size={44} color={palette.warmIcon} />
            </View>
            <Text style={{ fontSize: 30, fontWeight: "700", color: palette.text, textAlign: "center" }}>
              Гонг подскажет
            </Text>
            <Text style={{ fontSize: 17, lineHeight: 25, color: palette.textSecondary, textAlign: "center" }}>
              Когда время практики выйдет, прозвучит гонг — даже если экран заблокирован. Для этого нужны уведомления. Других уведомлений не будет.
            </Text>
          </View>
        </ScrollView>

        {/* Dots and the main action */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 32, gap: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {Array.from({ length: PAGES }, (_, i) => (
              <View
                key={i}
                style={{
                  width: i === page ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === page ? palette.button : palette.dotInactive,
                }}
              />
            ))}
          </View>

          {page < PAGES - 1 ? (
            <Pressable
              onPress={() => goTo(page + 1)}
              style={({ pressed }) => ({
                paddingVertical: 16,
                borderRadius: 12,
                backgroundColor: palette.button,
                opacity: pressed ? 0.7 : 1,
                alignItems: "center",
              })}
            >
              <Text style={{ fontSize: 18, fontWeight: "600", color: palette.onButton }}>Далее</Text>
            </Pressable>
          ) : (
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={handleAllowNotifications}
                style={({ pressed }) => ({
                  paddingVertical: 16,
                  borderRadius: 12,
                  backgroundColor: palette.button,
                  opacity: pressed ? 0.7 : 1,
                  alignItems: "center",
                })}
              >
                <Text style={{ fontSize: 18, fontWeight: "600", color: palette.onButton }}>Включить гонг</Text>
              </Pressable>
              <Pressable onPress={finish} hitSlop={8} style={{ alignItems: "center", paddingVertical: 4 }}>
                <Text style={{ fontSize: 16, color: palette.muted }}>Не сейчас</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
