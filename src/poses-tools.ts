import type {
  McpToolDefinition,
  McpToolContext,
  McpToolResult,
  JsonSchema,
  DesignLayer,
  LayerTransform,
} from "@genart-dev/core";
import {
  type PoseData,
  type SessionData,
  type AnnotationItem,
  type KeypointMap,
  BODY_25_NAMES,
  computeAngle,
  computeCenterOfGravity,
  computeSymmetryScore,
} from "./shared.js";
import { skeletonLayerType } from "./skeleton-layer.js";
import { timerLayerType } from "./timer-layer.js";
import { annotationsLayerType } from "./annotations-layer.js";
import {
  getAllPoses,
  getPoseById,
  getRandomPoses,
  filterPoses,
} from "./poses/index.js";

function textResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }] };
}

function errorResult(text: string): McpToolResult {
  return { content: [{ type: "text", text }], isError: true };
}

function generateLayerId(): string {
  return `layer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function fullCanvasTransform(ctx: McpToolContext): LayerTransform {
  return {
    x: 0,
    y: 0,
    width: ctx.canvasWidth,
    height: ctx.canvasHeight,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    anchorX: 0,
    anchorY: 0,
  };
}

// ---------------------------------------------------------------------------
// add_pose_skeleton
// ---------------------------------------------------------------------------

export const addPoseSkeletonTool: McpToolDefinition = {
  name: "add_pose_skeleton",
  description:
    "Add a pose skeleton overlay. Use a preset ID, category name for a random pose from that category, or custom keypoints.",
  inputSchema: {
    type: "object",
    properties: {
      preset: {
        type: "string",
        description:
          "Preset ID (e.g., 'standing-contrapposto-right') or category name (e.g., 'standing') for a random pose from that category.",
      },
      keypoints: {
        type: "object",
        description:
          "Custom keypoints as { jointName: { x, y } } with normalized 0-1 coordinates. Overrides preset.",
      },
      style: {
        type: "string",
        enum: ["stick", "proportional", "silhouette"],
        description: "Skeleton rendering style (default: 'stick').",
      },
      colorMode: {
        type: "string",
        enum: ["uniform", "limb-groups", "left-right", "rainbow"],
        description: "Color mode (default: 'uniform').",
      },
      mirror: {
        type: "boolean",
        description: "Mirror the pose horizontally (default: false).",
      },
    },
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    let poseData: PoseData;

    if (input.keypoints) {
      poseData = {
        keypoints: input.keypoints as KeypointMap,
        source: "custom",
      };
    } else {
      const presetKey = (input.preset as string) ?? "standing";
      // Try exact ID first
      const exact = getPoseById(presetKey);
      if (exact) {
        poseData = {
          keypoints: exact.keypoints,
          source: "preset",
          label: exact.label,
          tags: [exact.tags.category],
        };
      } else {
        // Try as category
        const filtered = filterPoses({ category: presetKey as any });
        if (filtered.length > 0) {
          const randomPoses = getRandomPoses(1, { category: presetKey as any });
          const pose = randomPoses[0] ?? filtered[0]!;
          poseData = {
            keypoints: pose.keypoints,
            source: "preset",
            label: pose.label,
            tags: [pose.tags.category],
          };
        } else {
          // Default to random standing
          const randomPoses = getRandomPoses(1, { category: "standing" });
          const pose = randomPoses[0] ?? getAllPoses()[0]!;
          poseData = {
            keypoints: pose.keypoints,
            source: "preset",
            label: pose.label,
          };
        }
      }
    }

    const defaults = skeletonLayerType.createDefault();
    const properties = { ...defaults };
    properties.poseData = JSON.stringify(poseData);

    if (input.style !== undefined) properties.skeletonStyle = input.style as string;
    if (input.colorMode !== undefined) properties.colorMode = input.colorMode as string;
    if (input.mirror !== undefined) properties.mirror = input.mirror as boolean;
    if (poseData.label) properties.poseLabel = poseData.label;

    const id = generateLayerId();
    const layer: DesignLayer = {
      id,
      type: skeletonLayerType.typeId,
      name: poseData.label ?? "Pose Skeleton",
      visible: true,
      locked: true,
      opacity: 1,
      blendMode: "normal",
      transform: fullCanvasTransform(context),
      properties,
    };

    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(
      `Added pose skeleton '${id}'${poseData.label ? ` (${poseData.label})` : ""}.`,
    );
  },
};

// ---------------------------------------------------------------------------
// set_pose_keypoints
// ---------------------------------------------------------------------------

export const setPoseKeypointsTool: McpToolDefinition = {
  name: "set_pose_keypoints",
  description: "Update keypoints on an existing pose skeleton layer.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: { type: "string", description: "Skeleton layer ID." },
      keypoints: {
        type: "object",
        description: "New keypoints as { jointName: { x, y } }.",
      },
    },
    required: ["layerId", "keypoints"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.getAll().find((l) => l.id === layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);
    if (layer.type !== "poses:skeleton") {
      return errorResult(`Layer '${layerId}' is not a poses:skeleton layer.`);
    }

    const poseData: PoseData = {
      keypoints: input.keypoints as KeypointMap,
      source: "custom",
    };
    context.layers.updateProperties(layerId, { poseData: JSON.stringify(poseData) });
    context.emitChange("layer-updated");
    return textResult(`Updated keypoints on layer '${layerId}'.`);
  },
};

// ---------------------------------------------------------------------------
// create_practice_session
// ---------------------------------------------------------------------------

const SESSION_DEFAULTS = {
  gesture: { count: 10, duration: 45 },
  sustained: { count: 2, duration: 600 },
  progressive: { count: 6, duration: 0 },
  custom: { count: 5, duration: 120 },
};

const PROGRESSIVE_DURATIONS = [30, 60, 120, 300, 600, 900];

export const createPracticeSessionTool: McpToolDefinition = {
  name: "create_practice_session",
  description:
    "Create a timed pose practice session. Creates both a timer layer and a skeleton layer.",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["gesture", "sustained", "progressive", "custom"],
        description: "Session type.",
      },
      poseCount: {
        type: "number",
        description: "Number of poses (overrides default for type).",
      },
      duration: {
        type: "number",
        description: "Duration per pose in seconds (overrides default).",
      },
      tags: {
        type: "object",
        description: "Pose filter tags (e.g., { category: 'dynamic', difficulty: 'beginner' }).",
      },
      seed: {
        type: "number",
        description: "Random seed for reproducible sessions.",
      },
    },
    required: ["type"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const sessionType = input.type as SessionData["type"];
    const defaults = SESSION_DEFAULTS[sessionType] ?? SESSION_DEFAULTS.custom;
    const count = (input.poseCount as number) ?? defaults.count;
    const perDuration = (input.duration as number) ?? defaults.duration;
    const tags = input.tags as Record<string, string> | undefined;
    const seed = input.seed as number | undefined;

    const poses = getRandomPoses(count, tags as any, seed);
    if (poses.length === 0) return errorResult("No poses match the given filters.");

    const durations =
      sessionType === "progressive"
        ? PROGRESSIVE_DURATIONS.slice(0, poses.length)
        : poses.map(() => perDuration);

    const sessionData: SessionData = {
      poses: poses.map((p) => ({
        keypoints: p.keypoints,
        source: "preset" as const,
        label: p.label,
        tags: [p.tags.category],
      })),
      durations,
      type: sessionType,
      totalPoses: poses.length,
    };

    const firstPose = poses[0]!;
    const firstDuration = durations[0] ?? 120;

    // Create skeleton layer
    const skeletonId = generateLayerId();
    const skeletonProps = skeletonLayerType.createDefault();
    skeletonProps.poseData = JSON.stringify({
      keypoints: firstPose.keypoints,
      source: "preset",
      label: firstPose.label,
    });
    skeletonProps.poseLabel = firstPose.label;

    const skeletonLayer: DesignLayer = {
      id: skeletonId,
      type: "poses:skeleton",
      name: `Practice — ${firstPose.label}`,
      visible: true,
      locked: true,
      opacity: 1,
      blendMode: "normal",
      transform: fullCanvasTransform(context),
      properties: skeletonProps,
    };

    // Create timer layer
    const timerId = generateLayerId();
    const timerProps = timerLayerType.createDefault();
    timerProps.sessionData = JSON.stringify(sessionData);
    timerProps.timerDuration = firstDuration;
    timerProps.timerRemaining = firstDuration;
    timerProps.currentPoseIndex = 0;

    const timerLayer: DesignLayer = {
      id: timerId,
      type: "poses:timer",
      name: `Practice Timer — ${sessionType}`,
      visible: true,
      locked: true,
      opacity: 1,
      blendMode: "normal",
      transform: fullCanvasTransform(context),
      properties: timerProps,
    };

    context.layers.add(skeletonLayer);
    context.layers.add(timerLayer);
    context.emitChange("layer-added");

    return textResult(
      `Created ${sessionType} practice session with ${poses.length} poses. ` +
      `Skeleton layer: '${skeletonId}', Timer layer: '${timerId}'. ` +
      `First pose: ${firstPose.label} (${firstDuration}s).`,
    );
  },
};

// ---------------------------------------------------------------------------
// advance_pose
// ---------------------------------------------------------------------------

export const advancePoseTool: McpToolDefinition = {
  name: "advance_pose",
  description: "Move to the next pose in a practice session.",
  inputSchema: {
    type: "object",
    properties: {
      sessionLayerId: {
        type: "string",
        description: "Timer layer ID for the session.",
      },
    },
    required: ["sessionLayerId"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const timerId = input.sessionLayerId as string;
    const timerLayer = context.layers.getAll().find((l) => l.id === timerId);
    if (!timerLayer) return errorResult(`Layer '${timerId}' not found.`);
    if (timerLayer.type !== "poses:timer") {
      return errorResult(`Layer '${timerId}' is not a poses:timer layer.`);
    }

    const sessionRaw = timerLayer.properties.sessionData as string;
    let session: SessionData;
    try {
      session = JSON.parse(sessionRaw);
    } catch {
      return errorResult("Invalid session data.");
    }

    const currentIndex = (timerLayer.properties.currentPoseIndex as number) ?? 0;
    const nextIndex = currentIndex + 1;

    if (nextIndex >= session.totalPoses) {
      return textResult("Session complete! All poses have been shown.");
    }

    const nextPose = session.poses[nextIndex];
    if (!nextPose) return errorResult("No more poses in session.");

    const nextDuration = session.durations?.[nextIndex] ?? 120;

    // Update timer layer
    context.layers.updateProperties(timerId, {
      currentPoseIndex: nextIndex,
      timerDuration: nextDuration,
      timerRemaining: nextDuration,
    });

    // Find the skeleton layer (first poses:skeleton in the stack)
    const skeletonLayer = context.layers.getAll().find((l) => l.type === "poses:skeleton");
    if (skeletonLayer) {
      context.layers.updateProperties(skeletonLayer.id, {
        poseData: JSON.stringify(nextPose),
        poseLabel: nextPose.label ?? "",
      });
    }

    context.emitChange("layer-updated");
    return textResult(
      `Advanced to pose ${nextIndex + 1}/${session.totalPoses}: ${nextPose.label ?? "Custom pose"} (${nextDuration}s).`,
    );
  },
};

// ---------------------------------------------------------------------------
// annotate_pose
// ---------------------------------------------------------------------------

export const annotatePoseTool: McpToolDefinition = {
  name: "annotate_pose",
  description: "Add study annotations to a pose skeleton (landmarks, angles, distances, action lines).",
  inputSchema: {
    type: "object",
    properties: {
      skeletonLayerId: {
        type: "string",
        description: "ID of the poses:skeleton layer to annotate.",
      },
      annotationType: {
        type: "string",
        enum: ["landmarks", "angles", "distances", "action-lines"],
        description: "Type of annotations to add.",
      },
      joints: {
        type: "array",
        items: { type: "string" },
        description: "Specific joints to annotate (optional, defaults to major joints).",
      },
      customAnnotations: {
        type: "array",
        description: "Custom annotation objects to add directly.",
      },
    },
    required: ["skeletonLayerId", "annotationType"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const skeletonId = input.skeletonLayerId as string;
    const skeletonLayer = context.layers.getAll().find((l) => l.id === skeletonId);
    if (!skeletonLayer) return errorResult(`Layer '${skeletonId}' not found.`);
    if (skeletonLayer.type !== "poses:skeleton") {
      return errorResult(`Layer '${skeletonId}' is not a poses:skeleton layer.`);
    }

    const annotationType = input.annotationType as string;

    let poseData: PoseData;
    try {
      poseData = JSON.parse(skeletonLayer.properties.poseData as string);
    } catch {
      return errorResult("Cannot parse pose data from skeleton layer.");
    }

    const kp = poseData.keypoints;
    const annotations: AnnotationItem[] = [];

    if (input.customAnnotations) {
      annotations.push(...(input.customAnnotations as AnnotationItem[]));
    } else {
      const joints = (input.joints as string[]) ??
        ["nose", "neck", "rShoulder", "lShoulder", "rElbow", "lElbow", "rWrist", "lWrist",
         "midHip", "rHip", "lHip", "rKnee", "lKnee", "rAnkle", "lAnkle"];

      switch (annotationType) {
        case "landmarks":
          for (const joint of joints) {
            const pt = kp[joint];
            if (pt) {
              annotations.push({
                type: "landmark",
                joint,
                label: joint,
                position: { x: pt.x, y: pt.y },
              });
            }
          }
          break;

        case "angles": {
          const angleJoints: [string, string, string][] = [
            ["rShoulder", "rElbow", "rWrist"],
            ["lShoulder", "lElbow", "lWrist"],
            ["rHip", "rKnee", "rAnkle"],
            ["lHip", "lKnee", "lAnkle"],
            ["neck", "rShoulder", "rElbow"],
            ["neck", "lShoulder", "lElbow"],
          ];
          for (const [j1, vertex, j2] of angleJoints) {
            const p1 = kp[j1], pv = kp[vertex], p2 = kp[j2];
            if (p1 && pv && p2) {
              annotations.push({
                type: "angle",
                joint1: j1,
                vertex,
                joint2: j2,
                value: computeAngle(p1, pv, p2),
              });
            }
          }
          break;
        }

        case "distances": {
          // Head unit = nose to neck distance
          const nose = kp.nose, neck = kp.neck;
          if (nose && neck) {
            const headUnit = Math.sqrt((nose.x - neck.x) ** 2 + (nose.y - neck.y) ** 2);
            const distPairs: [string, string, string][] = [
              ["neck", "midHip", "Torso"],
              ["rShoulder", "rWrist", "R Arm"],
              ["lShoulder", "lWrist", "L Arm"],
              ["rHip", "rAnkle", "R Leg"],
              ["lHip", "lAnkle", "L Leg"],
            ];
            for (const [from, to, label] of distPairs) {
              const pf = kp[from], pt = kp[to];
              if (pf && pt && headUnit > 0.001) {
                const dist = Math.sqrt((pf.x - pt.x) ** 2 + (pf.y - pt.y) ** 2);
                annotations.push({
                  type: "distance",
                  from,
                  to,
                  label,
                  headUnits: dist / headUnit,
                });
              }
            }
          }
          break;
        }

        case "action-lines": {
          // Line of action through nose, neck, midHip
          const actionPoints: Array<{ x: number; y: number }> = [];
          for (const j of ["nose", "neck", "midHip"]) {
            const pt = kp[j];
            if (pt) actionPoints.push({ x: pt.x, y: pt.y });
          }
          if (actionPoints.length >= 2) {
            annotations.push({ type: "action-line", points: actionPoints });
          }
          break;
        }
      }
    }

    // Create annotation layer
    const id = generateLayerId();
    const defaults = annotationsLayerType.createDefault();
    const properties = { ...defaults };
    properties.annotations = JSON.stringify(annotations);
    properties.referenceLayerId = skeletonId;
    properties.annotationType = annotationType === "action-lines" ? "action-lines" : annotationType;

    const layer: DesignLayer = {
      id,
      type: "poses:annotations",
      name: `Annotations — ${annotationType}`,
      visible: true,
      locked: true,
      opacity: 1,
      blendMode: "normal",
      transform: fullCanvasTransform(context),
      properties,
    };

    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(
      `Added ${annotations.length} ${annotationType} annotation(s) on layer '${id}'.`,
    );
  },
};

// ---------------------------------------------------------------------------
// analyze_pose
// ---------------------------------------------------------------------------

export const analyzePoseTool: McpToolDefinition = {
  name: "analyze_pose",
  description: "Analyze a pose skeleton — returns joint angles, proportions, center of gravity, symmetry score.",
  inputSchema: {
    type: "object",
    properties: {
      layerId: {
        type: "string",
        description: "Skeleton layer ID to analyze.",
      },
    },
    required: ["layerId"],
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layerId = input.layerId as string;
    const layer = context.layers.getAll().find((l) => l.id === layerId);
    if (!layer) return errorResult(`Layer '${layerId}' not found.`);
    if (layer.type !== "poses:skeleton") {
      return errorResult(`Layer '${layerId}' is not a poses:skeleton layer.`);
    }

    let poseData: PoseData;
    try {
      poseData = JSON.parse(layer.properties.poseData as string);
    } catch {
      return errorResult("Cannot parse pose data.");
    }

    const kp = poseData.keypoints;

    // Joint angles
    const angleJoints: [string, string, string, string][] = [
      ["R Elbow", "rShoulder", "rElbow", "rWrist"],
      ["L Elbow", "lShoulder", "lElbow", "lWrist"],
      ["R Knee", "rHip", "rKnee", "rAnkle"],
      ["L Knee", "lHip", "lKnee", "lAnkle"],
      ["R Shoulder", "neck", "rShoulder", "rElbow"],
      ["L Shoulder", "neck", "lShoulder", "lElbow"],
    ];
    const angles: Record<string, number> = {};
    for (const [name, j1, vertex, j2] of angleJoints) {
      const p1 = kp[j1], pv = kp[vertex], p2 = kp[j2];
      if (p1 && pv && p2) angles[name] = Math.round(computeAngle(p1, pv, p2));
    }

    // Proportions (head units)
    const nose = kp.nose, neck = kp.neck;
    const proportions: Record<string, number> = {};
    if (nose && neck) {
      const headUnit = Math.sqrt((nose.x - neck.x) ** 2 + (nose.y - neck.y) ** 2);
      if (headUnit > 0.001) {
        const pairs: [string, string, string][] = [
          ["Torso", "neck", "midHip"],
          ["R Arm", "rShoulder", "rWrist"],
          ["L Arm", "lShoulder", "lWrist"],
          ["R Leg", "rHip", "rAnkle"],
          ["L Leg", "lHip", "lAnkle"],
        ];
        for (const [name, a, b] of pairs) {
          const pa = kp[a], pb = kp[b];
          if (pa && pb) {
            proportions[name] = parseFloat(
              (Math.sqrt((pa.x - pb.x) ** 2 + (pa.y - pb.y) ** 2) / headUnit).toFixed(1),
            );
          }
        }
      }
    }

    const cog = computeCenterOfGravity(kp);
    const symmetry = computeSymmetryScore(kp);

    const analysis = {
      angles,
      proportions,
      centerOfGravity: { x: parseFloat(cog.x.toFixed(3)), y: parseFloat(cog.y.toFixed(3)) },
      symmetryScore: parseFloat(symmetry.toFixed(2)),
      label: poseData.label ?? "Custom pose",
    };

    return textResult(JSON.stringify(analysis, null, 2));
  },
};

// ---------------------------------------------------------------------------
// randomize_pose
// ---------------------------------------------------------------------------

export const randomizePoseTool: McpToolDefinition = {
  name: "randomize_pose",
  description: "Generate a random anatomically-plausible pose or pick a random preset.",
  inputSchema: {
    type: "object",
    properties: {
      tags: {
        type: "object",
        description: "Filter tags to narrow preset selection.",
      },
      seed: {
        type: "number",
        description: "Random seed for reproducibility.",
      },
    },
  } satisfies JsonSchema,

  async handler(
    input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const tags = input.tags as Record<string, string> | undefined;
    const seed = input.seed as number | undefined;

    const poses = getRandomPoses(1, tags as any, seed);
    if (poses.length === 0) return errorResult("No poses match the given filters.");

    const pose = poses[0]!;
    const poseData: PoseData = {
      keypoints: pose.keypoints,
      source: "preset",
      label: pose.label,
      tags: [pose.tags.category],
    };

    const defaults = skeletonLayerType.createDefault();
    const properties = { ...defaults };
    properties.poseData = JSON.stringify(poseData);
    properties.poseLabel = pose.label;

    const id = generateLayerId();
    const layer: DesignLayer = {
      id,
      type: "poses:skeleton",
      name: pose.label,
      visible: true,
      locked: true,
      opacity: 1,
      blendMode: "normal",
      transform: fullCanvasTransform(context),
      properties,
    };

    context.layers.add(layer);
    context.emitChange("layer-added");
    return textResult(`Added random pose '${id}': ${pose.label}.`);
  },
};

// ---------------------------------------------------------------------------
// clear_pose_layers
// ---------------------------------------------------------------------------

export const clearPoseLayersTool: McpToolDefinition = {
  name: "clear_pose_layers",
  description: "Remove all poses:* layers from the layer stack.",
  inputSchema: {
    type: "object",
    properties: {},
  } satisfies JsonSchema,

  async handler(
    _input: Record<string, unknown>,
    context: McpToolContext,
  ): Promise<McpToolResult> {
    const layers = context.layers.getAll();
    const poseIds = layers
      .filter((l) => l.type.startsWith("poses:"))
      .map((l) => l.id);

    if (poseIds.length === 0) {
      return textResult("No pose layers to remove.");
    }

    for (const id of poseIds) {
      context.layers.remove(id);
    }

    context.emitChange("layer-removed");
    return textResult(`Removed ${poseIds.length} pose layer(s).`);
  },
};

// ---------------------------------------------------------------------------
// Export all tools
// ---------------------------------------------------------------------------

export const posesMcpTools: McpToolDefinition[] = [
  addPoseSkeletonTool,
  setPoseKeypointsTool,
  createPracticeSessionTool,
  advancePoseTool,
  annotatePoseTool,
  analyzePoseTool,
  randomizePoseTool,
  clearPoseLayersTool,
];
