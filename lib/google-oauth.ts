// No "server-only" marker: needs to be importable from tests (same
// reasoning as lib/allocation.ts) — it only touches node:crypto, fetch and
// jose, nothing Next-specific.

import { randomBytes, createHash } from "node:crypto";
import { jwtVerify, createRemoteJWKSet } from "jose";

// A minimal, hand-rolled Google OpenID Connect client (Authorization Code +
// PKCE). Google's flow is simple and stable enough not to need a library —
// arctic (the usual pick for exactly this) was deprecated by its maintainer
// in July 2026, who now recommends copying the flow directly instead of
// depending on it. This uses jose (already a project dependency, already
// trusted for our own session JWTs) to verify Google's signed ID token.

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Google's JWKS is fetched (and cached) lazily on first verification.
const googleJWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

function base64url(input: Buffer): string {
  return input.toString("base64url");
}

export type PkceParams = {
  state: string;
  codeVerifier: string;
  codeChallenge: string;
};

/** Generates a fresh CSRF state and PKCE verifier/challenge pair. */
export function generatePkceParams(): PkceParams {
  const state = base64url(randomBytes(32));
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(
    createHash("sha256").update(codeVerifier).digest(),
  );
  return { state, codeVerifier, codeChallenge };
}

/** Builds the URL to send the user to at Google. */
export function buildGoogleAuthorizationUrl(params: {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", requireEnv("GOOGLE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export class GoogleOAuthError extends Error {}

export type GoogleIdentity = {
  email: string;
  emailVerified: boolean;
  name: string;
};

/**
 * Exchanges an authorization code for tokens, then verifies the returned ID
 * token's signature against Google's published keys (and its issuer /
 * audience / expiry) rather than trusting an unauthenticated userinfo call —
 * this is the correct way to get a verified identity out of an OIDC flow.
 */
export async function exchangeCodeForGoogleIdentity(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleIdentity> {
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
      code_verifier: params.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    throw new GoogleOAuthError(
      `Google token exchange failed: ${tokenResponse.status} ${await tokenResponse.text()}`,
    );
  }

  const tokens = (await tokenResponse.json()) as { id_token?: string };
  if (!tokens.id_token) {
    throw new GoogleOAuthError("Google token response had no id_token");
  }

  const { payload } = await jwtVerify(tokens.id_token, googleJWKS, {
    issuer: ISSUERS,
    audience: requireEnv("GOOGLE_CLIENT_ID"),
  });

  const email = payload.email;
  if (typeof email !== "string") {
    throw new GoogleOAuthError("Google ID token had no email claim");
  }

  return {
    email,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : email,
  };
}
