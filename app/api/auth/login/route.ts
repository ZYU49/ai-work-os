import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  createAuthSessionToken,
} from "@/lib/auth/basic-auth";

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function loginUrl(request: Request, nextPath: string, hasError = false) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", nextPath);

  if (hasError) {
    url.searchParams.set("error", "1");
  }

  return url;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");
  const nextPath = safeNextPath(formData.get("next"));
  const configuredUsername = process.env.APP_ACCESS_USERNAME || "allen";
  const configuredPassword = process.env.APP_ACCESS_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (username !== configuredUsername || password !== configuredPassword) {
    return NextResponse.redirect(loginUrl(request, nextPath, true));
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));
  const token = await createAuthSessionToken({
    username: configuredUsername,
    password: configuredPassword,
  });

  response.cookies.set(AUTH_SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
