import { describe, it, expect } from 'vitest';

/**
 * Unit tests for payment split logic.
 * The actual split is done by the Supabase function `process_payment_with_splits`,
 * but we test the expected commission math here to ensure correctness.
 */
describe('Payment Split Calculations', () => {
  // Default commission settings from the DB
  const APP_COMMISSION = 10; // 10%
  const INSTITUTION_COMMISSION = 20; // 20%
  const PERSONNEL_COMMISSION = 70; // 70%
  const PHARMACY_COMMISSION = 15; // 15% (for pharmacy sales)

  function calculateSplit(totalAmount: number, type: 'consultation' | 'pharmacy', hasInstitution: boolean) {
    const appAmount = totalAmount * (APP_COMMISSION / 100);

    if (type === 'pharmacy') {
      const pharmacyAmount = totalAmount * (PHARMACY_COMMISSION / 100);
      const personnelAmount = totalAmount - pharmacyAmount - appAmount;
      return { appAmount, pharmacyAmount, personnelAmount, institutionAmount: 0 };
    }

    if (hasInstitution) {
      const institutionAmount = totalAmount * (INSTITUTION_COMMISSION / 100);
      const personnelAmount = totalAmount * (PERSONNEL_COMMISSION / 100);
      return { appAmount, institutionAmount, personnelAmount, pharmacyAmount: 0 };
    }

    // Independent provider gets institution share
    const personnelAmount = totalAmount * ((PERSONNEL_COMMISSION + INSTITUTION_COMMISSION) / 100);
    return { appAmount, institutionAmount: 0, personnelAmount, pharmacyAmount: 0 };
  }

  describe('Consultation with institution', () => {
    const result = calculateSplit(1000, 'consultation', true);

    it('app gets 10%', () => {
      expect(result.appAmount).toBe(100);
    });

    it('institution gets 20%', () => {
      expect(result.institutionAmount).toBe(200);
    });

    it('personnel gets 70%', () => {
      expect(result.personnelAmount).toBe(700);
    });

    it('all splits sum to total', () => {
      expect(result.appAmount + result.institutionAmount + result.personnelAmount).toBe(1000);
    });
  });

  describe('Consultation without institution (independent provider)', () => {
    const result = calculateSplit(500, 'consultation', false);

    it('app gets 10%', () => {
      expect(result.appAmount).toBe(50);
    });

    it('institution gets 0', () => {
      expect(result.institutionAmount).toBe(0);
    });

    it('personnel gets 90% (their share + institution share)', () => {
      expect(result.personnelAmount).toBe(450);
    });

    it('all splits sum to total', () => {
      expect(result.appAmount + result.personnelAmount).toBe(500);
    });
  });

  describe('Pharmacy sale', () => {
    const result = calculateSplit(200, 'pharmacy', true);

    it('app gets 10%', () => {
      expect(result.appAmount).toBe(20);
    });

    it('pharmacy gets 15%', () => {
      expect(result.pharmacyAmount).toBe(30);
    });

    it('personnel gets remainder', () => {
      expect(result.personnelAmount).toBe(150);
    });

    it('institution gets 0 for pharmacy sales', () => {
      expect(result.institutionAmount).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('handles zero amount', () => {
      const result = calculateSplit(0, 'consultation', true);
      expect(result.appAmount).toBe(0);
      expect(result.institutionAmount).toBe(0);
      expect(result.personnelAmount).toBe(0);
    });

    it('handles small amounts with decimal precision', () => {
      const result = calculateSplit(1, 'consultation', true);
      expect(result.appAmount).toBeCloseTo(0.1);
      expect(result.institutionAmount).toBeCloseTo(0.2);
      expect(result.personnelAmount).toBeCloseTo(0.7);
    });
  });
});
