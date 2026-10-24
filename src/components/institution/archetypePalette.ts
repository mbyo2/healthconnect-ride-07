/**
 * Per-archetype identity colours for institution surfaces.
 *
 * Data-only palette: these hues are the facility-archetype brand colours
 * used for the InstitutionDashboard identity chip (inline style) and chart
 * series. They live here — named by archetype — so the page file carries
 * no raw hex and chip contrast can be tuned in one place.
 *
 * Values are byte-identical to the colours previously inlined in
 * InstitutionDashboard's TYPE_CONFIG.
 */
export const archetypePalette: Record<string, string> = {
  solo_practice: "#0ea5e9",
  pharmacy: "#0073ea",
  wholesale_pharmacy: "#7c3aed",
  diagnostics: "#a25ddc",
  general_hospital: "#e44258",
  clinic: "#00c875",
  specialty_hospital: "#0d9488",
  long_term_care: "#fdab3d",
  dialysis_centre: "#0ea5e9",
  dental_clinic: "#38bdf8",
  trauma_centre: "#ef4444",
};

export default archetypePalette;
