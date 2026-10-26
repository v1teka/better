import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  FadeOutUp,
  ZoomIn,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { LogoSwitch } from "@/components/logo-switch";
import { Sunburst } from "@/components/sunburst";
import { ALL_BETTER_WORDS } from "@/constants/better-words";
import { PALETTES, type Palette } from "@/constants/palette";
import { addFeedback } from "@/lib/history";
import { getPracticeById } from "@/lib/practice-selector";
import { toggleScheme, usePalette, useScheme } from "@/lib/theme-setting";
import type { Practice, Rating } from "@/types/practice";

/**
 * intro    — logo, «Лучше» with a changing second word, «Начать»
 * feedback — after a practice: how did it go, centered
 * thanks   — the chosen emoji and a short reply to the rating, then back to intro
 */
type Phase = "intro" | "feedback" | "thanks";

// How long the reply stays before the home screen returns (a tap returns at once)
const THANKS_HOLD_MS = 2800;

// The rating does affect the next offers (lib/practice-selector.ts), so the reply says so
const RATINGS: {
  rating: Rating;
  emoji: string;
  /** Sun rays around the button: only the positive rating has them */
  rays?: string;
  label: string;
  reply: string;
  /** Ends the reply, in the brand color */
  accent?: string;
  note: string;
}[] = [
  {
    rating: "bad",
    emoji: "😔",
    label: "Плохо",
    reply: "Жаль, что не подошло",
    note: "В следующий раз предложим другое",
  },
  {
    rating: "neutral",
    emoji: "😐",
    label: "Нормально",
    reply: "Спасибо, что отметили",
    note: "Так подбор станет точнее",
  },
  {
    rating: "good",
    emoji: "😊",
    rays: "#F6AD55",
    label: "Хорошо",
    reply: "Рады, что стало",
    accent: "Лучше",
    note: "Запомним, что вам подошло",
  },
];

// The square the rays around the positive rating are drawn in
const RAYS_SIZE = 124;

function randomWord(except?: string): string {
  const pool = ALL_BETTER_WORDS.filter((w) => w !== except);
  return pool[Math.floor(Math.random() * pool.length)];
}

// How long day turns to night (and back) after the logo switch
const THEME_FADE_MS = 700;

// Soft round spots over the gradient; their colors come from the palette.
// Each drifts slowly along its own loop: `drift` px, one loop per `period` ms.
const BLOB_SPOTS = [
  { size: 280, top: -60, left: -80, drift: 22, period: 17000 },
  { size: 200, top: 120, right: -50, drift: 16, period: 13000 },
  { size: 240, bottom: 80, left: -60, drift: 20, period: 19000 },
  { size: 180, bottom: 40, right: -30, drift: 14, period: 15000 },
] as const;

/**
 * Loop phases of the spots (0 → 1, repeating), shared by the day and night backdrops so
 * the spots of both move as one. Still when the system asks to reduce motion.
 */
function useBlobPhases(): SharedValue<number>[] {
  const reduceMotion = useReducedMotion();
  const phases = [useSharedValue(0), useSharedValue(0.25), useSharedValue(0.5), useSharedValue(0.75)];

  useEffect(() => {
    if (reduceMotion) return;
    phases.forEach((phase, index) => {
      const start = phase.value;
      // From its own starting point once around, then whole loops
      phase.value = withSequence(
        withTiming(1, { duration: BLOB_SPOTS[index].period * (1 - start), easing: Easing.linear }),
        withRepeat(
          withSequence(
            withTiming(0, { duration: 0 }),
            withTiming(1, { duration: BLOB_SPOTS[index].period, easing: Easing.linear }),
          ),
          -1,
          false,
        ),
      );
    });
  }, [reduceMotion]);

  return phases;
}

