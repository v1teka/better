import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "@/lib/_core/nativewind-pressable";
import { ThemeProvider } from "@/lib/theme-provider";
import { usePalette } from "@/lib/theme-setting";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

export const unstable_settings = {
  anchor: "index",
};

export default function RootLayout() {
  const palette = usePalette();

  return (
    <ThemeProvider>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* Default to hiding native headers so raw route segments don't appear */}
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.screen } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            <Stack.Screen name="home" />
            <Stack.Screen name="survey" />
            <Stack.Screen name="recommendation" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="series-break" />
          </Stack>
          <StatusBar style={palette.statusBar} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
