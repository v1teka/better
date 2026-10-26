import { Text, View } from "react-native";

import { usePalette } from "@/lib/theme-setting";

/**
 * «Серия · 2 из 3» with a segment per practice: done ones filled, the current one too,
 * the rest faint.
 */
export function SeriesProgress({ step, total, label }: { step: number; total: number; label?: string }) {
  const palette = usePalette();
  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: palette.muted,
        }}
      >
        {label ?? `Серия · ${step + 1} из ${total}`}
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: total }, (_, i) => (
          <View
            key={i}
            style={{
              width: 28,
              height: 4,
              borderRadius: 2,
              backgroundColor: i <= step ? palette.accent : palette.accent + "33",
            }}
          />
        ))}
      </View>
    </View>
  );
}
