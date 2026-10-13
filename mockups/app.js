// Duck T-Shirt Co concept demo: hash-routed single page, all state in memory.

// A "side" is what's printed on the front or back of a tee:
//   { kind: "catalog", designId, aspect, place }  or
//   { kind: "upload", name, url, aspect, stats: { colours, detail, coverage }, place }
// place = { x, y (offset from print-area centre, as a fraction of its size), s (width, fraction of print area), k (vertical stretch), r (degrees) }
const draftDefaults = () => ({
  path: null,      // "catalog" | "upload": how they started (sets the step order)
  tee: "crew",   // preselected: it is the only style for now, so Continue is enabled straight away
  colour: null,
  size: null,
  qty: 1,
  badge: "brand", // the round Duck badge on the back: "brand" | "mine" (their own duck) | "none"
  front: null,
  back: null,
  side: "front",   // side being edited in the studio
  picker: false,   // catalog picker open in the studio
  editing: null,   // id of the basket item being edited, if any
});
const freshState = () => ({ ...draftDefaults(), fields: {}, cart: [], orderNo: null, duckCalls: 0, duckPrompt: "", duckMsg: null, duckUsed: false });
let state = freshState();
let cartSeq = 0;
let lastRoute = null;

const $app = document.getElementById("app");

// ---------- helpers ----------
// Whole amounts print as before (R30). Part-rand amounts print to the cent (R34.90), so nothing is rounded away.
const money = n => `${CURRENCY}${n.toLocaleString("en-US", Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const minusMoney = n => `\u2212${money(n)}`; // a deduction, e.g. −R30
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const svgUrl = (inner, vb = "0 0 100 100") => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`);
DESIGNS.forEach(d => { d.url = d.img || svgUrl(d.svg, d.vb); }); // img: a transparent image file in designs/, otherwise inline SVG
const designById = id => DESIGNS.find(d => d.id === id);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const normDeg = a => ((((a + 180) % 360) + 360) % 360) - 180;
const go = route => { location.hash = "#/" + route; };

// Home carousel order: featured first, the rest shuffled once per visit.
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(p => p[1]);
const CAROUSEL = [...DESIGNS.filter(d => d.featured), ...shuffle(DESIGNS.filter(d => !d.featured))];
const carHex = i => COLOURS.find(c => c.id === CAROUSEL[i].showOn).hex; // tee colour that suits each design
const hexOf = d => COLOURS.find(c => c.id === d.showOn).hex;

