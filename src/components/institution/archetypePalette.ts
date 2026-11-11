/**
 * Institution identity colour.
 *
 * This file previously held an 11-colour per-archetype rainbow (sky,
 * violet, purple, red, green, teal, orange…) consumed by the
 * InstitutionDashboard identity chip and chart series. Colour
 * discipline (2026-11-11 interior rebuild): the interior reserves
 * colour for status + ONE brand accent, so every archetype now maps
 * to the single Signal Blue accent. The map shape is kept so callers
 * don't change; the values are deliberately uniform.
 */
export const archetypePalette: Record<string, string> = {
  solo_practice: "#397dff",
  pharmacy: "#397dff",
  wholesale_pharmacy: "#397dff",
  diagnostics: "#397dff",
  general_hospital: "#397dff",
  clinic: "#397dff",
  specialty_hospital: "#397dff",
  long_term_care: "#397dff",
  dialysis_centre: "#397dff",
  dental_clinic: "#397dff",
  trauma_centre: "#397dff",
};

export default archetypePalette;
