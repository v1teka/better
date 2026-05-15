import Markdown from "react-native-markdown-display";
import { StyleSheet } from "react-native";

interface MarkdownTextProps {
  children: string;
}

/**
 * MarkdownText — renders Markdown-formatted text using react-native-markdown-display.
 * Styled to match the app's design system (color #2D3748, 15px body text).
 * The `body` wrapper has no extra margin so cards don't get unwanted bottom padding.
 */
export function MarkdownText({ children }: MarkdownTextProps) {
  return (
    <Markdown style={markdownStyles}>{children}</Markdown>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: "#2D3748",
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
    color: "#2D3748",
  },
  strong: {
    fontWeight: "700",
    color: "#2D3748",
  },
  em: {
    fontStyle: "italic",
    color: "#2D3748",
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
    color: "#4A90E2",
    fontSize: 14,
    lineHeight: 20,
  },
  ordered_list_icon: {
    marginRight: 6,
    color: "#4A90E2",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "600",
  },
  heading1: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 8,
    marginTop: 4,
  },
  heading2: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 6,
    marginTop: 4,
  },
  heading3: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2D3748",
    marginBottom: 4,
    marginTop: 4,
  },
  code_inline: {
    backgroundColor: "rgba(74, 144, 226, 0.1)",
    color: "#4A90E2",
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
    borderLeftColor: "#4A90E2",
    paddingLeft: 12,
    marginLeft: 0,
    opacity: 0.85,
  },
  hr: {
    backgroundColor: "rgba(45, 55, 72, 0.15)",
    height: 1,
    marginVertical: 8,
  },
} as any);
