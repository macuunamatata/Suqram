import { createClient } from "@/lib/supabase/server";
import { DashboardProvider } from "./DashboardContext";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <DashboardProvider user={user}>{children}</DashboardProvider>;
}
