import type { PosePreset, PoseCategory, PoseTags } from "../shared.js";
import { standingPoses } from "./standing.js";
import { seatedPoses } from "./seated.js";
import { recliningPoses } from "./reclining.js";
import { dynamicPoses } from "./dynamic.js";
import { dancePoses } from "./dance.js";
import { combatPoses } from "./combat.js";
import { foreshortenedPoses } from "./foreshortened.js";
import { portraitPoses } from "./portrait.js";
import { climbingPoses } from "./climbing.js";
import { gesturePoses } from "./gesture.js";

const ALL_POSES: PosePreset[] = [
  ...standingPoses,
  ...seatedPoses,
  ...recliningPoses,
  ...dynamicPoses,
  ...dancePoses,
  ...combatPoses,
  ...foreshortenedPoses,
  ...portraitPoses,
  ...climbingPoses,
  ...gesturePoses,
];

const poseById = new Map<string, PosePreset>();
for (const pose of ALL_POSES) {
  poseById.set(pose.id, pose);
}

export function getAllPoses(): PosePreset[] {
  return ALL_POSES;
}

export function filterPoses(filter: Partial<PoseTags>): PosePreset[] {
  return ALL_POSES.filter((pose) => {
    for (const [key, value] of Object.entries(filter)) {
      if (value !== undefined && pose.tags[key as keyof PoseTags] !== value) {
        return false;
      }
    }
    return true;
  });
}

export function getRandomPoses(
  count: number,
  filter?: Partial<PoseTags>,
  seed?: number,
): PosePreset[] {
  const pool = filter ? filterPoses(filter) : ALL_POSES;
  if (pool.length === 0) return [];

  // Simple seeded PRNG (mulberry32)
  let s = seed ?? Date.now();
  function rand(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Fisher-Yates shuffle on indices
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }

  const n = Math.min(count, pool.length);
  return indices.slice(0, n).map((i) => pool[i]!);
}

export function getPoseById(id: string): PosePreset | undefined {
  return poseById.get(id);
}

export function getPoseCategories(): PoseCategory[] {
  return [
    "standing", "seated", "reclining", "dynamic", "dance",
    "combat", "foreshortened", "portrait", "climbing", "gesture",
  ];
}

export {
  standingPoses,
  seatedPoses,
  recliningPoses,
  dynamicPoses,
  dancePoses,
  combatPoses,
  foreshortenedPoses,
  portraitPoses,
  climbingPoses,
  gesturePoses,
};
