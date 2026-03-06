// src/world/BoarSystem.js
// Scorpion AI + probes (WORLD helper).
//
// Scorpion sheet: scorpionSpriteSheet.png — 192x240, 48x48 frames, 4 cols x 5 rows.
//   row 0=idle  row 1=walk  row 2=attack  row 3=hurt  row 4=death
//
// ALIGNMENT FIX: Every row has 0px of empty space at the bottom of the frame
// (content sits flush against the bottom edge). This means p5play's centered
// rendering places the scorpion visually below its collider, sinking into tiles.
// Fix: anis.offset.y = -16 (source pixels) shifts the visual upward by ~8px
// on screen (after scale=0.5), aligning the feet with the collider bottom.
//
// IMPORTANT: spriteSheet set globally (group/sprite), NOT per animation def.
//   Order: spriteSheet → anis.w/h + anis.offset.y → addAnis.

const SCORPION_SCALE = 0.5; // 48px frame renders at ~24px
const SCORPION_OFFSET_Y = -16; // source px upward shift to sit on top of tiles

export function buildBoarGroup(level) {
  const frameW = 48;
  const frameH = 48;

  level.boar = new Group();
  level.boar.physics = "dynamic";
  level.boar.tile = "b";

  const hasDefs = !!(
    level.assets?.boarAnis && typeof level.assets.boarAnis === "object"
  );

  if (hasDefs) {
    safeAssignSpriteSheet(level.boar, level.assets.boarImg);
    safeConfigureAniSheet(level.boar, frameW, frameH, SCORPION_OFFSET_Y);
    try {
      level.boar.addAnis(level.assets.boarAnis);
    } catch (err) {
      console.warn("[BoarSystem] group.addAnis failed:", err);
      level.boar.img = level.assets.boarImg;
    }
  } else {
    level.boar.img = level.assets.boarImg;
  }
}

function ensureBoarAnis(level, e) {
  const defs = level.assets?.boarAnis;
  if (!defs || typeof defs !== "object") return;

  const hasRun = !!(e.anis && e.anis.run);
  const hasDeath = !!(e.anis && e.anis.death);
  const hasThrow = !!(e.anis && e.anis.throwPose);
  if (hasRun && hasDeath && hasThrow) return;

  safeAssignSpriteSheet(e, level.assets.boarImg);
  safeConfigureAniSheet(e, 48, 48, SCORPION_OFFSET_Y);
  try {
    e.addAnis(defs);
  } catch (err) {
    console.warn("[BoarSystem] sprite.addAnis failed:", err);
    e.img = level.assets.boarImg;
  }
}

// ---------------------------------------------------------------------------
// p5play compatibility helpers
// ---------------------------------------------------------------------------

function boarWidth(e, fallbackW) {
  return Number(e?.width ?? e?.w ?? fallbackW) || Number(fallbackW) || 14;
}
function boarHeight(e, fallbackH) {
  return Number(e?.height ?? e?.h ?? fallbackH) || Number(fallbackH) || 14;
}

function needsColliderReplace(e, desiredW, desiredH) {
  return (
    Math.abs(boarWidth(e, desiredW) - desiredW) > 0.25 ||
    Math.abs(boarHeight(e, desiredH) - desiredH) > 0.25
  );
}

function replaceBoarSprite(level, oldBoar, desiredW, desiredH) {
  const s = new Sprite(oldBoar.x, oldBoar.y, desiredW, desiredH);
  s.dir = oldBoar.dir;
  s._lvlInit = false;

  oldBoar.footProbe?.remove?.();
  oldBoar.frontProbe?.remove?.();
  oldBoar.groundProbe?.remove?.();
  oldBoar.remove?.();

  level.boar.add(s);
  return s;
}

function safeAssignSpriteSheet(target, img) {
  if (!img || !target) return;
  try {
    target.spriteSheet = img;
  } catch (_) {}
}

function safeConfigureAniSheet(target, frameW, frameH, offsetY) {
  if (!target) return;
  try {
    if (!target.anis) return;
    try {
      target.anis.w = frameW;
    } catch (_) {}
    try {
      target.anis.h = frameH;
    } catch (_) {}
    try {
      if (target.anis.offset) target.anis.offset.y = offsetY;
    } catch (_) {}
  } catch (_) {}
}

