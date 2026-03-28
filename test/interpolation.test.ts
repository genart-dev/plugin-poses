import { describe, it, expect } from "vitest";
import { interpolatePose } from "../src/interpolation.js";
import type { KeypointMap } from "../src/shared.js";

const poseA: KeypointMap = {
  nose: { x: 0, y: 0, confidence: 1.0 },
  neck: { x: 0, y: 100, confidence: 0.9 },
  rShoulder: { x: -50, y: 120 },
};

const poseB: KeypointMap = {
  nose: { x: 100, y: 0, confidence: 0.8 },
  neck: { x: 100, y: 100, confidence: 1.0 },
  lShoulder: { x: 150, y: 120 },
};

describe("interpolatePose", () => {
  it("returns poseA when t=0", () => {
    const result = interpolatePose(poseA, poseB, 0);
    expect(result.nose).toEqual({ x: 0, y: 0, confidence: 1.0 });
    expect(result.neck).toEqual({ x: 0, y: 100, confidence: 0.9 });
  });

  it("returns poseB when t=1", () => {
    const result = interpolatePose(poseA, poseB, 1);
    expect(result.nose).toEqual({ x: 100, y: 0, confidence: 0.8 });
    expect(result.neck).toEqual({ x: 100, y: 100, confidence: 1.0 });
  });

  it("interpolates at t=0.5", () => {
    const result = interpolatePose(poseA, poseB, 0.5);
    expect(result.nose!.x).toBeCloseTo(50);
    expect(result.nose!.y).toBeCloseTo(0);
    expect(result.nose!.confidence).toBeCloseTo(0.9);
    expect(result.neck!.x).toBeCloseTo(50);
    expect(result.neck!.confidence).toBeCloseTo(0.95);
  });

  it("interpolates at t=0.25", () => {
    const result = interpolatePose(poseA, poseB, 0.25);
    expect(result.nose!.x).toBeCloseTo(25);
    expect(result.neck!.x).toBeCloseTo(25);
  });

  it("clamps t below 0 to 0", () => {
    const result = interpolatePose(poseA, poseB, -5);
    expect(result.nose!.x).toBeCloseTo(0);
    expect(result.neck!.x).toBeCloseTo(0);
  });

  it("clamps t above 1 to 1", () => {
    const result = interpolatePose(poseA, poseB, 10);
    expect(result.nose!.x).toBeCloseTo(100);
    expect(result.neck!.x).toBeCloseTo(100);
  });

  it("includes A-only keys when t < 0.5", () => {
    const result = interpolatePose(poseA, poseB, 0.3);
    expect(result.rShoulder).toBeDefined();
    expect(result.rShoulder!.x).toBe(-50);
    expect(result.lShoulder).toBeUndefined();
  });

  it("includes B-only keys when t >= 0.5", () => {
    const result = interpolatePose(poseA, poseB, 0.7);
    expect(result.lShoulder).toBeDefined();
    expect(result.lShoulder!.x).toBe(150);
    expect(result.rShoulder).toBeUndefined();
  });

  it("includes both single-side keys at t=0.5 (B side wins)", () => {
    const result = interpolatePose(poseA, poseB, 0.5);
    expect(result.lShoulder).toBeDefined();
    expect(result.rShoulder).toBeUndefined();
  });

  it("handles empty poses", () => {
    const result = interpolatePose({}, {}, 0.5);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("handles one empty pose", () => {
    const result = interpolatePose(poseA, {}, 0.3);
    // t < 0.5, so A-only keys are included
    expect(Object.keys(result).length).toBe(3);
  });

  it("handles keypoints without confidence", () => {
    const a: KeypointMap = { nose: { x: 0, y: 0 } };
    const b: KeypointMap = { nose: { x: 10, y: 20 } };
    const result = interpolatePose(a, b, 0.5);
    expect(result.nose!.x).toBeCloseTo(5);
    expect(result.nose!.y).toBeCloseTo(10);
    expect(result.nose!.confidence).toBeUndefined();
  });

  it("carries confidence from A when B has none", () => {
    const a: KeypointMap = { nose: { x: 0, y: 0, confidence: 0.9 } };
    const b: KeypointMap = { nose: { x: 10, y: 0 } };
    const result = interpolatePose(a, b, 0.5);
    expect(result.nose!.confidence).toBe(0.9);
  });

  it("carries confidence from B when A has none", () => {
    const a: KeypointMap = { nose: { x: 0, y: 0 } };
    const b: KeypointMap = { nose: { x: 10, y: 0, confidence: 0.7 } };
    const result = interpolatePose(a, b, 0.5);
    expect(result.nose!.confidence).toBe(0.7);
  });

  it("does not mutate input poses", () => {
    const a: KeypointMap = { nose: { x: 0, y: 0 } };
    const b: KeypointMap = { nose: { x: 10, y: 10 } };
    const aCopy = JSON.parse(JSON.stringify(a));
    const bCopy = JSON.parse(JSON.stringify(b));
    interpolatePose(a, b, 0.5);
    expect(a).toEqual(aCopy);
    expect(b).toEqual(bCopy);
  });
});
