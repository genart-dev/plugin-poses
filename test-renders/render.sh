#!/usr/bin/env bash
# Render poses plugin test images using the genart CLI.
# Usage: bash test-renders/render.sh

set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"

CLI="${GENART_CLI:-node $HOME/genart-dev/cli/dist/index.js}"

echo "Rendering poses-montage..."
$CLI render "$DIR/poses-montage.genart" -o "$DIR/poses-montage.png"

echo "Rendering all-poses..."
$CLI render "$DIR/all-poses.genart" -o "$DIR/all-poses.png"

echo "Done. Output in $DIR/"
