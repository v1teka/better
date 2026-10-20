import Markdown from "react-native-markdown-display";
import { StyleSheet } from "react-native";

import { PALETTES, type Palette } from "@/constants/palette";
import { useScheme } from "@/lib/theme-setting";

interface MarkdownTextProps {
  children: string;
}

/**
 * MarkdownText — renders Markdown-formatted text using react-native-markdown-display.
 * Styled to match the app's design system (palette text color, 15px body text).
 * The `body` wrapper has no extra margin so cards don't get unwanted bottom padding.
 */
export function MarkdownText({ children }: MarkdownTextProps) {
  return (
    <Markdown style={MARKDOWN_STYLES[useScheme()]}>{children}</Markdown>
  );
}

const makeMarkdownStyles = (palette: Palette) => StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: palette.text,
    fontFamily: undefined,
    // No margin on the body wrapper — cards provide their own padding
    margin: 0,
    padding: 0,
  },
  paragraph: {
    marginTop: 0,
    // Last paragraph inside a card would add unwanted space; keep it tight
    marginBottom: 0,
    fontSize: 15,
    lineHeight: 24,
    color: palette.text,
  },
  strong: {
    fontWeight: "700",
    color: palette.text,
  },
  em: {
    fontStyle: "italic",
    color: palette.text,
  },
  bullet_list: {
    marginBottom: 4,
  },
  ordered_list: {
    marginBottom: 4,
  },
  list_item: {
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bullet_list_icon: {
    marginTop: 6,
    marginRight: 6,
    color: palette.accent,
    fontSize: 14,
    lineHeight: 20,
  },
  ordered_list_icon: {
    marginRight: 6,
    color: palette.accent,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
  },
  heading1: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 8,
    marginTop: 4,
  },
  heading2: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 6,
    marginTop: 4,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 4,
    marginTop: 4,
  },
  code_inline: {
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    color: palette.accent,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 14,
  },
  fence: {
    backgroundColor: "rgba(74, 144, 226, 0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: palette.accent,
    paddingLeft: 12,
    marginLeft: 0,
    opacity: 0.85,
  },
  hr: {
    backgroundColor: palette.rule,
    height: 1,
    marginVertical: 8,
  },
} as any);

const MARKDOWN_STYLES = {
  light: makeMarkdownStyles(PALETTES.light),
  dark: makeMarkdownStyles(PALETTES.dark),
};
