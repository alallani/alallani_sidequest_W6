// src/entities/PlayerEntity.js
// Player entity (WORLD entity).
//
// Camper character: single 288x240 spritesheet, 48x48 frames.
// Row 0=idle  1=walk/run  2=attack  3=hurt  4=death
//
// BUG FIXES:
//
// Bug 1 – Attack showed hurt frames:
//   Root cause: buildAnis() injected `spriteSheet` into each animation def.
//   p5play re-derives anis.w/h from a per-def spriteSheet, overriding the
//   values we set on sprite.anis.w = 48 / sprite.anis.h = 48.
//   With the wrong dimensions the row y-offset arithmetic shifts every
//   animation one row down (attack row 2 → rendered at hurt row 3, etc.).
//   Fix: set sprite.spriteSheet once globally; animation defs have NO
//   spriteSheet key. p5play then uses our explicit anis.w/h=48 correctly.
//
// Bug 2 – Player disappeared when hurt:
//   Root cause: invuln blink used divisor 4, producing a very fast toggle
//   at high invulnTimer values (45 frames) that rendered nearly invisible.
//   Fix: use divisor 8 for a visible, slower blink.
//
// Bug 3 – Death animation didn't play; player vanished:
//   Root cause: sprite.ani.noLoop?.() is a no-op in many p5play v3 builds.
//   Without loop suppression the death animation restarts every cycle,
//   and the "pin to last frame" code only ran in the `else` branch —
//   never on the first call when the animation actually starts looping.
//   Fix: pin sprite.ani.frame = lastFrame unconditionally every draw tick
//   while dead, regardless of deathAnimStarted. Also removed noLoop() call.

export class PlayerEntity {
  constructor(pkg, assets) {
    this.pkg = pkg;
    this.assets = assets;

    this.tuning = pkg.tuning || {};
    this.tilesCfg = pkg.tiles || {};
    this.bounds = pkg.bounds || {};
    this.levelData = pkg.level || {};

    this.sprite = null;
    this.sensor = null;

    const ps = this.levelData.playerStart || {
      x: this.tilesCfg.frameW ?? 48,
      y: (this.bounds.levelH ?? 0) - (this.tilesCfg.tileH ?? 24) * 4,
    };
    this.startX = ps.x;
    this.startY = ps.y;

    // stats
    this.maxHealth = Number(this.tuning.player?.maxHealth ?? 3);
    this.health = this.maxHealth;

    // state
    this.dead = false;
    this.pendingDeath = false;
    this.deathAnimStarted = false;

    // timers
    this.invulnTimer = 0;
    this.knockTimer = 0;

    // attack
    this.attacking = false;
    this.attackFrameCounter = 0;
    this.attackHitThisSwing = false;

    // tuning
    this.MOVE_SPEED = Number(this.tuning.player?.moveSpeed ?? 1.5);
    this.JUMP_STRENGTH = Number(this.tuning.player?.jumpStrength ?? 4.5);

    this.INVULN_FRAMES = Number(this.tuning.player?.invulnFrames ?? 45);
    this.KNOCK_FRAMES = Number(this.tuning.player?.knockFrames ?? 30);

    this.KNOCKBACK_X = Number(this.tuning.player?.knockbackX ?? 2.0);
    this.KNOCKBACK_Y = Number(this.tuning.player?.knockbackY ?? 3.2);

    // Collider smaller than 48x48 visual
    this.COLLIDER_W = Number(this.tuning.player?.colliderW ?? 18);
    this.COLLIDER_H = Number(this.tuning.player?.colliderH ?? 30);

    // Shift visual up so feet sit at collider bottom
    this.ANI_OFFSET_Y = Number(this.tuning.player?.aniOffsetY ?? -9);

    // Attack window (controller frames)
    this.ATTACK_START = Number(this.tuning.player?.attackStartFrame ?? 4);
    this.ATTACK_END = Number(this.tuning.player?.attackEndFrame ?? 10);
    this.ATTACK_FINISH = Number(this.tuning.player?.attackFinishFrame ?? 16);
  }

  // -----------------------
  // animation safety
  // -----------------------
  _hasAni(name) {
    return !!(this.sprite?.anis && this.sprite.anis[name]);
  }

  _setAni(name) {
    if (!this._hasAni(name)) return false;
    this.sprite.ani = name;
    return true;
  }

  _setAniFrame(name, frame) {
    if (!this._setAni(name)) return false;
    if (this.sprite.ani) this.sprite.ani.frame = frame;
    return true;
  }

  _playAni(name, startFrame = 0) {
    if (!this._setAni(name)) return false;
    if (this.sprite.ani) {
      this.sprite.ani.frame = startFrame;
      this.sprite.ani.play?.();
    }
    return true;
  }

  // -----------------------
  // build / reset
  // -----------------------
  buildSprites() {
    const frameW = 48;
    const frameH = 48;

    this.sprite = new Sprite(this.startX, this.startY, frameW, frameH);
    this.sprite.rotationLock = true;

    const anis = this.assets?.playerAnis;
    const img = this.assets?.playerImg;

    // BUG FIX 1: Set spriteSheet globally FIRST, THEN configure anis dimensions,
    // THEN addAnis. Never put spriteSheet inside individual animation defs —
    // that causes p5play to re-derive anis.w/h from the image, breaking rows.
    if (img) this.sprite.spriteSheet = img;

    if (anis && typeof anis === "object") {
      // These must be set AFTER assigning spriteSheet and BEFORE addAnis.
      this.sprite.anis.w = frameW;
      this.sprite.anis.h = frameH;
      this.sprite.anis.offset.y = this.ANI_OFFSET_Y;

      this.sprite.addAnis(anis);
      this._setAni("idle");
    } else {
      this.sprite.img = img;
    }

    // Physics collider
    this.sprite.w = this.COLLIDER_W;
    this.sprite.h = this.COLLIDER_H;
    this.sprite.friction = 0;
    this.sprite.bounciness = 0;

    // Ground sensor
    this.sensor = new Sprite();
    this.sensor.x = this.sprite.x;
    this.sensor.y = this.sprite.y + this.sprite.h / 2;
    this.sensor.w = this.sprite.w;
    this.sensor.h = 2;
    this.sensor.mass = 0.01;
    this.sensor.removeColliders();
    this.sensor.visible = false;

    const j = new GlueJoint(this.sprite, this.sensor);
    j.visible = false;

    return this;
  }

