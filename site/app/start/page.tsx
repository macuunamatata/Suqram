import type { Metadata } from "next";
import StartPageContent from "./StartPageContent";

export const metadata: Metadata = {
  title: "Integrate — Auth Link Rail",
  description: "Generate protected links and paste into Supabase. Run the inbox test first.",
};

/** Static default so /start prerenders; client reads ?next= from URL. */
export default function StartPage() {
  return <StartPageContent defaultNext="/app" />;
}
