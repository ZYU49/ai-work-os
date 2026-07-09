import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  isBasicAuthAuthorized,
  verifyAuthSessionToken,
} from "@/lib/auth/basic-auth";

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname === "/api/auth/login";
}

function loginRedirect(request: NextRequest) {
  const url = new URL("/login", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.searchParams.set("next", nextPath);

  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const config = {
    username: process.env.APP_ACCESS_USERNAME || "allen",
    password: process.env.APP_ACCESS_PASSWORD,
  };
  const basicAuthIsAuthorized = isBasicAuthAuthorized(
    request.headers.get("authorization"),
    config,
  );
  const cookieIsAuthorized = await verifyAuthSessionToken(
    request.cookies.get(AUTH_SESSION_COOKIE)?.value,
    config,
  );

  if (basicAuthIsAuthorized || cookieIsAuthorized) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  return loginRedirect(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
