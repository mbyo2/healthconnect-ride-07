import { verifyTwoFactor, setupTwoFactor, disableTwoFactor } from '../two-factor-service';

describe('two-factor-service', () => {
  it('verifies a valid 6-digit code', async () => {
    expect(await verifyTwoFactor('123456')).toBe(true);
  });

  it('throws error for invalid code', async () => {
    await expect(verifyTwoFactor('abc')).rejects.toThrow('Invalid verification code');
  });

  it('sets up two-factor and returns secret/backup codes', async () => {
    const result = await setupTwoFactor();
    expect(result.secret).toBeDefined();
    expect(result.backupCodes).toHaveLength(10);
  });

  it('disables two-factor without error', async () => {
    await expect(disableTwoFactor()).resolves.toBeUndefined();
  });
});
