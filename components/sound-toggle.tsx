import { Platform, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";

import { setSoundOn, useSoundOn } from "@/lib/sound-setting";

/** Speaker button: turns the background sound and the gong on and off */
export function SoundToggle() {
  const soundOn = useSoundOn();

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSoundOn(!soundOn);
      }}
      hitSlop={12}
      accessibilityRole="switch"
      accessibilityState={{ checked: soundOn }}
      accessibilityLabel="Звук"
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons
        name={soundOn ? "volume-high-outline" : "volume-mute-outline"}
        size={22}
        color="#4A90E2"
      />
    </Pressable>
  );
}
