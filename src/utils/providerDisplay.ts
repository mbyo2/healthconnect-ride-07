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

export function providerDisplayName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  role?: string | null;
}): string {
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  if (!name) return 'Healthcare Provider';
  return `${providerHonorific(profile.role)}${name}`;
}
