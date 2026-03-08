import { describe, it, expect } from 'vitest';
import { ZAMBIA_CONFIG } from '@/config/zambia';

describe('Zambia Configuration', () => {
  it('should have correct currency config', () => {
    expect(ZAMBIA_CONFIG.country.currency.code).toBe('ZMW');
    expect(ZAMBIA_CONFIG.country.currency.symbol).toBe('K');
    expect(ZAMBIA_CONFIG.country.code).toBe('ZM');
  });

  it('should validate Zambian phone numbers correctly', () => {
    expect(ZAMBIA_CONFIG.isValidPhone('+260971234567')).toBe(true);
    expect(ZAMBIA_CONFIG.isValidPhone('0971234567')).toBe(true);
    expect(ZAMBIA_CONFIG.isValidPhone('971234567')).toBe(true);
    expect(ZAMBIA_CONFIG.isValidPhone('123')).toBe(false);
    expect(ZAMBIA_CONFIG.isValidPhone('')).toBe(false);
  });

  it('should format Zambian phone numbers correctly', () => {
    expect(ZAMBIA_CONFIG.formatPhoneNumber('0971234567')).toBe('+260971234567');
    expect(ZAMBIA_CONFIG.formatPhoneNumber('971234567')).toBe('+260971234567');
    expect(ZAMBIA_CONFIG.formatPhoneNumber('+260971234567')).toBe('+260971234567');
  });

  it('should detect mobile providers correctly', () => {
    expect(ZAMBIA_CONFIG.getMobileProvider('0971234567')).toBe('mtn');
    expect(ZAMBIA_CONFIG.getMobileProvider('0961234567')).toBe('mtn');
    expect(ZAMBIA_CONFIG.getMobileProvider('0951234567')).toBe('airtel');
    expect(ZAMBIA_CONFIG.getMobileProvider('0771234567')).toBe('airtel');
  });

  it('should have emergency numbers', () => {
    expect(ZAMBIA_CONFIG.emergencyNumbers.police).toBe('999');
    expect(ZAMBIA_CONFIG.emergencyNumbers.ambulance).toBe('991');
    expect(ZAMBIA_CONFIG.emergencyNumbers.generalEmergency).toBe('112');
  });

  it('should have healthcare institutions', () => {
    expect(ZAMBIA_CONFIG.healthcareInstitutions.length).toBeGreaterThan(0);
    ZAMBIA_CONFIG.healthcareInstitutions.forEach(inst => {
      expect(inst.id).toBeTruthy();
      expect(inst.name).toBeTruthy();
      expect(inst.phone).toBeTruthy();
      expect(inst.coordinates.lat).toBeDefined();
      expect(inst.coordinates.lng).toBeDefined();
    });
  });

  it('should have ambulance services', () => {
    expect(ZAMBIA_CONFIG.ambulanceServices.length).toBeGreaterThan(0);
    ZAMBIA_CONFIG.ambulanceServices.forEach(service => {
      expect(service.phone).toBeTruthy();
      expect(service.available24h).toBe(true);
    });
  });

  it('should have insurance providers', () => {
    expect(ZAMBIA_CONFIG.insuranceProviders.length).toBeGreaterThan(0);
    const nhima = ZAMBIA_CONFIG.insuranceProviders.find(p => p.id === 'nhima');
    expect(nhima).toBeDefined();
    expect(nhima?.name).toBe('NHIMA');
  });

  it('should have major cities', () => {
    expect(ZAMBIA_CONFIG.cities).toContain('Lusaka');
    expect(ZAMBIA_CONFIG.cities).toContain('Ndola');
    expect(ZAMBIA_CONFIG.cities).toContain('Kitwe');
    expect(ZAMBIA_CONFIG.cities).toContain('Livingstone');
  });
});
