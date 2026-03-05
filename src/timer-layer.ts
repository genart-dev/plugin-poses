import type {
  LayerTypeDefinition,
  LayerPropertySchema,
  LayerProperties,
  LayerBounds,
  RenderResources,
  ValidationError,
} from "@genart-dev/core";
import { COMMON_GUIDE_PROPERTIES, type SessionData, setupGuideStyle } from "./shared.js";

const TIMER_PROPERTIES: LayerPropertySchema[] = [
  {
    key: "sessionData",
    label: "Session Data",
    type: "string",
    default: "{}",
    group: "session",
  },
  {
    key: "currentPoseIndex",
    label: "Current Pose Index",
    type: "number",
    default: 0,
    min: 0,
    max: 999,
    step: 1,
    group: "session",
  },
  {
    key: "timerRemaining",
    label: "Timer Remaining (s)",
    type: "number",
    default: 120,
    min: 0,
    max: 1800,
    step: 1,
    group: "timer",
  },
  {
    key: "timerDuration",
    label: "Timer Duration (s)",
    type: "number",
    default: 120,
    min: 10,
    max: 1800,
    step: 10,
    group: "timer",
  },
  {
    key: "showTimer",
    label: "Show Timer",
    type: "boolean",
    default: true,
    group: "display",
  },
  {
    key: "timerPosition",
    label: "Timer Position",
    type: "select",
    default: "top-right",
    options: [
      { value: "top-left", label: "Top Left" },
      { value: "top-right", label: "Top Right" },
      { value: "bottom-left", label: "Bottom Left" },
      { value: "bottom-right", label: "Bottom Right" },
      { value: "center-top", label: "Center Top" },
    ],
    group: "display",
  },
  {
    key: "timerSize",
    label: "Timer Size",
    type: "number",
    default: 24,
    min: 12,
    max: 48,
    step: 2,
    group: "display",
  },
  {
    key: "showProgress",
    label: "Show Progress",
    type: "boolean",
    default: true,
    group: "display",
  },
  {
    key: "timerColor",
    label: "Timer Color",
    type: "color",
    default: "rgba(255,255,255,0.9)",
    group: "style",
  },
  {
    key: "bgColor",
    label: "Background Color",
    type: "color",
    default: "rgba(0,0,0,0.5)",
    group: "style",
  },
  ...COMMON_GUIDE_PROPERTIES,
];

