import { useEffect, useId } from "react";
import type { ViewStyle } from "react-native";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

const RAYS = 12;

/** A ray as a narrow wedge: base on the inner circle, tip outside */
function rayPath(c: number, inner: number, outer: number, halfWidth: number, angle: number): string {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const bx = c + inner * cos;
  const by = c + inner * sin;
  const px = -sin * halfWidth;
  const py = cos * halfWidth;
  const tx = c + outer * cos;
  const ty = c + outer * sin;
  return (
    `M${(bx + px).toFixed(2)} ${(by + py).toFixed(2)} ` +
    `L${tx.toFixed(2)} ${ty.toFixed(2)} ` +
    `L${(bx - px).toFixed(2)} ${(by - py).toFixed(2)} Z`
  );
}

/**
 * Sun rays with a glow, around the positive rating: they turn slowly and breathe while
 * waiting; `bloom` (0 → 1) opens them wider and brighter when the rating is chosen.
 * Centered on its own square of `size`; place it absolutely around the button.
 */
export function Sunburst({
  size,
  color,
  bloom,
  style,
}: {
  size: number;
  color: string;
  bloom?: SharedValue<number>;
  style?: ViewStyle;
}) {
  const reduceMotion = useReducedMotion();
  // Gradient ids must be unique per instance: on the web url(#id) looks through the whole page
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const glowId = `sunburst-glow-${uid}`;
  const raysId = `sunburst-rays-${uid}`;
  const spin = useSharedValue(0);
  const breath = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(withTiming(1, { duration: 40000, easing: Easing.linear }), -1, false);
    breath.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => {
    const b = bloom ? bloom.value : 0;
    return {
      // Kept soft: a hint of warmth around the button, not a spotlight
      opacity: 0.2 + breath.value * 0.08 + b * 0.22,
      transform: [
        { rotate: `${spin.value * 360}deg` },
        { scale: 0.92 + breath.value * 0.08 + b * 0.3 },
      ],
    };
  });

  const c = size / 2;
  const inner = size * 0.26;
  const long = size * 0.48;
  const short = size * 0.39;

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: size, height: size }, style, animatedStyle]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={glowId} cx={c} cy={c} r={c} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="0.45" stopColor={color} stopOpacity={0.22} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={raysId} cx={c} cy={c} r={long} gradientUnits="userSpaceOnUse">
            <Stop offset={inner / long} stopColor={color} stopOpacity={0.95} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={c} cy={c} r={c} fill={`url(#${glowId})`} />
        {Array.from({ length: RAYS }, (_, i) => (
          <Path
            key={i}
            d={rayPath(c, inner, i % 2 === 0 ? long : short, size * 0.028, (i / RAYS) * Math.PI * 2)}
            fill={`url(#${raysId})`}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}
