import type { Metadata } from "next";
import ApiKeyPageContent from "./ApiKeyPageContent";

export const metadata: Metadata = {
  title: "Sign in with API key — Suqram",
  description: "Advanced: sign in using your API key.",
};

/** Static default so page prerenders; client reads ?next= from URL. */
export default function ApiKeyPage() {
  return <ApiKeyPageContent defaultNext="/app" />;
}
