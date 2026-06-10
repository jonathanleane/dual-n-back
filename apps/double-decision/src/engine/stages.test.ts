import { describe, expect, it } from 'vitest';
import { STAGES, getStage, slotToPolar, totalSlots } from './stages';

describe('stages', () => {
  it('exposes stages with increasing difficulty', () => {
    const ids = STAGES.map((s) => s.id);
    expect(ids).toEqual([1, 2, 3, 4, 5]);
    // Distractor count is monotonically non-decreasing across stages.
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].distractors).toBeGreaterThanOrEqual(STAGES[i - 1].distractors);
    }
  });

  it('getStage returns the matching stage', () => {
    expect(getStage(2).id).toBe(2);
    expect(() => getStage(99)).toThrow();
  });

  it('totalSlots multiplies slotsPerRing by ring count', () => {
    const s4 = getStage(4);
    expect(totalSlots(s4)).toBe(s4.slotsPerRing * s4.eccentricities.length);
  });

  it('slotToPolar maps slot 0 to the top of the first ring', () => {
    const s = getStage(2);
    const { angleRad, eccentricity } = slotToPolar(s, 0);
    expect(angleRad).toBeCloseTo(0); // 12 o'clock
    expect(eccentricity).toBe(s.eccentricities[0]);
  });

  it('slotToPolar throws when slot is out of range', () => {
    const s = getStage(2);
    expect(() => slotToPolar(s, totalSlots(s))).toThrow();
  });

  it('slotToPolar uses second ring for higher slots and offsets the angle', () => {
    const s = getStage(4);
    const ringOneSlotZero = slotToPolar(s, 0);
    const ringTwoSlotZero = slotToPolar(s, s.slotsPerRing);
    expect(ringTwoSlotZero.eccentricity).toBe(s.eccentricities[1]);
    // Second ring is offset by half a slot so it shouldn't sit at the same angle.
    expect(ringTwoSlotZero.angleRad).not.toBeCloseTo(ringOneSlotZero.angleRad);
  });
});
