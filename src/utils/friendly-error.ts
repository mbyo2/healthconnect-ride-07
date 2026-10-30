/**
 * friendlyErrorMessage — turn raw backend/SDK errors into crafted,
 * plain-language copy before anything reaches a toast or banner.
 *
 * Standing rule (CEO, 2026-10-22): the app must NEVER show a raw
 * browser-style/system response — failures are presented in the app's own
 * words, saying what happened and what to do next. Supabase Auth and
 * PostgREST messages ("Invalid login credentials", "new row violates
 * row-level security policy…", PGRST codes, JWT text) are system
 * responses, so they are mapped here; anything unrecognised that still
 * looks technical falls back to the caller's crafted fallback instead of
 * leaking through.
 */

const MAPPINGS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /invalid login credentials|invalid_credentials/i,
    message:
      "That email and password don't match. Check them and try again — or reset your password if you've forgotten it.",
  },
  {
    pattern: /email not confirmed|email_not_confirmed/i,
    message:
      "Please confirm your email first — check your inbox for the confirmation link, then sign in.",
  },
  {
    pattern: /user already registered|already been registered|user_already_exists/i,
    message: "An account with this email already exists. Try signing in instead.",
  },
  {
    pattern: /token.*expired|expired.*token|jwt expired|invalid[ _]token|refresh[ _]token|session[ _]not[ _]found/i,
    message: "Your session has expired. Please sign in again to continue.",
  },
  {
    pattern: /rate[ _]limit|too many requests|over_request_rate_limit|over_email_send_rate_limit/i,
    message: "Too many attempts in a short time. Please wait a moment and try again.",
  },
  {
    pattern: /failed to fetch|network|load failed|connection|offline|ERR_NETWORK|NetworkError|net::ERR/i,
    message:
      "We couldn't reach the server. Check your internet connection and try again.",
  },
  {
    pattern: /row-level security|permission denied|not authorized|42501/i,
    message:
      "You don't have permission to do that. If you believe you should, ask your administrator to check your access.",
  },
  {
    pattern: /duplicate key|unique constraint|23505/i,
    message:
      "That already exists — it looks like it was already saved. Refresh the page and check before trying again.",
  },
  {
    pattern: /otp[ _]expired|token has expired or is invalid|code.*(expired|invalid)/i,
    message: "That code has expired or isn't valid. Request a new one and try again.",
  },
  {
    pattern: /same[ _]password|new password.*different/i,
    message: "Your new password must be different from your current password.",
  },
  {
    pattern: /failed to send a request|FunctionsFetchError|FunctionsHttpError|non-2xx|edge function returned/i,
    message:
      "That action couldn't be completed on the server. Please try again in a moment.",
  },
  {
    pattern: /aborterror|timed out|timeout|statement timeout/i,
    message: "That took too long to complete. Check your connection and try again.",
  },
  {
    pattern: /payload too large|request entity too large|file.*too large/i,
    message: "That file is too large. Choose a smaller file and try again.",
  },
  {
    pattern: /mime type.*not supported|invalid mime|file type.*not (supported|allowed)/i,
    message: "That file type isn't supported. Choose a different file and try again.",
  },
  {
    pattern: /resource was not found|object not found|storage.*not found/i,
    message:
      "That file could not be found. It may have been removed — refresh the page and try again.",
  },
  {
    pattern: /password.*(at least|weak|short|strength)|weak_password/i,
    message: "Please choose a stronger password — at least 6 characters.",
  },
  {
    pattern: /invalid email|email address.*invalid|validate email/i,
    message: "That email address doesn't look right. Check it and try again.",
  },
];

/** Heuristics for "this is a system message, not crafted copy". */
const TECHNICAL_PATTERN =
  /PGRST\d+|PostgREST|row-level security|violates .*constraint|duplicate key|JWT|postgres|supabase|TypeError|ReferenceError|SyntaxError|undefined is not|null value in column|permission denied|relation .* does not exist|schema cache|could not find the table|JSON object requested|multiple \(or no\) rows|invalid input syntax|column .* does not exist|function .* does not exist|value too long|invalid input value for enum|\{"?\s*"?code"?\s*:|stack trace/i;

function rawMessageOf(error: unknown): string {
  if (error instanceof Error) return error.message || "";
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const m = (error as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

/**
 * Returns a user-safe message for `error`, or `fallback` when the raw
 * error is technical/unrecognised. Short, plain, non-technical messages
 * (often crafted upstream, e.g. edge-function responses) pass through.
 */
export function friendlyErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw = rawMessageOf(error).trim();
  if (!raw) return fallback;

  // Serialised error objects (PostgREST/GoTrue JSON bodies) are system
  // payloads — never mine them for copy; collapse straight to fallback.
  if (/^\s*\{/.test(raw) || raw.includes('"code":') || /PGRST\d+/.test(raw)) {
    return fallback;
  }

  for (const { pattern, message } of MAPPINGS) {
    if (pattern.test(raw)) return message;
  }

  if (TECHNICAL_PATTERN.test(raw)) return fallback;
  // Long or JSON-ish blobs are never crafted copy.
  if (raw.length > 160 || raw.includes("{") || raw.includes("}") || raw.includes("\\n")) {
    return fallback;
  }
  return raw;
}

export default friendlyErrorMessage;
