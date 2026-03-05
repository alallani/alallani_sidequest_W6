// src/world/TileBuilder.js
// Tile + static group construction (WORLD helper).
//
// Collectible: key (replaces leaf).
//   keySpriteSheet.png: 768x32px, 24 frames at 32x32px, single row.
//
// SIZE FIX: Setting w/h on the group before Tiles() is unreliable — p5play
// resets each spawned sprite's size to match the animation frame dimensions.
// Solution (same pattern as scorpion scale): set sprite.scale = KEY_SCALE
// on each sprite AFTER Tiles() has spawned them. Scale affects only the
// visual render; the (already-removed) collider is unaffected.

import { buildBoarGroup } from "./BoarSystem.js";

const KEY_SCALE = 0.4; // 32px source * 0.4 = ~13px rendered
// Adjust this one value to resize all keys.

export function buildTilesAndGroups(level) {
  // ---------------------------------------------------------------------------
  // 1) Validate data contract
  // ---------------------------------------------------------------------------
  const tilemap = level.levelData?.tilemap;
  if (!Array.isArray(tilemap) || tilemap.length === 0) {
    throw new Error(
      `[TileBuilder] level.levelData.tilemap is missing or empty.`,
    );
  }

  const tiles = level.levelData?.tiles;
  if (!tiles || typeof tiles !== "object") {
    throw new Error(
      `[TileBuilder] levels.json is missing level.tiles { tileW, tileH, frameW, frameH }.`,
    );
  }

  const tileW = Number(tiles.tileW);
  const tileH = Number(tiles.tileH);

  if (!Number.isFinite(tileW) || tileW <= 0) {
    throw new Error(`[TileBuilder] Invalid tiles.tileW: ${tiles.tileW}`);
  }
  if (!Number.isFinite(tileH) || tileH <= 0) {
    throw new Error(`[TileBuilder] Invalid tiles.tileH: ${tiles.tileH}`);
  }

  level._tileW = tileW;
  level._tileH = tileH;

  // ---------------------------------------------------------------------------
  // 2) Build groups (BEFORE new Tiles())
  // ---------------------------------------------------------------------------

  // --- scorpion group (tile = 'b') ---
  buildBoarGroup(level);

  // --- key group (tile = 'x') — replaces leaf ---
  // w/h intentionally NOT set here — Tiles() would override them anyway.
  // Scale is applied per-sprite after Tiles() below.
  level.leaf = new Group();
  level.leaf.physics = "static";
  level.leaf.spriteSheet = level.assets.leafImg; // leafImg = keySpriteSheet.png
  level.leaf.anis.w = 32;
  level.leaf.anis.h = 32;
  level.leaf.addAnis({
    idle: { row: 0, frames: 24, frameDelay: 3 },
  });
  level.leaf.tile = "x";

  // --- fire group (tile = 'f') ---
  level.fire = new Group();
  level.fire.physics = "static";
  level.fire.spriteSheet = level.assets.fireImg;
  level.fire.addAnis({ burn: { w: 32, h: 32, row: 0, frames: 16 } });
  level.fire.w = 18;
  level.fire.h = 16;
  level.fire.tile = "f";

  // --- ground tile (g) ---
  level.ground = new Group();
  level.ground.physics = "static";
  level.ground.img = level.assets.groundTileImg;
  level.ground.w = tileW;
  level.ground.h = tileH;
  level.ground.tile = "g";

  // --- deep ground tile (d) ---
  level.groundDeep = new Group();
  level.groundDeep.physics = "static";
  level.groundDeep.img = level.assets.groundTileDeepImg;
  level.groundDeep.w = tileW;
  level.groundDeep.h = tileH;
  level.groundDeep.tile = "d";

  // --- platform left cap (L) ---
  level.platformsL = new Group();
  level.platformsL.physics = "static";
  level.platformsL.img = level.assets.platformLCImg;
  level.platformsL.w = tileW;
  level.platformsL.h = tileH;
  level.platformsL.tile = "L";

  // --- platform right cap (R) ---
  level.platformsR = new Group();
  level.platformsR.physics = "static";
  level.platformsR.img = level.assets.platformRCImg;
  level.platformsR.w = tileW;
  level.platformsR.h = tileH;
  level.platformsR.tile = "R";

  // --- wall left ([) ---
  level.wallsL = new Group();
  level.wallsL.physics = "static";
  level.wallsL.img = level.assets.wallLImg;
  level.wallsL.w = tileW;
  level.wallsL.h = tileH;
  level.wallsL.tile = "[";

  // --- wall right (]) ---
  level.wallsR = new Group();
  level.wallsR.physics = "static";
  level.wallsR.img = level.assets.wallRImg;
  level.wallsR.w = tileW;
  level.wallsR.h = tileH;
  level.wallsR.tile = "]";

  // ---------------------------------------------------------------------------
  // 3) Spawn everything from the tilemap
  // ---------------------------------------------------------------------------
  new Tiles(tilemap, 0, 0, tileW, tileH);

  // ---------------------------------------------------------------------------
  // 4) Post-spawn adjustments
  // ---------------------------------------------------------------------------

  // Fire: overlap-only sensor
  for (const s of level.fire) {
    s.collider = "static";
    s.sensor = true;
  }

  // Keys: scale down THEN remove colliders.
  // Scale must be set after Tiles() spawns the sprites — setting it on the
  // group before Tiles() has no effect on the spawned sprite sizes.
  for (const s of level.leaf) {
    try {
      s.scale = KEY_SCALE;
    } catch (_) {}
    s.removeColliders();
  }
}
