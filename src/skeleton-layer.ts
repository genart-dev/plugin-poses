import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
  ValidationError,
} from "@genart-dev/core";
import {
  COMMON_GUIDE_PROPERTIES,
  LIMB_CONNECTIONS,
  PROPORTIONAL_WIDTHS,
  LIMB_GROUPS,
  type PoseData,
  type KeypointMap,
  setupGuideStyle,
  denormalizeKeypoints,
  mirrorKeypoints,
  drawJoint,
  drawLimb,
  drawProportionalLimb,
  drawSilhouetteSegment,
  getConnectionColor,
} from "./shared.js";

const SKELETON_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "poseData",
    label: "Pose Data",
    type: "string",
    default: "{}",
    group: "pose",
  },
  {
    key: "skeletonStyle",
    label: "Skeleton Style",
    type: "select",
    default: "stick",
    options: [
      { value: "stick", label: "Stick" },
      { value: "proportional", label: "Proportional" },
      { value: "silhouette", label: "Silhouette" },
    ],
    group: "display",
  },
  {
    key: "jointStyle",
    label: "Joint Style",
    type: "select",
    default: "circle",
    options: [
      { value: "circle", label: "Circle" },
      { value: "diamond", label: "Diamond" },
      { value: "none", label: "None" },
    ],
    group: "display",
  },
  {
    key: "jointRadius",
    label: "Joint Radius",
    type: "number",
    default: 5,
    min: 2,
    max: 15,
    step: 1,
    group: "display",
  },
  {
    key: "limbWidth",
    label: "Limb Width",
    type: "number",
    default: 2,
    min: 1,
    max: 8,
    step: 0.5,
    group: "display",
  },
  {
    key: "showConfidence",
    label: "Show Confidence",
    type: "boolean",
    default: false,
    group: "display",
  },
  {
    key: "colorMode",
    label: "Color Mode",
    type: "select",
    default: "uniform",
    options: [
      { value: "uniform", label: "Uniform" },
      { value: "limb-groups", label: "Limb Groups" },
      { value: "left-right", label: "Left / Right" },
      { value: "rainbow", label: "Rainbow" },
    ],
    group: "style",
  },
  {
    key: "leftColor",
    label: "Left Color",
    type: "color",
    default: "rgba(66,133,244,0.7)",
    group: "style",
  },
  {
    key: "rightColor",
    label: "Right Color",
    type: "color",
    default: "rgba(234,67,53,0.7)",
    group: "style",
  },
  {
    key: "highlightJoints",
    label: "Highlight Joints",
    type: "string",
    default: "[]",
    group: "annotation",
  },
  {
    key: "showBoundingBox",
    label: "Show Bounding Box",
    type: "boolean",
    default: false,
    group: "display",
  },
  {
    key: "mirror",
    label: "Mirror",
    type: "boolean",
    default: false,
    group: "pose",
  },
  {
    key: "poseLabel",
    label: "Pose Label",
    type: "string",
    default: "",
    group: "annotation",
  },
  ...COMMON_GUIDE_PROPERTIES,
];

function parsePoseData(raw: string): PoseData | null {
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && data.keypoints) return data as PoseData;
    return null;
  } catch {
    return null;
  }
}

