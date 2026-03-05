import { describe, it, expect, vi } from "vitest";
import {
  addPoseSkeletonTool,
  setPoseKeypointsTool,
  createPracticeSessionTool,
  advancePoseTool,
  analyzePoseTool,
  randomizePoseTool,
  clearPoseLayersTool,
} from "../src/poses-tools.js";
import type {
  McpToolContext,
  DesignLayer,
  LayerStackAccessor,
} from "@genart-dev/core";

function createMockLayer(overrides: Partial<DesignLayer> = {}): DesignLayer {
  return {
    id: "pose-1",
    type: "poses:skeleton",
    name: "Pose Skeleton",
    visible: true,
    locked: true,
    opacity: 1,
    blendMode: "normal",
    transform: {
      x: 0, y: 0, width: 800, height: 600,
      rotation: 0, scaleX: 1, scaleY: 1, anchorX: 0, anchorY: 0,
    },
    properties: {
      poseData: JSON.stringify({
        keypoints: {
          nose: { x: 0.5, y: 0.1 }, neck: { x: 0.5, y: 0.15 },
          rShoulder: { x: 0.42, y: 0.17 }, rElbow: { x: 0.39, y: 0.28 },
          rWrist: { x: 0.38, y: 0.38 }, lShoulder: { x: 0.58, y: 0.17 },
          lElbow: { x: 0.61, y: 0.28 }, lWrist: { x: 0.62, y: 0.38 },
          midHip: { x: 0.5, y: 0.42 }, rHip: { x: 0.45, y: 0.43 },
          rKnee: { x: 0.44, y: 0.58 }, rAnkle: { x: 0.44, y: 0.73 },
          lHip: { x: 0.55, y: 0.43 }, lKnee: { x: 0.56, y: 0.58 },
          lAnkle: { x: 0.56, y: 0.73 }, rEye: { x: 0.47, y: 0.07 },
          lEye: { x: 0.53, y: 0.07 }, rEar: { x: 0.44, y: 0.08 },
          lEar: { x: 0.56, y: 0.08 }, lBigToe: { x: 0.58, y: 0.76 },
          lSmallToe: { x: 0.59, y: 0.75 }, lHeel: { x: 0.54, y: 0.75 },
          rBigToe: { x: 0.42, y: 0.76 }, rSmallToe: { x: 0.41, y: 0.75 },
          rHeel: { x: 0.46, y: 0.75 },
        },
        source: "preset",
        label: "Test Pose",
      }),
    },
    ...overrides,
  };
}

function createMockContext(layers: DesignLayer[] = []): McpToolContext {
  const layerMap = new Map(layers.map((l) => [l.id, l]));

  const accessor: LayerStackAccessor = {
    getAll: () => layers,
    get: (id: string) => layerMap.get(id) ?? null,
    add: vi.fn((layer: DesignLayer) => {
      layers.push(layer);
      layerMap.set(layer.id, layer);
    }),
    remove: vi.fn((id: string) => {
      const idx = layers.findIndex((l) => l.id === id);
      if (idx >= 0) { layers.splice(idx, 1); layerMap.delete(id); return true; }
      return false;
    }),
    updateProperties: vi.fn(),
    updateTransform: vi.fn(),
    updateBlend: vi.fn(),
    reorder: vi.fn(),
    duplicate: vi.fn(() => "dup-id"),
    count: layers.length,
  };

  return {
    layers: accessor,
    sketchState: {
      seed: 42, params: {}, colorPalette: [],
      canvasWidth: 800, canvasHeight: 600, rendererId: "canvas2d",
    },
    canvasWidth: 800,
    canvasHeight: 600,
    resolveAsset: vi.fn(async () => null),
    captureComposite: vi.fn(async () => Buffer.from("")),
    emitChange: vi.fn(),
  };
}

describe("add_pose_skeleton tool", () => {
  it("adds a skeleton with preset ID", async () => {
    const ctx = createMockContext();
    const result = await addPoseSkeletonTool.handler(
      { preset: "standing-neutral-front" },
      ctx,
    );
    expect(result.isError).toBeUndefined();
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.type).toBe("poses:skeleton");
    expect(layer.locked).toBe(true);
  });

  it("adds a skeleton with category name", async () => {
    const ctx = createMockContext();
    const result = await addPoseSkeletonTool.handler(
      { preset: "dance" },
      ctx,
    );
    expect(result.isError).toBeUndefined();
  });

  it("adds with custom style and color mode", async () => {
    const ctx = createMockContext();
    await addPoseSkeletonTool.handler(
      { preset: "standing", style: "proportional", colorMode: "limb-groups" },
      ctx,
    );
    const layer = (ctx.layers.add as ReturnType<typeof vi.fn>).mock.calls[0]![0] as DesignLayer;
    expect(layer.properties.skeletonStyle).toBe("proportional");
    expect(layer.properties.colorMode).toBe("limb-groups");
  });

  it("defaults to standing when no preset given", async () => {
    const ctx = createMockContext();
    const result = await addPoseSkeletonTool.handler({}, ctx);
    expect(result.isError).toBeUndefined();
  });
});

