/**
 * A03 Injection — INSECURE EXAMPLE
 * Do not copy to production. Used for workshop remediation.
 */

import { Client } from 'pg';

export async function searchUsers(query: string) {
  const client = new Client({});
  await client.connect();
  // Insecure: string concatenation leads to SQL injection
  const sql = `SELECT id, email FROM users WHERE email LIKE '%${query}%'`;
  const res = await client.query(sql);
  await client.end();
  return res.rows;
}
