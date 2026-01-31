import type { Metadata } from "next";
import StartPageContent from "./StartPageContent";

export const metadata: Metadata = {
  title: "Create your site — Suqram",
  description: "Enter your access token to continue to the dashboard.",
};

/** Static default so /start prerenders; client reads ?next= from URL. */
export default function StartPage() {
  return <StartPageContent defaultNext="/app" />;
}
