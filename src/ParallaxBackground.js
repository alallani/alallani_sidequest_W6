// src/ParallaxBackground.js
// Parallax background renderer (VIEW layer).
//
// Responsibilities:
// - Draw repeating background layers in screen-space (camera.off())
// - Offset layers based on camera.x using per-layer factor
// - Support multiple depth layers for a sense of movement
//
// Non-goals:
// - Does NOT modify camera position or world state
// - Does NOT load images (main.js preload does)
// - Does NOT interact with physics/entities
//
// Architectural notes:
// - main.js owns parallax construction using level.view.parallax from levels.json.
// - This stays VIEW-only so it can be swapped or removed without touching gameplay.

export class ParallaxBackground {
  /**
   * @param {Object} layers
   * Example:
   * [
   *   { img: bgFar, factor: 0.2 },
   *   { img: bgMid, factor: 0.5 },
   *   { img: bgFore, factor: 0.8 }
   * ]
   */
  constructor(layers = []) {
    this.layers = layers;
    // Smooth internal offset per layer to prevent jitter
    this.smoothOffsets = layers.map(() => null);
  }

  draw({ cameraX, viewW, viewH }) {
    camera.off();
    drawingContext.imageSmoothingEnabled = false;

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const { img, factor = 1 } = layer;
      if (!img || !img.width) continue;

      const targetOffset = -cameraX * factor;

      // Apply smoothing to prevent micro-jitter (slower layers get more smoothing)
      const smoothFactor = 0.3 + factor * 0.5; // 0.3 to 0.8 based on layer depth
      if (this.smoothOffsets[i] === null) {
        this.smoothOffsets[i] = targetOffset;
      } else {
        this.smoothOffsets[i] +=
          (targetOffset - this.smoothOffsets[i]) * smoothFactor;
      }
      const offsetX = this.smoothOffsets[i];

      // tile horizontally
      const imgW = img.width;
      const imgH = img.height;

      // Calculate smooth tiling offset (preserve fractional pixel offset within tile)
      const tileOffset = offsetX - Math.floor(offsetX / imgW) * imgW; // 0 to imgW
      const startX = tileOffset - imgW; // -imgW to 0

      for (let x = startX; x < viewW; x += imgW) {
        image(img, Math.floor(x), 0, imgW, viewH);
      }
    }

    camera.on();
  }
}