function BlobSpot({
  index,
  color,
  phase,
}: {
  index: number;
  color: string;
  phase: SharedValue<number>;
}) {
  const { size, drift, period: _period, ...spot } = BLOB_SPOTS[index];

  // An uneven loop (x twice as fast as y) and a slow swell, so the motion doesn't look mechanical
  const style = useAnimatedStyle(() => {
    const a = phase.value * Math.PI * 2;
    return {
      transform: [
        { translateX: Math.sin(a * 2) * drift * 0.6 },
        { translateY: Math.sin(a) * drift },
        { scale: 1 + Math.sin(a + 1) * 0.05 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          ...spot,
        },
        style,
      ]}
    />
  );
}

function Backdrop({ palette, phases }: { palette: Palette; phases: SharedValue<number>[] }) {
  return (
    <>
      <LinearGradient
        colors={palette.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {BLOB_SPOTS.map((_, index) => (
        <BlobSpot key={index} index={index} color={palette.blobs[index]} phase={phases[index]} />
      ))}
    </>
  );
}

// The window the changing word scrolls through: fixed, so «Лучше» never moves
const WORD_WINDOW_HEIGHT = 44;

/**
 * «Лучше» stays in place; the second word under it changes like a ticker:
 * the old one slides up and fades, the new one comes up from below.
 * `night` goes 0 → 1 as the theme turns dark, so the colors change smoothly.
 */
function BetterTitle({ night }: { night: SharedValue<number> }) {
  const [word, setWord] = useState(() => randomWord());

  useEffect(() => {
    const interval = setInterval(() => setWord((w) => randomWord(w)), 5000);
    return () => clearInterval(interval);
  }, []);

  const titleColor = useAnimatedStyle(() => ({
    color: interpolateColor(night.value, [0, 1], [PALETTES.light.text, PALETTES.dark.text]),
  }));
  const wordColor = useAnimatedStyle(() => ({
    color: interpolateColor(night.value, [0, 1], [PALETTES.light.accent, PALETTES.dark.accent]),
  }));

  return (
    <View style={{ alignItems: "center", alignSelf: "stretch" }}>
      <Animated.Text style={[{ fontSize: 48, fontWeight: "700", letterSpacing: -1 }, titleColor]}>
        Лучше
      </Animated.Text>
      <View
        style={{
          height: WORD_WINDOW_HEIGHT,
          alignSelf: "stretch",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <Animated.Text
          key={word}
          entering={FadeInDown.duration(900).easing(Easing.out(Easing.cubic))}
          exiting={FadeOutUp.duration(700).easing(Easing.in(Easing.cubic))}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 32,
              fontWeight: "600",
              letterSpacing: -0.5,
            },
            wordColor,
          ]}
        >
          {word}
        </Animated.Text>
      </View>
    </View>
  );
}

/**
 * Emoji button. The positive one has sun rays with a glow around it: they turn and breathe
 * while waiting for a choice and open up when it is chosen. The others fade back then.
 */
function EmojiChoice({
  emoji,
  rays,
  label,
  selected,
  dimmed,
  onPress,
}: {
  emoji: string;
  rays?: string;
  label: string;
  selected: boolean;
  dimmed: boolean;
  onPress: () => void;
}) {
  const palette = usePalette();
  const bloom = useSharedValue(0);

  useEffect(() => {
    bloom.value = withSpring(selected ? 1 : 0, { damping: 12, stiffness: 120 });
  }, [selected]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + bloom.value * 0.2 }],
  }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        opacity: dimmed ? 0.35 : pressed ? 0.8 : 1,
      })}
    >
      {rays && <Sunburst size={RAYS_SIZE} color={rays} bloom={bloom} />}
      <Animated.View
        style={[
          {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: palette.bubble,
            alignItems: "center",
            justifyContent: "center",
          },
          emojiStyle,
        ]}
      >
        <Text style={{ fontSize: 28 }}>{emoji}</Text>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Home Screen - Landing page with gradient background; after a practice it asks how it went
 */
