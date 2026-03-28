import type { DesignPlugin, PluginContext } from "@genart-dev/core";
import { skeletonLayerType } from "./skeleton-layer.js";
import { timerLayerType } from "./timer-layer.js";
import { annotationsLayerType } from "./annotations-layer.js";
import { posesMcpTools } from "./poses-tools.js";

const posesPlugin: DesignPlugin = {
  id: "poses",
  name: "Pose Reference",
  version: "0.2.0",
  tier: "free",
  description:
    "Pose reference skeletons, timed practice sessions, and study annotations for figure drawing.",

  layerTypes: [
    skeletonLayerType,
    timerLayerType,
    annotationsLayerType,
  ],
  tools: [],
  exportHandlers: [],
  mcpTools: posesMcpTools,

  async initialize(_context: PluginContext): Promise<void> {
    // No async setup needed
  },

  dispose(): void {
    // No resources to release
  },
};

export default posesPlugin;
export { skeletonLayerType } from "./skeleton-layer.js";
export { timerLayerType } from "./timer-layer.js";
export { annotationsLayerType } from "./annotations-layer.js";
export { posesMcpTools } from "./poses-tools.js";
export {
  getAllPoses,
  filterPoses,
  getRandomPoses,
  getPoseById,
  getPoseCategories,
} from "./poses/index.js";
export {
  BODY_25_NAMES,
  LIMB_CONNECTIONS,
  LIMB_GROUPS,
  LIMB_GROUP_COLORS,
  PROPORTIONAL_WIDTHS,
  COMMON_GUIDE_PROPERTIES,
  setupGuideStyle,
  denormalizeKeypoints,
  mirrorKeypoints,
  drawJoint,
  drawLimb,
  drawProportionalLimb,
  drawSilhouetteSegment,
  computeAngle,
  computeCenterOfGravity,
  computeSymmetryScore,
} from "./shared.js";
export { interpolatePose } from "./interpolation.js";
export type {
  KeypointName,
  Keypoint,
  KeypointMap,
  PoseData,
  PoseCategory,
  PoseTags,
  PosePreset,
  SessionData,
  AnnotationItem,
} from "./shared.js";
