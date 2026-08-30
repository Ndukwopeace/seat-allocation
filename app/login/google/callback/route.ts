import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { exchangeCodeForGoogleIdentity, GoogleOAuthError } from "@/lib/google-oauth";
import { safeNextPath } from "@/lib/safe-redirect";

const FLOW_COOKIE = "google_oauth_flow";

function loginError(request: NextRequest, code: string) {
  const url = new URL("/login", request.nextUrl.origin);
  url.searchParams.set("error", code);
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: FLOW_COOKIE, path: "/login/google" });
  return response;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  // The user cancelled at Google's consent screen, or Google reported an
  // error — not a bug on our end.
  if (params.get("error")) {
    return loginError(request, "google_cancelled");
  }

  const code = params.get("code");
  const returnedState = params.get("state");
  const flowCookie = request.cookies.get(FLOW_COOKIE)?.value;

  if (!code || !returnedState || !flowCookie) {
    return loginError(request, "google_invalid_request");
  }

  let flow: { state: string; codeVerifier: string; next: string };
  try {
    flow = JSON.parse(flowCookie);
  } catch {
    return loginError(request, "google_invalid_request");
  }

  // Constant-time-ish comparison isn't essential here — state is single-use
  // and expires in 10 minutes, not a long-lived secret — but an exact match
  // is required to block CSRF (someone starting a flow for the victim and
  // tricking them into completing it).
  if (returnedState !== flow.state) {
    return loginError(request, "google_state_mismatch");
  }

  const redirectUri = new URL("/login/google/callback", request.nextUrl.origin).toString();

  let identity;
  try {
    identity = await exchangeCodeForGoogleIdentity({
      code,
      codeVerifier: flow.codeVerifier,
      redirectUri,
    });
  } catch (err) {
    if (err instanceof GoogleOAuthError) {
      return loginError(request, "google_exchange_failed");
    }
    throw err;
  }

  if (!identity.emailVerified) {
    return loginError(request, "google_email_unverified");
  }

  const email = identity.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // No self-serve signup: only emails an admin has already added can sign
  // in, even though Google itself authenticated this person just fine.
  if (!user) {
    return loginError(request, "google_not_registered");
  }

  await createSession({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.redirect(
    new URL(safeNextPath(flow.next), request.nextUrl.origin),
  );
  response.cookies.delete({ name: FLOW_COOKIE, path: "/login/google" });
  return response;
}