export default function HomeScreen() {
  const router = useRouter();
  // Development only: /home?preview=<practiceId> opens the rating card right away
  const { preview } = useLocalSearchParams<{ preview?: string }>();
  const [phase, setPhase] = useState<Phase | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [selected, setSelected] = useState<Rating | null>(null);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scheme = useScheme();
  const palette = usePalette();
  // 0 — day, 1 — night: the backdrop and the title follow it smoothly
  const night = useSharedValue(scheme === "dark" ? 1 : 0);

  const blobPhases = useBlobPhases();

  // The rays after a positive rating stay fully open
  const thanksBloom = useSharedValue(1);

  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);

  useEffect(() => {
    checkFeedbackFlag();
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    night.value = withTiming(scheme === "dark" ? 1 : 0, {
      duration: THEME_FADE_MS,
      easing: Easing.inOut(Easing.ease),
    });
  }, [scheme]);

  const nightLayerStyle = useAnimatedStyle(() => ({ opacity: night.value }));

  useEffect(() => {
    if (phase !== "intro") return;
    logoOpacity.value = 0;
    logoScale.value = 0.8;
    logoOpacity.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) }, () => {
      logoOpacity.value = withRepeat(
        withTiming(0.8, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    });
    logoScale.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.ease) });
  }, [phase]);

  const later = (fn: () => void, ms: number) => {
    timeouts.current.push(setTimeout(fn, ms));
  };

  const checkFeedbackFlag = async () => {
    if (__DEV__ && preview) {
      setPractice(getPracticeById(preview) ?? null);
      setPhase("feedback");
      return;
    }
    try {
      const showFeedback = await AsyncStorage.getItem("showFeedback");
      if (showFeedback === "true") {
        await AsyncStorage.removeItem("showFeedback");
        const practiceId = await AsyncStorage.getItem("practiceId");
        setPractice(practiceId ? getPracticeById(practiceId) ?? null : null);
        setPhase("feedback");
        return;
      }
    } catch (error) {
      console.error("Error checking feedback flag:", error);
    }
    setPhase("intro");
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const handleStart = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/survey");
  };

  // The logo is a switch: knob up — light theme, as on the app icon; down — dark
  const handleLogoPress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleScheme();
  };

  const handleRating = (rating: Rating) => {
    if (selected) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(rating);
    if (practice) addFeedback(practice.id, rating);
    // Let the aura bloom, then the card drifts up and the closing word comes in
    later(() => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase("thanks");
    }, 700);
    later(() => setPhase("intro"), 700 + THANKS_HOLD_MS);
  };

  // The reply screen: a tap (on «Лучше» or anywhere) goes home without waiting
  const handleThanksTap = () => {
    timeouts.current.forEach(clearTimeout);
    timeouts.current = [];
    setPhase("intro");
  };

  const handleSkip = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase("intro");
  };

  const reply = RATINGS.find((r) => r.rating === selected);

  return (
    <View style={{ flex: 1 }}>
      {/* Day backdrop, with the night one fading in over it */}
      <Backdrop palette={PALETTES.light} phases={blobPhases} />
      <Animated.View style={[StyleSheet.absoluteFill, nightLayerStyle]}>
        <Backdrop palette={PALETTES.dark} phases={blobPhases} />
      </Animated.View>

      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {phase === "intro" && (
            <Animated.View
              entering={FadeIn.duration(600)}
              exiting={FadeOut.duration(300)}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 24,
                paddingTop: 72,
                paddingBottom: 80,
              }}
            >
              {/* Logo — at top; it is also the light / dark switch */}
              <Animated.View
                style={[{ height: 100, justifyContent: "center" }, logoAnimatedStyle]}
              >
                <LogoSwitch
                  down={scheme === "dark"}
                  onPress={handleLogoPress}
                  accessibilityLabel="Тёмная тема"
                />
              </Animated.View>

              {/* «Лучше» + changing word */}
              <BetterTitle night={night} />

              <Animated.View entering={FadeInDown.delay(250).springify().damping(16)}>
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => ({
                    width: 220,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: pressed ? palette.buttonPressed : palette.button,
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: palette.button,
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                    elevation: 10,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  })}
                >
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: palette.onButton,
                      letterSpacing: 0.3,
                    }}
                  >
                    Начать
                  </Text>
                </Pressable>
              </Animated.View>
            </Animated.View>
          )}

          {phase === "feedback" && (
            <Animated.View
              entering={FadeInDown.springify().damping(16)}
              exiting={FadeOutUp.duration(450)}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 24,
              }}
            >
              <View
                style={{
                  width: 300,
                  borderRadius: 28,
                  backgroundColor: palette.card,
                  paddingVertical: 32,
                  paddingHorizontal: 24,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.1,
                  shadowRadius: 20,
                  elevation: 8,
                  borderWidth: 1,
                  borderColor: palette.cardBorder,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: palette.success,
                    marginBottom: 8,
                  }}
                >
                  Практика завершена
                </Text>
                {practice && (
                  <Text
                    style={{
                      fontSize: 15,
                      color: palette.muted,
                      textAlign: "center",
                      marginBottom: 16,
                    }}
                  >
                    {practice.title}
                  </Text>
                )}
                <Text style={{ fontSize: 22, fontWeight: "600", color: palette.text, marginBottom: 24 }}>
                  Как прошло?
                </Text>
                <View style={{ flexDirection: "row", gap: 20, marginBottom: 24 }}>
                  {RATINGS.map((item) => (
                    <EmojiChoice
                      key={item.rating}
                      emoji={item.emoji}
                      rays={item.rays}
                      label={item.label}
                      selected={selected === item.rating}
                      dimmed={selected != null && selected !== item.rating}
                      onPress={() => handleRating(item.rating)}
                    />
                  ))}
                </View>
                <Pressable onPress={handleSkip} hitSlop={10} disabled={selected != null}>
                  <Text style={{ fontSize: 14, color: palette.subtle }}>Пропустить</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {phase === "thanks" && reply && (
            <Animated.View
              entering={FadeIn.duration(400)}
              exiting={FadeOutUp.duration(600)}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <Pressable
                onPress={handleThanksTap}
                accessibilityRole="button"
                accessibilityLabel={`${reply.reply}${reply.accent ? " " + reply.accent : ""}. На главный экран`}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 24,
                  gap: 12,
                }}
              >
                {/* The chosen emoji stays, so the reply reads as an answer to it */}
                <Animated.View
                  entering={ZoomIn.springify().damping(12)}
                  style={{ marginBottom: 36, alignItems: "center", justifyContent: "center" }}
                >
                  {reply.rays && <Sunburst size={RAYS_SIZE * 1.3} color={reply.rays} bloom={thanksBloom} />}
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 28,
                      backgroundColor: palette.bubble,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 32 }}>{reply.emoji}</Text>
                  </View>
                </Animated.View>
                <Animated.Text
                  entering={FadeInDown.delay(150).duration(500)}
                  style={{ fontSize: 26, fontWeight: "700", color: palette.text, textAlign: "center" }}
                >
                  {reply.reply}
                  {reply.accent && <Text style={{ color: palette.accent }}> {reply.accent}</Text>}
                </Animated.Text>
                <Animated.Text
                  entering={FadeInDown.delay(300).duration(500)}
                  style={{ fontSize: 15, color: palette.muted, textAlign: "center" }}
                >
                  {reply.note}
                </Animated.Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
