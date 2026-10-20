import { useEffect, useMemo } from "react";
import { View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors } from "@/constants/theme";
import { useScheme } from "@/lib/theme-setting";

/**
 * Follows the theme chosen with the logo switch (lib/theme-setting.ts), not the system one.
 * On iOS nativewind passes the choice on to the native UI (alerts, keyboard).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useScheme();

  useEffect(() => {
    nativewindColorScheme.set(scheme);
  }, [scheme]);

  const themeVariables = useMemo(() => {
    const palette = SchemeColors[scheme];
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
  }, [scheme]);

  return <View style={[{ flex: 1 }, themeVariables]}>{children}</View>;
}
