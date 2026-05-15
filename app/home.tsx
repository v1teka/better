import { View, Text, Pressable, Platform, SafeAreaView, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect, useState } from "react";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";

type FeedbackState = "normal" | "feedback" | "thankyou";

/**
 * Home Screen - Landing page with gradient background and clear button
 */
export default function HomeScreen() {
  const router = useRouter();
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.8);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("normal");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);

  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.9);
  const buttonOpacity = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.ease),
    });
    logoScale.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.ease),
    });

    setTimeout(() => {
      logoOpacity.value = withRepeat(
        withTiming(0.8, {
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    }, 1600);

    checkFeedbackFlag();
  }, []);

  useEffect(() => {
    if (feedbackState === "feedback" || feedbackState === "thankyou") {
      cardOpacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
      cardScale.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
    // "normal" state — card is already hidden via dismissCard animation
  }, [feedbackState]);

  const checkFeedbackFlag = async () => {
    try {
      const showFeedback = await AsyncStorage.getItem("showFeedback");
      if (showFeedback === "true") {
        setFeedbackState("feedback");
        await AsyncStorage.removeItem("showFeedback");
      }
    } catch (error) {
      console.error("Error checking feedback flag:", error);
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const handleStart = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/survey");
  };

  const dismissCard = (delay = 0) => {
    setTimeout(() => {
      cardOpacity.value = withTiming(0, { duration: 250, easing: Easing.in(Easing.ease) });
      cardScale.value = withTiming(0.9, { duration: 250, easing: Easing.in(Easing.ease) });
      setTimeout(() => {
        // Reset button to invisible before showing it
        buttonOpacity.value = 0;
        buttonScale.value = 0.92;
        setFeedbackState("normal");
        setSelectedEmoji(null);
        // Animate button in after state update
        setTimeout(() => {
          buttonOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
          buttonScale.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) });
        }, 30);
      }, 260);
    }, delay);
  };

  const handleEmojiSelect = async (rating: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEmoji(rating);
    setTimeout(() => {
      // Animate card out first, then switch to thankyou
      cardOpacity.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) });
      cardScale.value = withTiming(0.9, { duration: 200, easing: Easing.in(Easing.ease) });
      setTimeout(() => {
        setFeedbackState("thankyou");
        // thankyou card animates in via useEffect, then dismisses after 1500ms
        dismissCard(1500);
      }, 210);
    }, 400);
  };

  const handleSkip = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dismissCard(0);
  };

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient
        colors={["#FFE5D9", "#D9F7F1"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View
        style={{
          position: "absolute",
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          top: -60,
          left: -80,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: "rgba(152, 216, 200, 0.25)",
          top: 120,
          right: -50,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: 120,
          backgroundColor: "rgba(255, 182, 193, 0.2)",
          bottom: 80,
          left: -60,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: "rgba(255, 255, 255, 0.3)",
          bottom: 40,
          right: -30,
        }}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 24,
            paddingTop: 48,
            paddingBottom: 80,
          }}
        >
          {/* Logo — at top */}
          <View style={{ marginBottom: 0, paddingTop: 24 }}>
            <Animated.View style={logoAnimatedStyle}>
              <Image
                source={require("../assets/images/logo.png")}
                style={{ width: 56, height: 100 }}
                contentFit="contain"
              />
            </Animated.View>
          </View>

          {/* Title */}
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 48,
                fontWeight: "700",
                color: "#2D3748",
                letterSpacing: -1,
                marginBottom: 8,
              }}
            >
              Лучше
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#718096",
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              {"Практика для улучшения\nментального состояния"}
            </Text>
          </View>

          {/* Card / button area — below title, does not affect title position */}
          <View style={{ alignItems: "center" }}>
            {feedbackState === "feedback" && (
              <Animated.View
                style={[
                  cardAnimatedStyle,
                  {
                    width: 280,
                    borderRadius: 24,
                    backgroundColor: "rgba(255, 255, 255, 0.92)",
                    padding: 28,
                    marginBottom: 24,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    elevation: 8,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.6)",
                    alignItems: "center",
                  },
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#4CAF50",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 24, color: "white", fontWeight: "bold" }}>{"\u2713"}</Text>
                </View>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#2D3748", marginBottom: 4 }}>
                  Практика завершена
                </Text>
                <Text style={{ fontSize: 17, color: "#2D3748", marginBottom: 20 }}>
                  Как прошла практика?
                </Text>
                <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
                  {[
                    { emoji: "\ud83d\ude14", rating: "bad" },
                    { emoji: "\ud83d\ude10", rating: "neutral" },
                    { emoji: "\ud83d\ude0a", rating: "good" },
                  ].map((item) => (
                    <Pressable
                      key={item.rating}
                      onPress={() => handleEmojiSelect(item.rating)}
                      style={({ pressed }) => ({
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        backgroundColor:
                          selectedEmoji === item.rating ? "#4A90E2" : "rgba(240, 240, 240, 0.9)",
                        justifyContent: "center",
                        alignItems: "center",
                        transform: [{ scale: pressed ? 0.9 : selectedEmoji === item.rating ? 1.15 : 1 }],
                      })}
                    >
                      <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={handleSkip}>
                  <Text style={{ fontSize: 14, color: "#A0AEC0", textDecorationLine: "underline" }}>
                    Пропустить
                  </Text>
                </Pressable>
              </Animated.View>
            )}

            {feedbackState === "thankyou" && (
              <Animated.View
                style={[
                  cardAnimatedStyle,
                  {
                    width: 280,
                    borderRadius: 24,
                    backgroundColor: "rgba(255, 255, 255, 0.92)",
                    padding: 40,
                    marginBottom: 24,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.1,
                    shadowRadius: 20,
                    elevation: 8,
                    alignItems: "center",
                  },
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#4CAF50",
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ fontSize: 24, color: "white", fontWeight: "bold" }}>{"\u2713"}</Text>
                </View>
                <Text style={{ fontSize: 20, fontWeight: "600", color: "#4CAF50" }}>
                  Спасибо!
                </Text>
              </Animated.View>
            )}

            {feedbackState === "normal" && (
              <Animated.View style={buttonAnimatedStyle}>
                <Pressable
                  onPress={handleStart}
                  style={({ pressed }) => ({
                    width: 220,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: pressed ? "#3A7BD5" : "#4A90E2",
                    justifyContent: "center",
                    alignItems: "center",
                    shadowColor: "#4A90E2",
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
                      color: "#FFFFFF",
                      letterSpacing: 0.3,
                    }}
                  >
                    Начать
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
