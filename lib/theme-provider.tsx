import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors } from "@/constants/theme";

// Every screen is designed for a light background (gradients, dark text),
// so the app stays light even when the system is in dark mode.
const SCHEME = "light";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    nativewindColorScheme.set(SCHEME);
  }, []);

  const themeVariables = useMemo(() => {
    const palette = SchemeColors[SCHEME];
    return vars({
      "color-primary": palette.primary,
      "color-background": palette.background,
      "color-surface": palette.surface,
      "color-foreground": palette.foreground,
      "color-muted": palette.muted,
      "color-border": palette.border,
      "color-success": palette.success,
      "color-warning": palette.warning,
      "color-error": palette.error,
    });
  }, []);

  return <View style={[{ flex: 1 }, themeVariables]}>{children}</View>;
}
