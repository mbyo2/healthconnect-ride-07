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
  solo_practice: "#0066f5",
  pharmacy: "#0066f5",
  wholesale_pharmacy: "#0066f5",
  diagnostics: "#0066f5",
  general_hospital: "#0066f5",
  clinic: "#0066f5",
  specialty_hospital: "#0066f5",
  long_term_care: "#0066f5",
  dialysis_centre: "#0066f5",
  dental_clinic: "#0066f5",
  trauma_centre: "#0066f5",
};

export default archetypePalette;
