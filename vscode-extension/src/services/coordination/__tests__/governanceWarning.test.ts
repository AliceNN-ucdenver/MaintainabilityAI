import { describe, expect, it } from 'vitest';
import { deriveFanOutGovernance } from '../governanceWarning';

/**
 * Bug-AAC — a Fan-Out pre-flight row can read `ready` (repo + harness +
 * perms + upstream clear) while the owning BAR's tier still constrains
 * the impl agent at runtime. These pin the tier → warning mapping so the
 * pane surfaces "plan-only" BEFORE dispatch (the celeb-api greenfield
 * surprise).
 */

describe('deriveFanOutGovernance', () => {
  it('restricted → block / plan-only, naming the weakest pillar', () => {
    const w = deriveFanOutGovernance('restricted', { name: 'security', score: 0 });
    expect(w).not.toBeNull();
    expect(w!.severity).toBe('block');
    expect(w!.planOnly).toBe(true);
    expect(w!.reason).toMatch(/plan-only/);
    expect(w!.reason).toMatch(/security pillar 0\/100/);
    expect(w!.reason).toMatch(/Write/);
  });

  it('restricted with no sub-50 pillar still warns (composite-driven restricted)', () => {
    const w = deriveFanOutGovernance('restricted', null);
    expect(w!.severity).toBe('block');
    expect(w!.planOnly).toBe(true);
    // No pillar parenthetical when none is failing.
    expect(w!.reason).not.toMatch(/pillar \d/);
  });

  it('supervised → caution / NOT plan-only (Write allowed, Edit needs approval)', () => {
    const w = deriveFanOutGovernance('supervised', null);
    expect(w).not.toBeNull();
    expect(w!.severity).toBe('caution');
    expect(w!.planOnly).toBe(false);
    expect(w!.reason).toMatch(/REDQUEEN_PLAN_APPROVED/);
  });

  it('autonomous → no warning (null)', () => {
    expect(deriveFanOutGovernance('autonomous', null)).toBeNull();
  });
});
