import { describe, it, expect, vi } from "vitest";
import posesPlugin from "../src/index.js";
import { skeletonLayerType } from "../src/skeleton-layer.js";
import { getAllPoses } from "../src/poses/index.js";
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

describe("poses plugin", () => {
  it("exports a valid DesignPlugin", () => {
    expect(posesPlugin.id).toBe("poses");
    expect(posesPlugin.tier).toBe("free");
    expect(posesPlugin.layerTypes).toHaveLength(3);
    expect(posesPlugin.mcpTools).toHaveLength(8);
  });

  it("all layer types have guide category", () => {
    for (const lt of posesPlugin.layerTypes) {
      expect(lt.category).toBe("guide");
    }
  });

  it("all layer types have unique typeIds", () => {
    const ids = posesPlugin.layerTypes.map((t) => t.typeId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("skeletonLayerType", () => {
  it("creates default properties", () => {
    const defaults = skeletonLayerType.createDefault();
    expect(defaults.skeletonStyle).toBe("stick");
    expect(defaults.jointStyle).toBe("circle");
    expect(defaults.jointRadius).toBe(5);
    expect(defaults.mirror).toBe(false);
  });

  it("renders without errors with empty poseData", () => {
    const ctx = createMockCtx();
    skeletonLayerType.render(
      skeletonLayerType.createDefault(),
      ctx,
      BOUNDS,
      RESOURCES,
    );
    // Should not throw, but also shouldn't draw (no keypoints)
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it("renders with valid poseData", () => {
    const ctx = createMockCtx();
    const poses = getAllPoses();
    const pose = poses[0]!;
    const props = {
      ...skeletonLayerType.createDefault(),
      poseData: JSON.stringify({ keypoints: pose.keypoints, source: "preset" }),
    };
    skeletonLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it("renders with all skeleton styles", () => {
    const poses = getAllPoses();
    const pose = poses[0]!;
    for (const style of ["stick", "proportional", "silhouette"]) {
      const ctx = createMockCtx();
      const props = {
        ...skeletonLayerType.createDefault(),
        poseData: JSON.stringify({ keypoints: pose.keypoints }),
        skeletonStyle: style,
      };
      skeletonLayerType.render(props, ctx, BOUNDS, RESOURCES);
      expect(ctx.save).toHaveBeenCalled();
    }
  });

  it("renders with all color modes", () => {
    const poses = getAllPoses();
    const pose = poses[0]!;
    for (const mode of ["uniform", "limb-groups", "left-right", "rainbow"]) {
      const ctx = createMockCtx();
      const props = {
        ...skeletonLayerType.createDefault(),
        poseData: JSON.stringify({ keypoints: pose.keypoints }),
        colorMode: mode,
      };
      skeletonLayerType.render(props, ctx, BOUNDS, RESOURCES);
      expect(ctx.save).toHaveBeenCalled();
    }
  });

  it("renders with mirror enabled", () => {
    const ctx = createMockCtx();
    const poses = getAllPoses();
    const pose = poses[0]!;
    const props = {
      ...skeletonLayerType.createDefault(),
      poseData: JSON.stringify({ keypoints: pose.keypoints }),
      mirror: true,
    };
    skeletonLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.save).toHaveBeenCalled();
  });

  it("renders with bounding box", () => {
    const ctx = createMockCtx();
    const poses = getAllPoses();
    const pose = poses[0]!;
    const props = {
      ...skeletonLayerType.createDefault(),
      poseData: JSON.stringify({ keypoints: pose.keypoints }),
      showBoundingBox: true,
    };
    skeletonLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it("renders highlighted joints", () => {
    const ctx = createMockCtx();
    const poses = getAllPoses();
    const pose = poses[0]!;
    const props = {
      ...skeletonLayerType.createDefault(),
      poseData: JSON.stringify({ keypoints: pose.keypoints }),
      highlightJoints: JSON.stringify(["nose", "rWrist"]),
    };
    skeletonLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("validates joint radius", () => {
    expect(
      skeletonLayerType.validate({ ...skeletonLayerType.createDefault(), jointRadius: 1 }),
    ).not.toBeNull();
    expect(
      skeletonLayerType.validate(skeletonLayerType.createDefault()),
    ).toBeNull();
  });

  it("validates limb width", () => {
    expect(
      skeletonLayerType.validate({ ...skeletonLayerType.createDefault(), limbWidth: 0.5 }),
    ).not.toBeNull();
  });
});
