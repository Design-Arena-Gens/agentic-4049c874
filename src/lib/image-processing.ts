export type RestorationAdjustments = {
  exposure: number;
  contrast: number;
  saturation: number;
  vibrance: number;
  warmth: number;
  sepiaReduction: number;
  shadowLift: number;
  highlightRecovery: number;
  clarity: number;
  denoise: number;
};

const clamp = (value: number, min = 0, max = 255) =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, amount: number) =>
  start + (end - start) * amount;

const DEFAULT_ALPHA = 255;

const luminance = (r: number, g: number, b: number) =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

const adjustSaturation = (
  r: number,
  g: number,
  b: number,
  amount: number,
  vibrance: number,
) => {
  if (amount === 0 && vibrance === 0) {
    return [r, g, b] as const;
  }

  const gray = luminance(r, g, b);
  const satFactor = 1 + amount;
  const vibFactor = 1 + vibrance;

  const enhance = (channel: number) =>
    clamp(
      lerp(gray, channel, satFactor) +
        (channel - gray) * (vibFactor - 1) * (1 - gray / 255),
    );

  return [enhance(r), enhance(g), enhance(b)] as const;
};

const applyShadowHighlight = (
  r: number,
  g: number,
  b: number,
  shadowLift: number,
  highlightRecovery: number,
) => {
  if (shadowLift === 0 && highlightRecovery === 0) {
    return [r, g, b] as const;
  }

  const gray = luminance(r, g, b);

  let shadowBoost = 0;
  if (gray < 118 && shadowLift > 0) {
    const influence = (118 - gray) / 118;
    shadowBoost = shadowLift * influence * 0.6;
  }

  let highlightReduction = 0;
  if (gray > 170 && highlightRecovery > 0) {
    const influence = (gray - 170) / (255 - 170);
    highlightReduction = highlightRecovery * influence * 0.7;
  }

  const adjustChannel = (channel: number) =>
    clamp(channel + shadowBoost - highlightReduction);

  return [adjustChannel(r), adjustChannel(g), adjustChannel(b)] as const;
};

const removeSepia = (r: number, g: number, b: number, amount: number) => {
  if (amount <= 0) {
    return [r, g, b] as const;
  }

  const gray = luminance(r, g, b);
  const strength = amount * 0.75;

  const cooledR = clamp(r - strength);
  const cooledG = clamp(g - strength * 0.5);
  const cooledB = clamp(b + strength * 0.6);

  return [
    lerp(gray, cooledR, 0.75),
    lerp(gray, cooledG, 0.85),
    lerp(gray, cooledB, 1.1),
  ] as const;
};

const applyWarmth = (r: number, g: number, b: number, warmth: number) => {
  if (warmth === 0) {
    return [r, g, b] as const;
  }

  const warmAmount = warmth > 0 ? warmth * 1.2 : warmth;
  const coolAmount = warmth < 0 ? warmth * -1.1 : 0;

  return [
    clamp(r + warmAmount),
    clamp(g + warmAmount * 0.35),
    clamp(b - warmAmount * 0.8 - coolAmount),
  ] as const;
};

const boxBlur = (
  source: Float32Array,
  width: number,
  height: number,
): Float32Array => {
  const result = new Float32Array(source.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;
      let samples = 0;

      for (let ky = -1; ky <= 1; ky += 1) {
        const yy = y + ky;
        if (yy < 0 || yy >= height) continue;

        for (let kx = -1; kx <= 1; kx += 1) {
          const xx = x + kx;
          if (xx < 0 || xx >= width) continue;

          const idx = (yy * width + xx) * 4;
          sumR += source[idx];
          sumG += source[idx + 1];
          sumB += source[idx + 2];
          sumA += source[idx + 3];
          samples += 1;
        }
      }

      const target = (y * width + x) * 4;
      result[target] = sumR / samples;
      result[target + 1] = sumG / samples;
      result[target + 2] = sumB / samples;
      result[target + 3] = sumA / samples;
    }
  }

  return result;
};

