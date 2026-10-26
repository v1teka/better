import { Easing } from "react-native-reanimated";

/** Unfolding a hint or a spoiler: a little slow, so the eye follows what opens */
export const UNFOLD = { duration: 360, easing: Easing.out(Easing.cubic) };
/** Folding it back: quicker, it's done */
export const FOLD = { duration: 180, easing: Easing.in(Easing.cubic) };
