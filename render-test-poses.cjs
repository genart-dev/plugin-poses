/**
 * Poses Plugin — Visual Render Test
 *
 * Montage layout (4 columns × 4 rows):
 *   Row 0: Skeleton styles (stick, proportional, silhouette) + mirror
 *   Row 1: Color modes (uniform, limb-groups, left-right, rainbow)
 *   Row 2: Pose categories sample (standing, seated, dynamic, dance, combat, foreshortened, climbing, gesture)
 *   Row 3: Timer, landmarks, angles, action-lines
 *
 * Output: test-renders/poses-montage.png
 */
const { createCanvas } = require("canvas");
const fs   = require("fs");
const path = require("path");

const {
  skeletonLayerType,
  timerLayerType,
  annotationsLayerType,
  getAllPoses,
  filterPoses,
} = require("./dist/index.cjs");

const CW = 380;
const CH = 280;
const PAD = 8;
const LABEL_H = 30;
const COLS = 4;
const ROWS = 4;
const W = COLS * CW + (COLS + 1) * PAD;
const H = ROWS * (CH + LABEL_H) + (ROWS + 1) * PAD;

const outDir = path.join(__dirname, "test-renders");
fs.mkdirSync(outDir, { recursive: true });

const resources = { getFont: () => null, getImage: () => null, theme: "dark", pixelRatio: 1 };

function cellBounds(col, row) {
  const x = PAD + col * (CW + PAD);
  const y = PAD + row * (CH + LABEL_H + PAD) + LABEL_H;
  return { x, y, width: CW, height: CH, rotation: 0, scaleX: 1, scaleY: 1 };
}

function drawLabel(ctx, col, row, title, subtitle) {
  const x = PAD + col * (CW + PAD);
  const y = PAD + row * (CH + LABEL_H + PAD);
  ctx.fillStyle = "#333333";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(title, x + 6, y + 15);
  ctx.fillStyle = "#888888";
  ctx.font = "10px sans-serif";
  ctx.fillText(subtitle, x + 6, y + 27);
}

function cellBackground(ctx, b) {
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(b.x, b.y, b.width, b.height);
  ctx.strokeStyle = "#333344";
  ctx.lineWidth = 0.5;
  ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);
}

function poseDataStr(pose) {
  return JSON.stringify({ keypoints: pose.keypoints, source: "preset", label: pose.label });
}

// Main canvas
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

ctx.fillStyle = "#0d0d1a";
ctx.fillRect(0, 0, W, H);

// Get sample poses
const allPoses = getAllPoses();
const standingPose = allPoses.find(p => p.id === "standing-neutral-front") || allPoses[0];
const contrappostoPose = allPoses.find(p => p.id === "standing-contrapposto-left") || allPoses[1];

// ─── Row 0: Skeleton styles + mirror ──────────────────────────────────────

// Stick style
{
  const b = cellBounds(0, 0);
  cellBackground(ctx, b);
  drawLabel(ctx, 0, 0, "Stick Style", "Default skeleton rendering");
  const props = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(standingPose),
    skeletonStyle: "stick",
  };
  skeletonLayerType.render(props, ctx, b, resources);
}

// Proportional style
{
  const b = cellBounds(1, 0);
  cellBackground(ctx, b);
  drawLabel(ctx, 1, 0, "Proportional Style", "Tapered limb widths");
  const props = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(contrappostoPose),
    skeletonStyle: "proportional",
  };
  skeletonLayerType.render(props, ctx, b, resources);
}

// Silhouette style
{
  const b = cellBounds(2, 0);
  cellBackground(ctx, b);
  drawLabel(ctx, 2, 0, "Silhouette Style", "Thick rounded paths");
  const dynamicPose = filterPoses({ category: "dynamic" })[0];
  const props = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(dynamicPose),
    skeletonStyle: "silhouette",
  };
  skeletonLayerType.render(props, ctx, b, resources);
}

// Mirror
{
  const b = cellBounds(3, 0);
  cellBackground(ctx, b);
  drawLabel(ctx, 3, 0, "Mirrored + Bounding Box", "Horizontal flip, bbox overlay");
  const props = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(standingPose),
    mirror: true,
    showBoundingBox: true,
  };
  skeletonLayerType.render(props, ctx, b, resources);
}

// ─── Row 1: Color modes ───────────────────────────────────────────────────

const colorPose = filterPoses({ category: "dance" })[0] || allPoses[5];
const colorModes = ["uniform", "limb-groups", "left-right", "rainbow"];
for (let i = 0; i < colorModes.length; i++) {
  const mode = colorModes[i];
  const b = cellBounds(i, 1);
  cellBackground(ctx, b);
  drawLabel(ctx, i, 1, `Color: ${mode}`, `${mode} coloring on dance pose`);
  const props = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(colorPose),
    colorMode: mode,
    jointRadius: 6,
  };
  skeletonLayerType.render(props, ctx, b, resources);
}

// ─── Row 2: Pose categories ───────────────────────────────────────────────

