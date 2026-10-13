// Warp and effects for a placed design. Pure, so it is unit tested.
// The same settings produce (1) the CSS filter and transform on the artwork layer in the studio, and
// (2) the identical filter string for the canvas that makes the print file, so what you see is what prints.
(function (root) {
  "use strict";

  // name: [min, max, step, unit, label]. Defaults are "no change".
  const FX_RANGE = {
    skx: [-45, 45, 1, "°", "Slant sideways"],
    sky: [-45, 45, 1, "°", "Slant up/down"],
    wave: [0, 100, 1, "", "Wave"],
    grayscale: [0, 100, 1, "%", "Greyscale"],
    sepia: [0, 100, 1, "%", "Sepia"],
    brightness: [40, 160, 1, "%", "Brightness"],
    contrast: [40, 180, 1, "%", "Contrast"],
    saturate: [0, 250, 1, "%", "Saturation"],
    hue: [-180, 180, 1, "°", "Hue shift"],
    invert: [0, 100, 1, "%", "Invert"],
    blur: [0, 8, 0.5, "px", "Blur"],
    opacity: [30, 100, 1, "%", "Opacity"],
  };
  const FX_DEFAULT = { skx: 0, sky: 0, flipH: false, flipV: false, wave: 0, grayscale: 0, sepia: 0, brightness: 100, contrast: 100, saturate: 100, hue: 0, invert: 0, blur: 0, opacity: 100, shadow: false };

  const FX_PRESETS = [
    { id: "vintage", label: "Vintage", fx: { sepia: 60, contrast: 110, saturate: 80, brightness: 95 } },
    { id: "mono", label: "Mono", fx: { grayscale: 100, contrast: 115 } },
    { id: "pop", label: "Pop", fx: { saturate: 170, contrast: 115 } },
    { id: "negative", label: "Negative", fx: { invert: 100 } },
    { id: "acid", label: "Acid", fx: { hue: 120, saturate: 190, contrast: 120 } },
    { id: "ghost", label: "Ghost", fx: { opacity: 55, blur: 1 } },
    { id: "wobble", label: "Wobble", fx: { wave: 45, skx: 6 } },
    { id: "lean", label: "Lean", fx: { skx: -18, sky: 4 } },
  ];

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  // Always a full, valid fx: unknown keys dropped, numbers clamped into range, anything odd becomes the default.
  function fxClean(fx) {
    const out = { ...FX_DEFAULT };
    fx = fx || {};
    for (const [k, [lo, hi]] of Object.entries(FX_RANGE)) {
      const v = Number(fx[k]);
      if (fx[k] !== undefined && fx[k] !== null && fx[k] !== "" && Number.isFinite(v)) out[k] = clamp(v, lo, hi);
    }
    out.flipH = fx.flipH === true;
    out.flipV = fx.flipV === true;
    out.shadow = fx.shadow === true;
    return out;
  }
  const fxIsDefault = fx => {
    const c = fxClean(fx);
    return Object.keys(FX_DEFAULT).every(k => c[k] === FX_DEFAULT[k]);
  };

  // The CSS filter for the artwork layer, e.g. "grayscale(60%) blur(2px)". unit scales the pixel measures
  // (blur and shadow), so the print file can use the same recipe at its own resolution. waveId adds an SVG filter.
  function fxFilter(fx, unit = 1, waveId = null) {
    const c = fxClean(fx), p = [];
    if (c.wave > 0 && waveId) p.push(`url(#${waveId})`);
    if (c.grayscale > 0) p.push(`grayscale(${c.grayscale}%)`);
    if (c.sepia > 0) p.push(`sepia(${c.sepia}%)`);
    if (c.brightness !== 100) p.push(`brightness(${c.brightness}%)`);
    if (c.contrast !== 100) p.push(`contrast(${c.contrast}%)`);
    if (c.saturate !== 100) p.push(`saturate(${c.saturate}%)`);
    if (c.hue !== 0) p.push(`hue-rotate(${c.hue}deg)`);
    if (c.invert > 0) p.push(`invert(${c.invert}%)`);
    if (c.blur > 0) p.push(`blur(${+(c.blur * unit).toFixed(2)}px)`);
    if (c.opacity !== 100) p.push(`opacity(${c.opacity}%)`);
    if (c.shadow) p.push(`drop-shadow(${+(2 * unit).toFixed(2)}px ${+(3 * unit).toFixed(2)}px ${+(3 * unit).toFixed(2)}px rgba(0,0,0,.65))`);
    return p.join(" ");
  }

  // Slant and flip, as the numbers an SVG/CSS transform and a canvas matrix both use.
  const fxTransform = fx => { const c = fxClean(fx); return { skx: c.skx, sky: c.sky, sx: c.flipH ? -1 : 1, sy: c.flipV ? -1 : 1 }; };
  // SVG transform text about (cx, cy): the warp first, then the placed rotation outside it.
  function fxSvgTransform(fx, rot, cx, cy) {
    const t = fxTransform(fx);
    if (!t.skx && !t.sky && t.sx === 1 && t.sy === 1) return `rotate(${rot} ${cx} ${cy})`; // no warp: keep it plain
    return `rotate(${rot} ${cx} ${cy}) translate(${cx} ${cy}) skewX(${t.skx}) skewY(${t.sky}) scale(${t.sx} ${t.sy}) translate(${-cx} ${-cy})`;
  }
  // Where a point (px, py), measured from the artwork's centre, ends up after the warp and rotation.
  function fxMapPoint(fx, rotDeg, px, py) {
    const t = fxTransform(fx), tx = Math.tan(t.skx * Math.PI / 180), ty = Math.tan(t.sky * Math.PI / 180);
    let x = px * t.sx, y = py * t.sy;                  // scale (flip) first
    y = y + ty * x;                                     // then skewY ...
    x = x + tx * y;                                     // ... then skewX: SVG's "skewX(a) skewY(b)" applies right to left
    const r = rotDeg * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
    return [x * cs - y * sn, x * sn + y * cs];
  }

  // A wavy "warp" as an SVG filter (CSS can reference it with filter: url(#id)).
  const fxWaveDef = (id, amount, unit = 1) => `<filter id="${id}" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="${((0.012 + amount * 0.0004) / unit).toFixed(5)} ${((0.02 + amount * 0.0006) / unit).toFixed(5)}" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${(amount * 0.45 * unit).toFixed(1)}" xChannelSelector="R" yChannelSelector="G"/></filter>`; // unit: pixels per tee unit, so the print file waves the same amount

  // What the print checks need to know about the effects.
  const fxCheckInfo = fx => { const c = fxClean(fx); return { opacity: c.opacity / 100, blur: c.blur, shadow: c.shadow }; };

  const api = { FX_RANGE, FX_DEFAULT, FX_PRESETS, fxClean, fxIsDefault, fxFilter, fxTransform, fxSvgTransform, fxMapPoint, fxWaveDef, fxCheckInfo };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FX = api;
})(typeof window !== "undefined" ? window : globalThis);
