// Print-readiness gates for uploaded artwork: is this file good enough to print on a tee, at the size it's placed?
// Pure rules (no DOM), so they are unit tested. The numbers follow what print-on-demand printers ask for:
//   PNG with a transparent background, sRGB, 300 DPI at print size (150 DPI is the lowest they accept),
//   up to about 12 x 16 in on a tee, PNG/JPG up to 100 MB and SVG up to 20 MB, no thin lines under about 0.5 mm.
// Each gate is { id, level: "pass" | "warn" | "fail", title, detail, fix }. Any "fail" blocks the order; "warn" is allowed but shown.
(function (root) {
  "use strict";

  const PRINT = {
    areaIn: { w: 12, h: 14.4 },   // the print area on the tee, in inches (the dashed box in the studio)
    dpiFail: 150,                 // below this it will not print well
    dpiGood: 300,                 // the usual standard
    minPx: 300,                   // the short side of any raster image, whatever size it is placed at
    minPlacedIn: 0.8,             // narrower than this (about 2 cm) is too small to be worth printing
    maxBytes: { raster: 100 * 1024 * 1024, svg: 20 * 1024 * 1024 },
    types: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"],
    semiWarn: 0.12,               // more than this share of see-through pixels can print patchy
    contrastWarn: 1.6,            // artwork vs shirt colour
    outsideWarn: 0.02, outsideFail: 0.6,
    maxSlackIn: 0.05,             // allowed over the print area before it counts as too big
    minFailIn: 0.4,               // narrower than this (about 1 cm) cannot be printed at all
    stretchWarn: 0.15,            // squashed or stretched by more than 15% looks wrong
    nearlyStraightDeg: 3,         // a tilt this small usually looks like a mistake
    upsideDownDeg: 150,
  };

  const mb = n => Math.round(n / 1048576 * 10) / 10;
  const lumHex = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  // inkLum is 0..255 (mean brightness of the artwork); relative luminance from that, treating it as a grey
  const lumGrey = v => { const c = Math.max(0, Math.min(255, v)) / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const gate = (id, level, title, detail, fix = null) => ({ id, level, title, detail, fix });

  // The checks that need only the file itself, done the moment it is chosen.
  // file: { type, bytes }, px: { w, h } | null  ->  a "fail" gate, or null if the file can be used at all.
  function checkFile(file, px) {
    const type = (file && file.type) || "";
    if (!PRINT.types.includes(type)) return gate("type", "fail", "We can't print this kind of file", "Please use a PNG (best), JPG or SVG.");
    const limit = type === "image/svg+xml" ? PRINT.maxBytes.svg : PRINT.maxBytes.raster;
    if (file.bytes > limit) return gate("size", "fail", "That file is too big", `It is ${mb(file.bytes)} MB and the limit is ${mb(limit)} MB for this kind of file.`);
    if (type !== "image/svg+xml") {
      if (!px || !px.w || !px.h) return gate("read", "fail", "We couldn't open that image", "It may be damaged. Try saving it again as a PNG.");
      if (Math.min(px.w, px.h) < PRINT.minPx) {
        return gate("pixels", "fail", "That image is too small", `It is ${px.w} × ${px.h} px. We need at least ${PRINT.minPx} px on the short side, and 3000 px or more for a full-size print.`);
      }
    }
    return null;
  }

  // input: { file: {type, bytes}, px: {w,h} | null (null = vector), placed: { wIn, hIn } at the current size,
  //          analysis: { hasAlpha, edgeOpaque, edgeFlat, semiShare, inkLum } | null, teeHex, teeName, outsideShare 0..1,
  //          rotation (degrees), stretch (1 = natural proportions), effects: { opacity 0..1, blur px, shadow bool } }
  function checkPrint(input) {
    const { file, px, placed, analysis, teeHex, teeName } = input;
    const gates = [];
    const fileFail = checkFile(file, px);
    if (fileFail) gates.push(fileFail);
    const vector = file && file.type === "image/svg+xml";

    // sharpness at the size it is placed
    let dpi = null;
    const need = { px150: Math.ceil(placed.wIn * PRINT.dpiFail), px300: Math.ceil(placed.wIn * PRINT.dpiGood) };
    if (vector) {
      gates.push(gate("dpi", "pass", "Vector artwork", "It prints sharp at any size."));
    } else if (px && px.w && px.h) {
      const raw = Math.min(px.w / placed.wIn, px.h / placed.hIn); // judged on the true value; shown rounded DOWN so it never claims more than the file has
      dpi = Math.floor(raw + 1e-9);
      if (raw < PRINT.dpiFail - 1e-9) gates.push(gate("dpi", "fail", "Too low-res at this size", `At this size it is only ${dpi} dpi. We need at least ${PRINT.dpiFail}, and 300 is best. Make it smaller, or upload a larger image: about ${need.px150} px wide for ${PRINT.dpiFail} dpi, ${need.px300} px for 300 dpi.`, "shrink"));
      else if (dpi < PRINT.dpiGood) gates.push(gate("dpi", "warn", "Printable, but may look slightly soft", `${dpi} dpi at this size. 300 dpi is sharpest, which needs about ${need.px300} px wide.`, "shrink"));
      else gates.push(gate("dpi", "pass", "Sharp", `${dpi} dpi at this size.`));
    }

    // background and edges (pictures only)
    if (!vector && analysis) {
      if (analysis.hasAlpha && !analysis.edgeOpaque) {
        gates.push(gate("background", "pass", "Transparent background", "Only the artwork will print."));
        if (analysis.semiShare > PRINT.semiWarn) gates.push(gate("edges", "warn", "Soft or see-through edges", "Glows, shadows and translucent areas can print patchy on fabric. Making them solid gives the cleanest result."));
        else gates.push(gate("edges", "pass", "Clean edges", "No large see-through areas."));
      } else if (analysis.edgeFlat) {
        gates.push(gate("background", "warn", "Solid background", "The background will print as a coloured box on the shirt. Remove it for a clean cut-out.", "remove-bg"));
      } else {
        gates.push(gate("background", "warn", "Full-bleed picture", "This will print as a rectangle with no see-through areas. That is fine for a photo; use a transparent PNG for a cut-out look."));
      }
      if (teeHex && typeof analysis.inkLum === "number") {
        const c = contrast(lumGrey(analysis.inkLum), lumHex(teeHex));
        if (c < PRINT.contrastWarn) gates.push(gate("visibility", "warn", `May be hard to see on ${teeName || "this colour"}`, "The artwork is close to the shirt colour. Try a different shirt colour, or lighter or darker artwork."));
      }
    }

    // how big it is: the printer's biggest area, and a floor below which nothing prints
    const A = PRINT.areaIn;
    const f1 = n => (Math.round(n * 10) / 10).toFixed(1);
    if (placed.wIn > A.w + PRINT.maxSlackIn || placed.hIn > A.h + PRINT.maxSlackIn) {
      gates.push(gate("max", "fail", "Bigger than the largest print we can do", `The biggest print is ${A.w} × ${A.h} in. This is ${f1(placed.wIn)} × ${f1(placed.hIn)} in. Make it smaller.`, "fit"));
    } else {
      gates.push(gate("max", "pass", "Fits the print size", `${f1(placed.wIn)} × ${f1(placed.hIn)} in, inside the ${A.w} × ${A.h} in maximum.`));
    }
    if (placed.wIn < PRINT.minFailIn || placed.hIn < PRINT.minFailIn) {
      gates.push(gate("min", "fail", "Too small to print", `It is only ${f1(placed.wIn)} × ${f1(placed.hIn)} in. The smallest we can print is ${PRINT.minFailIn} in.`, "grow"));
    } else if (placed.wIn < PRINT.minPlacedIn) {
      gates.push(gate("tiny", "warn", "Very small", `It is only ${f1(placed.wIn)} in wide. Under about ${PRINT.minPlacedIn} in the detail may not print clearly.`));
    }

    // proportions and angle
    const stretch = input.stretch == null ? 1 : input.stretch;
    if (Math.abs(stretch - 1) > PRINT.stretchWarn) gates.push(gate("distortion", "warn", "Stretched out of proportion", `It is squashed or stretched by ${Math.round(Math.abs(stretch - 1) * 100)}%, so it may look distorted when printed.`, "unstretch"));
    const rot = Math.abs(input.rotation || 0);
    if (rot >= PRINT.upsideDownDeg) gates.push(gate("rotation", "warn", "Upside down?", `It is turned ${Math.round(rot)}°. Check that you meant that.`, "straighten"));
    else if (rot > 0.5 && rot <= PRINT.nearlyStraightDeg) gates.push(gate("rotation", "warn", "Almost, but not quite, straight", `It is tilted ${rot.toFixed(1)}°, which usually looks like a mistake.`, "straighten"));

    // effects that make soft or see-through pixels
    const fx = input.effects || {};
    if (fx.opacity != null && fx.opacity < 0.99) gates.push(gate("fx-opacity", "warn", "See-through artwork", "Reduced opacity prints as a patchy halftone on fabric. Keep it at 100% for solid ink."));
    if (fx.blur > 0) gates.push(gate("fx-blur", "warn", "Blur softens the print", "Blurred areas print soft and can look out of focus on fabric."));
    if (fx.shadow) gates.push(gate("fx-shadow", "warn", "Shadows print patchy", "Soft drop shadows are see-through and can print patchy. A hard outline prints better."));

    // where it sits
    const out = input.outsideShare || 0;
    if (out > PRINT.outsideFail) gates.push(gate("placement", "fail", "Mostly outside the print area", "Most of the design sits outside the dashed box, and anything outside won't be printed. Move it back in."));
    else if (out > PRINT.outsideWarn) gates.push(gate("placement", "warn", "Part of it is outside the print area", `About ${Math.round(out * 100)}% sits outside the dashed box and won't be printed.`));

    const level = gates.some(g => g.level === "fail") ? "blocked" : gates.some(g => g.level === "warn") ? "notes" : "ready";
    return { level, gates, dpi, need, vector };
  }

  const LABEL = { ready: "Ready to print", notes: "Printable, with notes", blocked: "Needs fixing before we can print it" };
  const summary = r => LABEL[r.level];

  const api = { PRINT, checkFile, checkPrint, summary, LABEL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PrintCheck = api;
})(typeof window !== "undefined" ? window : globalThis);
