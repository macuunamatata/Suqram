"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/app";
  if (!email || !password) {
    redirect(`/login?error=missing&next=${encodeURIComponent(redirectTo)}`);
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(redirectTo)}`
    );
  }
  redirect(redirectTo);
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/app";
  if (!email || !password) {
    redirect(`/login?error=missing&next=${encodeURIComponent(redirectTo)}`);
  }
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(redirectTo)}`
    );
  }
  redirect(redirectTo);
}
