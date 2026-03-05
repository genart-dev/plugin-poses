import type { LayerPropertySchema, LayerBounds } from "@genart-dev/core";

// ---------------------------------------------------------------------------
// BODY_25 Keypoint definitions
// ---------------------------------------------------------------------------

export const BODY_25_NAMES = [
  "nose", "neck", "rShoulder", "rElbow", "rWrist",
  "lShoulder", "lElbow", "lWrist", "midHip", "rHip",
  "rKnee", "rAnkle", "lHip", "lKnee", "lAnkle",
  "rEye", "lEye", "rEar", "lEar",
  "lBigToe", "lSmallToe", "lHeel",
  "rBigToe", "rSmallToe", "rHeel",
] as const;

export type KeypointName = (typeof BODY_25_NAMES)[number];

export interface Keypoint {
  x: number;
  y: number;
  confidence?: number;
}

export type KeypointMap = Record<string, Keypoint>;

// ---------------------------------------------------------------------------
// Limb connections (for skeleton rendering)
// ---------------------------------------------------------------------------

export const LIMB_CONNECTIONS: [KeypointName, KeypointName][] = [
  // Head
  ["nose", "neck"],
  ["nose", "rEye"], ["rEye", "rEar"],
  ["nose", "lEye"], ["lEye", "lEar"],
  // Torso
  ["neck", "rShoulder"], ["neck", "lShoulder"], ["neck", "midHip"],
  // Right arm
  ["rShoulder", "rElbow"], ["rElbow", "rWrist"],
  // Left arm
  ["lShoulder", "lElbow"], ["lElbow", "lWrist"],
  // Right leg
  ["midHip", "rHip"], ["rHip", "rKnee"], ["rKnee", "rAnkle"],
  // Left leg
  ["midHip", "lHip"], ["lHip", "lKnee"], ["lKnee", "lAnkle"],
  // Right foot
  ["rAnkle", "rBigToe"], ["rAnkle", "rSmallToe"], ["rAnkle", "rHeel"],
  // Left foot
  ["lAnkle", "lBigToe"], ["lAnkle", "lSmallToe"], ["lAnkle", "lHeel"],
];

// ---------------------------------------------------------------------------
// Limb groups (for color modes)
// ---------------------------------------------------------------------------

export const LIMB_GROUPS: Record<string, KeypointName[]> = {
  head: ["nose", "rEye", "lEye", "rEar", "lEar"],
  torso: ["neck", "rShoulder", "lShoulder", "midHip"],
  rArm: ["rShoulder", "rElbow", "rWrist"],
  lArm: ["lShoulder", "lElbow", "lWrist"],
  rLeg: ["rHip", "rKnee", "rAnkle", "rBigToe", "rSmallToe", "rHeel"],
  lLeg: ["lHip", "lKnee", "lAnkle", "lBigToe", "lSmallToe", "lHeel"],
};

export const LIMB_GROUP_COLORS: Record<string, string> = {
  head: "rgba(255,235,59,0.8)",
  torso: "rgba(76,175,80,0.8)",
  rArm: "rgba(234,67,53,0.8)",
  lArm: "rgba(66,133,244,0.8)",
  rLeg: "rgba(255,152,0,0.8)",
  lLeg: "rgba(156,39,176,0.8)",
};

// Proportional limb widths (relative to base limbWidth) for proportional style
export const PROPORTIONAL_WIDTHS: Record<string, number> = {
  // Head
  "nose-neck": 1.0,
  "nose-rEye": 0.5, "rEye-rEar": 0.4,
  "nose-lEye": 0.5, "lEye-lEar": 0.4,
  // Torso
  "neck-rShoulder": 2.5, "neck-lShoulder": 2.5, "neck-midHip": 3.0,
  // Arms
  "rShoulder-rElbow": 1.8, "rElbow-rWrist": 1.2,
  "lShoulder-lElbow": 1.8, "lElbow-lWrist": 1.2,
  // Legs
  "midHip-rHip": 2.5, "rHip-rKnee": 2.2, "rKnee-rAnkle": 1.6,
  "midHip-lHip": 2.5, "lHip-lKnee": 2.2, "lKnee-lAnkle": 1.6,
  // Feet
  "rAnkle-rBigToe": 0.8, "rAnkle-rSmallToe": 0.6, "rAnkle-rHeel": 0.7,
  "lAnkle-lBigToe": 0.8, "lAnkle-lSmallToe": 0.6, "lAnkle-lHeel": 0.7,
};

