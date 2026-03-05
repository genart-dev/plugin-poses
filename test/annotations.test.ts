import { describe, it, expect, vi } from "vitest";
import { annotationsLayerType } from "../src/annotations-layer.js";
import type { LayerBounds, RenderResources } from "@genart-dev/core";

const BOUNDS: LayerBounds = {
  x: 0, y: 0, width: 800, height: 600,
  rotation: 0, scaleX: 1, scaleY: 1,
};

const RESOURCES: RenderResources = {
  getFont: () => null,
  getImage: () => null,
  theme: "dark",
  pixelRatio: 1,
};

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    setLineDash: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 50 })),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    lineJoin: "miter",
    lineCap: "butt",
    globalAlpha: 1,
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
  } as unknown as CanvasRenderingContext2D;
}

describe("annotationsLayerType", () => {
  it("creates default properties", () => {
    const defaults = annotationsLayerType.createDefault();
    expect(defaults.annotationType).toBe("landmarks");
    expect(defaults.showLabels).toBe(true);
    expect(defaults.fontSize).toBe(12);
  });

  it("renders nothing with empty annotations", () => {
    const ctx = createMockCtx();
    annotationsLayerType.render(annotationsLayerType.createDefault(), ctx, BOUNDS, RESOURCES);
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it("renders landmark annotations", () => {
    const ctx = createMockCtx();
    const annotations = [
      { type: "landmark", joint: "nose", label: "Nose", position: { x: 0.5, y: 0.1 } },
    ];
    const props = {
      ...annotationsLayerType.createDefault(),
      annotations: JSON.stringify(annotations),
      annotationType: "landmarks",
    };
    annotationsLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("renders angle annotations", () => {
    const ctx = createMockCtx();
    const annotations = [
      { type: "angle", joint1: "rShoulder", vertex: "rElbow", joint2: "rWrist", value: 120 },
    ];
    const props = {
      ...annotationsLayerType.createDefault(),
      annotations: JSON.stringify(annotations),
      annotationType: "angles",
    };
    annotationsLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.arc).toHaveBeenCalled();
  });

  it("renders action-line annotations", () => {
    const ctx = createMockCtx();
    const annotations = [
      { type: "action-line", points: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.4 }, { x: 0.5, y: 0.7 }] },
    ];
    const props = {
      ...annotationsLayerType.createDefault(),
      annotations: JSON.stringify(annotations),
      annotationType: "action-lines",
    };
    annotationsLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("validates font size", () => {
    expect(
      annotationsLayerType.validate({ ...annotationsLayerType.createDefault(), fontSize: 4 }),
    ).not.toBeNull();
    expect(
      annotationsLayerType.validate(annotationsLayerType.createDefault()),
    ).toBeNull();
  });
});