describe("set_pose_keypoints tool", () => {
  it("updates keypoints on skeleton layer", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await setPoseKeypointsTool.handler(
      { layerId: "pose-1", keypoints: { nose: { x: 0.3, y: 0.1 } } },
      ctx,
    );
    expect(result.isError).toBeUndefined();
    expect(ctx.layers.updateProperties).toHaveBeenCalled();
  });

  it("rejects non-skeleton layer", async () => {
    const layer = createMockLayer({ type: "poses:timer" });
    const ctx = createMockContext([layer]);
    const result = await setPoseKeypointsTool.handler(
      { layerId: "pose-1", keypoints: {} },
      ctx,
    );
    expect(result.isError).toBe(true);
  });

  it("rejects unknown layer", async () => {
    const ctx = createMockContext();
    const result = await setPoseKeypointsTool.handler(
      { layerId: "nope", keypoints: {} },
      ctx,
    );
    expect(result.isError).toBe(true);
  });
});

describe("create_practice_session tool", () => {
  it("creates gesture session", async () => {
    const ctx = createMockContext();
    const result = await createPracticeSessionTool.handler(
      { type: "gesture" },
      ctx,
    );
    expect(result.isError).toBeUndefined();
    // Should add 2 layers (skeleton + timer)
    expect(ctx.layers.add).toHaveBeenCalledTimes(2);
  });

  it("creates progressive session", async () => {
    const ctx = createMockContext();
    const result = await createPracticeSessionTool.handler(
      { type: "progressive" },
      ctx,
    );
    expect(result.isError).toBeUndefined();
  });

  it("creates session with tags filter", async () => {
    const ctx = createMockContext();
    const result = await createPracticeSessionTool.handler(
      { type: "gesture", tags: { category: "dynamic" }, poseCount: 3 },
      ctx,
    );
    expect(result.isError).toBeUndefined();
  });
});

describe("advance_pose tool", () => {
  it("advances to next pose", async () => {
    const timerLayer = createMockLayer({
      id: "timer-1",
      type: "poses:timer",
      properties: {
        sessionData: JSON.stringify({
          poses: [
            { keypoints: {}, label: "Pose 1" },
            { keypoints: {}, label: "Pose 2" },
          ],
          durations: [30, 60],
          type: "gesture",
          totalPoses: 2,
        }),
        currentPoseIndex: 0,
      },
    });
    const skeletonLayer = createMockLayer();
    const ctx = createMockContext([timerLayer, skeletonLayer]);

    const result = await advancePoseTool.handler(
      { sessionLayerId: "timer-1" },
      ctx,
    );
    expect(result.isError).toBeUndefined();
    expect(ctx.layers.updateProperties).toHaveBeenCalledTimes(2);
  });

  it("reports session complete at end", async () => {
    const timerLayer = createMockLayer({
      id: "timer-1",
      type: "poses:timer",
      properties: {
        sessionData: JSON.stringify({
          poses: [{ keypoints: {} }],
          type: "gesture",
          totalPoses: 1,
        }),
        currentPoseIndex: 0,
      },
    });
    const ctx = createMockContext([timerLayer]);
    const result = await advancePoseTool.handler(
      { sessionLayerId: "timer-1" },
      ctx,
    );
    expect((result.content[0] as { text: string }).text).toContain("complete");
  });
});

describe("analyze_pose tool", () => {
  it("returns analysis data", async () => {
    const layer = createMockLayer();
    const ctx = createMockContext([layer]);
    const result = await analyzePoseTool.handler(
      { layerId: "pose-1" },
      ctx,
    );
    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { text: string }).text;
    const analysis = JSON.parse(text);
    expect(analysis.angles).toBeDefined();
    expect(analysis.proportions).toBeDefined();
    expect(analysis.centerOfGravity).toBeDefined();
    expect(analysis.symmetryScore).toBeDefined();
  });
});

describe("randomize_pose tool", () => {
  it("adds a random pose", async () => {
    const ctx = createMockContext();
    const result = await randomizePoseTool.handler({}, ctx);
    expect(result.isError).toBeUndefined();
    expect(ctx.layers.add).toHaveBeenCalledTimes(1);
  });

  it("respects tags filter", async () => {
    const ctx = createMockContext();
    const result = await randomizePoseTool.handler(
      { tags: { category: "combat" } },
      ctx,
    );
    expect(result.isError).toBeUndefined();
  });
});

describe("clear_pose_layers tool", () => {
  it("removes all pose layers", async () => {
    const layers = [
      createMockLayer({ id: "p1", type: "poses:skeleton" }),
      createMockLayer({ id: "p2", type: "poses:timer" }),
      createMockLayer({ id: "p3", type: "poses:annotations" }),
    ];
    const ctx = createMockContext(layers);
    const result = await clearPoseLayersTool.handler({}, ctx);
    expect(result.isError).toBeUndefined();
    expect(ctx.layers.remove).toHaveBeenCalledTimes(3);
  });

  it("does not remove non-pose layers", async () => {
    const layers = [
      createMockLayer({ id: "g1", type: "guides:grid" }),
      createMockLayer({ id: "p1", type: "poses:skeleton" }),
    ];
    const ctx = createMockContext(layers);
    await clearPoseLayersTool.handler({}, ctx);
    expect(ctx.layers.remove).toHaveBeenCalledTimes(1);
    expect(ctx.layers.remove).toHaveBeenCalledWith("p1");
  });

  it("reports when no pose layers exist", async () => {
    const ctx = createMockContext();
    const result = await clearPoseLayersTool.handler({}, ctx);
    expect((result.content[0] as { text: string }).text).toContain("No pose layers");
  });
});