  reset() {
    this.health = this.maxHealth;
    this.dead = false;
    this.pendingDeath = false;
    this.deathAnimStarted = false;

    this.invulnTimer = 0;
    this.knockTimer = 0;

    this.attacking = false;
    this.attackFrameCounter = 0;
    this.attackHitThisSwing = false;

    if (!this.sprite) return;

    this.sprite.x = this.startX;
    this.sprite.y = this.startY;
    this.sprite.vel.x = 0;
    this.sprite.vel.y = 0;
    this.sprite.tint = "#ffffff";

    this._setAni("idle");
  }

  // -----------------------
  // queries
  // -----------------------
  isGrounded(solids) {
    const s = this.sensor;
    if (!s) return false;
    const list = Array.isArray(solids) ? solids : Object.values(solids || {});
    for (const g of list) {
      if (g && s.overlapping(g)) return true;
    }
    return false;
  }

  // -----------------------
  // timers
  // -----------------------
  tickTimers() {
    if (this.invulnTimer > 0) this.invulnTimer--;
    if (this.knockTimer > 0) this.knockTimer--;
  }

  // -----------------------
  // actions
  // -----------------------
  stopX() {
    this.sprite.vel.x = 0;
  }
  moveLeft() {
    this.sprite.vel.x = -this.MOVE_SPEED;
    this.sprite.mirror.x = true;
  }
  moveRight() {
    this.sprite.vel.x = this.MOVE_SPEED;
    this.sprite.mirror.x = false;
  }
  jump() {
    this.sprite.vel.y = -this.JUMP_STRENGTH;
  }

  startAttack() {
    this.attacking = true;
    this.attackHitThisSwing = false;
    this.attackFrameCounter = 0;
    this.stopX();
    this._playAni("attack", 0);
  }

  markAttackHit() {
    this.attackHitThisSwing = true;
  }

  clampToBounds(bounds) {
    const half = (this.sprite?.w ?? 0) / 2;
    const maxX = (bounds?.levelW ?? this.sprite.x) - half;
    this.sprite.x = constrain(this.sprite.x, half, maxX);
  }

  // -----------------------
  // animation (visual state)
  // -----------------------
  applyAnimation({ grounded, won }) {
    if (!this.sprite?.anis || Object.keys(this.sprite.anis).length === 0)
      return;

    // ---- DEAD ----
    // BUG FIX 3: Pin to last frame unconditionally every tick.
    // noLoop() is unreliable across p5play builds — without it the animation
    // loops back to frame 0 every cycle, causing a flicker-then-vanish effect.
    // By forcing frame = lastFrame every draw call we guarantee it holds.
    if (this.dead) {
      const def = this.assets?.playerAnis?.death;
      const lastFrame = Math.max(0, Number(def?.frames ?? 4) - 1);

      if (!this.deathAnimStarted) {
        this.deathAnimStarted = true;
        // Switch to death row and immediately clamp to last frame.
        // We don't call playAni/play() to avoid triggering the animation loop.
        this._setAni("death");
      }

      // Always pin — this is the key fix.
      if (this.sprite.ani) this.sprite.ani.frame = lastFrame;
      return;
    }

    if (won) {
      this._setAni("idle");
      return;
    }

    if (this.knockTimer > 0 || this.pendingDeath) {
      // Show hurt row, hold on frame 0 (first hurt frame is clearly readable)
      this._setAniFrame("hurtPose", 0);
      return;
    }

    // Attack animation started by startAttack() — don't override it here
    if (this.attacking) return;

    if (!grounded) {
      this._setAniFrame("jump", 0);
      return;
    }

    const moving = Math.abs(this.sprite.vel.x) > 0.01;
    this._setAni(moving ? "run" : "idle");
  }

  // -----------------------
  // damage / effects
  // -----------------------
  takeDamageFromX(sourceX) {
    if (this.invulnTimer > 0 || this.dead) return false;

    this.health = Math.max(0, this.health - 1);
    if (this.health <= 0) this.pendingDeath = true;

    this.invulnTimer = this.INVULN_FRAMES;
    this.knockTimer = this.KNOCK_FRAMES;

    const dir = this.sprite.x < sourceX ? -1 : 1;
    this.sprite.vel.x = dir * this.KNOCKBACK_X;
    this.sprite.vel.y = -this.KNOCKBACK_Y;

    this.attacking = false;
    this.attackFrameCounter = 0;
    this.attackHitThisSwing = false;

    return true;
  }

  applyHurtBlinkTint() {
    if (!this.sprite) return;

    if (!this.dead && this.invulnTimer > 0) {
      // BUG FIX 2: Divisor 8 (was 4) gives a slower, clearly visible blink.
      // At invulnFrames=45, divisor 4 toggled ~11 times/sec — nearly invisible.
      // Divisor 8 gives ~5-6 blinks total over the invuln window, clearly readable.
      this.sprite.tint =
        Math.floor(this.invulnTimer / 8) % 2 === 0 ? "#ff8080" : "#ffffff";
    } else {
      this.sprite.tint = "#ffffff";
    }
  }
}
