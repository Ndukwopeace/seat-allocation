import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { generatePkceParams, buildGoogleAuthorizationUrl } from "@/lib/google-oauth";
import { safeNextPath } from "@/lib/safe-redirect";

const FLOW_COOKIE = "google_oauth_flow";

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  const { state, codeVerifier, codeChallenge } = generatePkceParams();
  const redirectUri = new URL("/login/google/callback", request.nextUrl.origin).toString();

  const authUrl = buildGoogleAuthorizationUrl({ redirectUri, state, codeChallenge });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    FLOW_COOKIE,
    JSON.stringify({ state, codeVerifier, next }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/login/google",
      maxAge: 600, // 10 minutes — plenty for the Google redirect round trip
    },
  );
  return response;
}
