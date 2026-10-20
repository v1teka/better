import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_DONE_KEY = "onboardingDone";

export async function isOnboardingDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_DONE_KEY)) === "true";
  } catch {
    // Without storage, don't trap the person in onboarding
    return true;
  }
}

export async function markOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "true");
  } catch {}
}
