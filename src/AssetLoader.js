// src/AssetLoader.js
// Asset loading (SYSTEM layer).
//
// Player sprite: "camperSpriteSheet.png"   — 288x240, 48x48 frames, 5 rows.
// Enemy sprite:  "scorpionSpriteSheet.png" — 192x240, 48x48 frames, 5 rows.
//                Visual size reduced via sprite.scale = 0.5 in BoarSystem.
// Collectible:   "keySpriteSheet.png"      — 768x32,  32x32 frames, 24 frames (full spin).
//                Replaces leaf. Single row (row 0).
//
// IMPORTANT: Do NOT inject `spriteSheet` into individual animation defs.
// Set sprite.spriteSheet once globally — per-def spriteSheet causes p5play
// to re-derive anis.w/h from the image, breaking row-based frame lookup.

export async function loadAssets(levelPkg, tuningDoc) {
  // ---- Player ----
  const playerImg = await loadImageAsync("assets/camperSpriteSheet.png");

  // ---- Enemy (scorpion) ----
  const boarImg = await loadImageAsync("assets/scorpionSpriteSheet.png");

  // ---- Collectible (key replaces leaf) ----
  const leafImg = await loadImageAsync("assets/keySpriteSheet.png");

  // ---- Hazard ----
  const fireImg = await loadImageAsync("assets/plantSpriteSheet2.png");

  // ---- Tiles ----
  const groundTileImg = await loadImageAsync("assets/groundTile.png");
  const groundTileDeepImg = await loadImageAsync("assets/groundTileDeep.png");
  const platformLCImg = await loadImageAsync("assets/platformLC.png");
  const platformRCImg = await loadImageAsync("assets/platformRC.png");
  const wallLImg = await loadImageAsync("assets/wallL.png");
  const wallRImg = await loadImageAsync("assets/wallR.png");
  const tileCornerBRImg = await loadImageAsync("assets/tileCornerBR.png");
  const tileCornerBLImg = await loadImageAsync("assets/tileCornerBL.png");
  const tileCornerTRImg = await loadImageAsync("assets/tileCornerTR.png");
  const tileCornerTLImg = await loadImageAsync("assets/tileCornerTL.png");
  const flagImg = await loadImageAsync("assets/flagSpriteSheet.png");

  // ---- UI ----
  const fontImg = await loadImageAsync("assets/bitmapFont.png");

  // ---- Backgrounds ----
  const backgrounds = await loadBackgrounds(levelPkg);

  // ---- Player animation defs (48x48 frames, no spriteSheet per def) ----
  const playerAnis = {
    idle: { row: 0, frames: 4, frameDelay: 10 },
    run: { row: 1, frames: 6, frameDelay: 4 },
    jump: { row: 1, frames: 1, frameDelay: Infinity, frame: 0 },
    attack: { row: 2, frames: 4, frameDelay: 3 },
    hurtPose: { row: 3, frames: 2, frameDelay: Infinity, frame: 0 },
    death: { row: 4, frames: 4, frameDelay: 16 },
  };

  // ---- Scorpion animation defs (48x48 frames, no spriteSheet per def) ----
  const boarAnis = {
    run: { row: 1, frames: 4, frameDelay: 4 },
    throwPose: { row: 3, frames: 1, frameDelay: Infinity, frame: 0 },
    death: { row: 4, frames: 4, frameDelay: 16 },
  };

  validateAssets({
    playerImg,
    boarImg,
    leafImg,
    fireImg,
    groundTileImg,
    groundTileDeepImg,
    platformLCImg,
    platformRCImg,
    wallLImg,
    wallRImg,
    tileCornerBRImg,
    tileCornerBLImg,
    tileCornerTRImg,
    tileCornerTLImg,
    flagImg,
    fontImg,
    backgrounds,
  });

  return {
    playerImg,
    boarImg,
    leafImg, // keySpriteSheet.png — variable name kept for compatibility
    fireImg,

    groundTileImg,
    groundTileDeepImg,
    platformLCImg,
    platformRCImg,
    wallLImg,
    wallRImg,
    tileCornerBRImg,
    tileCornerBLImg,
    tileCornerTRImg,
    tileCornerTLImg,
    flagImg,

    fontImg,
    backgrounds,

    playerAnis,
    boarAnis,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadImageAsync(path) {
  if (!path)
    throw new Error(
      `[AssetLoader] loadImageAsync called with invalid path: ${path}`,
    );
  return new Promise((resolve, reject) => {
    try {
      loadImage(
        path,
        (img) => resolve(img),
        (err) =>
          reject(new Error(`[AssetLoader] Failed to load "${path}": ${err}`)),
      );
    } catch (e) {
      reject(
        new Error(
          `[AssetLoader] loadImage("${path}") threw: ${e?.message ?? e}`,
        ),
      );
    }
  });
}

async function loadBackgrounds(levelPkg) {
  const layers = levelPkg?.level?.view?.parallax ?? levelPkg?.parallaxLayers;

  if (Array.isArray(layers) && layers.length > 0) {
    const bg = {};
    for (const layer of layers) {
      const key = layer?.key;
      const src = layer?.src ?? layer?.path ?? layer?.img;
      if (!key) continue;
      bg[key] = src ? await loadImageAsync(src) : undefined;
    }
    return bg;
  }

  return {
    bgFar: await loadImageAsync("assets/background_layer_1.png"),
    bgMid: await loadImageAsync("assets/background_layer_2.png"),
    bgFore: await loadImageAsync("assets/background_layer_3.png"),
  };
}

function validateAssets(bundle) {
  const required = [
    "playerImg",
    "boarImg",
    "leafImg",
    "fireImg",
    "groundTileImg",
    "groundTileDeepImg",
    "platformLCImg",
    "platformRCImg",
    "wallLImg",
    "wallRImg",
    "fontImg",
  ];
  for (const key of required) {
    if (!bundle[key])
      throw new Error(`[AssetLoader] Missing required image: ${key}`);
  }
  if (!bundle.backgrounds || typeof bundle.backgrounds !== "object") {
    throw new Error("[AssetLoader] Missing backgrounds object");
  }
  for (const [k, v] of Object.entries(bundle.backgrounds)) {
    if (!v) throw new Error(`[AssetLoader] Background "${k}" failed to load`);
  }
}