function parseSessionData(raw: string): SessionData | null {
  try {
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && Array.isArray(data.poses)) return data as SessionData;
    return null;
  } catch {
    return null;
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getTimerPosition(
  position: string,
  bounds: LayerBounds,
  timerSize: number,
): { x: number; y: number; align: CanvasTextAlign } {
  const margin = timerSize;
  switch (position) {
    case "top-left":
      return { x: bounds.x + margin, y: bounds.y + margin + timerSize, align: "left" };
    case "top-right":
      return { x: bounds.x + bounds.width - margin, y: bounds.y + margin + timerSize, align: "right" };
    case "bottom-left":
      return { x: bounds.x + margin, y: bounds.y + bounds.height - margin, align: "left" };
    case "bottom-right":
      return { x: bounds.x + bounds.width - margin, y: bounds.y + bounds.height - margin, align: "right" };
    case "center-top":
      return { x: bounds.x + bounds.width / 2, y: bounds.y + margin + timerSize, align: "center" };
    default:
      return { x: bounds.x + bounds.width - margin, y: bounds.y + margin + timerSize, align: "right" };
  }
}

export const timerLayerType: LayerTypeDefinition = {
  typeId: "poses:timer",
  displayName: "Practice Timer",
  icon: "timer",
  category: "guide",
  properties: TIMER_PROPERTIES,
  propertyEditorId: "poses:timer-editor",

  createDefault(): LayerProperties {
    const props: LayerProperties = {};
    for (const schema of TIMER_PROPERTIES) {
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
    const showTimer = (properties.showTimer as boolean) ?? true;
    if (!showTimer) return;

    const remaining = (properties.timerRemaining as number) ?? 120;
    const duration = (properties.timerDuration as number) ?? 120;
    const position = (properties.timerPosition as string) ?? "top-right";
    const timerSize = (properties.timerSize as number) ?? 24;
    const showProgress = (properties.showProgress as boolean) ?? true;
    const timerColor = (properties.timerColor as string) ?? "rgba(255,255,255,0.9)";
    const bgColor = (properties.bgColor as string) ?? "rgba(0,0,0,0.5)";
    const currentPoseIndex = (properties.currentPoseIndex as number) ?? 0;
    const session = parseSessionData((properties.sessionData as string) ?? "{}");
    const totalPoses = session?.totalPoses ?? 1;

    ctx.save();

    const pos = getTimerPosition(position, bounds, timerSize);

    // Background pill
    const timeText = formatTime(remaining);
    ctx.font = `bold ${timerSize}px monospace`;
    const metrics = ctx.measureText(timeText);
    const textWidth = metrics.width;
    const pillPadX = timerSize * 0.5;
    const pillPadY = timerSize * 0.3;
    const pillH = timerSize + pillPadY * 2;
    const pillW = textWidth + pillPadX * 2;

    let pillX: number;
    if (pos.align === "right") pillX = pos.x - pillW;
    else if (pos.align === "center") pillX = pos.x - pillW / 2;
    else pillX = pos.x;

    const pillY = pos.y - timerSize - pillPadY;
    const pillR = pillH / 2;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.moveTo(pillX + pillR, pillY);
    ctx.lineTo(pillX + pillW - pillR, pillY);
    ctx.arc(pillX + pillW - pillR, pillY + pillR, pillR, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(pillX + pillR, pillY + pillH);
    ctx.arc(pillX + pillR, pillY + pillR, pillR, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    // Timer text
    ctx.fillStyle = timerColor;
    ctx.font = `bold ${timerSize}px monospace`;
    ctx.textAlign = pos.align;
    ctx.textBaseline = "bottom";
    ctx.fillText(timeText, pos.x, pos.y);

    // Pose counter
    if (session && totalPoses > 1) {
      const counterText = `Pose ${currentPoseIndex + 1} / ${totalPoses}`;
      ctx.font = `${Math.round(timerSize * 0.5)}px sans-serif`;
      ctx.fillStyle = timerColor;
      ctx.globalAlpha = 0.7;
      ctx.fillText(counterText, pos.x, pos.y + timerSize * 0.7);
      ctx.globalAlpha = 1;
    }

    // Progress bar at top
    if (showProgress && duration > 0) {
      const barHeight = 3;
      const elapsed = duration - remaining;
      const progress = Math.min(1, Math.max(0, elapsed / duration));

      ctx.fillStyle = bgColor;
      ctx.fillRect(bounds.x, bounds.y, bounds.width, barHeight);
      ctx.fillStyle = timerColor;
      ctx.fillRect(bounds.x, bounds.y, bounds.width * progress, barHeight);
    }

    // Progress dots
    if (session && totalPoses > 1 && showProgress) {
      const dotRadius = 4;
      const dotSpacing = dotRadius * 3;
      const totalWidth = (totalPoses - 1) * dotSpacing;
      const startX = bounds.x + bounds.width / 2 - totalWidth / 2;
      const dotY = bounds.y + bounds.height - 16;

      for (let i = 0; i < totalPoses; i++) {
        const cx = startX + i * dotSpacing;
        ctx.beginPath();
        ctx.arc(cx, dotY, dotRadius, 0, Math.PI * 2);

        if (i < currentPoseIndex) {
          ctx.fillStyle = timerColor;
          ctx.fill();
        } else if (i === currentPoseIndex) {
          ctx.fillStyle = timerColor;
          ctx.fill();
          ctx.strokeStyle = timerColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          ctx.strokeStyle = timerColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    ctx.restore();
  },

  validate(properties: LayerProperties): ValidationError[] | null {
    const errors: ValidationError[] = [];
    const dur = properties.timerDuration;
    if (typeof dur === "number" && (dur < 10 || dur > 1800)) {
      errors.push({ property: "timerDuration", message: "Must be 10-1800" });
    }
    const rem = properties.timerRemaining;
    if (typeof rem === "number" && (rem < 0 || rem > 1800)) {
      errors.push({ property: "timerRemaining", message: "Must be 0-1800" });
    }
    const sz = properties.timerSize;
    if (typeof sz === "number" && (sz < 12 || sz > 48)) {
      errors.push({ property: "timerSize", message: "Must be 12-48" });
    }
    return errors.length > 0 ? errors : null;
  },
};
