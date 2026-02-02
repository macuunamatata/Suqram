import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

export async function HeaderAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--muted)]" title={user.email}>
          {user.email}
        </span>
        <form action={signOut} className="inline">
          <button
            type="submit"
            className="site-header__link site-header__link--log"
          >
            Sign out
          </button>
        </form>
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