export const enhanceImageData = (
  sourceImageData: ImageData,
  adjustments: RestorationAdjustments,
): ImageData => {
  const { width, height, data } = sourceImageData;
  const working = new Float32Array(data.length);

  for (let i = 0; i < data.length; i += 1) {
    working[i] = data[i];
  }

  const exposureOffset = adjustments.exposure * 2.2;
  const contrast = clamp(adjustments.contrast, -80, 120);
  const contrastFactor =
    (259 * (contrast + 255)) / (255 * (259 - contrast || 0.0001));
  const saturation = adjustments.saturation / 100;
  const vibrance = adjustments.vibrance / 100;
  const warmth = adjustments.warmth;
  const sepia = adjustments.sepiaReduction / 100;

  for (let i = 0; i < working.length; i += 4) {
    let r = working[i];
    let g = working[i + 1];
    let b = working[i + 2];
    const a = working[i + 3] ?? DEFAULT_ALPHA;

    r = clamp(r + exposureOffset);
    g = clamp(g + exposureOffset);
    b = clamp(b + exposureOffset);

    r = clamp(contrastFactor * (r - 128) + 128);
    g = clamp(contrastFactor * (g - 128) + 128);
    b = clamp(contrastFactor * (b - 128) + 128);

    [r, g, b] = adjustSaturation(r, g, b, saturation, vibrance);
    [r, g, b] = removeSepia(r, g, b, sepia * 100);
    [r, g, b] = applyWarmth(r, g, b, warmth);
    [r, g, b] = applyShadowHighlight(
      r,
      g,
      b,
      adjustments.shadowLift,
      adjustments.highlightRecovery,
    );

    working[i] = clamp(r);
    working[i + 1] = clamp(g);
    working[i + 2] = clamp(b);
    working[i + 3] = clamp(a);
  }

  if (adjustments.denoise > 0) {
    const blurred = boxBlur(working, width, height);
    const denoiseMix = Math.min(0.85, adjustments.denoise / 100);

    for (let i = 0; i < working.length; i += 4) {
      working[i] = lerp(working[i], blurred[i], denoiseMix);
      working[i + 1] = lerp(working[i + 1], blurred[i + 1], denoiseMix);
      working[i + 2] = lerp(working[i + 2], blurred[i + 2], denoiseMix);
    }
  }

  if (adjustments.clarity > 0) {
    const softened = boxBlur(working, width, height);
    const clarityMix = adjustments.clarity / 100;

    for (let i = 0; i < working.length; i += 4) {
      const detailR = working[i] - softened[i];
      const detailG = working[i + 1] - softened[i + 1];
      const detailB = working[i + 2] - softened[i + 2];

      working[i] = clamp(working[i] + detailR * (0.8 + clarityMix));
      working[i + 1] = clamp(
        working[i + 1] + detailG * (0.8 + clarityMix * 0.9),
      );
      working[i + 2] = clamp(
        working[i + 2] + detailB * (0.8 + clarityMix * 0.9),
      );
    }
  }

  const output = new Uint8ClampedArray(working.length);
  for (let i = 0; i < working.length; i += 1) {
    output[i] = clamp(working[i]);
  }

  return new ImageData(output, width, height);
};

export const DEFAULT_ADJUSTMENTS: RestorationAdjustments = {
  exposure: 6,
  contrast: 12,
  saturation: 16,
  vibrance: 18,
  warmth: 4,
  sepiaReduction: 30,
  shadowLift: 12,
  highlightRecovery: 8,
  clarity: 14,
  denoise: 18,
};

export const CLEAN_SLATE_ADJUSTMENTS: RestorationAdjustments = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  warmth: 0,
  sepiaReduction: 0,
  shadowLift: 0,
  highlightRecovery: 0,
  clarity: 0,
  denoise: 0,
};
