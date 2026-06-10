import { describe, expect, it } from 'vitest';
import { createRng } from './rng';
import { generateStimulus } from './trialGenerator';
import { getStage, totalSlots } from './stages';

describe('trialGenerator', () => {
  it('produces a stimulus with central in {A,B} and a valid peripheral slot', () => {
    const stage = getStage(2);
    const rng = createRng(42);
    for (let i = 0; i < 50; i++) {
      const s = generateStimulus(stage, rng);
      expect(['A', 'B']).toContain(s.central);
      expect(s.peripheralPosition).toBeGreaterThanOrEqual(0);
      expect(s.peripheralPosition).toBeLessThan(totalSlots(stage));
    }
  });

  it('places distractors only on slots other than the target slot', () => {
    const stage = getStage(3);
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      const s = generateStimulus(stage, rng);
      expect(s.distractorPositions).toHaveLength(stage.distractors);
      expect(s.distractorPositions).not.toContain(s.peripheralPosition);
      // No duplicates either.
      expect(new Set(s.distractorPositions).size).toBe(s.distractorPositions.length);
    }
  });

  it('generates no distractors for stage 1', () => {
    const stage = getStage(1);
    const rng = createRng(1);
    const s = generateStimulus(stage, rng);
    expect(s.distractorPositions).toEqual([]);
  });

  it('is deterministic for a given seed', () => {
    const stage = getStage(4);
    const rngA = createRng(123);
    const rngB = createRng(123);
    for (let i = 0; i < 10; i++) {
      expect(generateStimulus(stage, rngA)).toEqual(generateStimulus(stage, rngB));
    }
  });
});