function applyScale(e) {
  try {
    e.scale = SCORPION_SCALE;
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// Public helpers used by Level
// ---------------------------------------------------------------------------

export function hookBoarSolids(level) {
  if (!level.boar) return;
  if (level.ground) level.boar.collides(level.ground);
  if (level.groundDeep) level.boar.collides(level.groundDeep);
  if (level.platformsL) level.boar.collides(level.platformsL);
  if (level.platformsR) level.boar.collides(level.platformsR);
  if (level.wallsL) level.boar.collides(level.wallsL);
  if (level.wallsR) level.boar.collides(level.wallsR);
  if (level.cornerBR) level.boar.collides(level.cornerBR);
  if (level.cornerBL) level.boar.collides(level.cornerBL);
  if (level.cornerTR) level.boar.collides(level.cornerTR);
  if (level.cornerTL) level.boar.collides(level.cornerTL);
}

export function cacheBoarSpawns(level) {
  level.boarSpawns = [];
  if (!level.boar) return;
  for (const e of level.boar) {
    level.boarSpawns.push({ x: e.x, y: e.y, dir: e.dir });
  }
}

export function clearBoars(level) {
  if (!level.boar) return;
  for (const e of level.boar) {
    e.footProbe?.remove?.();
    e.frontProbe?.remove?.();
    e.groundProbe?.remove?.();
    e.remove?.();
  }
}

export function rebuildBoarsFromSpawns(level) {
  buildBoarGroup(level);

  const boarW = Number(level.tuning.boar?.w ?? 14);
  const boarH = Number(level.tuning.boar?.h ?? 14);
  const boarHP = Number(level.tuning.boar?.hp ?? 3);

  for (const s of level.boarSpawns) {
    const e = new Sprite(s.x, s.y, boarW, boarH);

    const hasDefs =
      level.assets?.boarAnis && typeof level.assets.boarAnis === "object";
    if (hasDefs) {
      safeAssignSpriteSheet(e, level.assets.boarImg);
      safeConfigureAniSheet(e, 48, 48, SCORPION_OFFSET_Y);
      try {
        e.addAnis(level.assets.boarAnis);
      } catch (_) {
        e.img = level.assets.boarImg;
      }
    } else {
      e.img = level.assets.boarImg;
    }

    applyScale(e);

    e.rotationLock = true;
    e.physics = "dynamic";
    e.friction = 0;
    e.bounciness = 0;
    e.hp = boarHP;

    attachBoarProbes(level, e);

    e.dir = s.dir === 1 || s.dir === -1 ? s.dir : random([-1, 1]);
    fixSpawnEdgeCase(level, e);

    e.wasDanger = false;
    e.flashTimer = 0;
    e.knockTimer = 0;
    e.turnTimer = 0;
    e.dead = false;
    e.dying = false;
    e.deathStarted = false;
    e.deathFrameTimer = 0;
    e.vanishTimer = 0;
    e.holdX = e.x;
    e.holdY = e.y;

    e.mirror.x = e.dir === -1;
    level._setAniSafe?.(e, "run");
    level.boar.add(e);
  }
}

// ---------------------------------------------------------------------------
// Scorpion AI update
// ---------------------------------------------------------------------------

export function updateBoars(level) {
  if (!level.boar) return;

  if (level.won) {
    for (const e of level.boar) e.vel.x = 0;
    return;
  }

  const boarSpeed = Number(level.tuning.boar?.speed ?? 0.5);
  const boarW = Number(level.tuning.boar?.w ?? 14);
  const boarH = Number(level.tuning.boar?.h ?? 14);
  const boarHP = Number(level.tuning.boar?.hp ?? 3);
  const hasAnis =
    level.assets?.boarAnis && typeof level.assets.boarAnis === "object";

  const boarsSnapshot = [...level.boar];

  for (const old of boarsSnapshot) {
    let e = old;

    // -----------------------------
    // One-time init for Tiles()-spawned scorpions
    // -----------------------------
    if (e._lvlInit !== true) {
      if (needsColliderReplace(e, boarW, boarH)) {
        e = replaceBoarSprite(level, e, boarW, boarH);
      }

      e._lvlInit = true;
      e.physics = "dynamic";
      e.rotationLock = true;
      e.friction = 0;
      e.bounciness = 0;
      e.hp = e.hp ?? boarHP;

      if (hasAnis) {
        safeAssignSpriteSheet(e, level.assets.boarImg);
        safeConfigureAniSheet(e, 48, 48, SCORPION_OFFSET_Y);
        try {
          if (!e.anis || !e.anis.run) e.addAnis(level.assets.boarAnis);
        } catch (_) {}
        ensureBoarAnis(level, e);
      } else {
        e.img = level.assets.boarImg;
      }

      applyScale(e);

      attachBoarProbes(level, e);

      e.dir = e.dir === 1 || e.dir === -1 ? e.dir : random([-1, 1]);
      fixSpawnEdgeCase(level, e);

      e.wasDanger = false;
      e.flashTimer = 0;
      e.knockTimer = 0;
      e.turnTimer = 0;
      e.dead = false;
      e.dying = false;
      e.deathStarted = false;
      e.deathFrameTimer = 0;
      e.vanishTimer = 0;
      e.holdX = e.x;
      e.holdY = e.y;

      e.mirror.x = e.dir === -1;
      level._setAniSafe?.(e, "run");
    }

    // -----------------------------
    // Probes + timers
    // -----------------------------
    updateBoarProbes(level, e);
    updateGroundProbe(level, e, boarH);

    if (e.flashTimer > 0) e.flashTimer--;
    if (e.knockTimer > 0) e.knockTimer--;
    if (e.turnTimer > 0) e.turnTimer--;

    e.tint = e.flashTimer > 0 ? "#ff5050" : "#ffffff";

    const grounded = boarGrounded(level, e);

    // -----------------------------
    // Death state machine
    // -----------------------------
    if (!e.dead && e.dying && grounded) {
      e.dead = true;
      e.deathStarted = false;
    }

    if (e.dying && !e.dead) {
      e.vel.x = 0;
      level._setAniFrame0Safe?.(e, "throwPose");
      continue;
    }

    if (e.dead && !e.deathStarted) {
      e.deathStarted = true;
      e.holdX = e.x;
      e.holdY = e.y;
      e.vel.x = 0;
      e.vel.y = 0;
      e.collider = "none";
      e.removeColliders();
      e.x = e.holdX;
      e.y = e.holdY;
      level._setAniFrame0Safe?.(e, "death");
      e.deathFrameTimer = 0;
      e.vanishTimer = 24;
      e.visible = true;
    }

    if (e.dead) {
      e.x = e.holdX;
      e.y = e.holdY;

      const deathDef = level.assets?.boarAnis?.death;
      const frames = Number(deathDef?.frames ?? 4);
      const delayFrames = Number(deathDef?.frameDelay ?? 16);
      const msPerFrame = (delayFrames * 1000) / 60;

      e.deathFrameTimer += deltaTime;
      const f = Math.floor(e.deathFrameTimer / msPerFrame);

      if (e.ani) e.ani.frame = Math.min(frames - 1, f);

      if (f >= frames - 1) {
        if (e.vanishTimer > 0) {
          e.visible = Math.floor(e.vanishTimer / 3) % 2 === 0;
          e.vanishTimer--;
        } else {
          e.footProbe?.remove?.();
          e.frontProbe?.remove?.();
          e.groundProbe?.remove?.();
          e.remove?.();
        }
      }
      continue;
    }

    // -----------------------------
    // Control states
    // -----------------------------
    if (e.knockTimer > 0) {
      level._setAniFrame0Safe?.(e, "throwPose");
      continue;
    }

    if (!grounded) {
      level._setAniFrame0Safe?.(e, "throwPose");
      continue;
    }

    if (e.dir !== 1 && e.dir !== -1) e.dir = random([-1, 1]);

    const halfW = boarWidth(e, boarW) / 2;
    if (e.x < halfW) turnBoar(level, e, 1);
    if (e.x > level.bounds.levelW - halfW) turnBoar(level, e, -1);

    const noGroundAhead = !frontProbeHasGroundAhead(level, e);
    const frontHitsLeaf = e.frontProbe.overlapping(level.leaf);
    const frontHitsFire = e.frontProbe.overlapping(level.fire);
    const frontHitsWall = frontProbeHitsWall(level, e);
    const headSeesFire = e.footProbe.overlapping(level.fire);

    const dangerNow =
      noGroundAhead ||
      frontHitsLeaf ||
      frontHitsFire ||
      frontHitsWall ||
      headSeesFire;

    if (e.turnTimer === 0 && shouldTurnNow(e, dangerNow)) {
      turnBoar(level, e, -e.dir);
      updateBoarProbes(level, e);
      continue;
    }

    e.vel.x = e.dir * boarSpeed;
    e.mirror.x = e.dir === -1;

    if (!e.dead && !e.dying) level._setAniSafe?.(e, "run");
  }
}

// ---------------------------------------------------------------------------
// Probe helpers
// ---------------------------------------------------------------------------

function placeProbe(probe, x, y) {
  probe.x = x;
  probe.y = y;
}

export function attachBoarProbes(level, e) {
  const size = Number(level.tuning.boar?.probeSize ?? 4);

  const makeProbe = () => {
    const p = new Sprite(-9999, -9999, size, size);
    p.sensor = true;
    p.collider = "dynamic";
    p.mass = 0.0001;
    p.rotationLock = true;
    p.visible = false;
    p.layer = 999;
    p.friction = 0;
    p.bounciness = 0;
    return p;
  };

  e.footProbe = makeProbe();
  e.frontProbe = makeProbe();
  e.groundProbe = makeProbe();
}

function updateBoarProbes(level, e) {
  const forward = level.tuning.boar?.probeForward ?? 10;
  const frontY = level.tuning.boar?.probeFrontY ?? 8;
  const headY = level.tuning.boar?.probeHeadY ?? 0;

  placeProbe(e.frontProbe, e.x + e.dir * forward, e.y + frontY);
  placeProbe(e.footProbe, e.x + e.dir * forward, e.y - headY);
}

function updateGroundProbe(level, e, fallbackH) {
  const h = boarHeight(e, Number(fallbackH ?? level.tuning.boar?.h ?? 14));
  placeProbe(e.groundProbe, e.x, e.y + h / 2 + 4);
}

function frontProbeHasGroundAhead(level, e) {
  const p = e.frontProbe;
  return (
    p.overlapping(level.ground) ||
    p.overlapping(level.groundDeep) ||
    p.overlapping(level.platformsL) ||
    p.overlapping(level.platformsR)
  );
}

function frontProbeHitsWall(level, e) {
  const p = e.frontProbe;
  return (
    (level.wallsL ? p.overlapping(level.wallsL) : false) ||
    (level.wallsR ? p.overlapping(level.wallsR) : false)
  );
}

function boarGrounded(level, e) {
  const p = e.groundProbe;
  return (
    p.overlapping(level.ground) ||
    p.overlapping(level.groundDeep) ||
    p.overlapping(level.platformsL) ||
    p.overlapping(level.platformsR)
  );
}

function shouldTurnNow(e, dangerNow) {
  const risingEdge = dangerNow && !e.wasDanger;
  e.wasDanger = dangerNow;
  return risingEdge;
}

function turnBoar(level, e, newDir) {
  const cooldown = level.tuning.boar?.turnCooldown ?? 12;
  if (e.turnTimer > 0) return;
  e.dir = newDir;
  e.turnTimer = cooldown;
  e.x += e.dir * 6;
  e.vel.x = 0;
}

function groundAheadForDir(level, e, dir) {
  const old = e.dir;
  e.dir = dir;
  updateBoarProbes(level, e);
  const ok =
    e.frontProbe.overlapping(level.ground) ||
    e.frontProbe.overlapping(level.groundDeep) ||
    e.frontProbe.overlapping(level.platformsL) ||
    e.frontProbe.overlapping(level.platformsR);
  e.dir = old;
  return ok;
}

function fixSpawnEdgeCase(level, e) {
  const leftOk = groundAheadForDir(level, e, -1);
  const rightOk = groundAheadForDir(level, e, 1);
  if (leftOk && !rightOk) e.dir = -1;
  else if (rightOk && !leftOk) e.dir = 1;
  updateBoarProbes(level, e);
  e.vel.x = 0;
  e.turnTimer = 0;
  e.wasDanger = false;
}
