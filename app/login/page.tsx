import { LoginForm } from "./LoginForm";

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_invalid_request: "That Google sign-in link expired. Please try again.",
  google_state_mismatch: "That Google sign-in link expired. Please try again.",
  google_exchange_failed: "Couldn't complete Google sign-in. Please try again.",
  google_email_unverified: "Your Google account's email isn't verified.",
  google_not_registered:
    "This Google account isn't registered. Ask an admin to add you first.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const nextParam = searchParams.next;
  const next = typeof nextParam === "string" ? nextParam : "/";
  const errorParam = searchParams.error;
  const googleError =
    typeof errorParam === "string" ? GOOGLE_ERROR_MESSAGES[errorParam] : undefined;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            SIU Exam Seat Allocation
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in to continue
          </p>
        </div>

        {googleError && (
          <p
            role="alert"
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {googleError}
          </p>
        )}

        <a
          href={`/login/google?next=${encodeURIComponent(next)}`}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-base font-medium text-slate-700 shadow-sm active:scale-[0.99]"
        >
          <GoogleLogo />
          Continue with Google
        </a>

        <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <LoginForm next={next} />
      </div>
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
