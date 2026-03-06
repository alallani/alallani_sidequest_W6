// src/ui/FlagPopup.js
// Flag popup modal (VIEW layer).
//
// Responsibilities:
// - Display popup when player touches flag
// - Show different message based on key collection status
// - Provide button to continue or dismiss

export class FlagPopup {
  constructor(pkg, assets) {
    this.pkg = pkg;
    this.assets = assets;

    // Bitmap font config (same charmap used in Level HUD)
    this.FONT_COLS = pkg.tuning?.hud?.fontCols ?? 19;
    this.CELL = pkg.tuning?.hud?.cell ?? 30;

    this.FONT_SCALE = pkg.tuning?.hud?.fontScale ?? 1 / 3;
    this.GLYPH_W = this.CELL * this.FONT_SCALE;

    this.FONT_CHARS =
      pkg.tuning?.hud?.fontChars ??
      " !\"#$%&'()*+,-./0123456789:;<=>?@" +
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`" +
        "abcdefghijklmnopqrstuvwxyz{|}~";

    this.active = false;
    this.hasAllKeys = false;
  }

  show(hasAllKeys = false) {
    this.active = true;
    this.hasAllKeys = hasAllKeys;
  }

  hide() {
    this.active = false;
  }

  draw() {
    if (!this.active) return;

    const viewW = this.pkg.view?.viewW ?? this.pkg.view?.w ?? 240;
    const viewH = this.pkg.view?.viewH ?? this.pkg.view?.h ?? 192;

    camera.off();
    try {
      drawingContext.imageSmoothingEnabled = false;

      push();
      noStroke();
      fill(0, 160);
      rect(0, 0, width, height);

      // Popup box
      const popupW = 200;
      const popupH = 140;
      const popupX = (width - popupW) / 2;
      const popupY = (height - popupH) / 2;

      fill(0);
      stroke(200, 220, 255);
      strokeWeight(3);
      rect(popupX, popupY, popupW, popupH, 5);

      // Title (using bitmap font for consistent HUD styling)
      noStroke();
      const title = this.hasAllKeys ? "TRAIL COMPLETE!" : "EXIT BLOCKED";
      const letterSpacing = 2;
      const totalTitleWidth =
        title.length * this.GLYPH_W + (title.length - 1) * letterSpacing;
      const titleX = popupX + popupW / 2 - totalTitleWidth / 2;
      const titleY = popupY + 10;
      const titleColor = this.hasAllKeys ? "#00ff00" : "#ff0000";
      this._drawOutlinedBitmap(title, titleX, titleY, this.GLYPH_W, titleColor);

      // Message
      fill(255);
      textAlign(CENTER, TOP);
      const message = this.hasAllKeys
        ? "You've gathered your first round of keys!"
        : "You're missing keys.";
      textSize(12);
      text(message, popupX + 10, popupY + 35, popupW - 20);

      // Button
      const buttonW = 100;
      const buttonH = 24;
      const buttonX = popupX + (popupW - buttonW) / 2;
      const buttonY = popupY + popupH - 35;

      const isHovering = this._isButtonHovered(
        buttonX,
        buttonY,
        buttonW,
        buttonH,
      );
      fill(isHovering ? 100 : 70);
      noStroke();
      rect(buttonX, buttonY, buttonW, buttonH, 3);

      fill(255);
      textFont("Arial", 12);
      textAlign(CENTER, CENTER);
      const buttonText = this.hasAllKeys ? "Next Trail" : "Return to Trail";
      text(buttonText, buttonX + buttonW / 2, buttonY + buttonH / 2);

      pop();
    } finally {
      camera.on();
    }
  }

  _isButtonHovered(x, y, w, h) {
    return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  }

  _drawBitmap(str, x, y, glyphW) {
    str = String(str);
    let currentX = x;
    let currentY = y;
    const lineHeight = glyphW + 4; // spacing between lines
    const letterSpacing = 2; // space between letters

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];

      // Handle newlines
      if (ch === "\n") {
        currentX = x;
        currentY += lineHeight;
        continue;
      }

      const idx = this.FONT_CHARS.indexOf(ch);
      if (idx === -1) {
        // For unknown characters, still advance position
        currentX += glyphW + letterSpacing;
        continue;
      }

      const col = idx % this.FONT_COLS;
      const row = Math.floor(idx / this.FONT_COLS);

      const sx = col * this.CELL;
      const sy = row * this.CELL;

      image(
        this.assets.fontImg,
        Math.round(currentX),
        Math.round(currentY),
        glyphW,
        glyphW,
        sx,
        sy,
        this.CELL,
        this.CELL,
      );

      // Advance x position with letter spacing
      currentX += glyphW + letterSpacing;
    }
  }

  _drawOutlinedBitmap(str, x, y, glyphW, fillHex) {
    // Draw black outline (4 sides)
    tint("#000000");
    this._drawBitmap(str, x - 1, y, glyphW);
    this._drawBitmap(str, x + 1, y, glyphW);
    this._drawBitmap(str, x, y - 1, glyphW);
    this._drawBitmap(str, x, y + 1, glyphW);

    // Draw filled text on top
    tint(fillHex);
    this._drawBitmap(str, x, y, glyphW);

    noTint();
  }

  handleClick() {
    if (!this.active) return false;

    const popupW = 200;
    const popupH = 140;
    const popupX = (width - popupW) / 2;
    const popupY = (height - popupH) / 2;

    const buttonW = 100;
    const buttonH = 24;
    const buttonX = popupX + (popupW - buttonW) / 2;
    const buttonY = popupY + popupH - 35;

    if (this._isButtonHovered(buttonX, buttonY, buttonW, buttonH)) {
      this.hide();
      return true; // Button was clicked
    }

    return false;
  }
}