function parseHighlightJoints(raw: string): string[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export const skeletonLayerType: LayerTypeDefinition = {
  typeId: "poses:skeleton",
  displayName: "Pose Skeleton",
  icon: "person",
  category: "guide",
  properties: SKELETON_PROPERTIES,
  propertyEditorId: "poses:skeleton-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of SKELETON_PROPERTIES) {
      props[schema.key] = schema.default;
    }
    return props;
  },

  render(
    properties: LayerProperties,
    ctx: CanvasRenderingContext2D,
    bounds: LayerBounds,
    _resources: RenderResources,
  ): void {
    const poseData = parsePoseData((properties.poseData as string) ?? "{}");
    if (!poseData || !poseData.keypoints || Object.keys(poseData.keypoints).length === 0) return;

    const style = (properties.skeletonStyle as string) ?? "stick";
    const jointStyle = (properties.jointStyle as string) ?? "circle";
    const jointRadius = (properties.jointRadius as number) ?? 5;
    const limbWidth = (properties.limbWidth as number) ?? 2;
    const showConfidence = (properties.showConfidence as boolean) ?? false;
    const colorMode = (properties.colorMode as string) ?? "uniform";
    const leftColor = (properties.leftColor as string) ?? "rgba(66,133,244,0.7)";
    const rightColor = (properties.rightColor as string) ?? "rgba(234,67,53,0.7)";
    const highlightJoints = parseHighlightJoints((properties.highlightJoints as string) ?? "[]");
    const showBoundingBox = (properties.showBoundingBox as boolean) ?? false;
    const shouldMirror = (properties.mirror as boolean) ?? false;
    const poseLabel = (properties.poseLabel as string) ?? "";
    const guideColor = (properties.guideColor as string) ?? "rgba(0,200,255,0.5)";
    const lineWidth = (properties.lineWidth as number) ?? 1;
    const dashPattern = (properties.dashPattern as string) ?? "";

    let keypoints: KeypointMap = poseData.keypoints;
    if (shouldMirror) keypoints = mirrorKeypoints(keypoints);

    const denorm = denormalizeKeypoints(keypoints, bounds);

    ctx.save();
    setupGuideStyle(ctx, guideColor, lineWidth, dashPattern);

    // Draw limbs
    const totalConnections = LIMB_CONNECTIONS.length;
    for (let i = 0; i < LIMB_CONNECTIONS.length; i++) {
      const [a, b] = LIMB_CONNECTIONS[i]!;
      const pa = denorm[a];
      const pb = denorm[b];
      if (!pa || !pb) continue;

      const color = getConnectionColor(
        a, b, colorMode, guideColor, leftColor, rightColor, i, totalConnections,
      );

      if (showConfidence) {
        const confA = keypoints[a]?.confidence ?? 1;
        const confB = keypoints[b]?.confidence ?? 1;
        ctx.globalAlpha = (confA + confB) / 2;
      }

      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      if (style === "proportional") {
        const key = `${a}-${b}`;
        const altKey = `${b}-${a}`;
        const widthMul = PROPORTIONAL_WIDTHS[key] ?? PROPORTIONAL_WIDTHS[altKey] ?? 1;
        const w = limbWidth * widthMul;
        drawProportionalLimb(ctx, pa.x, pa.y, pb.x, pb.y, w, w * 0.8);
      } else if (style === "silhouette") {
        const key = `${a}-${b}`;
        const altKey = `${b}-${a}`;
        const widthMul = PROPORTIONAL_WIDTHS[key] ?? PROPORTIONAL_WIDTHS[altKey] ?? 1;
        drawSilhouetteSegment(ctx, [pa, pb], limbWidth * widthMul * 1.5);
      } else {
        drawLimb(ctx, pa.x, pa.y, pb.x, pb.y, limbWidth);
      }
    }

    // Draw joints
    if (jointStyle !== "none") {
      for (const [name, pt] of Object.entries(denorm)) {
        if (showConfidence) {
          ctx.globalAlpha = keypoints[name]?.confidence ?? 1;
        }

        const isHighlighted = highlightJoints.includes(name);
        const r = isHighlighted ? jointRadius * 1.5 : jointRadius;
        const color = getConnectionColor(
          name, name, colorMode, guideColor, leftColor, rightColor, 0, 1,
        );
        ctx.fillStyle = isHighlighted ? "rgba(255,255,0,0.9)" : color;
        drawJoint(ctx, pt.x, pt.y, r, jointStyle as "circle" | "diamond");

        if (isHighlighted) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = `${Math.round(jointRadius * 2)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(name, pt.x, pt.y - r - 4);
        }
      }
    }

    ctx.globalAlpha = 1;

    // Bounding box
    if (showBoundingBox) {
      const pts = Object.values(denorm);
      if (pts.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = guideColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8);
      }
    }

    // Pose label
    if (poseLabel) {
      ctx.fillStyle = guideColor;
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(poseLabel, bounds.x + bounds.width / 2, bounds.y + bounds.height - 10);
    }

    ctx.restore();
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const jr = properties.jointRadius;
    if (typeof jr === "number" && (jr < 2 || jr > 15)) {
      errors.push({ property: "jointRadius", message: "Must be 2-15" });
    }
    const lw = properties.limbWidth;
    if (typeof lw === "number" && (lw < 1 || lw > 8)) {
      errors.push({ property: "limbWidth", message: "Must be 1-8" });
    }
    return errors.length > 0 ? errors : null;
  },
};
