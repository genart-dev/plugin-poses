import type { KeypointMap, Keypoint } from "./shared.js";

/**
 * Linearly interpolate a single keypoint between two states.
 */
function lerpKeypoint(a: Keypoint, b: Keypoint, t: number): Keypoint {
  const result: Keypoint = {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
  if (a.confidence !== undefined && b.confidence !== undefined) {
    result.confidence = a.confidence + (b.confidence - a.confidence) * t;
  } else if (a.confidence !== undefined) {
    result.confidence = a.confidence;
  } else if (b.confidence !== undefined) {
    result.confidence = b.confidence;
  }
  return result;
}

/**
 * Interpolate between two keypoint maps, morphing each shared keypoint
 * by linear interpolation of (x, y) and optional confidence.
 *
 * @param poseA - Source keypoint map (t=0)
 * @param poseB - Target keypoint map (t=1)
 * @param t - Interpolation factor, clamped to [0, 1]
 * @returns A new KeypointMap with interpolated values for all shared keys.
 *   Keys present in only one pose are included at the nearer endpoint
 *   (poseA when t < 0.5, poseB when t >= 0.5).
 */
export function interpolatePose(
  poseA: KeypointMap,
  poseB: KeypointMap,
  t: number,
): KeypointMap {
  const clamped = Math.max(0, Math.min(1, t));
  const result: KeypointMap = {};

  // Collect all unique keys from both poses
  const allKeys = new Set([...Object.keys(poseA), ...Object.keys(poseB)]);

  for (const key of allKeys) {
    const a = poseA[key];
    const b = poseB[key];

    if (a && b) {
      // Both poses have this keypoint — interpolate
      result[key] = lerpKeypoint(a, b, clamped);
    } else if (a && !b) {
      // Only in poseA — include when closer to A
      if (clamped < 0.5) {
        result[key] = { ...a };
      }
    } else if (b && !a) {
      // Only in poseB — include when closer to B
      if (clamped >= 0.5) {
        result[key] = { ...b };
      }
    }
  }

  return result;
}
