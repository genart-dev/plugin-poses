/**
 * Poses Plugin — All 88 Poses Render Test
 *
 * Grid layout: one row per category, each pose in a small cell.
 * Category label on the left, poses flowing right.
 *
 * Output: test-renders/all-poses.png
 */
const { createCanvas } = require("canvas");
const fs   = require("fs");
const path = require("path");

const {
  skeletonLayerType,
  getAllPoses,
  getPoseCategories,
  filterPoses,
} = require("./dist/index.cjs");

// Cell size for each pose
const CW = 140;
const CH = 160;
const PAD = 4;
const LABEL_W = 120; // left column for category label
const LABEL_PAD = 8;

const categories = getPoseCategories();
const categoryPoses = categories.map(cat => ({
  name: cat,
  poses: filterPoses({ category: cat }),
}));

const maxPerRow = Math.max(...categoryPoses.map(c => c.poses.length)); // 15

const W = LABEL_W + maxPerRow * (CW + PAD) + PAD;
const H = categories.length * (CH + PAD) + PAD;

const outDir = path.join(__dirname, "test-renders");
fs.mkdirSync(outDir, { recursive: true });

const resources = { getFont: () => null, getImage: () => null, theme: "dark", pixelRatio: 1 };

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

// Dark background
ctx.fillStyle = "#0d0d1a";
ctx.fillRect(0, 0, W, H);

for (let row = 0; row < categoryPoses.length; row++) {
  const { name, poses } = categoryPoses[row];
  const rowY = PAD + row * (CH + PAD);

  // Category label
  ctx.save();
  ctx.fillStyle = "#555566";
  ctx.font = "bold 13px sans-serif";
  ctx.textBaseline = "top";
  ctx.fillText(name.toUpperCase(), LABEL_PAD, rowY + 8);
  ctx.fillStyle = "#444455";
  ctx.font = "10px sans-serif";
  ctx.fillText(`${poses.length} poses`, LABEL_PAD, rowY + 26);
  ctx.restore();

  for (let col = 0; col < poses.length; col++) {
    const pose = poses[col];
    const cellX = LABEL_W + col * (CW + PAD);
    const cellY = rowY;

    // Cell background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(cellX, cellY, CW, CH);
    ctx.strokeStyle = "#252540";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cellX + 0.5, cellY + 0.5, CW - 1, CH - 1);

    // Render skeleton
    const bounds = {
      x: cellX + 8,
      y: cellY + 4,
      width: CW - 16,
      height: CH - 24,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };

    const poseData = JSON.stringify({
      keypoints: pose.keypoints,
      source: "preset",
    });

    const props = {
      ...skeletonLayerType.createDefault(),
      poseData,
      colorMode: "limb-groups",
      jointRadius: 3,
      limbWidth: 1.5,
    };

    skeletonLayerType.render(props, ctx, bounds, resources);

    // Pose label at bottom of cell
    ctx.save();
    ctx.fillStyle = "#666677";
    ctx.font = "9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    // Truncate long labels
    let label = pose.label;
    if (label.length > 20) label = label.slice(0, 19) + "\u2026";
    ctx.fillText(label, cellX + CW / 2, cellY + CH - 3);
    ctx.textAlign = "start";
    ctx.restore();
  }
}

// Write output
const outPath = path.join(outDir, "all-poses.png");
const buf = canvas.toBuffer("image/png");
fs.writeFileSync(outPath, buf);
console.log(`Wrote ${outPath} (${W}x${H}, ${(buf.length / 1024).toFixed(1)} KB)`);
