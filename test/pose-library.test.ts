import { describe, it, expect } from "vitest";
import {
  getAllPoses,
  filterPoses,
  getRandomPoses,
  getPoseById,
  getPoseCategories,
} from "../src/poses/index.js";
import { BODY_25_NAMES } from "../src/shared.js";

describe("pose library", () => {
  it("has 88 total poses", () => {
    expect(getAllPoses().length).toBe(88);
  });

  it("all poses have unique IDs", () => {
    const poses = getAllPoses();
    const ids = poses.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all poses have 25 keypoints", () => {
    const poses = getAllPoses();
    for (const pose of poses) {
      const kpKeys = Object.keys(pose.keypoints);
      expect(kpKeys.length).toBe(25);
      for (const name of BODY_25_NAMES) {
        expect(pose.keypoints[name]).toBeDefined();
      }
    }
  });

  it("all keypoints are normalized 0-1 (approximately)", () => {
    const poses = getAllPoses();
    for (const pose of poses) {
      for (const [name, kp] of Object.entries(pose.keypoints)) {
        expect(kp.x).toBeGreaterThanOrEqual(-0.1);
        expect(kp.x).toBeLessThanOrEqual(1.1);
        expect(kp.y).toBeGreaterThanOrEqual(-0.1);
        expect(kp.y).toBeLessThanOrEqual(1.1);
      }
    }
  });

  it("all poses have valid tags", () => {
    const validCategories = getPoseCategories();
    const validViews = ["front", "back", "three-quarter", "profile", "above", "below"];
    const validDifficulty = ["beginner", "intermediate", "advanced"];
    const validEnergy = ["static", "moderate", "dynamic"];
    const validSymmetry = ["symmetric", "asymmetric"];
    const validWeight = ["grounded", "airborne", "supported"];

    for (const pose of getAllPoses()) {
      expect(validCategories).toContain(pose.tags.category);
      expect(validViews).toContain(pose.tags.view);
      expect(validDifficulty).toContain(pose.tags.difficulty);
      expect(validEnergy).toContain(pose.tags.energy);
      expect(validSymmetry).toContain(pose.tags.symmetry);
      expect(validWeight).toContain(pose.tags.weight);
    }
  });

  it("has 10 categories", () => {
    expect(getPoseCategories()).toHaveLength(10);
  });

  it("each category has correct count", () => {
    const expected: Record<string, number> = {
      standing: 15, seated: 10, reclining: 8, dynamic: 12,
      dance: 8, combat: 6, foreshortened: 8, portrait: 8,
      climbing: 5, gesture: 8,
    };
    for (const [cat, count] of Object.entries(expected)) {
      const poses = filterPoses({ category: cat as any });
      expect(poses.length).toBe(count);
    }
  });
});

describe("filterPoses", () => {
  it("filters by category", () => {
    const standing = filterPoses({ category: "standing" });
    expect(standing.length).toBe(15);
    expect(standing.every((p) => p.tags.category === "standing")).toBe(true);
  });

  it("filters by multiple tags", () => {
    const results = filterPoses({ category: "standing", difficulty: "beginner" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((p) => p.tags.category === "standing" && p.tags.difficulty === "beginner")).toBe(true);
  });

  it("returns empty array for impossible filter", () => {
    const results = filterPoses({ category: "standing", weight: "airborne" });
    expect(results.length).toBe(0);
  });
});

describe("getRandomPoses", () => {
  it("returns requested count", () => {
    const poses = getRandomPoses(5);
    expect(poses.length).toBe(5);
  });

  it("does not exceed pool size", () => {
    const poses = getRandomPoses(200);
    expect(poses.length).toBe(88);
  });

  it("is deterministic with seed", () => {
    const a = getRandomPoses(5, undefined, 42);
    const b = getRandomPoses(5, undefined, 42);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it("different seeds give different results", () => {
    const a = getRandomPoses(5, undefined, 42);
    const b = getRandomPoses(5, undefined, 99);
    // Very unlikely to be identical
    expect(a.map((p) => p.id)).not.toEqual(b.map((p) => p.id));
  });

  it("respects filter", () => {
    const poses = getRandomPoses(3, { category: "dance" }, 42);
    expect(poses.length).toBe(3);
    expect(poses.every((p) => p.tags.category === "dance")).toBe(true);
  });
});

describe("getPoseById", () => {
  it("finds existing pose", () => {
    const pose = getPoseById("standing-neutral-front");
    expect(pose).toBeDefined();
    expect(pose!.label).toBe("Neutral Standing — Front");
  });

  it("returns undefined for unknown ID", () => {
    expect(getPoseById("nonexistent")).toBeUndefined();
  });
});