// ---------------------------------------------------------------------------
// Common guide properties (same pattern as plugin-perspective)
// ---------------------------------------------------------------------------

export const COMMON_GUIDE_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "guideColor",
    label: "Guide Color",
    type: "color",
    default: "rgba(0,200,255,0.5)",
    group: "style",
  },
  {
    key: "lineWidth",
    label: "Line Width",
    type: "number",
    default: 1,
    min: 0.5,
    max: 5,
    step: 0.5,
    group: "style",
  },
  {
    key: "dashPattern",
    label: "Dash Pattern",
    type: "string",
    default: "",
    group: "style",
  },
];

// ---------------------------------------------------------------------------
// Pose data types
// ---------------------------------------------------------------------------

export interface PoseData {
  keypoints: KeypointMap;
  source?: "preset" | "openpose" | "custom";
  label?: string;
  tags?: string[];
}

export type PoseCategory =
  | "standing" | "seated" | "reclining" | "dynamic" | "dance"
  | "combat" | "foreshortened" | "portrait" | "climbing" | "gesture";

export interface PoseTags {
  category: PoseCategory;
  view: "front" | "back" | "three-quarter" | "profile" | "above" | "below";
  difficulty: "beginner" | "intermediate" | "advanced";
  energy: "static" | "moderate" | "dynamic";
  symmetry: "symmetric" | "asymmetric";
  weight: "grounded" | "airborne" | "supported";
}

export interface PosePreset {
  id: string;
  label: string;
  keypoints: KeypointMap;
  tags: PoseTags;
}

export interface SessionData {
  poses: PoseData[];
  durations?: number[];
  type: "gesture" | "sustained" | "progressive" | "custom";
  totalPoses: number;
}

export type AnnotationItem =
  | { type: "landmark"; joint: string; label: string; position: { x: number; y: number } }
  | { type: "angle"; joint1: string; vertex: string; joint2: string; value?: number }
  | { type: "distance"; from: string; to: string; label?: string; headUnits?: number }
  | { type: "action-line"; points: Array<{ x: number; y: number }> };

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

export function setupGuideStyle(
  ctx: CanvasRenderingContext2D,
  color: string,
  lineWidth: number,
  dashPattern: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  if (dashPattern) {
    const dashes = dashPattern
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n > 0);
    ctx.setLineDash(dashes.length > 0 ? dashes : []);
  } else {
    ctx.setLineDash([]);
  }
}

export function denormalizeKeypoints(
  keypoints: KeypointMap,
  bounds: LayerBounds,
): Record<string, { x: number; y: number; confidence?: number }> {
  const result: Record<string, { x: number; y: number; confidence?: number }> = {};
  for (const [name, kp] of Object.entries(keypoints)) {
    result[name] = {
      x: bounds.x + kp.x * bounds.width,
      y: bounds.y + kp.y * bounds.height,
      confidence: kp.confidence,
    };
  }
  return result;
}

export function mirrorKeypoints(keypoints: KeypointMap): KeypointMap {
  const result: KeypointMap = {};
  for (const [name, kp] of Object.entries(keypoints)) {
    result[name] = { x: 1 - kp.x, y: kp.y, confidence: kp.confidence };
  }
  return result;
}

export function drawJoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  style: "circle" | "diamond",
): void {
  ctx.beginPath();
  if (style === "diamond") {
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
  } else {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
  ctx.fill();
}

export function drawLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width: number,
): void {
  const prevWidth = ctx.lineWidth;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.lineWidth = prevWidth;
}

export function drawProportionalLimb(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  width1: number,
  width2: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return;
  const nx = -dy / len;
  const ny = dx / len;

  ctx.beginPath();
  ctx.moveTo(x1 + nx * width1 / 2, y1 + ny * width1 / 2);
  ctx.lineTo(x2 + nx * width2 / 2, y2 + ny * width2 / 2);
  ctx.lineTo(x2 - nx * width2 / 2, y2 - ny * width2 / 2);
  ctx.lineTo(x1 - nx * width1 / 2, y1 - ny * width1 / 2);
  ctx.closePath();
  ctx.fill();
}

