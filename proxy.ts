import { NextResponse, type NextRequest } from "next/server";
import {
  buildBasicAuthChallenge,
  isBasicAuthAuthorized,
} from "@/lib/auth/basic-auth";

const AUTH_REALM = "AI Work OS";

export function proxy(request: NextRequest) {
  const isAuthorized = isBasicAuthAuthorized(
    request.headers.get("authorization"),
    {
      username: process.env.APP_ACCESS_USERNAME || "allen",
      password: process.env.APP_ACCESS_PASSWORD,
    },
  );

  if (isAuthorized) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": buildBasicAuthChallenge(AUTH_REALM),
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
