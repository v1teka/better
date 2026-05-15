import { Redirect } from "expo-router";

/**
 * Root index - redirects to Home screen
 */
export default function Index() {
  return <Redirect href="/home" />;
}
