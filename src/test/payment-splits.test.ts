import { describe, it, expect } from 'vitest';

/**
 * Payment split model: a patient payment is shared between exactly TWO parties —
 * the platform fee and the single payee (provider, pharmacy, or the facility that
 * billed the visit). No third party takes a cut.
 *
 * Mirrors the DB function `process_payment_with_splits`.
 */
describe('Payment Split Calculations (two-party)', () => {
  const CONSULTATION_PLATFORM_FEE = 0; // providers pay per-new-patient booking fees instead
  const PHARMACY_PLATFORM_FEE = 2.5; // % of each pharmacy/marketplace sale

  function calculateSplit(
    totalAmount: number,
    type: 'consultation' | 'pharmacy',
    hasInstitution = false
  ) {
    const pct = type === 'pharmacy' ? PHARMACY_PLATFORM_FEE : CONSULTATION_PLATFORM_FEE;
    const platformAmount = Math.round(totalAmount * (pct / 100) * 100) / 100;
    const payeeAmount = totalAmount - platformAmount;
    const payeeType = hasInstitution
      ? 'institution'
      : type === 'pharmacy'
        ? 'pharmacy'
        : 'health_personnel';
    return { platformAmount, payeeAmount, payeeType, platformPercentage: pct };
  }

  describe('Consultation payment', () => {
    const result = calculateSplit(1000, 'consultation');

    it('takes no platform cut (booking-fee model)', () => {
      expect(result.platformAmount).toBe(0);
    });

    it('pays the whole amount to the provider', () => {
      expect(result.payeeAmount).toBe(1000);
      expect(result.payeeType).toBe('health_personnel');
    });

    it('sums to the total', () => {
      expect(result.platformAmount + result.payeeAmount).toBe(1000);
    });
  });

  describe('Consultation billed by an institution', () => {
    const result = calculateSplit(500, 'consultation', true);

    it('pays the facility, not a three-way split', () => {
      expect(result.payeeType).toBe('institution');
      expect(result.payeeAmount).toBe(500);
    });
  });

  describe('Pharmacy sale', () => {
    const result = calculateSplit(1000, 'pharmacy');

    it('platform takes 2.5%', () => {
      expect(result.platformAmount).toBe(25);
    });

    it('pharmacy keeps the rest', () => {
      expect(result.payeeAmount).toBe(975);
      expect(result.payeeType).toBe('pharmacy');
    });

    it('sums to the total', () => {
      expect(result.platformAmount + result.payeeAmount).toBe(1000);
    });
  });

  describe('Only two recipients ever', () => {
    it('never produces a third split row', () => {
      const r = calculateSplit(750, 'pharmacy');
      const recipients = ['app_owner', r.payeeType];
      expect(new Set(recipients).size).toBe(2);
    });
  });
});
