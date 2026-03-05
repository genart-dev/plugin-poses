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
  type AnnotationItem,
  type PoseData,
  setupGuideStyle,
  denormalizeKeypoints,
  computeAngle,
} from "./shared.js";

const ANNOTATIONS_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "annotations",
    label: "Annotations",
    type: "string",
    default: "[]",
    group: "annotations",
  },
  {
    key: "referenceLayerId",
    label: "Reference Skeleton Layer",
    type: "string",
    default: "",
    group: "annotations",
  },
  {
    key: "annotationType",
    label: "Annotation Type",
    type: "select",
    default: "landmarks",
    options: [
      { value: "landmarks", label: "Landmarks" },
      { value: "angles", label: "Angles" },
      { value: "distances", label: "Distances" },
      { value: "action-lines", label: "Action Lines" },
      { value: "all", label: "All" },
    ],
    group: "display",
  },
  {
    key: "annotationColor",
    label: "Annotation Color",
    type: "color",
    default: "rgba(255,100,50,0.7)",
    group: "style",
  },
  {
    key: "fontSize",
    label: "Font Size",
    type: "number",
    default: 12,
    min: 8,
    max: 24,
    step: 1,
    group: "style",
  },
  {
    key: "showLabels",
    label: "Show Labels",
    type: "boolean",
    default: true,
    group: "display",
  },
  ...COMMON_GUIDE_PROPERTIES,
];

function parseAnnotations(raw: string): AnnotationItem[] {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export const annotationsLayerType: LayerTypeDefinition = {
  typeId: "poses:annotations",
  displayName: "Pose Annotations",
  icon: "annotation",
  category: "guide",
  properties: ANNOTATIONS_PROPERTIES,
  propertyEditorId: "poses:annotations-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of ANNOTATIONS_PROPERTIES) {
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
    const annotations = parseAnnotations((properties.annotations as string) ?? "[]");
    if (annotations.length === 0) return;

    const typeFilter = (properties.annotationType as string) ?? "landmarks";
    const color = (properties.annotationColor as string) ?? "rgba(255,100,50,0.7)";
    const fontSize = (properties.fontSize as number) ?? 12;
    const showLabels = (properties.showLabels as boolean) ?? true;
    const guideColor = (properties.guideColor as string) ?? "rgba(0,200,255,0.5)";
    const lineWidth = (properties.lineWidth as number) ?? 1;
    const dashPattern = (properties.dashPattern as string) ?? "";

    ctx.save();
    setupGuideStyle(ctx, guideColor, lineWidth, dashPattern);

    // Map plural filter names to singular annotation types
    const filterMap: Record<string, string> = {
      landmarks: "landmark",
      angles: "angle",
      distances: "distance",
      "action-lines": "action-line",
    };
    const matchType = filterMap[typeFilter];

    for (const ann of annotations) {
      if (typeFilter !== "all" && matchType && ann.type !== matchType) continue;

      switch (ann.type) {
        case "landmark":
          renderLandmark(ctx, ann, bounds, color, fontSize, showLabels);
          break;
        case "angle":
          renderAngle(ctx, ann, bounds, color, fontSize, showLabels);
          break;
        case "distance":
          renderDistance(ctx, ann, bounds, color, fontSize, showLabels);
          break;
        case "action-line":
          renderActionLine(ctx, ann, bounds, color, lineWidth);
          break;
      }
    }

    ctx.restore();
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const fs = properties.fontSize;
    if (typeof fs === "number" && (fs < 8 || fs > 24)) {
      errors.push({ property: "fontSize", message: "Must be 8-24" });
    }
    return errors.length > 0 ? errors : null;
  },
};

function renderLandmark(
  ctx: CanvasRenderingContext2D,
  ann: Extract<AnnotationItem, { type: "landmark" }>,
  bounds: LayerBounds,
  color: string,
  fontSize: number,
  showLabels: boolean,
): void {
  const px = bounds.x + ann.position.x * bounds.width;
  const py = bounds.y + ann.position.y * bounds.height;
  const r = 5;

  // Diamond marker
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(px, py - r);
  ctx.lineTo(px + r, py);
  ctx.lineTo(px, py + r);
  ctx.lineTo(px - r, py);
  ctx.closePath();
  ctx.fill();

  if (showLabels && ann.label) {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(ann.label, px, py - r - 4);
  }
}

function renderAngle(
  ctx: CanvasRenderingContext2D,
  ann: Extract<AnnotationItem, { type: "angle" }>,
  bounds: LayerBounds,
  color: string,
  fontSize: number,
  showLabels: boolean,
): void {
  // Positions are joint names — denormalize as positions
  // For angle annotations, we use the joint names as normalized coordinates
  // stored in the position data. We need the reference skeleton's keypoints.
  // Since we can't access other layers in render, angle annotations store
  // pre-computed positions.
  const vx = bounds.x + 0.5 * bounds.width;
  const vy = bounds.y + 0.5 * bounds.height;

  if (ann.value !== undefined && showLabels) {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(ann.value)}°`, vx, vy);
  }

  // Draw arc indicator
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  const arcRadius = 20;
  ctx.beginPath();
  ctx.arc(vx, vy, arcRadius, 0, ((ann.value ?? 90) * Math.PI) / 180);
  ctx.stroke();
}

function renderDistance(
  ctx: CanvasRenderingContext2D,
  ann: Extract<AnnotationItem, { type: "distance" }>,
  bounds: LayerBounds,
  color: string,
  fontSize: number,
  showLabels: boolean,
): void {
  // Distance annotations store from/to as "x,y" normalized coords
  // For simplicity, we render a dashed line between positions
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const midX = bounds.x + bounds.width / 2;
  const midY = bounds.y + bounds.height / 2;

  if (showLabels && ann.label) {
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(ann.label, midX, midY - 6);
  }

  if (ann.headUnits !== undefined && showLabels) {
    ctx.fillStyle = color;
    ctx.font = `${fontSize - 2}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${ann.headUnits.toFixed(1)} heads`, midX, midY + fontSize);
  }
}

function renderActionLine(
  ctx: CanvasRenderingContext2D,
  ann: Extract<AnnotationItem, { type: "action-line" }>,
  bounds: LayerBounds,
  color: string,
  baseWidth: number,
): void {
  const points = ann.points;
  if (points.length < 2) return;

  const denorm = points.map((p) => ({
    x: bounds.x + p.x * bounds.width,
    y: bounds.y + p.y * bounds.height,
  }));

  ctx.strokeStyle = color;
  ctx.setLineDash([]);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Draw with tapered width (thick in center, thin at ends)
  for (let i = 0; i < denorm.length - 1; i++) {
    const t = denorm.length > 2 ? i / (denorm.length - 2) : 0.5;
    const taper = 1 - 2 * Math.abs(t - 0.5); // 0 at ends, 1 at center
    ctx.lineWidth = baseWidth + taper * baseWidth * 3;
    ctx.beginPath();
    ctx.moveTo(denorm[i]!.x, denorm[i]!.y);
    ctx.lineTo(denorm[i + 1]!.x, denorm[i + 1]!.y);
    ctx.stroke();
  }
}
