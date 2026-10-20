import { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";

import { isOnboardingDone } from "@/lib/onboarding";
import { themeLoaded, usePalette } from "@/lib/theme-setting";

/**
 * Root index - onboarding on the first launch, Home screen afterwards
 */
export default function Index() {
  const palette = usePalette();
  const [target, setTarget] = useState<"/home" | "/onboarding" | null>(null);

  useEffect(() => {
    // Wait for the saved theme too, so the first screen doesn't flash in the other colors
    Promise.all([isOnboardingDone(), themeLoaded]).then(([done]) =>
      setTarget(done ? "/home" : "/onboarding"),
    );
  }, []);

  if (!target) return <View style={{ flex: 1, backgroundColor: palette.gradient[0] }} />;
  return <Redirect href={target} />;
}
