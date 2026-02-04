"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { User } from "@supabase/supabase-js";

export function HeaderAuthClient() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    syncSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      syncSession();
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--muted)]" title={user.email ?? undefined}>
          {user.email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="site-header__link site-header__link--log"
        >
          Sign out
        </button>
        <Button asChild size="sm" className="site-btn site-btn--primary">
          <Link href="/app">Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Link href="/login" className="site-header__link site-header__link--log">
        Log in
      </Link>
      <Button asChild size="sm" className="site-btn site-btn--primary">
        <Link href="/login">Get started</Link>
      </Button>
    </>
  );
}