const categories = ["standing", "seated", "dynamic", "dance", "combat", "foreshortened", "climbing", "gesture"];
for (let i = 0; i < categories.length; i++) {
  const col = i % 4;
  // Use two sub-rows within row 2 space — render 8 categories as a 4×2 mini-grid
  // Actually just show first 4 in row 2
  if (i >= 4) continue;
  const cat = categories[i];
  const poses = filterPoses({ category: cat });
  const pose = poses[Math.floor(poses.length / 2)] || poses[0];
  const b = cellBounds(col, 2);
  cellBackground(ctx, b);
  drawLabel(ctx, col, 2, `Category: ${cat}`, `"${pose.label}"`);
  const props = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(pose),
    colorMode: "limb-groups",
  };
  skeletonLayerType.render(props, ctx, b, resources);
}

// ─── Row 3: Timer + annotations ───────────────────────────────────────────

// Timer
{
  const b = cellBounds(0, 3);
  cellBackground(ctx, b);
  drawLabel(ctx, 0, 3, "Timer Layer", "Countdown + progress bar");
  const session = {
    poses: [{ keypoints: {} }, { keypoints: {} }, { keypoints: {} }],
    type: "gesture",
    totalPoses: 3,
  };
  const props = {
    ...timerLayerType.createDefault(),
    sessionData: JSON.stringify(session),
    currentPoseIndex: 1,
    timerRemaining: 45,
    timerDuration: 60,
    showProgress: true,
  };
  timerLayerType.render(props, ctx, b, resources);
}

// Landmarks
{
  const b = cellBounds(1, 3);
  cellBackground(ctx, b);
  drawLabel(ctx, 1, 3, "Landmarks Annotations", "Joint labels on skeleton");
  // First render skeleton
  const pose = standingPose;
  const skelProps = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(pose),
    guideColor: "rgba(0,200,255,0.3)",
  };
  skeletonLayerType.render(skelProps, ctx, b, resources);
  // Then render annotations
  const landmarks = [
    { type: "landmark", joint: "nose", label: "Nose", position: pose.keypoints.nose },
    { type: "landmark", joint: "rShoulder", label: "R.Shoulder", position: pose.keypoints.rShoulder },
    { type: "landmark", joint: "lShoulder", label: "L.Shoulder", position: pose.keypoints.lShoulder },
    { type: "landmark", joint: "rWrist", label: "R.Wrist", position: pose.keypoints.rWrist },
    { type: "landmark", joint: "lWrist", label: "L.Wrist", position: pose.keypoints.lWrist },
    { type: "landmark", joint: "rAnkle", label: "R.Ankle", position: pose.keypoints.rAnkle },
    { type: "landmark", joint: "lAnkle", label: "L.Ankle", position: pose.keypoints.lAnkle },
  ];
  const annProps = {
    ...annotationsLayerType.createDefault(),
    annotations: JSON.stringify(landmarks),
    annotationType: "landmarks",
    annotationColor: "rgba(255,235,59,0.9)",
    showLabels: true,
  };
  annotationsLayerType.render(annProps, ctx, b, resources);
}

// Angles
{
  const b = cellBounds(2, 3);
  cellBackground(ctx, b);
  drawLabel(ctx, 2, 3, "Angle Annotations", "Joint angle measurement");
  const pose = contrappostoPose;
  const skelProps = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(pose),
    guideColor: "rgba(0,200,255,0.3)",
  };
  skeletonLayerType.render(skelProps, ctx, b, resources);
  const angles = [
    { type: "angle", joint1: "rShoulder", vertex: "rElbow", joint2: "rWrist", value: 120 },
    { type: "angle", joint1: "lShoulder", vertex: "lElbow", joint2: "lWrist", value: 135 },
    { type: "angle", joint1: "rHip", vertex: "rKnee", joint2: "rAnkle", value: 170 },
  ];
  const annProps = {
    ...annotationsLayerType.createDefault(),
    annotations: JSON.stringify(angles),
    annotationType: "angles",
    annotationColor: "rgba(76,175,80,0.9)",
  };
  annotationsLayerType.render(annProps, ctx, b, resources);
}

// Action lines
{
  const b = cellBounds(3, 3);
  cellBackground(ctx, b);
  drawLabel(ctx, 3, 3, "Action-Line Annotations", "Gesture flow line");
  const pose = filterPoses({ category: "dynamic" })[2] || allPoses[20];
  const skelProps = {
    ...skeletonLayerType.createDefault(),
    poseData: poseDataStr(pose),
    guideColor: "rgba(0,200,255,0.3)",
  };
  skeletonLayerType.render(skelProps, ctx, b, resources);
  // Action line through head->torso->hips
  const kp = pose.keypoints;
  const actionLine = [
    { type: "action-line", points: [
      { x: kp.nose.x, y: kp.nose.y },
      { x: kp.neck.x, y: kp.neck.y },
      { x: kp.midHip.x, y: kp.midHip.y },
      { x: (kp.lKnee.x + kp.rKnee.x) / 2, y: (kp.lKnee.y + kp.rKnee.y) / 2 },
      { x: (kp.lAnkle.x + kp.rAnkle.x) / 2, y: (kp.lAnkle.y + kp.rAnkle.y) / 2 },
    ]},
  ];
  const annProps = {
    ...annotationsLayerType.createDefault(),
    annotations: JSON.stringify(actionLine),
    annotationType: "action-lines",
    annotationColor: "rgba(255,87,34,0.9)",
  };
  annotationsLayerType.render(annProps, ctx, b, resources);
}

// Write output
const outPath = path.join(outDir, "poses-montage.png");
const buf = canvas.toBuffer("image/png");
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${outPath} (${W}x${H}, ${(buf.length / 1024).toFixed(1)} KB)`);
