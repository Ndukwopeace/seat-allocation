// Shared between the password login action and the Google OAuth callback.
// Only allow same-site relative redirects, never an absolute/external URL —
// otherwise a crafted `next` param could send a just-authenticated user
// straight to an attacker's site (open redirect).
export function safeNextPath(next: string | null | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/sessions";
}
