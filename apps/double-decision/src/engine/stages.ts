/**
 * Stage definitions for Double Decision.
 *
 * Each stage incrementally adds difficulty along the UFOV dimensions:
 *   - eccentricity (how far from centre the peripheral target can appear)
 *   - position count (how many possible peripheral slots — search difficulty)
 *   - distractor count (clutter that the trained "useful field of view" must
 *     filter through)
 *
 * Position layout is a radial polar grid: positions are distributed evenly
 * around the centre at the stage's eccentricity rings.
 */

export interface StageConfig {
  id: number;
  label: string;
  /** Peripheral slots: number of evenly-spaced angular positions per ring. */
  slotsPerRing: number;
  /** Rings of eccentricity, as fraction of viewport short edge / 2. */
  eccentricities: number[];
  /** Number of distractor slots populated each trial (not counting the target). */
  distractors: number;
  /** Starting stimulus duration in ms when entering this stage cold. */
  startingDurationMs: number;
}

export const STAGES: readonly StageConfig[] = [
  {
    id: 1,
    label: 'Find the target',
    slotsPerRing: 1,        // peripheral target always at top
    eccentricities: [0.35],
    distractors: 0,
    startingDurationMs: 500,
  },
  {
    id: 2,
    label: 'Anywhere on the rim',
    slotsPerRing: 8,        // 8 cardinal+diagonal positions
    eccentricities: [0.35],
    distractors: 0,
    startingDurationMs: 600,
  },
  {
    id: 3,
    label: 'Find it among the clutter',
    slotsPerRing: 8,
    eccentricities: [0.35],
    distractors: 4,
    startingDurationMs: 700,
  },
  {
    id: 4,
    label: 'Closer and farther',
    slotsPerRing: 8,
    eccentricities: [0.22, 0.42],
    distractors: 6,
    startingDurationMs: 800,
  },
  {
    id: 5,
    label: 'Full field',
    slotsPerRing: 12,
    eccentricities: [0.22, 0.42],
    distractors: 12,
    startingDurationMs: 900,
  },
] as const;

export function getStage(id: number): StageConfig {
  const found = STAGES.find((s) => s.id === id);
  if (!found) throw new Error(`unknown stage id: ${id}`);
  return found;
}

/** Total number of peripheral slots a stage has (across all rings). */
export function totalSlots(stage: StageConfig): number {
  return stage.slotsPerRing * stage.eccentricities.length;
}

/**
 * Convert a slot index into a polar coordinate (angle in radians from 12 o'clock,
 * eccentricity as a fraction of viewport short edge / 2).
 *
 * Slots are filled ring-by-ring: first ring [0..slotsPerRing-1], second ring
 * [slotsPerRing..2*slotsPerRing-1], etc.
 */
export function slotToPolar(stage: StageConfig, slot: number): { angleRad: number; eccentricity: number } {
  const ringIndex = Math.floor(slot / stage.slotsPerRing);
  if (ringIndex >= stage.eccentricities.length) {
    throw new Error(`slot ${slot} out of range for stage ${stage.id}`);
  }
  const slotInRing = slot % stage.slotsPerRing;
  // Angle 0 = top (12 o'clock), increasing clockwise.
  const angleRad = (slotInRing / stage.slotsPerRing) * Math.PI * 2;
  // Offset alternating rings by half a slot so positions don't line up radially.
  const offset = ringIndex % 2 === 1 ? Math.PI / stage.slotsPerRing : 0;
  return {
    angleRad: angleRad + offset,
    eccentricity: stage.eccentricities[ringIndex],
  };
}
