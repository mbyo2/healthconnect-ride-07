/**
 * Provider display helpers — one honorific rule everywhere so nurses,
 * midwives, therapists and technologists are never mis-titled "Dr.".
 */

const DOCTOR_ROLES = new Set([
  'doctor',
  'specialist',
  'dentist',
  'medical_licentiate',
  'radiologist',
  'pathologist',
  'health_personnel',
]);

/** "Dr. " for doctoral cadres, "" otherwise. */
export function providerHonorific(role?: string | null): string {
  return role && DOCTOR_ROLES.has(role.toLowerCase()) ? 'Dr. ' : '';
}

// Some profiles were registered with the honorific typed into the name
// itself (e.g. first_name "Dr. Wave"). Composing "Dr. " + that name
// renders "Dr. Dr. Wave Test" in the directory — strip a leading title
// from the stored name before the honorific is prepended. Display only;
// stored data is never changed.
const LEADING_TITLE = /^(?:dr\.?|doctor)\s+/i;

export function stripLeadingTitle(name: string): string {
  let out = name.trim();
  while (LEADING_TITLE.test(out)) out = out.replace(LEADING_TITLE, '').trim();
  return out;
}

export function providerDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
}): string {
  const name = stripLeadingTitle(`${profile.first_name || ''} ${profile.last_name || ''}`);
  if (!name) return 'Healthcare Provider';
  return `${providerHonorific(profile.role)}${name}`;
}
