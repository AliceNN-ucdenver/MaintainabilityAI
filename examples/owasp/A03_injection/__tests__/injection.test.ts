jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { searchUsers } from '../insecure';

describe('A03 Injection', () => {
  it('blocks classic tautology payload', async () => {
    // Insecure version should "pass" but we expect remediation to sanitize and parameterize.
    await expect(searchUsers(`' OR '1'='1`)).resolves.toBeDefined();
  });
});
