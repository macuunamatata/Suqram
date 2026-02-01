import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const path = req.nextUrl.pathname;
  const isApp = path === "/app" || path.startsWith("/app/");
  const isStart = path === "/start";
  const modeSignin = req.nextUrl.searchParams.get("mode") === "signin";

  if (isApp && !req.auth) {
    const returnTo = encodeURIComponent(path + req.nextUrl.search);
    return NextResponse.redirect(new URL(`/login?returnTo=${returnTo}`, req.url));
  }

  if (isStart && !req.auth && !modeSignin) {
    return NextResponse.redirect(new URL("/login?returnTo=%2Fapp", req.url));
  }

  if (isStart && req.auth) {
    return NextResponse.redirect(new URL("/app", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/app", "/app/:path*", "/start", "/login"],
};
