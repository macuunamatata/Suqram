import type { Metadata } from "next";
import StartPageContent from "./StartPageContent";

export const metadata: Metadata = {
  title: "Create your site — Suqram",
  description: "Create your first site and get a protected link format for Supabase. No API key required.",
};

/** Static default so /start prerenders; client reads ?next= from URL. */
export default function StartPage() {
  return <StartPageContent defaultNext="/app" />;
}
