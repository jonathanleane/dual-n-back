import type { Rng } from './rng';
import { totalSlots, type StageConfig } from './stages';
import type { CentralTarget, StimulusSpec } from './types';

const CENTRAL_TARGETS: readonly CentralTarget[] = ['A', 'B'];

/**
 * Generate a fresh stimulus for the given stage. Independent draws per trial —
 * the central target identity and peripheral location are uniformly random,
 * and distractor slots are sampled without replacement from the remaining
 * peripheral slots.
 */
export function generateStimulus(stage: StageConfig, rng: Rng): StimulusSpec {
  const slots = totalSlots(stage);
  if (stage.distractors >= slots) {
    throw new Error(`stage ${stage.id} requests ${stage.distractors} distractors but only has ${slots - 1} non-target slots`);
  }
  const central = rng.pick(CENTRAL_TARGETS);
  const peripheralPosition = rng.int(slots);

  const otherSlots: number[] = [];
  for (let i = 0; i < slots; i++) {
    if (i !== peripheralPosition) otherSlots.push(i);
  }
  const distractorPositions = stage.distractors > 0 ? rng.sample(otherSlots, stage.distractors) : [];

  return { central, peripheralPosition, distractorPositions };
}