export function drawSilhouetteSegment(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  width: number,
): void {
  if (points.length < 2) return;
  // Draw a thick rounded path through the points
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const prevWidth = ctx.lineWidth;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.stroke();
  ctx.lineWidth = prevWidth;
}

export function getLimbGroupForConnection(
  a: string,
  b: string,
): string | undefined {
  for (const [group, joints] of Object.entries(LIMB_GROUPS)) {
    if (joints.includes(a as KeypointName) && joints.includes(b as KeypointName)) {
      return group;
    }
  }
  // Check cross-group connections (neck-midHip is torso)
  if ((a === "neck" && b === "midHip") || (a === "midHip" && b === "neck")) return "torso";
  if ((a === "midHip" && b === "rHip") || (a === "rHip" && b === "midHip")) return "rLeg";
  if ((a === "midHip" && b === "lHip") || (a === "lHip" && b === "midHip")) return "lLeg";
  if ((a === "neck" && b === "rShoulder") || (a === "rShoulder" && b === "neck")) return "rArm";
  if ((a === "neck" && b === "lShoulder") || (a === "lShoulder" && b === "neck")) return "lArm";
  if ((a === "nose" && b === "neck") || (a === "neck" && b === "nose")) return "head";
  return undefined;
}

export function getConnectionColor(
  a: string,
  b: string,
  colorMode: string,
  guideColor: string,
  leftColor: string,
  rightColor: string,
  connectionIndex: number,
  totalConnections: number,
): string {
  switch (colorMode) {
    case "limb-groups": {
      const group = getLimbGroupForConnection(a, b);
      return group ? (LIMB_GROUP_COLORS[group] ?? guideColor) : guideColor;
    }
    case "left-right": {
      const isRight = a.startsWith("r") || b.startsWith("r");
      const isLeft = a.startsWith("l") || b.startsWith("l");
      if (isRight && !isLeft) return rightColor;
      if (isLeft && !isRight) return leftColor;
      return guideColor; // center/mixed
    }
    case "rainbow": {
      const hue = (connectionIndex / totalConnections) * 360;
      return `hsla(${hue}, 80%, 60%, 0.8)`;
    }
    default:
      return guideColor;
  }
}

// ---------------------------------------------------------------------------
// Joint angle computation (for analyze_pose)
// ---------------------------------------------------------------------------

export function computeAngle(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number },
): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;
  const dot = v1x * v2x + v1y * v2y;
  const cross = v1x * v2y - v1y * v2x;
  const angle = Math.atan2(Math.abs(cross), dot);
  return (angle * 180) / Math.PI;
}

export function computeCenterOfGravity(keypoints: KeypointMap): { x: number; y: number } {
  const entries = Object.values(keypoints);
  if (entries.length === 0) return { x: 0.5, y: 0.5 };
  let sx = 0, sy = 0;
  for (const kp of entries) {
    sx += kp.x;
    sy += kp.y;
  }
  return { x: sx / entries.length, y: sy / entries.length };
}

export function computeSymmetryScore(keypoints: KeypointMap): number {
  const pairs: [KeypointName, KeypointName][] = [
    ["rShoulder", "lShoulder"], ["rElbow", "lElbow"], ["rWrist", "lWrist"],
    ["rHip", "lHip"], ["rKnee", "lKnee"], ["rAnkle", "lAnkle"],
    ["rEye", "lEye"], ["rEar", "lEar"],
  ];
  let totalDiff = 0;
  let count = 0;
  for (const [r, l] of pairs) {
    const rk = keypoints[r];
    const lk = keypoints[l];
    if (!rk || !lk) continue;
    // Compare mirrored positions
    const dx = Math.abs(rk.x - (1 - lk.x));
    const dy = Math.abs(rk.y - lk.y);
    totalDiff += Math.sqrt(dx * dx + dy * dy);
    count++;
  }
  return count > 0 ? Math.min(1, totalDiff / count / 0.3) : 0;
}
