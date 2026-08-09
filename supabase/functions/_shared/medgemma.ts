/**
 * Single source of truth for the MedGemma model used across all AI edge functions.
 * Bump MEDGEMMA_MODEL here when a newer MedGemma release ships — every function follows.
 */
export const MEDGEMMA_MODEL = "google/medgemma-1.5-4b-it";

/** Short label returned to clients in API responses. */
export const MEDGEMMA_MODEL_LABEL = MEDGEMMA_MODEL.split("/")[1];

/** HuggingFace inference endpoint for the current MedGemma model. */
export const MEDGEMMA_ENDPOINT =
  `https://api-inference.huggingface.co/models/${MEDGEMMA_MODEL}`;
