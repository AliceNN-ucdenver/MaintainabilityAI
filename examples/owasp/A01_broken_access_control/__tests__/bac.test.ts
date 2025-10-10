import { getUserDocument } from '../insecure';

describe('A01 Broken Access Control', () => {
  it('should not disclose documents of other users (to be fixed)', () => {
    const doc = getUserDocument('attacker', 'victim');
    expect(doc.owner).toBe('victim'); // baseline; remediation should enforce checks and tests will be updated
  });
});
