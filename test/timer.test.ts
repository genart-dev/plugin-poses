import { describe, it, expect, vi } from "vitest";
import { timerLayerType } from "../src/timer-layer.js";
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
    measureText: vi.fn(() => ({ width: 60 })),
    fillRect: vi.fn(),
    strokeStyle: "",
    fillStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    font: "",
    textAlign: "start",
    textBaseline: "alphabetic",
  } as unknown as CanvasRenderingContext2D;
}

describe("timerLayerType", () => {
  it("creates default properties", () => {
    const defaults = timerLayerType.createDefault();
    expect(defaults.timerDuration).toBe(120);
    expect(defaults.timerRemaining).toBe(120);
    expect(defaults.showTimer).toBe(true);
    expect(defaults.timerPosition).toBe("top-right");
  });

  it("renders timer text", () => {
    const ctx = createMockCtx();
    timerLayerType.render(timerLayerType.createDefault(), ctx, BOUNDS, RESOURCES);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it("renders progress bar", () => {
    const ctx = createMockCtx();
    const props = {
      ...timerLayerType.createDefault(),
      timerRemaining: 60,
      timerDuration: 120,
      showProgress: true,
    };
    timerLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("does not render when showTimer is false", () => {
    const ctx = createMockCtx();
    const props = {
      ...timerLayerType.createDefault(),
      showTimer: false,
    };
    timerLayerType.render(props, ctx, BOUNDS, RESOURCES);
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("renders pose counter with session data", () => {
    const ctx = createMockCtx();
    const session = {
      poses: [{ keypoints: {} }, { keypoints: {} }],
      type: "gesture",
      totalPoses: 2,
    };
    const props = {
      ...timerLayerType.createDefault(),
      sessionData: JSON.stringify(session),
      currentPoseIndex: 0,
    };
    timerLayerType.render(props, ctx, BOUNDS, RESOURCES);
    // Should render counter text
    const calls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const hasCounter = calls.some(
      (c: string[]) => typeof c[0] === "string" && c[0].includes("Pose"),
    );
    expect(hasCounter).toBe(true);
  });

  it("validates timer duration range", () => {
    expect(
      timerLayerType.validate({ ...timerLayerType.createDefault(), timerDuration: 5 }),
    ).not.toBeNull();
    expect(
      timerLayerType.validate(timerLayerType.createDefault()),
    ).toBeNull();
  });

  it("renders in all positions", () => {
    for (const pos of ["top-left", "top-right", "bottom-left", "bottom-right", "center-top"]) {
      const ctx = createMockCtx();
      const props = { ...timerLayerType.createDefault(), timerPosition: pos };
      timerLayerType.render(props, ctx, BOUNDS, RESOURCES);
      expect(ctx.fillText).toHaveBeenCalled();
    }
  });
});
