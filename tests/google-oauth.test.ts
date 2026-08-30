import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it, before } from "node:test";
import {
  generatePkceParams,
  buildGoogleAuthorizationUrl,
} from "../lib/google-oauth";

describe("google oauth helpers", () => {
  before(() => {
    // buildGoogleAuthorizationUrl reads this; not a real credential.
    process.env.GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";
  });

  it("generates a state and a PKCE verifier/challenge pair that match", () => {
    const { state, codeVerifier, codeChallenge } = generatePkceParams();

    assert.ok(state.length >= 32);
    assert.ok(codeVerifier.length >= 32);
    const expectedChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    assert.equal(codeChallenge, expectedChallenge);
  });

  it("generates a fresh state/verifier on every call", () => {
    const a = generatePkceParams();
    const b = generatePkceParams();
    assert.notEqual(a.state, b.state);
    assert.notEqual(a.codeVerifier, b.codeVerifier);
  });

  it("builds a Google authorization URL with the required OIDC params", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        redirectUri: "https://example.com/login/google/callback",
        state: "the-state",
        codeChallenge: "the-challenge",
      }),
    );

    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(url.searchParams.get("client_id"), "test-client-id.apps.googleusercontent.com");
    assert.equal(
      url.searchParams.get("redirect_uri"),
      "https://example.com/login/google/callback",
    );
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(url.searchParams.get("scope"), "openid email profile");
    assert.equal(url.searchParams.get("state"), "the-state");
    assert.equal(url.searchParams.get("code_challenge"), "the-challenge");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  });
});
