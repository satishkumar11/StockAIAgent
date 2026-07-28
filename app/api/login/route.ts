import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  timingSafeEqual,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const secret = process.env.SITE_PASSWORD;
  if (!secret) {
    return NextResponse.json({ error: "SITE_PASSWORD is not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const password = formData.get("password");

  if (typeof password !== "string" || !(await timingSafeEqual(password, secret))) {
    const loginUrl = new URL("/login?error=1", request.url);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  const token = await createSessionToken(secret);
  const response = NextResponse.redirect(new URL("/", request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
