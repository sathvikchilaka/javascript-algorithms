class ColorSwatch {
  constructor(
    presets = {},
    defaultPreviewColor = [255, 255, 255],
    alpha = 0.1,
  ) {
    this.presets = presets;
    this.currentColor = defaultPreviewColor;
    this.currentHexCode = this.rgbToHex(this.currentColor);
    this.alpha = alpha;
    this.undoStack = [];
    this.redoStack = [];

    this.swatchesEl = document.getElementById('swatches');
    this.alphaSliderEl = document.getElementById('alpha-slider');
    this.alphaPreviewText = document.getElementById('alpha-display');
    this.resetBtn = document.getElementById('reset-btn');
    this.undoBtn = document.getElementById('undo-btn');
    this.redoBtn = document.getElementById('redo-btn');
    this.previewContainer = document.getElementById('preview');
    this.previewText = document.getElementById('preview-text');
    this.previewHexCode = document.getElementById('preview-color-hex');
    this.previewNearestHexCode = document.getElementById(
      'preview-nearest-color-hex',
    );
    this.redTextEl = document.getElementById('red-color-text');
    this.greenTextEl = document.getElementById('green-color-text');
    this.blueTextEl = document.getElementById('blue-color-text');

    this.init(defaultPreviewColor);
  }

  init(defaultPreviewColor) {
    // If we need to fetch the presets from the native existing CSS classes but not from presets,
    // then we need to populate presets from CSS if not apply BG colors from the given presets obj
    if (Object.keys(this.presets).length === 0)
      this.presets = this.getComputedStylesFromCSS();
    else this.fillDefaultColors();
    this.render();

    if (this.swatchesEl) {
      this.swatchesEl.addEventListener('click', (e) => {
        const swatchEls = e.target.closest('.swatch');
        if (!swatchEls) return;
        const swatchColor = swatchEls.id;
        if (!this.presets[swatchColor]) return;

        this.applyRGBColors(
          this.presets[swatchColor][0],
          this.presets[swatchColor][1],
          this.presets[swatchColor][2],
        );
      });

      ////////////////////// To Right-click to preview (show temporary mix), release to revert  //////////////////////
      // Disable browser right-click menu inside swatches
      // this.swatchesEl.addEventListener("contextmenu", (e) => e.preventDefault());

      // // RIGHT-CLICK PREVIEW (press right button to preview, release to revert)
      // this.swatchesEl.addEventListener("pointerdown", (e) => {
      // const swatch = e.target.closest(".swatch");
      // if (!swatch) return;

      // // right click = button 2
      // if (e.button !== 2) return;

      // e.preventDefault();

      // const swatchId = swatch.id;
      // const rgb = this.presets[swatchId];
      // if (!rgb) return;

      // // store base so we can revert
      // this.previewBaseColor = [...this.currentColor];

      // // show temp mixed color (UI only, no stacks, no currentColor update)
      // const temp = this.mixPreviewColor(this.previewBaseColor, rgb);
      // this.renderColorOnly(temp);

      // // when released anywhere, revert
      // const endPreview = () => {
      //     this.renderColorOnly(this.previewBaseColor);
      //     this.previewBaseColor = null;

      //     window.removeEventListener("pointerup", endPreview);
      //     window.removeEventListener("pointercancel", endPreview);
      //     window.removeEventListener("blur", endPreview);
      // };

      // window.addEventListener("pointerup", endPreview, { once: true });
      // window.addEventListener("pointercancel", endPreview, { once: true });
      // window.addEventListener("blur", endPreview, { once: true });
      // });

      ////////////////////// TO Press & hold (mousedown / touchstart) to preview, release to revert  //////////////////////
      // Disable browser right-click menu inside swatches
      // this.swatchesEl.addEventListener("contextmenu", (e) => e.preventDefault());

      // this.swatchesEl.addEventListener("pointerdown", (e) => {
      //     const swatch = e.target.closest(".swatch");
      //     if (!swatch) return;

      //     // left press only
      //     if (e.button !== 0) return;

      //     const rgb = this.presets[swatch.id];
      //     if (!rgb) return;

      //     this.previewBaseColor = [...this.currentColor];
      //     const temp = this.mixPreviewColor(this.previewBaseColor, rgb);
      //     this.renderColorOnly(temp);

      //     const endPreview = () => {
      //       this.renderColorOnly(this.previewBaseColor);
      //       this.previewBaseColor = null;

      //       window.removeEventListener("pointerup", endPreview);
      //       window.removeEventListener("pointercancel", endPreview);
      //       window.removeEventListener("blur", endPreview);
      //     };

      //     window.addEventListener("pointerup", endPreview, { once: true });
      //     window.addEventListener("pointercancel", endPreview, { once: true });
      //     window.addEventListener("blur", endPreview, { once: true });
      //   });

      this.swatchesEl.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;

        e.preventDefault();
        const swatchEls = e.target.closest('.swatch');
        if (!swatchEls) return;
        const swatchColor = swatchEls.id;
        if (!this.presets[swatchColor]) return;

        this.applyRGBColors(
          this.presets[swatchColor][0],
          this.presets[swatchColor][1],
          this.presets[swatchColor][2],
        );
      });
    }

    this.alphaSliderEl.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      this.alpha = val / 100;
      this.alphaPreviewText.textContent = `${val}%`;
    });
    this.alphaPreviewText.textContent = `${this.alpha * 100}%`;

    this.resetBtn.addEventListener('click', () => {
      this.currentColor = [...defaultPreviewColor];
      this.undoStack = [];
      this.redoStack = [];
      this.render();
    });

    this.undoBtn.addEventListener('click', () => {
      if (this.undoStack.length === 0) return;

      this.redoStack.push([...this.currentColor]);
      this.currentColor = this.undoStack.pop();
      this.render();
    });

    this.redoBtn.addEventListener('click', () => {
      if (this.redoStack.length === 0) return;
      this.undoStack.push([...this.currentColor]);
      this.currentColor = this.redoStack.pop();
      this.render();
    });
  }

  parseRgbStringToArray(colorStr) {
    // examples: "rgb(200, 0, 0)" or "rgba(200, 0, 0, 1)" to [200, 0, 0]
    const inside = colorStr.slice(
      colorStr.indexOf('(') + 1,
      colorStr.lastIndexOf(')'),
    );
    const parts = inside.split(',').map((s) => s.trim());

    const r = Number(parts[0]);
    const g = Number(parts[1]);
    const b = Number(parts[2]);

    return [r, g, b];
  }

  getComputedStylesFromCSS() {
    let preset = {};
    const swatchEls = document.getElementsByClassName('swatch');
    Array.from(swatchEls).forEach((swatch) => {
      const bgColor = getComputedStyle(swatch).backgroundColor;

      presets[swatch.id] = this.parseRgbStringToArray(bgColor);
    });

    return preset;
  }

  fillDefaultColors() {
    const swatchEls = document.getElementsByClassName('swatch');
    Array.from(swatchEls).forEach((swatch) => {
      const swatchColor = swatch.id;
      const rgb = `rgb(${this.presets[swatchColor][0]}, ${this.presets[swatchColor][1]}, ${this.presets[swatchColor][2]})`;

      const swatchEl = document.getElementById(swatchColor);
      swatchEl.style.backgroundColor = rgb;
    });
  }

  rgbToHex([r, g, b]) {
    return `#${[r, g, b]
      .map((c) => {
        return c.toString(16).padStart(2, '0');
      })
      .join('')}`;
  }

  getMixedColor = (currColor, newColor) => {
    return Math.round(newColor * this.alpha + (1 - this.alpha) * currColor);
  };

  compressHexCodeIfPossible(hex) {
    const hexCode = hex.slice(1);
    const [x, y, z] = [
      hexCode.slice(0, 2),
      hexCode.slice(2, 4),
      hexCode.slice(4, 6),
    ];

    const isPossible = x[0] === x[1] && y[0] === y[1] && z[0] === z[1];

    return isPossible ? `#${x[0]}${y[0]}${z[0]}` : hex;
  }

  // For a hexcode to be identical, it should have identicial digits and each one differs 17 from previous one..
  // 00 = 0
  // 11 = 17
  // 22 = 34
  // 33 = 51
  // 44 = 68
  // 55 = 85
  // 66 = 102
  // 77 = 119
  // 88 = 136
  // 99 = 153
  // AA = 170
  // BB = 187
  // CC = 204
  // DD = 221
  // EE = 238
  // FF = 255
  //
  // So we can make em round-off to it's nearest 17 multiple
  getNearestHexCode([r, g, b]) {
    const newR = Math.round(r / 17) * 17;
    const newG = Math.round(g / 17) * 17;
    const newB = Math.round(b / 17) * 17;

    const hexCode = [newR, newG, newB]
      .map((c) => {
        return c.toString(16).padStart(2, '0');
      })
      .join('');

    return `#${hexCode[0]}${hexCode[2]}${hexCode[4]}`;
  }

  updateHexValueforRGB() {
    this.previewHexCode.textContent = this.compressHexCodeIfPossible(
      this.currentHexCode,
    );
    this.previewNearestHexCode.textContent = this.getNearestHexCode(
      this.currentColor,
    );
  }

  updatePreviewTextColor = () => {
    const isDark =
      this.currentColor[0] + this.currentColor[1] + this.currentColor[2] <
      (256 * 3) / 2;

    this.previewText.style.color = isDark ? 'white' : 'black';
  };

  updateRGBValuesPreview = () => {
    this.redTextEl.textContent = this.currentColor[0];
    this.greenTextEl.textContent = this.currentColor[1];
    this.blueTextEl.textContent = this.currentColor[2];
  };

  applyRGBColors = (r, g, b) => {
    const newR = this.getMixedColor(this.currentColor[0], r);
    const newG = this.getMixedColor(this.currentColor[1], g);
    const newB = this.getMixedColor(this.currentColor[2], b);

    this.undoStack.push([...this.currentColor]);
    this.redoStack = [];
    this.currentColor = [newR, newG, newB];
    this.currentHexCode = this.rgbToHex(this.currentColor);
    this.render();
  };

  render() {
    this.previewContainer.style.backgroundColor = `rgb(${this.currentColor[0]}, ${this.currentColor[1]}, ${this.currentColor[2]})`;

    this.undoBtn.disabled = this.undoStack.length === 0;
    this.redoBtn.disabled = this.redoStack.length === 0;

    this.updatePreviewTextColor();
    this.updateRGBValuesPreview();
    this.updateHexValueforRGB();
  }
}

const presets = {
  red: [200, 0, 0],
  yellow: [250, 225, 50],
  green: [0, 200, 0],
  blue: [0, 0, 200],
};

let currentColor = [255, 255, 255];
let alpha = 0.1;

const swatches = new ColorSwatch(presets, currentColor, alpha);
