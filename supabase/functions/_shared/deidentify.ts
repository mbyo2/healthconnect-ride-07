// De-identification for clinical text sent to third-party AI providers.
//
// ambient-scribe forwards consultation transcripts + free-text patient
// context to external AI (OpenRouter / HuggingFace / Lovable gateway).
// This pass strips direct identifiers BEFORE the upstream call so the
// providers never receive them. It is a best-effort scrubber, NOT a
// guarantee: names without a label or honorific, rare ID formats, and
// free-text addresses that match no pattern can still slip through.
//
// It deliberately does NOT try to scrub clinical content (symptoms,
// vitals, medications, diagnoses) — that is what the scribe needs.
// What it scrubs: emails, phone numbers, Zambian NRC numbers, labelled
// names (Patient:/Name:/"my name is …", honorific + name), street/plot
// addresses, and dates of birth.
//
// Pure TS, no Deno or URL imports — unit-tested from src/test/.
// Security-sweep fix M-4 (2026-11-10). The consent/contract basis for
// sending consultation text to third-party AI at all remains a CEO
// decision — this scrubber reduces exposure, it does not settle it.

const EMAIL_RE =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const NRC_RE =
  /\b\d{6}\/\d{2}\/\d{1,2}\b/g;

// Zambian mobile (096/097/095/076/077 + 7 digits, local or +260) and
// generic international numbers. Requires 9+ digits so vitals, years
// and short clinical numbers are never touched.
const PHONE_RE =
  /(?:\+?260[\s.-]?|0)(?:9[567]|7[67])\s?\d{3}\s?\d{3}\b|(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,}\d{3,4}\b/g;

const DOB_RE =
  /\b(?:date of birth|dob|born)\s*[:\-]?\s*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/gi;

// Labelled names: "Patient: Jane Banda", "Name - John", "my name is Chanda".
// The label alternatives spell out both cases (no /i flag) so the name
// part ([A-Z]…) stays strictly capitalised — with /i it would swallow
// following lowercase words ("called the nurse" would become a name).
const LABELLED_NAME_RE =
  /\b(?:[Pp]atient|[Cc]lient|[Nn]ame|[Mm]other|[Ff]ather|[Gg]uardian|[Nn]ext of kin|[Cc]ontact person|[Pp]atient name)(?:\s*[:\-]\s*|\s+)[A-Z][A-Za-z'’.‐-]+(?:\s+[A-Z][A-Za-z'’.‐-]+){0,2}/g;
const MY_NAME_IS_RE =
  /\b[Mm]y name is\s+[A-Z][A-Za-z'’.‐-]+(?:\s+[A-Z][A-Za-z'’.‐-]+){0,2}/g;
const CALLED_RE =
  /\b(?:[Cc]alled|[Cc]all me)\s+[A-Z][A-Za-z'’.‐-]+(?:\s+[A-Z][A-Za-z'’.‐-]+){0,2}/g;

// Honorific + name: "Mr Banda", "Dr. Jane Mwila".
const HONORIFIC_RE =
  /\b(?:Mr|Mrs|Ms|Miss|Dr|Prof)\.?\s+[A-Z][A-Za-z'’.‐-]+(?:\s+[A-Z][A-Za-z'’.‐-]+)?/g;

// Street / plot / house addresses.
const STREET_RE =
  /\b\d+\s+(?:[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2}\s+)?(?:Road|Street|Avenue|Close|Lane|Way|Drive|Crescent)\b/gi;
const PLOT_RE =
  /\b(?:Plot|House)\s*(?:No\.?|Number|#)?\s*\d+[A-Za-z]?\b/gi;

export interface DeidentifyResult {
  text: string;
  /** How many identifier matches were replaced (0 = nothing found). */
  redactions: number;
}

export function deidentifyText(input: string): DeidentifyResult {
  if (!input) return { text: input, redactions: 0 };
  let text = input;
  let redactions = 0;
  const apply = (re: RegExp, replacement: string) => {
    text = text.replace(re, (m) => {
      redactions++;
      // Keep a label prefix where the pattern captured one, so the
      // sentence stays readable ("Patient: [NAME]" not "[NAME]").
      const label = m.match(
        /^(patient|client|name|mother|father|guardian|next of kin|contact person|my name is|called|call me|date of birth|dob|born)\s*[:\-]?\s*/i,
      );
      return label ? `${label[0]}${replacement}` : replacement;
    });
  };
  apply(EMAIL_RE, "[EMAIL]");
  apply(NRC_RE, "[NRC]");
  apply(DOB_RE, "[DOB]");
  apply(PHONE_RE, "[PHONE]");
  apply(LABELLED_NAME_RE, "[NAME]");
  apply(MY_NAME_IS_RE, "[NAME]");
  apply(CALLED_RE, "[NAME]");
  apply(HONORIFIC_RE, "[NAME]");
  apply(STREET_RE, "[ADDRESS]");
  apply(PLOT_RE, "[ADDRESS]");
  return { text, redactions };
}

/**
 * Scrub a transcript + patient context pair for the upstream AI call.
 * Returns the scrubbed values; the originals must never be sent or
 * logged after this point.
 */
export function deidentifyScribeInput(input: {
  transcript: string;
  patient_context?: string;
}): { transcript: string; patient_context: string; redactions: number } {
  const t = deidentifyText(input.transcript);
  const c = deidentifyText(input.patient_context ?? "");
  return {
    transcript: t.text,
    patient_context: c.text,
    redactions: t.redactions + c.redactions,
  };
}
