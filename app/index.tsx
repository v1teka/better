import { useEffect, useState } from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";

import { isOnboardingDone } from "@/lib/onboarding";

/**
 * Root index - onboarding on the first launch, Home screen afterwards
 */
export default function Index() {
  const [target, setTarget] = useState<"/home" | "/onboarding" | null>(null);

  useEffect(() => {
    isOnboardingDone().then((done) => setTarget(done ? "/home" : "/onboarding"));
  }, []);

  if (!target) return <View style={{ flex: 1, backgroundColor: "#FFE5D9" }} />;
  return <Redirect href={target} />;
}