// The carousel has its own list so a pill can change it without touching the shop grid.
// No pill = the default order above. One pill at a time; tapping the active one clears it.
// Every list is capped at CAROUSEL_SIZE: the carousel is a short, curated strip, not the whole catalogue.
const pillList = {
  hot: () => [...DESIGNS].sort((a, b) => b.sold30 - a.sold30).slice(0, CAROUSEL_SIZE), // top sellers, last 30 days
  fresh: () => [...DESIGNS].sort((a, b) => b.added.localeCompare(a.added)).slice(0, CAROUSEL_SIZE),
  uploaded: () => DESIGNS.filter(d => d.uploader).slice(0, CAROUSEL_SIZE),
};
const carDefault = () => CAROUSEL.slice(0, CAROUSEL_SIZE); // featured first, then the shuffled rest
let carPill = null;
let carList = carDefault();
const hotIds = new Set([...DESIGNS].sort((a, b) => b.sold30 - a.sold30).slice(0, HOT_BADGE_COUNT).map(d => d.id));
const isHot = d => hotIds.has(d.id);
const isNew = d => (Date.now() - new Date(d.added)) / 864e5 <= NEW_DESIGN_DAYS;
// Comic-book "bang" starbursts drawn as SVG (original artwork, no licensed assets). The jagged outline is
// generated once; every sticker reuses it, coloured by class, with a hard black offset shadow behind it.
const BURST = (() => {
  const n = 14, pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = Math.PI * i / n - Math.PI / 2;
    const k = i % 2 ? 0.68 + 0.07 * Math.sin(i * 2.3) : 1 - 0.07 * Math.cos(i * 1.7); // slightly uneven, like hand-cut
    pts.push(`${(100 + 98 * k * Math.cos(a)).toFixed(1)},${(60 + 57 * k * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
})();
const sticker = (cls, text) => `<span class="sticker ${cls}"><svg viewBox="0 0 200 120" preserveAspectRatio="none" aria-hidden="true"><polygon class="sh" points="${BURST}" transform="translate(6 7)"/><polygon class="fg" points="${BURST}"/></svg><b>${text}</b></span>`;
const badgeOverlay = d => {
  const b = (isHot(d) ? sticker("hot", "Hot Seller!") : "") +
            (isNew(d) ? sticker("new", "New Design") : "") +
            (d.uploader ? sticker("user", "User's Designs") : "");
  return b ? `<span class="ov">${b}</span>` : "";
};
const pillEmpty = id => pillList[id]().length === 0;
const carMeta = d => `Design: ${d.tags} · from ${money(fromPrice(d.price))}` +
  (d.uploader ? ` · by ${d.uploader}` : "") +
  (carPill === "hot" ? ` · ${d.sold30} sold in 30 days` : "");

const LOGO = `<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="30" cy="42" rx="22" ry="14" fill="var(--brand-1)" stroke="#000" stroke-width="2.5"/><circle cx="40" cy="22" r="12" fill="var(--brand-1)" stroke="#000" stroke-width="2.5"/><path d="M50 18 L62 23 L50 28 Z" fill="#FF8A1E" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/><path d="M14 42 Q22 52 34 44 Q26 36 14 42 Z" fill="#FFB400"/><path d="M22 54 L20 61 M34 54 L33 61" stroke="#FF8A1E" stroke-width="3.5" stroke-linecap="round"/><circle cx="43" cy="19" r="2.2" fill="#000"/></svg>`;
const CHECK = `<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2.5 6.5 L5 9 L9.5 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// ---------- tee drawing ----------
const PA = { x: 100, y: 78, w: 100, h: 120 }; // print area on the tee (front and back), in tee-SVG units
const BLANK_TEE = "#e9e9e9";                    // plain, not-yet-coloured tee
let clipSeq = 0;

const teeBody = (hex, back = false) => {
  const neck = back ? "C120 27 180 27 195 18" : "C120 42 180 42 195 18"; // the back neckline sits higher
  return `
    <path d="M105 18 ${neck} L262 44 L298 118 L250 138 L236 112 L236 318 L64 318 L64 112 L50 138 L2 118 L38 44 Z"
      fill="${hex}" stroke="rgba(255,255,255,.28)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M105 18 ${neck}" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="6"/>
    <path d="M64 112 L64 128 M236 112 L236 128" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`;
};

const sideUrl = side => (side.kind === "catalog" ? designById(side.designId).url : side.url);
const sideArt = side => side && { url: sideUrl(side), aspect: side.aspect, ...side.place };

// Where a placed design sits on the tee.
function artGeom(a) {
  const w = a.s * PA.w, h = w / a.aspect * (a.k ?? 1); // k: vertical stretch (1 = natural proportions)
  const cx = PA.x + PA.w / 2 + a.x * PA.w, cy = PA.y + PA.h / 2 + a.y * PA.h;
  return { w, h, cx, cy, x: cx - w / 2, y: cy - h / 2 };
}

// ---- the duck badge: a small round print in its own label zone on the back, between the collar and the print area ----
const DUCK_KEY = "duck-badge";
const duckLoad = () => { try { return duckConfig(JSON.parse(localStorage.getItem(DUCK_KEY))); } catch { return duckConfig(); } };
const duckSave = cfg => { try { localStorage.setItem(DUCK_KEY, JSON.stringify(cfg)); } catch {} };
let duckCfg = duckLoad(); // the duck being edited on the duck page
const badgeUrl = cfg => svgUrl(badgeInner(cfg));
const BADGE_AT = { cx: 150, cy: 56, r: 14 }; // tee-SVG units: about 6 cm across
// kind: "brand" | "mine" | "none", or a duck config to preview. link: clicking it opens the duck page.
function badgeMark(kind, link = true) {
  if (!kind || kind === "none") return "";
  const cfg = kind === "brand" ? BRAND_BADGE : kind === "mine" ? duckLoad() : duckConfig(kind);
  const img = `<image href="${badgeUrl(cfg)}" x="${BADGE_AT.cx - BADGE_AT.r}" y="${BADGE_AT.cy - BADGE_AT.r}" width="${BADGE_AT.r * 2}" height="${BADGE_AT.r * 2}"/>`;
  return link ? `<a href="#/duck" class="duck-hit" aria-label="Customise your duck"><title>Customise your duck</title>${img}</a>` : img;
}

// art: a design URL drawn to fill the print area (carousel/shop), or a placed side from sideArt().
function teeSVG(hex, art, cls = "", back = false, badge = "none") {
  let print = "";
  if (cls !== "mini") {
    if (typeof art === "string") {
      print = `<image href="${art}" x="${PA.x}" y="${PA.y}" width="${PA.w}" height="${PA.h}" preserveAspectRatio="xMidYMid meet"/>`;
    } else if (art) {
      const g = artGeom(art), id = "pa" + ++clipSeq, wid = "fxw" + clipSeq, c = FX.fxClean(art.fx), filter = FX.fxFilter(art.fx, 1, wid);
      print = `<clipPath id="${id}"><rect x="${PA.x}" y="${PA.y}" width="${PA.w}" height="${PA.h}"/></clipPath>
        ${c.wave ? `<defs>${FX.fxWaveDef(wid, c.wave)}</defs>` : ""}
        <g clip-path="url(#${id})"><image href="${art.url}" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}"
          preserveAspectRatio="none" transform="${FX.fxSvgTransform(art.fx, art.r, g.cx, g.cy)}"${filter ? ` style="filter:${filter}"` : ""}/></g>`;
    } else if (cls !== "thumb") {
      print = `<rect x="${PA.x}" y="${PA.y}" width="${PA.w}" height="${PA.h}" rx="6" fill="none" stroke="rgba(128,128,128,.6)" stroke-dasharray="6 5"/>
        <text x="150" y="143" text-anchor="middle" font-size="12" fill="rgba(128,128,128,.9)" font-family="system-ui, sans-serif">Print area</text>`;
    }
  }
  const mark = back && cls !== "mini" ? badgeMark(badge, cls !== "thumb" && typeof badge !== "object") : "";
  return `<svg class="tee ${cls}" viewBox="0 0 300 330" role="img" aria-label="T-shirt ${back ? "back" : "front"}">${teeBody(hex, back)}${mark}${print}</svg>`;
}

// Front and back of one tee (back only if it has a back print, unless `always`).
function teePair(it, cls = "", always = false) {
  const hex = colourOf(it)?.hex || BLANK_TEE;
  const front = `<figure>${teeSVG(hex, sideArt(it.front), cls)}<figcaption>Front</figcaption></figure>`;
  const badge = it.badge ?? "brand";
  const back = `<figure>${teeSVG(hex, sideArt(it.back), cls, true, badge)}<figcaption>Back</figcaption></figure>`;
  return `<div class="tee-pair">${front}${it.back || always || badge !== "none" ? back : ""}</div>`;
}

// ---------- pricing: every option is its own line ----------
// An "item" is a basket entry, or the tee currently being designed (draft()).
const cloneSide = s => s && { ...s, place: { ...s.place, ...(s.place.fx ? { fx: { ...s.place.fx } } : {}) } }; // fx copied too, or two shirts would share their effects
const draft = () => ({
  path: state.path, tee: state.tee, colour: state.colour, size: state.size, qty: state.qty, badge: state.badge,
  front: cloneSide(state.front), back: cloneSide(state.back),
});
const colourOf = it => COLOURS.find(c => c.id === it.colour);
const sideName = side => (side.kind === "catalog" ? designById(side.designId).name : "Your design");
const itemTitle = it => {
  const names = [it.front, it.back].filter(Boolean).map(sideName);
  return `${[...new Set(names)].join(" + ")} · ${TEES.find(t => t.id === it.tee).name}`;
};

// Uploaded artwork: how much of the print area it covers at its current size (rotation doesn't change area).
const inkShare = side => {
  const g = artGeom({ aspect: side.aspect, ...side.place });
  return clamp(side.stats.coverage * (g.w * g.h) / (PA.w * PA.h), 0, 1);
};
const tier = (tiers, v) => tiers.find(t => v <= t.upTo);

function sideLines(side, where) {
  if (!side) return [{ label: `${where} print`, text: "None" }];
  if (side.kind === "catalog") {
    const d = designById(side.designId);
    return [{ label: `${where} print`, value: d.name, price: d.price }];
  }
  const U = UPLOAD_PRICING, share = inkShare(side);
  const ps = tier(U.printSize, share), cs = tier(U.colours, side.stats.colours), ds = tier(U.detail, side.stats.detail);
  return [
    { label: `${where} print`, value: `Your upload (${side.name})`, price: U.base },
    { label: "Print size", value: `${ps.label}, ${Math.round(share * 100)}% of print area`, price: ps.price, sub: true },
    { label: "Colours", value: side.stats.colours > 12 ? "full colour, photo-like" : `${side.stats.colours} detected`, price: cs.price, sub: true },
    { label: "Detail", value: ds.label, price: ds.price, sub: true },
    { label: "Custom design fee", value: "artwork check & setup", price: U.customFee, sub: true },
  ];
}
function priceLines(it) {
  const t = TEES.find(x => x.id === it.tee), c = colourOf(it), s = SIZES.find(x => x.id === it.size);
  return [
    { label: "Style", value: t?.name, price: t?.price },
    { label: "Colour", value: c?.name, price: c?.price },
    { label: "Size", value: s?.id, price: s?.price },
    ...sideLines(it.front, "Front"),
    ...sideLines(it.back, "Back"),
    badgeLine(it),
  ];
}
// The badge is a free brand label, not a print placement. Taking it off does not change the price.
function badgeLine(it) {
  const k = it.badge ?? "brand";
  if (k === "none") return { label: "Back badge", text: "Removed" };
  return { label: "Back badge", value: k === "mine" ? (duckLoad().title || "Your duck") : "Duck T-Shirt Co", price: 0 };
}
const sumLines = lines => lines.reduce((n, l) => n + (l.price ?? 0), 0);
const unitOf = it => sumLines(priceLines(it));
const lineTotal = it => unitOf(it) * it.qty;
const cartCount = () => state.cart.reduce((n, it) => n + it.qty, 0);
const cartSubtotal = () => state.cart.reduce((n, it) => n + lineTotal(it), 0); // items only, no shipping
const aiFees = () => duckAiFee(state.duckCalls); // "describe your duck" tries, billed with the order
const cartTotal = () => Math.round((cartSubtotal() + shippingSplit(cartSubtotal()).pay + aiFees()) * 100) / 100;
const priceText = p => (p === 0 ? "Included" : money(p));
const plusText = p => (p === 0 ? "Included" : "+" + money(p));
// One row for the duck AI tries, if there were any.
function aiRows() {
  const n = state.duckCalls;
  return n ? `<dt>Duck AI<span>${n} ${n === 1 ? "try" : "tries"} × ${money(DUCK_AI_COST)}</span></dt><dd>${money(aiFees())}</dd>` : "";
}
// The three shipping lines, as rows for a .breakdown list: what it costs, what we cover, what the customer pays.
function shippingRows() {
  const s = shippingSplit(cartSubtotal());
  if (!s.cost) return "";
  return `
    <dt>Shipping</dt><dd>${money(s.cost)}</dd>
    <dt class="ship-cover">We cover</dt><dd class="ship-cover">${minusMoney(s.cover)}</dd>
    <dt class="ship-pay">You pay${s.pay === 0 ? "<span>Shipping fully covered</span>" : ""}</dt><dd class="ship-pay">${money(s.pay)}</dd>`;
}

// Cheapest possible tee for a given print price, for "from R…" labels.
const minPrice = arr => Math.min(...arr.map(x => x.price));
const fromPrice = printPrice => minPrice(TEES.filter(t => t.available)) + minPrice(COLOURS) + minPrice(SIZES) + printPrice;
const uploadFrom = () => fromPrice(UPLOAD_PRICING.base + UPLOAD_PRICING.customFee); // simplest artwork, all tiers at 0

const linesHTML = lines => `<dl class="breakdown">${lines.map(l => `
    <dt class="${l.sub ? "sub" : ""}">${l.label}${l.value ? `<span>${esc(l.value)}</span>` : ""}</dt>
    <dd class="${l.sub ? "sub" : ""}">${l.text ?? (l.price == null ? '<span class="muted">—</span>' : priceText(l.price))}</dd>`).join("")}
  </dl>`;
const breakdown = it => linesHTML(priceLines(it));

// ---------- uploaded artwork analysis (runs in the browser; nothing is sent anywhere) ----------
// Counts distinct colours, measures detail (edge density) and how much of the image is ink (non-transparent).
function analyseImage(img) {
  try {
    const nw = img.naturalWidth || 300, nh = img.naturalHeight || 300, k = 160 / Math.max(nw, nh);
    const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
    const cv = Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const lum = i => px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    const differs = (i, j) => px[j + 3] < 128 || Math.abs(lum(i) - lum(j)) > 40;
    const buckets = new Map();
    let ink = 0, edges = 0, lumSum = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (px[i + 3] < 128) continue;
        ink++;
        lumSum += lum(i);
        const key = ((px[i] >> 5) << 6) | ((px[i + 1] >> 5) << 3) | (px[i + 2] >> 5); // 8 levels per channel
        buckets.set(key, (buckets.get(key) || 0) + 1);
        if (x + 1 < w && differs(i, i + 4)) edges++;
        if (y + 1 < h && differs(i, i + w * 4)) edges++;
      }
    }
    if (!ink) return { colours: 1, detail: 0, coverage: 0, alpha: null, lum: 128 };
    // colours = how many shades it takes to cover 95% of the ink (ignores anti-aliasing specks; photos score high)
    let colours = 0, covered = 0;
    for (const n of [...buckets.values()].sort((a, b) => b - a)) {
      if (covered >= ink * 0.95) break;
      covered += n;
      colours++;
    }
    return { colours, detail: edges / (ink * 2), coverage: ink / (w * h), alpha: analyseAlpha(img), lum: lumSum / ink };
  } catch {
    return { colours: 4, detail: 0.08, coverage: 0.6, alpha: null, lum: 128 }; // browser wouldn't let us read the pixels: assume mid-range
  }
}
// Transparency facts for the print gates, read without smoothing so soft edges are not invented by the shrinking.
function analyseAlpha(img) {
  const nw = img.naturalWidth || 300, nh = img.naturalHeight || 300, k = Math.min(1, 400 / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
  const cv = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  let anyAlpha = false, semi = 0, seen = 0;
  for (let i = 3; i < px.length; i += 4) {
    if (px[i] < 250) anyAlpha = true;
    if (px[i] > 5) { seen++; if (px[i] < 250) semi++; }
  }
  // the outer ring: does the picture sit on a solid background?
  const ring = [];
  for (let x = 0; x < w; x++) ring.push(x, (h - 1) * w + x);
  for (let y = 1; y < h - 1; y++) ring.push(y * w, y * w + w - 1);
  const opaque = ring.filter(p => px[p * 4 + 3] >= 250);
  const edgeOpaque = opaque.length / ring.length >= 0.92;
  let edgeFlat = false;
  if (edgeOpaque && opaque.length) {
    const m = [0, 1, 2].map(c => opaque.reduce((n, p) => n + px[p * 4 + c], 0) / opaque.length);
    edgeFlat = opaque.filter(p => [0, 1, 2].every(c => Math.abs(px[p * 4 + c] - m[c]) <= 28)).length / ring.length >= 0.9;
  }
  return { hasAlpha: anyAlpha, edgeOpaque, edgeFlat, semiShare: seen ? semi / seen : 0 };
}

// ---------- routing & progress ----------
// Each start point has its own step order. Checkout is separate: basket → details → payment.
const FLOWS = {
  catalog: ["tee", "colour", "design", "size"],
  upload: ["design", "colour", "size"], // only one tee style for now, so upload goes straight to the studio
};
const CHECKOUT = ["basket", "details", "payment"];
const STEP_LABEL = { tee: "T-shirt", colour: "Colour", design: "Design", size: "Size", basket: "Basket", details: "Details", payment: "Payment" };
const STEP_DONE = { tee: () => state.tee, colour: () => state.colour, design: () => state.front || state.back, size: () => state.size };
const flow = () => FLOWS[state.path];
const firstOpen = () => flow().find(s => !STEP_DONE[s]()) || "size"; // first unfinished step
const nextOf = r => flow()[flow().indexOf(r) + 1];
const prevOf = r => flow()[flow().indexOf(r) - 1] || "start";

function allowed(route) {
  if (["start", "shop", "basket", "duck"].includes(route)) return true;
  if (["details", "payment", "processing"].includes(route)) return state.cart.length > 0;
  if (!state.path) return false;
  const i = flow().indexOf(route);
  return i !== -1 && i <= flow().indexOf(firstOpen());
}

function render() {
  let route = location.hash.replace(/^#\/?/, "") || "start";
  if (route === "done") {
    if (!state.orderNo) return go("start");
  } else {
    if (!(route in VIEWS)) route = "start";
    if (!allowed(route)) {
      if (["details", "payment", "processing"].includes(route)) return go("basket");
      return go(state.path ? firstOpen() : "start");
    }
  }
  if ((route === "start" || route === "shop") && state.editing) Object.assign(state, draftDefaults()); // left an edit unfinished

  if (route === "start" || route === "shop" || route === "done" || route === "duck") {
    $app.innerHTML = VIEWS[route]();
  } else if (route === "design" || route === "basket") {
    $app.innerHTML = stepper(route) + VIEWS[route]();
  } else {
    const checkout = ["details", "payment", "processing"].includes(route);
    $app.innerHTML = `${stepper(route)}
      <div class="layout">
        <section class="panel">${VIEWS[route]()}</section>
        <aside class="summary">${checkout ? cartSummary() : summary()}</aside>
      </div>`;
  }
  if (state.uploadError) $app.insertAdjacentHTML("afterbegin", uploadErrorHTML());
  if (route === "design") studioUpdate();
  if (route === "start") { car.prev = []; carLayout(false); }
  if (route === "shop") shopInit();
  document.getElementById("cart-count").textContent = cartCount();
  document.getElementById("cart-count").hidden = !cartCount();
  if (route !== lastRoute) window.scrollTo(0, 0);
  lastRoute = route;
}

function stepper(route) {
  const inCheckout = CHECKOUT.includes(route) || route === "processing";
  const steps = inCheckout ? CHECKOUT : [...flow(), "basket"];
  const cur = inCheckout && route === "processing" ? 2 : steps.indexOf(route);
  const reached = inCheckout ? 2 : flow().indexOf(firstOpen());
  return `<ol class="stepper">${steps.map((s, i) => {
    const cls = i < cur ? "done" : i === cur ? "current" : "";
    const inner = `<b>${i < cur ? CHECK : i + 1}</b><span>${STEP_LABEL[s]}</span>`;
    const linkable = route !== "processing" && (i <= reached || s === "basket");
    return `<li class="${cls}">${linkable ? `<a href="#/${s}">${inner}</a>` : `<span class="step">${inner}</span>`}</li>`;
  }).join("")}</ol>`;
}

const nav = (back, next, ok, label = "Continue") => `
  <div class="nav">
    <a class="btn ghost" href="#/${back}">Back</a>
    <button class="btn primary" data-action="go" data-to="${next}" ${ok ? "" : "disabled"}>${label}</button>
  </div>`;

// Sidebar while designing a tee: preview + every option's price.
function summary() {
  const it = draft(), lines = priceLines(it);
  const missing = lines.some(l => l.price === undefined && !l.text);
  return `
    <div class="preview">${teePair(it)}</div>
    ${breakdown(it)}
    <div class="unit"><span>Per tee${missing ? " so far" : ""}</span><b>${money(unitOf(it))}</b></div>
    <div class="total"><span>Total${state.qty > 1 ? ` × ${state.qty}` : ""}</span><strong>${money(lineTotal(it))}</strong></div>
    ${state.cart.length ? `<p class="small"><a href="#/basket">${cartCount()} already in your basket</a></p>` : ""}`;
}

// Sidebar during checkout: what's being paid for.
function cartSummary() {
  return `
    <h3 class="sum-title">Your order</h3>
    <ul class="mini-cart">${state.cart.map(it => `
      <li>${teeSVG(colourOf(it).hex, sideArt(it.front || it.back), "thumb", !it.front, it.badge ?? "brand")}
        <div><b>${esc(itemTitle(it))}</b><span class="small muted">${colourOf(it).name} · ${it.size} · × ${it.qty}</span></div>
        <span>${money(lineTotal(it))}</span></li>`).join("")}
    </ul>
    <dl class="breakdown">${aiRows()}${shippingRows()}</dl>
    <div class="total"><span>Total</span><strong>${money(cartTotal())}</strong></div>
    <p class="small"><a href="#/basket">Edit basket</a></p>`;
}

// ---------- "what other styles are you interested in?" poll: multi-select (browser-only in the mockup) ----------
const POLL_KEY = "duck-poll-vote";
// An older single-choice answer was stored as one id; a multi-select answer is stored as a JSON list.
const pollLoad = () => { try { const v = localStorage.getItem(POLL_KEY); return !v ? null : v.startsWith("[") ? JSON.parse(v) : [v]; } catch { return null; } };
const pollSave = v => { try { v ? localStorage.setItem(POLL_KEY, JSON.stringify(v)) : localStorage.removeItem(POLL_KEY); } catch {} };
let pollMine = pollLoad();  // submitted answer: array of ids, or null
let pollDraft = [];         // ticked but not sent yet
function pollHTML() {
  const res = pollResults(pollMine || []);
  return `<section class="poll" aria-labelledby="poll-q">
    <h3 id="poll-q">${POLL.question}</h3>
    <p class="small muted">${pollMine ? `Thanks, your answer is in. ${res.voters} people have answered. <button class="link-btn" data-action="poll-change">Change my answer</button>` : POLL.note}</p>
    <div class="poll-opts" role="group" aria-labelledby="poll-q">${res.options.map(o => pollMine
      ? `<div class="poll-res ${o.mine ? "mine" : ""}" style="--p:${o.pct}%"><span>${o.label}</span><b>${o.pct}%</b></div>`
      : `<button class="poll-opt" data-action="poll-toggle" data-value="${o.id}" aria-pressed="${pollDraft.includes(o.id)}">${o.label}</button>`).join("")}
    </div>
    ${pollMine ? "" : `<button class="btn primary poll-send" data-action="poll-submit" ${pollDraft.length ? "" : "disabled"}>Send my answer</button>`}
  </section>`;
}

// ---------- views ----------
const VIEWS = {
  start: () => `
    <section class="hero">
      <h1>Your tee, <span class="accent">your way.</span></h1>
      <p class="lede">Pick a tee, choose a colour, add a design, and we print it. You pay up front, and production starts straight away.</p>
      <p class="ship-banner" role="note">${shippingBannerText()}</p>
      <div class="car-pills" role="group" aria-label="Show designs">${CAROUSEL_PILLS.map(p => `
        <button class="car-pill" data-action="car-pill" data-value="${p.id}" aria-pressed="${carPill === p.id}" ${pillEmpty(p.id) ? "disabled" : ""}>${p.label}</button>`).join("")}
      </div>
      <div class="carousel" tabindex="0" aria-roledescription="carousel" aria-label="Featured designs">
        <div class="car-stage">
          ${carList.map((d, i) => `
            <div class="car-slide" data-action="car-slide" data-value="${i}">${teeSVG(hexOf(d), d.url)}${badgeOverlay(d)}</div>`).join("")}
          <button class="car-btn prev" data-action="car-step" data-value="-1" aria-label="Previous design">‹</button>
          <button class="car-btn next" data-action="car-step" data-value="1" aria-label="Next design">›</button>
        </div>
        <div class="car-caption" aria-live="polite">
          <strong id="car-name"></strong>
          <span class="small muted" id="car-meta"></span>
          <button class="btn ghost" data-action="car-pick">Customise this</button>
        </div>
        <div class="car-dots">${carList.map((d, i) => `
          <button class="car-dot" data-action="car-dot" data-value="${i}" aria-label="Show ${d.name}"></button>`).join("")}
        </div>
        <a class="browse-all" href="#/shop" data-action="browse-all">
          <span class="ba-title">Browse ALL our designs <span aria-hidden="true">→</span></span>
          <span class="ba-cats">${CAROUSEL_PILLS.map(p => `<span><b>${DESIGNS.filter(BROWSE_PILLS[p.id]).length}</b> ${p.label}</span>`).join("")}</span>
        </a>
      </div>
      <div class="paths">
        <label class="path-card upload" tabindex="0">
          <input type="file" accept="image/png,image/jpeg,image/svg+xml" data-upload="start" hidden>
          <span class="badge">Priced on your artwork</span>
          <h2>Upload your own</h2>
          <p>Use your own artwork, then place, size and rotate it, front or back. The price depends on its size, colours and detail.</p>
          <span class="price"><small>from</small> ${money(uploadFrom())} <small>per tee</small></span>
        </label>
      </div>
      <ol class="how">
        <li><b>1</b>Choose tee, colour &amp; design</li>
        <li><b>2</b>Add to your basket</li>
        <li><b>3</b>Pay, and we start printing</li>
      </ol>
      ${pollHTML()}
    </section>`,

  shop: () => `
    <section class="ig">
      <a class="back-link" href="#/start">← Home</a>
      <header class="ig-profile">
        <a class="ig-avatar duck-hit" href="#/duck" title="Customise your duck" aria-label="Customise your duck">${LOGO}</a>
        <div>
          <h1>ducktshirtco</h1>
          <ul class="ig-stats">
            <li><b>${CAROUSEL.length}</b> designs</li>
            <li>from <b>${money(fromPrice(minPrice(DESIGNS)))}</b> per tee</li>
          </ul>
          <p>Every design printed to order. Tap one to make it yours.</p>
        </div>
      </header>
      <div class="car-pills" id="shop-pills" role="group" aria-label="Filter designs">${shopPillsHTML()}</div>
      <div class="car-pills cat-pills" id="shop-cats" role="group" aria-label="Filter by category">${shopCatsHTML()}</div>
      <p class="ig-result small muted" id="ig-result" aria-live="polite">${shopResultHTML()}</p>
      <div class="ig-float" role="note">All tees <b>from ${money(shopFromPrice())}</b></div>
      <div class="ig-grid" id="ig-grid"></div>
      <div class="ig-more" id="ig-more"><div class="spinner"></div></div>
    </section>`,

  tee: () => `
    <h2>Select your t-shirt style</h2>
    <div class="grid tees">${TEES.map(t => `
      <button class="card ${state.tee === t.id ? "selected" : ""}" ${t.available ? `data-action="tee" data-value="${t.id}"` : "disabled"}>
        ${teeSVG("#3a3a3a", null, "mini")}
        <strong>${t.name}</strong>
        <span class="small muted">${t.blurb}</span>
        <span class="opt-price">${money(t.price)}</span>
        ${t.available ? "" : '<span class="not-yet">Not available yet</span>'}
      </button>`).join("")}
    </div>
    ${pollHTML()}
    ${nav(prevOf("tee"), nextOf("tee"), state.tee)}`,

  colour: () => `
    <h2>Pick a colour</h2>
    <div class="swatches">${COLOURS.map(c => `
      <button class="swatch ${state.colour === c.id ? "selected" : ""}" data-action="colour" data-value="${c.id}">
        <span class="chip" style="background:${c.hex}"></span>
        <span>${c.name}<small>${plusText(c.price)}</small></span>
      </button>`).join("")}
    </div>
    ${nav(prevOf("colour"), nextOf("colour"), state.colour)}`,

  design: () => studioView(),

  duck: () => {
    const cfg = duckConfig(duckCfg), msg = state.duckMsg, n = state.duckCalls;
    const label = cfg.title || DUCK_PRESETS.find(p => p.id === cfg.preset)?.label || "Classic";
    const sw = (list, action, current) => list.map(c => `<button style="background:${c}" data-action="${action}" data-value="${c}" aria-pressed="${current.toLowerCase() === c.toLowerCase()}" aria-label="${c}"></button>`).join("");
    return `<section class="duck-page">
      <a class="back-link" href="#/${state.path ? "design" : "start"}">← Back</a>
      <h1>Customise your duck</h1>
      <p class="lede">Dress your duck. It rides on the back of your shirts as a little round badge.</p>
      <div class="duck-grid">
        <div class="duck-stage panel">
          <img class="duck-badge-img" id="duck-badge-img" src="${badgeUrl(cfg)}" alt="Your duck badge">
          <p class="muted small" id="duck-title">${esc(label)}</p>
          <div class="duck-tee" id="duck-tee">${teeSVG(colour()?.hex || COLOURS[0].hex, null, "mid", true, cfg)}</div>
        </div>
        <div class="duck-controls">
          <div class="panel duck-ai">
            <h3>Describe your duck</h3>
            <div class="duck-ask"><input type="text" id="duck-prompt" maxlength="80" placeholder="e.g. give me a vampire duck" value="${esc(state.duckPrompt || "")}"><button class="btn primary sm" data-action="duck-ai" ${state.duckBusy ? "disabled" : ""}>${state.duckBusy ? "Drawing…" : `Draw it · ${money(DUCK_AI_COST)}`}</button></div>
            <p class="small muted">Each duck we draw costs ${money(DUCK_AI_COST)}, added to your order. If we can't draw it you aren't charged. ${DUCK_AI_ENDPOINT ? "<b>Your words are sent to our artist to be drawn.</b>" : "<b>Demo: nothing is really sent or charged.</b>"}</p>
            ${n ? `<p class="small duck-tab">Your tab: ${n} ${n === 1 ? "duck" : "ducks"} drawn = <b>${money(aiFees())}</b></p>` : ""}
            ${msg ? (msg.busy
              ? `<p class="small" role="status">Drawing your duck… this takes a few seconds.</p>`
              : msg.ok
              ? `<p class="duck-ok">✓ ${esc(msg.text)}</p>`
              : msg.error
              ? `<p class="small duck-err" role="alert">${esc(msg.error)}</p>`
              : `<p class="small">We can't draw that one yet. Try: ${msg.ideas.map(i => `<button class="link-btn" data-action="duck-idea" data-value="${esc(i)}">${esc(i)}</button>`).join(", ")}.</p>`) : ""}
          </div>
          <h3>Character</h3>
          <div class="duck-presets">${DUCK_PRESETS.map(p => `
            <button class="duck-preset" data-action="duck-preset" data-value="${p.id}" aria-pressed="${!cfg.acc && cfg.preset === p.id}"><img src="${svgUrl(duckInner(duckConfig({ preset: p.id })))}" alt=""><span>${p.label}</span></button>`).join("")}</div>
          <h3>Body colour</h3><div class="duck-sw">${sw(DUCK_BODIES, "duck-body", cfg.body)}</div>
          <h3>Badge colour</h3><div class="duck-sw">${sw(DUCK_RINGS, "duck-ring", cfg.ring)}</div>
          <h3>Badge text</h3>
          <input type="text" id="duck-text" maxlength="${DUCK_RING_MAX}" value="${esc(duckCfg.text === DUCK_BRAND_TEXT ? "" : duckCfg.text || "")}" placeholder="${DUCK_BRAND_TEXT}">
          <p class="small muted">Up to ${DUCK_RING_MAX} characters. Your own words are checked before printing.</p>
          <div class="st-btns"><button class="btn ghost sm" data-action="duck-surprise">Surprise me</button><button class="btn ghost sm" data-action="duck-reset">Reset</button></div>
          ${state.duckUsed
            ? `<p class="duck-ok">✓ Done. Your duck is now the back badge on your shirts.</p><a class="btn primary block" href="#/${state.path ? "design" : "start"}">${state.path ? "Keep designing" : "Start designing"}</a>`
            : `<button class="btn primary block" data-action="duck-use">Use as my back badge</button>`}
        </div>
      </div>
    </section>`;
  },

  size: () => `
    <h2>Pick your size</h2>
    <div class="sizes">${SIZES.map(s => `
      <button class="size ${state.size === s.id ? "selected" : ""}" data-action="size" data-value="${s.id}">
        ${s.id}<small>${plusText(s.price)}</small>
      </button>`).join("")}
    </div>
    <p class="small muted">Regular fit. Size guide coming soon.</p>
    <h3>Quantity</h3>
    <div class="qty">
      <button class="btn ghost" data-action="qty" data-value="-1" aria-label="Decrease">−</button>
      <output>${state.qty}</output>
      <button class="btn ghost" data-action="qty" data-value="1" aria-label="Increase">+</button>
    </div>
    <div class="nav">
      <a class="btn ghost" href="#/${prevOf("size")}">Back</a>
      <button class="btn primary" data-action="add-to-basket" ${state.size ? "" : "disabled"}>
        ${state.editing ? "Update basket item" : "Add to basket"}</button>
    </div>`,

  basket: () => state.cart.length ? `
    <div class="basket">
      <section>
        <h2>Your basket</h2>
        ${state.cart.map(it => `
          <article class="b-item">
            <div class="b-thumbs">${teePair(it, "thumb", true)}</div>
            <div class="b-body">
              <div class="b-head">
                <h3>${esc(itemTitle(it))}</h3>
                <strong>${money(lineTotal(it))}</strong>
              </div>
              ${breakdown(it)}
              <div class="unit"><span>Per tee</span><b>${money(unitOf(it))}</b></div>
              <div class="b-actions">
                <div class="qty sm">
                  <button class="btn ghost" data-action="cart-qty" data-value="${it.id}:-1" aria-label="Decrease">−</button>
                  <output>${it.qty}</output>
                  <button class="btn ghost" data-action="cart-qty" data-value="${it.id}:1" aria-label="Increase">+</button>
                </div>
                <button class="btn ghost sm" data-action="cart-edit" data-value="${it.id}">Edit</button>
                <button class="btn ghost sm" data-action="cart-dup" data-value="${it.id}">Duplicate</button>
                <button class="btn ghost sm" data-action="cart-remove" data-value="${it.id}">Remove</button>
              </div>
            </div>
          </article>`).join("")}
        <a class="btn ghost" href="#/start">+ Design another tee</a>
      </section>
      <aside class="summary basket-total">
        <h3 class="sum-title">Order total</h3>
        <dl class="breakdown">${state.cart.map(it => `
          <dt>${esc(itemTitle(it))}<span>${colourOf(it).name} · ${it.size} · × ${it.qty}</span></dt><dd>${money(lineTotal(it))}</dd>`).join("")}
          ${aiRows()}${shippingRows()}
        </dl>
        <div class="total"><span>Total</span><strong>${money(cartTotal())}</strong></div>
        <button class="btn primary block" data-action="go" data-to="details">Checkout</button>
        <p class="small muted">Full payment is required before production starts.</p>
      </aside>
    </div>` : `
    <div class="panel empty-basket">
      <h2>Your basket is empty</h2>
      <p class="muted">Design a tee and add it here. You can add as many as you like before paying.</p>
      <a class="btn primary" href="#/start">Start designing</a>
    </div>`,

  details: () => `
    <h2>Your details</h2>
    <p class="small muted">Guest checkout. You don't need an account.</p>
    <div class="form">
      ${field("email", "Email", "you@example.com", "email", "full")}
      ${field("name", "Full name", "Alex Example", "text", "full")}
      ${field("address", "Address", "123 Example Street", "text", "full")}
      ${field("city", "City", "Sample City")}
      ${field("postcode", "Postal code", "0000")}
    </div>
    ${nav("basket", "payment", true, "Continue to payment")}`,

  payment: () => `
    <h2>Payment</h2>
    <div class="pay-box">
      <div class="test-banner">Test mode: no real payment is taken. Any details work.</div>
      <div class="form">
        ${field("card", "Card number", "4242 4242 4242 4242", "text", "full")}
        ${field("expiry", "Expiry", "MM / YY")}
        ${field("cvc", "CVC", "123")}
        ${field("cardname", "Name on card", "Alex Example", "text", "full")}
      </div>
    </div>
    <div class="nav">
      <a class="btn ghost" href="#/details">Back</a>
      <button class="btn primary" data-action="pay">Pay ${money(cartTotal())} to start production</button>
    </div>`,

  processing: () => `
    <div class="processing">
      <div class="spinner"></div>
      <h2>Processing payment…</h2>
      <p class="muted">This is a demo. Nothing is being charged.</p>
    </div>`,

  done: () => `
    <section class="confirm">
      <div class="check">✓</div>
      <h1>Payment received</h1>
      <p class="lede">Production has started on order <b>${state.orderNo}</b>.</p>
      <div class="done-list">${state.cart.map(it => `
        <div class="done-card">
          ${teePair(it, "thumb")}
          <div class="done-info">
            <b>${esc(itemTitle(it))}</b>
            <span class="small muted">${colourOf(it).name} · ${it.size} · × ${it.qty}</span>
          </div>
          <strong>${money(lineTotal(it))}</strong>
        </div>`).join("")}
        <div class="done-total"><span>Paid</span><strong>${money(cartTotal())}</strong></div>
      </div>
      <p class="muted">A confirmation would be sent to ${state.fields.email ? `<b>${esc(state.fields.email)}</b>` : "your inbox"}.${state.cart.some(it => [it.front, it.back].some(s => s?.kind === "upload")) ? " Our team will check your artwork before it goes to print." : ""}</p>
      <button class="btn primary" data-action="reset">Start a new order</button>
    </section>`,
};

function field(key, label, placeholder, type = "text", cls = "") {
  return `<label class="field ${cls}"><span>${label}</span>
    <input type="${type}" data-field="${key}" placeholder="${placeholder}" value="${esc(state.fields[key] || "")}"></label>`;
}

// ---------- design studio: front and back, each a catalog design or an upload, placed freely ----------
const FILE_INPUT = `<input type="file" accept="image/png,image/jpeg,image/svg+xml" data-upload hidden>`;
const cur = () => state[state.side];
const sideLabel = s => (s === "front" ? "Front" : "Back");
const defaultPlace = aspect => ({ x: 0, y: 0, s: Math.min(0.8, 0.96 * aspect), k: 1, r: 0 }); // fits inside the print area
const catalogSide = id => { const d = designById(id), a = d.aspect || 1; return { kind: "catalog", designId: id, aspect: a, place: { ...defaultPlace(a), ...d.place } }; }; // d.place: where it opens on the tee, e.g. left chest

// Free-transform handles: [name, x side, y side] on the artwork's own box (-1 / 0 / 1 from its centre).
const HANDLES = [["nw", -1, -1], ["n", 0, -1], ["ne", 1, -1], ["e", 1, 0], ["se", 1, 1], ["s", 0, 1], ["sw", -1, 1], ["w", -1, 0]];

function studioView() {
  const side = cur(), c = colour(), back = state.side === "back";
  const tabs = ["front", "back"].map(s => `
    <button class="tab ${state.side === s ? "on" : ""}" data-action="side" data-value="${s}">
      ${sideLabel(s)}${state[s] ? ` <span class="tick">${CHECK}</span>` : ""}</button>`).join("");
  return `
    <div class="studio">
      <div>
        <div class="tabs" role="tablist" aria-label="Side">${tabs}</div>
        <div class="studio-canvas" id="studio-canvas" data-drop tabindex="0" aria-label="${sideLabel(state.side)} of the tee">
          <svg id="studio-svg" class="tee" viewBox="0 0 300 330">
            ${teeBody(c ? c.hex : BLANK_TEE, back)}
            ${back ? badgeMark(state.badge) : ""}
            <rect x="${PA.x}" y="${PA.y}" width="${PA.w}" height="${PA.h}" rx="2" fill="none" stroke="rgba(110,110,110,.8)" stroke-width="1" stroke-dasharray="4 3"/>
            ${side ? `
              <clipPath id="studio-clip"><rect x="${PA.x}" y="${PA.y}" width="${PA.w}" height="${PA.h}"/></clipPath>
              <defs id="st-fxdefs"></defs>
              <g clip-path="url(#studio-clip)"><image id="st-img" href="${sideUrl(side)}" preserveAspectRatio="none"/></g>
              <g id="st-sel">
                ${HANDLES.filter(h => h[1] && h[2]).map(h => `<circle class="st-rotz" data-rotz="${h[0]}" r="18"/>`).join("")}
                <rect id="st-box" fill="transparent" stroke="#FFC629" stroke-width="1"/>
                ${HANDLES.map(h => `<g class="st-hnd" data-h="${h[0]}">
                  <rect class="st-hit" x="-8" y="-8" width="16" height="16"/>
                  <rect class="st-handle" x="-3.5" y="-3.5" width="7" height="7"/></g>`).join("")}
              </g>` : `
              <text x="150" y="104" text-anchor="middle" font-size="9" fill="#777" font-family="system-ui, sans-serif">${sideLabel(state.side)} print area</text>`}
          </svg>
          ${side ? "" : `
            <div class="studio-cta">
              <button class="btn primary" data-action="picker" data-value="1">Choose a design</button>
              <label class="btn ghost solid">${FILE_INPUT}Upload your own</label>
            </div>`}
        </div>
      </div>
      <aside class="panel studio-tools">
        <h2>${sideLabel(state.side)} of your tee</h2>
        ${state.picker ? pickerHTML() : side ? sideTools(side) : `
          <p class="muted">${back ? "Add a different design to the back, or leave it plain." : "Pick one of our designs or upload your own."}</p>
          <div class="st-btns">
            <button class="btn ghost sm" data-action="picker" data-value="1">Choose a design</button>
            <label class="btn ghost sm">${FILE_INPUT}Upload your own</label>
          </div>
          ${back ? "" : `<p class="small muted">You can also drop an image onto the tee.</p>`}`}
        ${back && !state.picker ? badgeControls() : ""}
        <div class="unit st-total"><span>This tee so far</span><b id="st-total"></b></div>
        <p class="small pc-blockmsg" id="st-blockmsg" role="alert" hidden></p>
        ${nav(prevOf("design"), nextOf("design"), state.front || state.back, `Continue to ${STEP_LABEL[nextOf("design")].toLowerCase()}`)}
      </aside>
    </div>`;
}

// Back tab: the little duck badge. Free, and removing it takes an extra (friendly) step.
const SAD_BITS = `<path d="M63 38 Q59 46 63 49 Q67 46 63 38 Z" fill="#4FC3F7" stroke="#000" stroke-width="1"/><path d="M56 26 L66 24" stroke="#000" stroke-width="2" stroke-linecap="round"/>`;
function badgeControls() {
  const k = state.badge ?? "brand";
  if (state.badgeAsk) {
    return `<div class="st-badge ask">
      <img class="sad-duck" src="${svgUrl(duckInner(duckConfig({})) + SAD_BITS)}" alt="A sad duck">
      <p><b>Aww, really?</b></p>
      <p class="small muted">The little duck rides along on the back of your tee to keep it company. It's free, and taking it off doesn't change the price. No hard feelings, it's your shirt.</p>
      <div class="st-btns"><button class="btn primary sm" data-action="badge-keep">Keep the duck</button><button class="btn ghost sm quiet" data-action="badge-remove">Remove it anyway</button></div>
    </div>`;
  }
  return `<div class="st-badge">
    <h3 class="st-price-title">Back badge</h3>
    <p class="small muted">${k === "none" ? "No badge on the back. The little duck would love to come along." : "A small round badge under the collar. Free, and it makes the back of your tee ours too."}</p>
    ${k === "none"
      ? `<button class="btn primary sm" data-action="badge" data-value="brand">Put the duck back</button>`
      : `<div class="st-btns">
          <button class="btn ghost sm ${k === "brand" ? "on" : ""}" data-action="badge" data-value="brand" aria-pressed="${k === "brand"}">Duck T-Shirt Co badge</button>
          <button class="btn ghost sm ${k === "mine" ? "on" : ""}" data-action="badge" data-value="mine" aria-pressed="${k === "mine"}">My duck</button>
        </div>`}
    <p class="small"><a href="#/duck">Customise your duck →</a>${k === "none" ? "" : ` · <button class="link-btn quiet" data-action="badge-ask">Remove badge</button>`}</p>
  </div>`;
}

function sideTools(side) {
  const upload = side.kind === "upload";
  return `
    <div class="st-file">
      <img src="${sideUrl(side)}" alt="">
      <div><b>${esc(upload ? side.name : designById(side.designId).name)}</b>
        <span class="small muted">${upload ? "Your upload" : "Catalog design"}</span></div>
    </div>
    <label class="st-row"><span>Size <output id="st-size-val"></output></span>
      <input type="range" min="10" max="120" data-place="s"></label>
    <label class="st-row"><span>Rotation <output id="st-rot-val"></output></span>
      <input type="range" min="-180" max="180" data-place="r"></label>
    <div class="st-btns">
      <button class="btn ghost sm" data-action="st-rotate" data-value="-15">⟲ 15°</button>
      <button class="btn ghost sm" data-action="st-rotate" data-value="15">⟳ 15°</button>
      <button class="btn ghost sm" data-action="st-center">Centre</button>
      <button class="btn ghost sm" data-action="st-reset">Reset</button>
    </div>
    <div class="st-btns">
      <button class="btn ghost sm" data-action="picker" data-value="1">Change design</button>
      <label class="btn ghost sm">${FILE_INPUT}${upload ? "Replace image" : "Upload instead"}</label>
      <button class="btn ghost sm" data-action="side-remove">Remove</button>
    </div>
    <h3 class="st-price-title">Print check</h3>
    <div id="st-check" class="st-check"></div>
    <details class="st-fx" ${state.fxOpen ? "open" : ""}>
      <summary>Warp &amp; effects</summary>
      <div class="st-btns">${FX.FX_PRESETS.map(pr => `<button class="btn ghost sm" data-action="fx-preset" data-value="${pr.id}">${pr.label}</button>`).join("")}</div>
      <div class="st-btns">
        <button class="btn ghost sm" data-action="fx-flip" data-value="H">Flip ↔</button>
        <button class="btn ghost sm" data-action="fx-flip" data-value="V">Flip ↕</button>
        <label class="fx-check"><input type="checkbox" data-fxbool="shadow"> Shadow</label>
        <button class="btn ghost sm" data-action="fx-reset">Clear effects</button>
      </div>
      ${Object.entries(FX.FX_RANGE).map(([k, [lo, hi, step, unit, label]]) => `
        <label class="st-row fx-row"><span>${label} <output data-fxout="${k}"></output></span><input type="range" min="${lo}" max="${hi}" step="${step}" data-fx="${k}"></label>`).join("")}
    </details>
    <p class="small muted">Drag inside the box to move. Drag a corner to resize, an edge to stretch, and just outside a corner to rotate. Hold Shift to stretch from a corner or snap rotation to 15°, and Alt to scale from the centre. Anything outside the dashed print area won't be printed.</p>
    <h3 class="st-price-title">${sideLabel(state.side)} print price</h3>
    <div id="st-side-price"></div>
    ${upload ? `<p class="small muted">Estimated automatically from your artwork's print size, colours and detail. It updates as you resize.</p>` : ""}`;
}

function pickerHTML() {
  return `
    <p class="small muted">Choose a design for the ${state.side}.</p>
    <div class="picker">${CAROUSEL.filter(d => !d.set).map(d => `
      <button class="pick ${cur()?.designId === d.id ? "selected" : ""}" data-action="pick-design" data-value="${d.id}">
        <img src="${d.url}" alt=""><span>${d.name}</span><b>${money(d.price)}</b>
      </button>`).join("")}
    </div>
    <button class="btn ghost sm" data-action="picker" data-value="">Cancel</button>`;
}

// Sync canvas, handles, sliders and live prices to the current side without re-rendering (keeps drags smooth).
function studioUpdate() {
  const total = document.getElementById("st-total");
  if (total) total.textContent = money(unitOf(draft()));
  studioGate();
  const side = cur(), img = document.getElementById("st-img");
  if (!img || !side) return;
  const p = side.place, g = artGeom({ aspect: side.aspect, ...p });
  const set = (el, attrs) => Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  const rot = `rotate(${p.r} ${g.cx} ${g.cy})`;
  set(img, { x: g.x, y: g.y, width: g.w, height: g.h, transform: FX.fxSvgTransform(p.fx, p.r, g.cx, g.cy) });
  // warp and effects are a CSS layer on the artwork; the wave warp is an SVG filter that the CSS points at
  const fxc = FX.fxClean(p.fx);
  img.style.filter = FX.fxFilter(p.fx, 1, "st-fxw");
  const defs = document.getElementById("st-fxdefs");
  if (defs) defs.innerHTML = fxc.wave ? FX.fxWaveDef("st-fxw", fxc.wave) : "";
  document.querySelectorAll("[data-fx]").forEach(inp => {
    const k = inp.dataset.fx;
    if (document.activeElement !== inp) inp.value = fxc[k];
    const out = document.querySelector(`[data-fxout="${k}"]`);
    if (out) out.textContent = fxc[k] + FX.FX_RANGE[k][3];
  });
  document.querySelectorAll("[data-fxbool]").forEach(inp => { inp.checked = fxc[inp.dataset.fxbool]; });
  const pc = document.getElementById("st-check");
  if (pc) pc.innerHTML = printCheckHTML(printCheckOf(side));
  set(document.getElementById("st-sel"), { transform: rot });
  set(document.getElementById("st-box"), { x: g.x, y: g.y, width: g.w, height: g.h });
  HANDLES.forEach(([n, sx, sy]) => {
    const hx = g.cx + sx * g.w / 2, hy = g.cy + sy * g.h / 2;
    set(document.querySelector(`[data-h="${n}"]`), { transform: `translate(${hx} ${hy})` });
    const rz = document.querySelector(`[data-rotz="${n}"]`);
    if (rz) set(rz, { cx: hx, cy: hy });
  });
  const size = Math.round(p.s * 100), deg = Math.round(p.r);
  const sizeIn = document.querySelector('[data-place="s"]'), rotIn = document.querySelector('[data-place="r"]');
  if (sizeIn) { sizeIn.value = size; rotIn.value = deg; }
  const sv = document.getElementById("st-size-val"), rv = document.getElementById("st-rot-val");
  if (sv) { sv.textContent = size + "%"; rv.textContent = deg + "°"; }
  const sp = document.getElementById("st-side-price");
  if (sp) sp.innerHTML = linesHTML(sideLines(side, sideLabel(state.side)));
}

// ---------- the real duck artist: ask the Worker, cut the white background out, use it as the badge centre ----------
async function duckAiReal(q) {
  if (state.duckBusy) return; // one at a time
  state.duckBusy = true; state.duckMsg = { busy: true }; render();
  try {
    const res = await fetch(DUCK_AI_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: q }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "The duck artist couldn't draw that. You weren't charged.");
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(data.image || "")) throw new Error("The duck artist sent something we can't use. You weren't charged.");
    const cv = flatBgCanvas(await loadImg(data.image), 512);
    let art = cv.toDataURL("image/png");
    if (!artOk(art)) art = flatBgCanvas(await loadImg(data.image), 320).toDataURL("image/png"); // keep it small enough to store
    if (!artOk(art)) throw new Error("That picture came out too big to use. You weren't charged.");
    duckCfg = duckConfig({ ...duckCfg, art, title: q.replace(/[^\w \-']/g, "").slice(0, 40) });
    state.duckCalls += 1; // charged now, because a picture was really drawn
    state.duckMsg = { ok: true, text: `Drawn: ${duckCfg.title || "your duck"}.` };
    state.duckUsed = false;
  } catch (e) {
    state.duckMsg = { ok: false, error: e && e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : "We couldn't reach the duck artist. You weren't charged." };
  }
  state.duckBusy = false; render();
}

// ---------- print readiness: every design is checked, live, against what the printer needs ----------
const IN_PER_UNIT = PrintCheck.PRINT.areaIn.w / PA.w; // tee-SVG units to inches (the print area is 12 in wide)
// The share of the artwork (after slant, flip and rotation) that falls outside the print area.
function outsideShare(side) {
  const g = artGeom({ aspect: side.aspect, ...side.place }), N = 24;
  let out = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const [dx, dy] = FX.fxMapPoint(side.place.fx, side.place.r, ((i + 0.5) / N - 0.5) * g.w, ((j + 0.5) / N - 0.5) * g.h);
      const x = g.cx + dx, y = g.cy + dy;
      if (x < PA.x || x > PA.x + PA.w || y < PA.y || y > PA.y + PA.h) out++;
    }
  }
  return out / (N * N);
}
function printCheckOf(side) {
  const p = side.place, g = artGeom({ aspect: side.aspect, ...p }), c = colour(), upload = side.kind === "upload";
  const known = upload && side.file; // our own catalogue art is vector or already print-ready
  return PrintCheck.checkPrint({
    file: known ? side.file : { type: "image/svg+xml", bytes: 0 }, px: known ? side.px : null,
    placed: { wIn: g.w * IN_PER_UNIT, hIn: g.h * IN_PER_UNIT },
    analysis: known && side.stats && side.stats.alpha ? { ...side.stats.alpha, inkLum: side.stats.lum } : null,
    teeHex: c && c.hex, teeName: c && c.name, outsideShare: outsideShare(side), rotation: p.r, stretch: p.k ?? 1, effects: FX.fxCheckInfo(p.fx),
  });
}
const blockedSides = () => ["front", "back"].filter(k => state[k] && printCheckOf(state[k]).level === "blocked");
// Continue is off while anything on either side cannot be printed, and says why.
function studioGate() {
  const blocked = blockedSides(), btn = document.querySelector(".studio-tools .nav .btn.primary"), msg = document.getElementById("st-blockmsg");
  if (btn) btn.disabled = blocked.length > 0 || !(state.front || state.back);
  if (msg) { msg.hidden = !blocked.length; msg.textContent = blocked.length ? `Fix the red items on the ${blocked.map(sideLabel).join(" and ").toLowerCase()} to continue.` : ""; }
}
const FIXES = { "remove-bg": "Remove background", shrink: "Make it sharp", fit: "Fit to the print area", grow: "Make it bigger", unstretch: "Fix proportions", straighten: "Straighten" };
function printCheckHTML(res) {
  const icon = l => (l === "pass" ? "✓" : l === "warn" ? "!" : "✕");
  const issues = res.gates.filter(g => g.level !== "pass"), passed = res.gates.filter(g => g.level === "pass");
  return `<div class="pc ${res.level}">
    <div class="pc-head"><b>${res.level === "ready" ? "✓" : res.level === "notes" ? "!" : "✕"}</b> ${esc(PrintCheck.summary(res))}</div>
    ${issues.map(g => `<div class="pc-item ${g.level}"><span class="pc-ic">${icon(g.level)}</span><div><b>${esc(g.title)}</b><p>${esc(g.detail)}</p>${g.fix ? `<button class="btn ghost sm" data-action="pc-fix" data-value="${g.fix}">${FIXES[g.fix]}</button>` : ""}</div></div>`).join("")}
    ${passed.length ? `<details class="pc-pass"><summary>${passed.length} check${passed.length === 1 ? "" : "s"} passed</summary>${passed.map(g => `<p>✓ <b>${esc(g.title)}</b> ${esc(g.detail)}</p>`).join("")}</details>` : ""}
    ${res.level !== "blocked" ? `<button class="btn ghost sm" data-action="pc-download">Download print file (PNG)</button><span class="small muted" id="pc-note"></span>` : ""}
  </div>`;
}
// One-tap fixes for the things the check can fix itself.
function pcFix(v) {
  const side = cur();
  if (!side) return;
  const p = side.place, k = p.k ?? 1, P = PrintCheck.PRINT, sFromIn = wIn => wIn / IN_PER_UNIT / PA.w;
  if (v === "straighten") p.r = 0;
  else if (v === "unstretch") p.k = 1;
  else if (v === "fit") p.s = Math.min(p.s, 1, PA.h * side.aspect / (PA.w * k)) * 0.999;
  else if (v === "grow") p.s = Math.max(p.s, sFromIn(1));
  else if (v === "shrink" && side.px) {
    for (const dpi of [P.dpiGood, P.dpiFail]) { // aim for 300 dpi, settle for 150
      const wIn = Math.min(side.px.w / dpi, side.px.h * side.aspect / (k * dpi));
      if (wIn >= P.minFailIn) { p.s = Math.min(p.s, sFromIn(wIn)); break; }
    }
  } else if (v === "remove-bg") { removeBackground(side); return; }
  studioUpdate();
}
const loadImg = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
// Turn a flat background (the colour of the corners, joined to the edge) transparent. Returns a canvas.
// maxSide: shrink to this size first (0 = keep the full resolution).
function flatBgCanvas(img, maxSide = 0) {
  const k = maxSide ? Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight)) : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const cv = Object.assign(document.createElement("canvas"), { width: w, height: h }), ctx = cv.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h), d = id.data;
  const at = (x, y) => (y * w + x) * 4;
  const bg = [0, 1, 2].map(c => Math.round([[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].reduce((n, [x, y]) => n + d[at(x, y) + c], 0) / 4));
  const near = (i, tol) => Math.abs(d[i] - bg[0]) <= tol && Math.abs(d[i + 1] - bg[1]) <= tol && Math.abs(d[i + 2] - bg[2]) <= tol;
  const seen = new Uint8Array(w * h), queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (x, y) => { const q = y * w + x; if (!seen[q] && near(q * 4, 40)) { seen[q] = 1; queue[tail++] = q; } };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (head < tail) {
    const q = queue[head++], x = q % w, y = (q / w) | 0;
    if (x > 0) push(x - 1, y); if (x < w - 1) push(x + 1, y); if (y > 0) push(x, y - 1); if (y < h - 1) push(x, y + 1);
  }
  for (let q = 0; q < w * h; q++) if (seen[q]) d[q * 4 + 3] = 0;
  for (let y = 1; y < h - 1; y++) { // soften the one-pixel fringe left next to what was removed
    for (let x = 1; x < w - 1; x++) {
      const q = y * w + x;
      if (!seen[q] && (seen[q - 1] || seen[q + 1] || seen[q - w] || seen[q + w]) && near(q * 4, 80)) d[q * 4 + 3] = 140;
    }
  }
  ctx.putImageData(id, 0, 0);
  return cv;
}
async function removeBackground(side) {
  const img = await loadImg(side.url);
  const blob = await new Promise(r => flatBgCanvas(img).toBlob(r, "image/png"));
  const url = URL.createObjectURL(blob), img2 = await loadImg(url);
  Object.assign(side, { url, file: { ...side.file, type: "image/png", bytes: blob.size, name: side.name.replace(/\.\w+$/, "") + ".png" }, px: { w: img2.naturalWidth, h: img2.naturalHeight }, stats: analyseImage(img2) });
  render();
}
// The print file: the artwork with its warp, effects and rotation baked in, on transparent, at 300 dpi (or the file's own
// resolution if that is lower; we never pretend to have pixels we don't). Uses the same CSS filter string as the preview.
async function renderPrintFile(side, dpi = PrintCheck.PRINT.dpiGood) {
  const img = await loadImg(sideUrl(side)), p = side.place, g = artGeom({ aspect: side.aspect, ...p }), c = FX.fxClean(p.fx);
  const vector = side.kind === "catalog" ? !designById(side.designId).img : side.file && side.file.type === "image/svg+xml";
  const ppu = Math.min(dpi * IN_PER_UNIT, vector || !img.naturalWidth ? Infinity : img.naturalWidth / g.w); // pixels per tee unit
  const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => FX.fxMapPoint(p.fx, p.r, sx * g.w / 2, sy * g.h / 2));
  const pad = c.blur * 3 + (c.shadow ? 8 : 0) + c.wave * 0.5; // room for blur, shadow and wave to spill out
  const minX = Math.min(...pts.map(q => q[0])) - pad, maxX = Math.max(...pts.map(q => q[0])) + pad;
  const minY = Math.min(...pts.map(q => q[1])) - pad, maxY = Math.max(...pts.map(q => q[1])) + pad;
  const cw = Math.ceil((maxX - minX) * ppu), ch = Math.ceil((maxY - minY) * ppu);
  const cv = Object.assign(document.createElement("canvas"), { width: cw, height: ch }), ctx = cv.getContext("2d");
  const t = FX.fxTransform(p.fx);
  ctx.translate(-minX * ppu, -minY * ppu);
  ctx.rotate(p.r * Math.PI / 180);
  ctx.transform(1, 0, Math.tan(t.skx * Math.PI / 180), 1, 0, 0);
  ctx.transform(1, Math.tan(t.sky * Math.PI / 180), 0, 1, 0, 0);
  ctx.scale(t.sx, t.sy);
  let holder = null;
  if (c.wave) {
    holder = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    holder.setAttribute("style", "position:absolute;width:0;height:0");
    holder.innerHTML = `<defs>${FX.fxWaveDef("pf-wave", c.wave, ppu)}</defs>`;
    document.body.appendChild(holder);
  }
  ctx.filter = FX.fxFilter(p.fx, ppu, c.wave ? "pf-wave" : null) || "none";
  ctx.drawImage(img, -g.w * ppu / 2, -g.h * ppu / 2, g.w * ppu, g.h * ppu);
  if (holder) holder.remove();
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  return { blob, w: cw, h: ch, dpi: Math.round(ppu / IN_PER_UNIT) };
}
async function pcDownload() {
  const side = cur(), note = document.getElementById("pc-note");
  if (!side) return;
  if (note) note.textContent = " Making it…";
  try {
    const f = await renderPrintFile(side);
    const base = (side.kind === "upload" ? side.name.replace(/\.\w+$/, "") : designById(side.designId).name).replace(/[^\w-]+/g, "-");
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(f.blob), download: `${base}-print-${f.dpi}dpi.png` });
    document.body.append(a); a.click(); a.remove();
    if (note) note.textContent = ` Saved ${f.w} × ${f.h} px at ${f.dpi} dpi.`;
  } catch (e) { if (note) note.textContent = " Couldn't make the file."; }
}
// A file the printer cannot use is turned away with a plain reason, instead of being quietly ignored.
const uploadRejected = (meta, gate) => { state.uploadError = { name: meta.name || "That file", title: gate.title, detail: gate.detail }; render(); };
const uploadErrorHTML = () => `<div class="upload-error" role="alert"><div><b>${esc(state.uploadError.title)}</b><p>${esc(state.uploadError.name)}: ${esc(state.uploadError.detail)}</p></div><button class="btn ghost sm" data-action="dismiss-upload-error">Dismiss</button></div>`;

const studio = { mode: null, start: null };
function svgPoint(e) {
  const svg = document.getElementById("studio-svg");
  return new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
}
document.addEventListener("pointerdown", e => {
  const t = e.target.closest("[data-h], [data-rotz], #st-box");
  if (!t || !cur()) return;
  e.preventDefault();
  const side = cur(), p = svgPoint(e), g = artGeom({ aspect: side.aspect, ...side.place });
  studio.mode = t.dataset.h ? "scale" : t.dataset.rotz ? "rotate" : "move";
  studio.handle = t.dataset.h ? HANDLES.find(h => h[0] === t.dataset.h) : null;
  studio.start = { p, g, place: { ...side.place }, a0: Math.atan2(p.y - g.cy, p.x - g.cx) };
  document.getElementById("studio-canvas").classList.add("dragging");
});

// Resize like Photoshop's Free Transform: work in the artwork's own (unrotated) frame, keep the opposite
// corner/edge fixed (or the centre with Alt). Corners keep proportions unless Shift; edges stretch one way.
function studioScale(e, s, pl) {
  const [, sx, sy] = studio.handle, g = s.g, rad = s.place.r * Math.PI / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const p = svgPoint(e), dx = p.x - g.cx, dy = p.y - g.cy;
  const lx = dx * cos + dy * sin, ly = -dx * sin + dy * cos; // pointer relative to the artwork centre, unrotated
  const hw = g.w / 2, hh = g.h / 2, mid = e.altKey, m = mid ? 2 : 1;
  const ax = mid ? 0 : -sx * hw, ay = mid ? 0 : -sy * hh; // the point that stays put
  const minW = 0.05 * PA.w, minH = 0.05 * PA.h, maxW = 1.2 * PA.w, maxH = 1.5 * PA.h;
  let w = g.w, h = g.h;
  if (sx && sy && !e.shiftKey) { // proportional
    const vx = sx * (3 - m) * hw, vy = sy * (3 - m) * hh; // fixed point -> dragged corner: a full side, or half with Alt
    const f = clamp(((lx - ax) * vx + (ly - ay) * vy) / (vx * vx + vy * vy),
      Math.max(minW / g.w, minH / g.h), Math.min(maxW / g.w, maxH / g.h));
    w = g.w * f; h = g.h * f;
  } else {
    if (sx) w = clamp(m * sx * (lx - ax), minW, maxW);
    if (sy) h = clamp(m * sy * (ly - ay), minH, maxH);
  }
  const cxl = mid || !sx ? 0 : ax + sx * w / 2, cyl = mid || !sy ? 0 : ay + sy * h / 2; // new centre, unrotated frame
  const cx = g.cx + cxl * cos - cyl * sin, cy = g.cy + cxl * sin + cyl * cos;
  pl.x = clamp((cx - (PA.x + PA.w / 2)) / PA.w, -0.5, 0.5);
  pl.y = clamp((cy - (PA.y + PA.h / 2)) / PA.h, -0.5, 0.5);
  pl.s = w / PA.w;
  pl.k = h * cur().aspect / w;
}
window.addEventListener("pointermove", e => {
  if (!studio.mode) return;
  const p = svgPoint(e), s = studio.start, pl = cur().place;
  if (studio.mode === "move") {
    pl.x = clamp(s.place.x + (p.x - s.p.x) / PA.w, -0.5, 0.5); // centre stays inside the print area
    pl.y = clamp(s.place.y + (p.y - s.p.y) / PA.h, -0.5, 0.5);
  } else if (studio.mode === "scale") {
    studioScale(e, s, pl);
  } else {
    const a = s.place.r + (Math.atan2(p.y - s.g.cy, p.x - s.g.cx) - s.a0) * 180 / Math.PI;
    const snapped = Math.round(a / 15) * 15;
    pl.r = normDeg(e.shiftKey || Math.abs(a - snapped) < 4 ? snapped : a); // Shift snaps to 15°, otherwise a gentle snap
  }
  studioUpdate();
});
window.addEventListener("pointerup", () => {
  if (!studio.mode) return;
  studio.mode = null;
  document.getElementById("studio-canvas")?.classList.remove("dragging");
});
document.addEventListener("keydown", e => {
  if (!e.target.closest?.("#studio-canvas") || !cur()) return;
  const step = e.shiftKey ? 0.05 : 0.01;
  const moves = { ArrowLeft: ["x", -step], ArrowRight: ["x", step], ArrowUp: ["y", -step], ArrowDown: ["y", step] };
  if (!moves[e.key]) return;
  e.preventDefault();
  const [k, d] = moves[e.key];
  cur().place[k] = clamp(cur().place[k] + d, -0.5, 0.5);
  studioUpdate();
});

// fromHome: picked from the home page's "Upload your own" card, so start the upload path on the front.
function setUpload(file, fromHome = false) {
  if (!file) return;
  const meta = { name: file.name, type: file.type, bytes: file.size }, isSvg = file.type === "image/svg+xml";
  const early = PrintCheck.checkFile(meta, isSvg ? null : { w: 99999, h: 99999 }); // kind and size first, before opening it
  if (early) return uploadRejected(meta, early);
  const url = URL.createObjectURL(file); // kept for the session: basket items may still use it
  const img = new Image();
  img.onload = img.onerror = () => {
    const px = !isSvg && img.naturalWidth ? { w: img.naturalWidth, h: img.naturalHeight } : null;
    const bad = PrintCheck.checkFile(meta, px); // now with the real pixel size: unreadable, or too small
    if (bad) { URL.revokeObjectURL(url); return uploadRejected(meta, bad); }
    const aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    const side = { kind: "upload", name: file.name, url, aspect, file: meta, px, stats: analyseImage(img), place: defaultPlace(aspect) };
    state.uploadError = null;
    if (fromHome) {
      Object.assign(state, draftDefaults(), { path: "upload", tee: "crew", front: side });
      go("design");
    } else {
      state[state.side] = side;
      state.picker = false;
      render();
    }
  };
  img.src = url;
}

// ---------- events ----------
const ACTIONS = {
  "shop-pick": v => pickDesign(shopList()[Number(v)]), // the grid shows the filtered full catalogue, so resolve from that list
  "browse-all": () => { shop.pills = carPill ? [carPill] : []; }, // the link then opens the browse page with that pill already on
  "shop-pill": v => { shop.pills = shop.pills.includes(v) ? shop.pills.filter(p => p !== v) : [...shop.pills, v]; shopApplyPills(); },
  "shop-cat": v => { shop.cats = shop.cats.includes(v) ? shop.cats.filter(c => c !== v) : [...shop.cats, v]; shopApplyPills(); },
  "shop-pills-clear": () => { shop.pills = []; shop.cats = []; shopApplyPills(); },
  "car-step": v => carStep(Number(v)),
  "car-dot": v => carTo(Number(v)),
  "car-pick": () => carPick(carIndex()),
  "car-pill": v => carSetPill(carPill === v ? null : v),
  "car-slide": v => {
    if (car.moved) return; // this "click" was the end of a drag
    const i = Number(v);
    i === carIndex() ? carPick(i) : carTo(i);
  },
  tee: v => { state.tee = v; render(); },
  // the back badge
  "badge": v => { state.badge = v; state.badgeAsk = false; render(); },
  "badge-ask": () => { state.badgeAsk = true; render(); },
  "badge-keep": () => { state.badgeAsk = false; render(); },
  "badge-remove": () => { state.badge = "none"; state.badgeAsk = false; render(); },
  // the duck page
  "duck-preset": v => { const p = DUCK_PRESETS.find(x => x.id === v); duckCfg = duckConfig({ preset: v, body: p.body, ring: p.ring, text: duckCfg.text }); state.duckMsg = null; state.duckUsed = false; render(); },
  "duck-body": v => { duckCfg = { ...duckCfg, body: v }; state.duckUsed = false; render(); },
  "duck-ring": v => { duckCfg = { ...duckCfg, ring: v }; state.duckUsed = false; render(); },
  "duck-surprise": () => {
    const pick = a => a[Math.floor(Math.random() * a.length)], p = pick(DUCK_PRESETS);
    duckCfg = duckConfig({ preset: p.id, body: Math.random() < .5 ? p.body : pick(DUCK_BODIES), ring: pick(DUCK_RINGS), text: duckCfg.text });
    state.duckMsg = null; state.duckUsed = false; render();
  },
  "duck-reset": () => { duckCfg = duckConfig(); state.duckMsg = null; state.duckUsed = false; render(); },
  "duck-idea": v => { state.duckPrompt = `give me a ${v} duck`; render(); },
  "duck-ai": () => { // a try is charged only when a duck is actually drawn
    const q = document.getElementById("duck-prompt")?.value ?? state.duckPrompt ?? "";
    state.duckPrompt = q;
    if (DUCK_AI_ENDPOINT) return duckAiReal(q); // the real artist (a Cloudflare Worker); otherwise the built-in stand-in below
    const r = duckFromPrompt(q);
    if (r.ok) { duckCfg = duckConfig({ ...r.cfg, text: duckCfg.text }); state.duckCalls += 1; state.duckMsg = { ok: true, text: r.explain }; state.duckUsed = false; }
    else state.duckMsg = { ok: false, ideas: r.tryThese.slice(0, 8) };
    render();
  },
  "duck-use": () => {
    duckCfg = duckConfig(duckCfg); duckSave(duckCfg);
    state.badge = "mine";
    state.cart.forEach(it => { if ((it.badge ?? "brand") !== "none") it.badge = "mine"; }); // not shirts where they chose to remove it
    state.duckUsed = true; render();
  },
  "poll-toggle": v => { pollDraft = pollDraft.includes(v) ? pollDraft.filter(x => x !== v) : [...pollDraft, v]; render(); },
  "poll-submit": () => { if (!pollDraft.length) return; pollMine = [...pollDraft]; pollSave(pollMine); render(); },
  "poll-change": () => { pollDraft = pollMine || []; pollMine = null; pollSave(null); render(); },
  colour: v => { state.colour = v; render(); },
  size: v => { state.size = v; render(); },
  qty: v => { state.qty = clamp(state.qty + Number(v), 1, 50); render(); },
  go: (v, el) => go(el.dataset.to),

  side: v => { state.side = v; state.picker = false; render(); },
  picker: v => { state.picker = Boolean(v); render(); },
  "pick-design": v => { state[state.side] = catalogSide(v); state.picker = false; render(); },
  "side-remove": () => { state[state.side] = null; render(); },
  "st-rotate": v => { cur().place.r = normDeg(cur().place.r + Number(v)); studioUpdate(); },
  "st-center": () => { Object.assign(cur().place, { x: 0, y: 0 }); studioUpdate(); },
  "st-reset": () => { cur().place = defaultPlace(cur().aspect); studioUpdate(); },
  "fx-preset": v => { const pr = FX.FX_PRESETS.find(x => x.id === v); if (pr && cur()) { cur().place.fx = FX.fxClean(pr.fx); studioUpdate(); } },
  "fx-reset": () => { if (cur()) { delete cur().place.fx; studioUpdate(); } },
  "fx-flip": v => { const k = v === "H" ? "flipH" : "flipV", fx = FX.fxClean(cur().place.fx); cur().place.fx = { ...fx, [k]: !fx[k] }; studioUpdate(); },
  "pc-fix": v => pcFix(v),
  "pc-download": () => pcDownload(),
  "dismiss-upload-error": () => { state.uploadError = null; render(); },

  "add-to-basket": () => {
    if (blockedSides().length) return go("design"); // nothing that cannot be printed goes in the basket
    const item = { ...draft(), id: state.editing ?? ++cartSeq };
    const i = state.cart.findIndex(it => it.id === state.editing);
    if (i >= 0) state.cart[i] = item; else state.cart.push(item);
    Object.assign(state, draftDefaults());
    go("basket");
  },
  "cart-qty": v => {
    const [id, d] = v.split(":").map(Number);
    const it = state.cart.find(x => x.id === id);
    it.qty = clamp(it.qty + d, 1, 50);
    render();
  },
  "cart-remove": v => { state.cart = state.cart.filter(it => it.id !== Number(v)); render(); },
  "cart-dup": v => {
    const i = state.cart.findIndex(it => it.id === Number(v)), it = state.cart[i];
    state.cart.splice(i + 1, 0, { ...it, front: cloneSide(it.front), back: cloneSide(it.back), id: ++cartSeq });
    render();
  },
  "cart-edit": v => {
    const it = state.cart.find(x => x.id === Number(v));
    Object.assign(state, draftDefaults(), {
      path: it.path, tee: it.tee, colour: it.colour, size: it.size, qty: it.qty, badge: it.badge ?? "brand",
      front: cloneSide(it.front), back: cloneSide(it.back), editing: it.id,
    });
    go(flow()[0]);
  },

  pay: () => {
    go("processing");
    setTimeout(() => {
      if (location.hash !== "#/processing") return;
      state.orderNo = "DTC-" + Math.floor(100000 + Math.random() * 900000);
      go("done");
    }, 2000);
  },
  reset: () => { state = freshState(); go("start"); },
};
const colour = () => COLOURS.find(c => c.id === state.colour);

document.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  ACTIONS[el.dataset.action]?.(el.dataset.value, el);
});
function duckRefresh() { // update just the previews while typing
  const cfg = duckConfig(duckCfg), img = document.getElementById("duck-badge-img"), tee = document.getElementById("duck-tee");
  if (img) img.src = badgeUrl(cfg);
  if (tee) tee.innerHTML = teeSVG(colour()?.hex || COLOURS[0].hex, null, "mid", true, cfg);
}
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "duck-prompt") ACTIONS["duck-ai"](); });
document.addEventListener("input", e => {
  if (e.target.id === "duck-text") { duckCfg = { ...duckCfg, text: e.target.value }; state.duckUsed = false; duckRefresh(); }
  if (e.target.id === "duck-prompt") state.duckPrompt = e.target.value;
  if (e.target.dataset.field) state.fields[e.target.dataset.field] = e.target.value;
  const fk = e.target.dataset.fx; // warp and effects sliders
  if (fk && cur()) { cur().place.fx = { ...cur().place.fx, [fk]: Number(e.target.value) }; studioUpdate(); return; }
  const k = e.target.dataset.place; // studio size / rotation sliders
  if (k && cur()) {
    cur().place[k] = k === "s" ? e.target.value / 100 : Number(e.target.value);
    studioUpdate();
  }
});
document.addEventListener("toggle", e => { if (e.target.matches && e.target.matches(".st-fx")) state.fxOpen = e.target.open; }, true); // remember whether Warp & effects is open
document.addEventListener("change", e => {
  if (e.target.dataset && e.target.dataset.fxbool && cur()) { cur().place.fx = { ...cur().place.fx, [e.target.dataset.fxbool]: e.target.checked }; studioUpdate(); return; }
  if (!e.target.matches("[data-upload]")) return;
  setUpload(e.target.files[0], e.target.dataset.upload === "start");
  e.target.value = ""; // so choosing the same file again still fires
});
document.addEventListener("keydown", e => { // label "buttons" that open the file picker
  const label = e.target.closest?.("label.path-card");
  if (label && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); label.querySelector("input").click(); }
});
document.addEventListener("dragover", e => {
  const zone = e.target.closest("[data-drop]");
  if (zone) { e.preventDefault(); zone.classList.add("over"); }
});
document.addEventListener("dragleave", e => e.target.closest("[data-drop]")?.classList.remove("over"));
document.addEventListener("drop", e => {
  const zone = e.target.closest("[data-drop]");
  if (!zone) return;
  e.preventDefault();
  zone.classList.remove("over");
  setUpload(e.dataTransfer.files[0]);
});

// ---------- home carousel: centre-focused, 3 designs visible either side ----------
const CAR_SIDE = 3;          // slides visible on each side of the focused one
const CAR_AUTOPLAY_MS = 4500;
const CAR_SCALE = [1, 0.45, 0.33, 0.24, 0.18]; // size by distance from centre (last = just off-stage)
const CAR_OVERLAP = 0.75;    // how much neighbouring tees tuck behind each other (1 = edge to edge)
const lerp = (arr, a) => { const i = Math.min(Math.floor(a), arr.length - 2); return arr[i] + (arr[i + 1] - arr[i]) * (a - i); };
const car = { pos: 0, sp: 100, drag: null, moved: false, prev: [], wheelAcc: 0, wheelLock: 0 };
const mod = (a, n) => ((a % n) + n) % n;
const carIndex = () => mod(Math.round(car.pos), carList.length);

// Position every slide from car.pos (a float, so dragging moves smoothly between slides).
function carLayout(animate = true) {
  const stage = document.querySelector(".car-stage");
  if (!stage) return;
  const n = carList.length;
  const slides = stage.querySelectorAll(".car-slide");
  const w = slides[0].offsetWidth;
  // centre-to-centre distances so each tee tucks slightly behind the next; squeezed if the stage is narrow
  const xs = [0];
  for (let k = 1; k < CAR_SCALE.length; k++) xs[k] = xs[k - 1] + (CAR_SCALE[k - 1] + CAR_SCALE[k]) / 2 * w * CAR_OVERLAP;
  const fit = Math.min(1, (stage.clientWidth / 2 - CAR_SCALE[CAR_SIDE] * w / 2 - 8) / xs[CAR_SIDE]);
  xs.forEach((x, k) => { xs[k] = x * fit; });
  car.sp = xs[1]; // drag distance that moves one slide
  slides.forEach((el, i) => {
    let off = mod(i - car.pos, n);
    if (off >= n / 2) off -= n;
    const a = Math.abs(off);
    // a slide that wraps from one end to the other jumps instead of sliding across the middle
    const wrapped = car.prev[i] !== undefined && Math.abs(off - car.prev[i]) > CAR_SIDE + 0.5;
    car.prev[i] = off;
    el.style.transition = animate && !wrapped ? "" : "none";
    const ac = Math.min(a, CAR_SIDE + 1);
    el.style.transform = `translateX(${Math.sign(off) * lerp(xs, ac)}px) scale(${lerp(CAR_SCALE, ac)})`;
    el.style.opacity = a <= CAR_SIDE ? 1 - 0.22 * a : Math.max(0, 0.34 * (CAR_SIDE + 0.5 - a) / 0.5);
    el.style.zIndex = 100 - Math.round(a * 10);
    el.style.pointerEvents = a <= CAR_SIDE + 0.5 ? "" : "none";
    el.classList.toggle("focus", a < 0.5);
  });
  const d = carList[carIndex()];
  document.getElementById("car-name").textContent = d.name;
  document.getElementById("car-meta").textContent = carMeta(d);
  document.querySelectorAll(".car-dot").forEach((b, i) => b.classList.toggle("on", i === carIndex()));
}
const carGo = target => { car.pos = target; carLayout(true); };
const carStep = d => carGo(Math.round(car.pos) + d);
function carTo(i) { // shortest way round the loop
  const n = carList.length;
  let diff = mod(i - carIndex(), n);
  if (diff > n / 2) diff -= n;
  carGo(Math.round(car.pos) + diff);
}
// Swap the carousel's list (null = default). Rebuilds slides + dots, restarts at the first design.
function carSetPill(id) {
  carPill = id;
  carList = id ? pillList[id]() : carDefault();
  const stage = document.querySelector(".car-stage");
  if (!stage) return;
  stage.querySelectorAll(".car-slide").forEach(el => el.remove());
  const btn = stage.querySelector(".car-btn.prev");
  btn.insertAdjacentHTML("beforebegin", carList.map((d, i) => `
    <div class="car-slide" data-action="car-slide" data-value="${i}">${teeSVG(hexOf(d), d.url)}${badgeOverlay(d)}</div>`).join(""));
  document.querySelector(".car-dots").innerHTML = carList.map((d, i) => `
    <button class="car-dot" data-action="car-dot" data-value="${i}" aria-label="Show ${d.name}"></button>`).join("");
  document.querySelectorAll(".car-pill").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.value === id)));
  car.pos = 0;
  car.prev = [];
  carLayout(false);
}
const carPick = i => pickDesign(carList[i]);
// Open the designer on a design. The carousel passes one of its own (capped) designs; the shop grid passes
// one from the full catalogue, so neither can index the wrong list.
function pickDesign(d) {
  // keep the colour they saw (still changeable); the back starts plain
  // a ready-made set opens with its own front and back; anything else opens on the front with a plain back
  const set = d.set;
  Object.assign(state, draftDefaults(), { path: "catalog", front: catalogSide(set ? set.front : d.id), back: set?.back ? catalogSide(set.back) : null, colour: d.showOn });
  go("tee");
}

// drag / swipe with a momentum flick
document.addEventListener("pointerdown", e => {
  if (!e.target.closest(".car-stage") || e.target.closest(".car-btn") || e.button !== 0) return;
  if (e.pointerType === "mouse") e.preventDefault(); // no text selection or image ghost-drag
  car.drag = { x: e.clientX, pos: car.pos, lastX: e.clientX, lastT: performance.now(), v: 0 };
  car.moved = false;
});
window.addEventListener("pointermove", e => {
  if (!car.drag) return;
  const dx = e.clientX - car.drag.x;
  if (Math.abs(dx) > 6) car.moved = true;
  car.pos = car.drag.pos - dx / car.sp;
  const now = performance.now();
  car.drag.v = (car.drag.lastX - e.clientX) / car.sp / Math.max(1, now - car.drag.lastT); // slides per ms
  car.drag.lastX = e.clientX;
  car.drag.lastT = now;
  carLayout(false);
});
const carRelease = () => {
  if (!car.drag) return;
  const v = performance.now() - car.drag.lastT > 80 ? 0 : car.drag.v; // no flick if the pointer had stopped
  car.drag = null;
  const base = Math.round(car.pos);
  carGo(Math.max(base - 6, Math.min(base + 6, Math.round(car.pos + v * 300))));
  setTimeout(() => { car.moved = false; }); // after the trailing click has been ignored
};
window.addEventListener("pointerup", carRelease);
window.addEventListener("pointercancel", carRelease);

// mousewheel while hovering: one design per wheel notch
document.addEventListener("wheel", e => {
  if (!e.target.closest(".car-stage")) return;
  e.preventDefault();
  const now = performance.now();
  if (now < car.wheelLock) { car.wheelAcc = 0; return; }
  const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  car.wheelAcc += d * (e.deltaMode === 1 ? 16 : 1);
  if (Math.abs(car.wheelAcc) >= 40) {
    carStep(Math.sign(car.wheelAcc));
    car.wheelAcc = 0;
    car.wheelLock = now + 90;
  }
}, { passive: false });

document.addEventListener("keydown", e => {
  if (!e.target.closest?.(".carousel")) return;
  if (e.key === "ArrowLeft") carStep(-1);
  if (e.key === "ArrowRight") carStep(1);
});
window.addEventListener("resize", () => carLayout(false));

// auto-advance, paused while hovered, dragged or the tab is hidden
setInterval(() => {
  const c = document.querySelector(".carousel");
  if (!c || car.drag || c.matches(":hover") || document.hidden) return;
  carStep(1);
}, CAR_AUTOPLAY_MS);

// ---------- shop grid: Instagram-style, lazy-loaded in batches as you scroll ----------
const SHOP_BATCH = 6;
const SHOP_DELAY_MS = 700; // fake network wait so the lazy load is visible in the demo
const shop = { shown: 0, loading: false, timer: 0, pills: [], cats: [] }; // pills / cats: ids switched on. They persist while you browse.
const shopList = () => browseList(shop.pills, CAROUSEL, shop.cats);
const shopFromPrice = () => fromPrice(minPrice(DESIGNS)); // the price every ordinary design starts from
function shopPillsHTML() {
  return CAROUSEL_PILLS.map(p => {
    const on = shop.pills.includes(p.id);
    const alone = DESIGNS.filter(BROWSE_PILLS[p.id]).length;
    const blocked = !on && browseList([...shop.pills, p.id], DESIGNS, shop.cats).length === 0; // adding it would leave nothing
    return `<button class="car-pill" data-action="shop-pill" data-value="${p.id}" aria-pressed="${on}" ${blocked ? "disabled" : ""}>${p.label} <span class="pill-n">${alone}</span></button>`;
  }).join("");
}
function shopCatsHTML() {
  return CATEGORIES.map(c => {
    const on = shop.cats.includes(c.id);
    const alone = DESIGNS.filter(d => d.category.includes(c.id)).length;
    const blocked = !on && browseList(shop.pills, DESIGNS, [...shop.cats, c.id]).length === 0;
    return `<button class="car-pill" data-action="shop-cat" data-value="${c.id}" aria-pressed="${on}" ${blocked ? "disabled" : ""}>${c.label} <span class="pill-n">${alone}</span></button>`;
  }).join("");
}
function shopResultHTML() {
  const n = shopList().length;
  return `Showing <b>${n}</b> of ${DESIGNS.length} designs${shop.pills.length || shop.cats.length ? ` · <button class="link-btn" data-action="shop-pills-clear">Clear filters</button>` : ""}`;
}
// A pill was toggled: refresh the pills, empty the grid and lazy-load the new list from the top.
function shopApplyPills() {
  document.getElementById("shop-pills").innerHTML = shopPillsHTML();
  document.getElementById("shop-cats").innerHTML = shopCatsHTML();
  document.getElementById("ig-result").innerHTML = shopResultHTML();
  document.getElementById("ig-grid").innerHTML = "";
  document.getElementById("ig-more").innerHTML = `<div class="spinner"></div>`;
  clearTimeout(shop.timer);
  Object.assign(shop, { shown: 0, loading: false });
  shopLoadMore(true);
}
const shopObserver = new IntersectionObserver(entries => {
  if (entries.some(e => e.isIntersecting)) shopLoadMore();
});

function shopInit() {
  clearTimeout(shop.timer);
  Object.assign(shop, { shown: 0, loading: false });
  shopLoadMore(true);
  shopObserver.disconnect();
  shopObserver.observe(document.getElementById("ig-more"));
}

function shopLoadMore(instant = false) {
  const list = shopList();
  if (shop.loading || shop.shown >= list.length) return;
  shop.loading = true;
  shop.timer = setTimeout(() => {
    const grid = document.getElementById("ig-grid");
    if (!grid) return;
    const next = list.slice(shop.shown, shop.shown + SHOP_BATCH);
    grid.insertAdjacentHTML("beforeend", next.map((d, k) => {
      const i = shop.shown + k;
      return `<button class="ig-tile" data-action="shop-pick" data-value="${i}" style="--d:${k * 60}ms" aria-label="${d.name}">
        ${teeSVG(hexOf(d), d.url)}
        ${badgeOverlay(d)}
        <span class="ig-tag"><span>${d.name}</span>${fromPrice(d.price) !== shopFromPrice() ? `<b>from ${money(fromPrice(d.price))}</b>` : ""}</span>
        <span class="ig-over"><strong>Customise →</strong></span>
      </button>`;
    }).join(""));
    shop.shown += next.length;
    shop.loading = false;
    const more = document.getElementById("ig-more");
    if (shop.shown >= list.length) {
      more.innerHTML = `<p class="small muted">${shop.pills.length || shop.cats.length ? "That's everything that matches." : "That's every design. More coming soon."}</p>`;
    } else if (more.getBoundingClientRect().top < innerHeight) {
      shopLoadMore(); // spinner still on screen: the observer won't fire again, so keep loading
    }
  }, instant ? 0 : SHOP_DELAY_MS);
}

window.addEventListener("hashchange", render);
render();
