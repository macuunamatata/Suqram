import { handlers } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export const runtime = 'edge';

const authDisabled = process.env.DISABLE_AUTH_ROUTES === "1";

async function notFound() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function GET(req: NextRequest) {
  if (authDisabled) return notFound();
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  if (authDisabled) return notFound();
  return handlers.POST(req);
}
