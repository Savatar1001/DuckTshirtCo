// All mock data for the concept demo. Edit freely — nothing here is real.

// Currency symbol used for every price on the site. Change it here only.
const CURRENCY = "R";

// Every option has its own price. A tee's price = style + colour + size + front print + back print.
// A price of 0 shows as "Included".

// Shipping is its own line at checkout, never baked into item prices. We put a share of the order price
// towards it and the customer pays the rest. Dummy numbers: change them here and everything follows.
const SHIPPING_COST = 120;        // dummy shipping cost per order, in CURRENCY units
const SHIPPING_COVER_RATE = 0.10; // share of the order price we put towards shipping (0.10 = 10%)

// How one order's shipping splits. orderSubtotal = the items only, shipping excluded.
// cover = min(cost, rate x subtotal), pay = the rest. Worked in cents so 0.1 x 349 can't drift to 34.900000000000006.
function shippingSplit(orderSubtotal) {
  if (!(orderSubtotal > 0)) return { cost: 0, cover: 0, pay: 0 };
  const costC = Math.round(SHIPPING_COST * 100);
  const coverC = Math.min(costC, Math.round(orderSubtotal * 100 * SHIPPING_COVER_RATE));
  return { cost: costC / 100, cover: coverC / 100, pay: (costC - coverC) / 100 };
}

// The home-page banner. The wording is fixed; only the percentage comes from the constant.
const shippingBannerText = () => `We pay ${Math.round(SHIPPING_COVER_RATE * 100)}% of your order's total price towards shipping, every order!`;

// Uploaded artwork is priced automatically from the image itself (analysed in the browser), per printed side.
// Each tier applies up to and including `upTo`.
const UPLOAD_PRICING = {
  base: 149,      // printing one side (same as a catalog design)
  customFee: 100, // artwork check & setup, per uploaded side
  printSize: [    // share of the print area covered by ink, at the size the customer placed it
    { upTo: 0.25, label: "Small", price: 0 },
    { upTo: 0.6, label: "Medium", price: 20 },
    { upTo: Infinity, label: "Large", price: 40 },
  ],
  colours: [      // distinct colours detected
    { upTo: 2, price: 0 },
    { upTo: 5, price: 20 },
    { upTo: Infinity, price: 40 },
  ],
  detail: [       // edge density: simple shapes → fine linework / photos
    { upTo: 0.06, label: "Simple", price: 0 },
    { upTo: 0.15, label: "Detailed", price: 20 },
    { upTo: Infinity, label: "Intricate", price: 40 },
  ],
};

const TEES = [ // styles
  { id: "crew", name: "Classic Crew Tee", blurb: "Regular fit, crew neck, 100% cotton.", price: 150, available: true },
  { id: "hoodie", name: "Hoodie", blurb: "Heavyweight pullover with hood.", price: 350, available: false },
  { id: "longsleeve", name: "Long Sleeve Tee", blurb: "Our classic tee with long sleeves.", price: 200, available: false },
];

const COLOURS = [
  { id: "black", name: "Black", hex: "#1a1a1a", price: 0 },
  { id: "white", name: "White", hex: "#f2f2f2", price: 0 },
  { id: "grey", name: "Heather Grey", hex: "#8b8e93", price: 10 },
  { id: "navy", name: "Navy", hex: "#1f2a44", price: 20 },
  { id: "red", name: "Red", hex: "#b8322a", price: 20 },
];

const SIZES = [
  { id: "S", price: 0 },
  { id: "M", price: 0 },
  { id: "L", price: 0 },
  { id: "XL", price: 0 },
  { id: "2XL", price: 30 },
  { id: "3XL", price: 60 },
];

// Categories say what a design IS (a design can carry several). They are separate from the pills, which say how it
// is doing (hot / fresh / by a customer). Rename or add freely: designs refer to these ids in `category`.
const CATEGORIES = [
  { id: "meme", label: "Meme" },
  { id: "pop", label: "Pop culture" },
  { id: "slapstick", label: "Slapstick" },
  { id: "graphic", label: "Graphic" },
  { id: "duck", label: "Duck" },
];

// Placeholder artwork: simple SVGs on a 100×100 canvas with transparent backgrounds.
// `tags` is the short design description shown as "Design: …" next to the price.
// `price` is what the design adds to the tee, per side it's printed on.
// `showOn` is the tee colour (from COLOURS) the design is displayed on in the carousel and shop grid.
// Slogan artwork: rows of [text, fill, font size], centred as a block. textLength keeps each line inside the print area.
const slogan = rows => {
  const total = rows.reduce((n, r) => n + r[2] * 1.3, 0);
  let y = 50 - total / 2;
  return rows.map(([t, fill, size]) => {
    y += size * 1.3;
    return `<text x="50" y="${(y - size * 0.3).toFixed(1)}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="${size}" fill="${fill}" textLength="${Math.min(94, Math.round(t.length * size * 0.66))}" lengthAdjust="spacingAndGlyphs">${t}</text>`;
  }).join("");
};
const Y = "#FFC629", W = "#F4F1EA", O = "#FF6B2C", T = "#2EC4B6";

// The Duck wordmark: a duck standing in for the D, then UCK in chunky colour. Drawn on a 100 x 40 canvas.
const DUCK_MARK = `
  <g stroke="#000" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
    <path d="M7 31 L4 36 M13 32 L12 37" stroke="#FF6B2C" stroke-width="2.2" fill="none"/>
    <ellipse cx="15" cy="25" rx="12" ry="8.5" fill="#FFC629"/>
    <circle cx="22" cy="13.5" r="7.5" fill="#FFC629"/>
    <path d="M28.5 12 L35 14.5 L28.5 17.5 Z" fill="#FF6B2C"/>
    <path d="M7 25 Q12 31 19 26 Q14 21 7 25 Z" fill="#FFB400"/>
  </g>
  <circle cx="24" cy="12" r="1.6" fill="#000"/>
  <g font-family="Arial Black, Arial, sans-serif" font-size="34" stroke="#000" stroke-width="3" paint-order="stroke" stroke-linejoin="round">
    <text x="34" y="34" fill="#2A8CF0" textLength="20" lengthAdjust="spacingAndGlyphs">U</text>
    <text x="56" y="34" fill="#E8318F" textLength="20" lengthAdjust="spacingAndGlyphs">C</text>
    <text x="78" y="34" fill="#4CAF28" textLength="21" lengthAdjust="spacingAndGlyphs">K</text>
  </g>`;

// Paint splatter behind the big version: seeded, so it looks the same every time.
const SPLAT = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const cols = ["#E8302A", "#FFC629", "#E8318F", "#2A8CF0", "#4CAF28", "#FF6B2C", "#8E2DE2"];
  let out = "";
  for (let i = 0; i < 12; i++) { // big blobs
    const a = rnd() * 6.283, r = 4 + rnd() * 12;
    out += `<circle cx="${(50 + Math.cos(a) * r * 1.2).toFixed(1)}" cy="${(50 + Math.sin(a) * r).toFixed(1)}" r="${(9 + rnd() * 8).toFixed(1)}" fill="${cols[i % 7]}"/>`;
  }
  for (let i = 0; i < 18; i++) { // streaks flicked outwards
    const a = rnd() * 6.283, r1 = 20 + rnd() * 6, r2 = r1 + 6 + rnd() * 10;
    out += `<path d="M${(50 + Math.cos(a) * r1 * 1.2).toFixed(1)} ${(50 + Math.sin(a) * r1).toFixed(1)} L${(50 + Math.cos(a) * r2 * 1.2).toFixed(1)} ${(50 + Math.sin(a) * r2).toFixed(1)}" stroke="${cols[i % 7]}" stroke-width="${(1.2 + rnd() * 2).toFixed(1)}" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 60; i++) { // flecks
    const a = rnd() * 6.283, r = 22 + rnd() * 20;
    out += `<circle cx="${(50 + Math.cos(a) * r * 1.15).toFixed(1)}" cy="${(50 + Math.sin(a) * r).toFixed(1)}" r="${(0.6 + rnd() * 1.8).toFixed(1)}" fill="${cols[i % 7]}"/>`;
  }
  return out;
})();

const DESIGNS = [
  { id: "d01", name: "Orbit", price: 149, showOn: "black", tags: "overlapping circles, bold, colourful", category: ["graphic"], featured: true,
    svg: `<circle cx="38" cy="40" r="24" fill="#FFC629"/><circle cx="62" cy="40" r="24" fill="#2EC4B6" fill-opacity=".85"/><circle cx="50" cy="62" r="24" fill="#FF6B2C" fill-opacity=".85"/>` },
  { id: "d02", name: "Pyramid", price: 149, showOn: "grey", tags: "stacked triangles, geometric, bright", category: ["graphic"],
    svg: `<path d="M50 8 L92 84 H8 Z" fill="#FF6B2C"/><path d="M50 32 L74 76 H26 Z" fill="#FFC629"/><path d="M50 54 L60 72 H40 Z" fill="#2EC4B6"/>` },
  { id: "d03", name: "Confetti", price: 149, showOn: "navy", tags: "dot grid, playful, pattern", category: ["graphic"],
    svg: [0, 1, 2, 3, 4].flatMap(r => [0, 1, 2, 3, 4].map(c =>
      `<circle cx="${14 + c * 18}" cy="${14 + r * 18}" r="${3 + ((r + c) % 3) * 2.5}" fill="${["#FFC629", "#2EC4B6", "#FF6B2C"][(r + c) % 3]}"/>`)).join("") },
  { id: "d04", name: "Duck", price: 149, showOn: "red", tags: "bold wordmark, duck, minimal", category: ["duck"], featured: true,
    svg: `<text x="50" y="62" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="30" fill="#FFC629">DUCK</text><rect x="12" y="70" width="76" height="5" fill="#FF6B2C"/>` },
  { id: "d05", name: "Quack", price: 149, showOn: "black", tags: "outline badge, quack, clean", category: ["duck"],
    svg: `<circle cx="50" cy="50" r="42" fill="none" stroke="#2EC4B6" stroke-width="5"/><text x="50" y="57" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="19" fill="#F4F1EA">QUACK</text>` },
  { id: "d06", name: "Meme", price: 149, showOn: "navy", tags: "repeated type, hello, colour stack", category: ["meme"],
    svg: `<g font-family="Arial Black, Arial, sans-serif" font-size="22" text-anchor="middle"><text x="50" y="30" fill="#FF6B2C">HELLO</text><text x="50" y="56" fill="#FFC629">HELLO</text><text x="50" y="82" fill="#2EC4B6">HELLO</text></g>` },
  { id: "d07", name: "Sunset", price: 149, showOn: "grey", tags: "retro sunset, stripes, warm", category: ["graphic"], featured: true,
    svg: `<defs><clipPath id="c"><circle cx="50" cy="56" r="40"/></clipPath></defs><g clip-path="url(#c)"><rect x="0" y="16" width="100" height="16" fill="#FFC629"/><rect x="0" y="36" width="100" height="12" fill="#FF6B2C"/><rect x="0" y="52" width="100" height="9" fill="#e0462a"/><rect x="0" y="65" width="100" height="6" fill="#2EC4B6"/></g>` },
  { id: "d08", name: "Ripple", price: 149, showOn: "navy", tags: "wavy lines, retro, calm", category: ["graphic"],
    svg: `<g fill="none" stroke-width="6" stroke-linecap="round"><path d="M10 30 Q30 15 50 30 T90 30" stroke="#FFC629"/><path d="M10 50 Q30 35 50 50 T90 50" stroke="#FF6B2C"/><path d="M10 70 Q30 55 50 70 T90 70" stroke="#2EC4B6"/></g>` },
  { id: "d09", name: "Bolt", price: 149, showOn: "black", tags: "lightning bolt, retro, energetic", category: ["graphic"],
    svg: `<path d="M58 6 L22 56 H46 L38 94 L80 40 H54 Z" fill="#FFC629" stroke="#FF6B2C" stroke-width="3" stroke-linejoin="round"/>` },
  { id: "d10", name: "Sky", price: 149, showOn: "navy", tags: "mountains, sun, outdoors", category: ["graphic"], featured: true,
    svg: `<circle cx="68" cy="30" r="14" fill="#FFC629"/><path d="M4 86 L36 36 L56 66 L68 50 L96 86 Z" fill="#2EC4B6"/><path d="M36 36 L44 48 L36 46 L29 47 Z" fill="#F4F1EA"/>` },
  { id: "d11", name: "Leaf", price: 149, showOn: "white", tags: "leaf, botanical, simple", category: ["graphic"],
    svg: `<path d="M50 8 C82 28 82 70 50 92 C18 70 18 28 50 8 Z" fill="#2EC4B6"/><path d="M50 18 V88 M50 40 L66 30 M50 56 L34 46 M50 70 L64 62" stroke="#0b3d38" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  { id: "d12", name: "Lake", price: 149, showOn: "black", tags: "ocean wave, summer, flowing", category: ["graphic"],
    svg: `<path d="M6 64 C20 30 46 28 54 50 C46 44 38 52 44 60 C56 72 80 62 94 46 V86 H6 Z" fill="#2EC4B6"/><path d="M6 80 C30 66 60 92 94 72 V92 H6 Z" fill="#FFC629" fill-opacity=".9"/>` },
  { id: "d13", name: "Replaced", price: 149, showOn: "black", tags: "replaced by AI, slogan, dark humour", category: ["meme"], featured: true,
    svg: slogan([["I GOT REPLACED BY AI", W, 9], ["AND ALL I GOT WAS", W, 9], ["THIS SHITTY", O, 13], ["TWSH?IRT", Y, 20]]) },
  { id: "d14", name: "Soon", price: 149, showOn: "navy", tags: "soon to be replaced by AI, slogan", category: ["meme"],
    svg: slogan([["SOON TO BE", W, 14], ["REPLACED", Y, 22], ["BY AI", O, 22]]) },
  { id: "d15", name: "Coffee", price: 149, showOn: "black", tags: "AI won't spit in your coffee, slogan", category: ["meme", "slapstick"], featured: true,
    svg: slogan([["I UNDERSTAND BOSS, BUT", W, 8], ["AI AINT GONNA SPIT IN", Y, 10], ["YOUR COFFEE EVERY", Y, 10], ["MORNING LIKE I DID", O, 10]]) },
  { id: "d16", name: "BraAI", price: 149, showOn: "black", tags: "BraAI, the only AI I trust, slogan", category: ["meme"], featured: true,
    svg: `<text x="50" y="52" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="30" fill="${W}">BRA<tspan fill="${Y}">AI</tspan></text><text x="50" y="72" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="8" fill="${T}" textLength="86" lengthAdjust="spacingAndGlyphs">THE ONLY AI I TRUST</text>` },
  { id: "d17", name: "Paddle", price: 149, showOn: "navy", tags: "calm duck, paddling underneath, slogan", category: ["duck", "meme"],
    svg: slogan([["CALM ON THE SURFACE", W, 9], ["PADDLING LIKE HELL", Y, 11], ["UNDERNEATH", O, 14]]) },
  { id: "d18", name: "JedAI", price: 149, showOn: "black", tags: "revenge of the JedAI, slogan, sci-fi parody", category: ["pop"],
    flag: "Trademark risk: parody of a Lucasfilm title. Clear or drop before launch.", // admin-only note; never shown to shoppers
    svg: slogan([["REVENGE OF", W, 12], ["THE", W, 12], ["JedAI", Y, 26]]) },
  // Image designs: a transparent webp in designs/ (img) and its width / height (aspect). Dark artwork, so shown on white.
  { id: "d19", name: "Truth", price: 149, showOn: "white", tags: "remember when software told the truth, meme", category: ["meme", "pop"], featured: true,
    img: "designs/software-truth.webp", aspect: 1.319,
    flag: "Trademark risk: Gemini, OpenAI, Anthropic, Meta and X logos, plus the Springbok rugby crest. Clear or redraw before launch." },
  { id: "d20", name: "Nyama en Pap", price: 149, showOn: "white", tags: "braai, vleis rys en aartappels, hawu", category: ["slapstick"], featured: true,
    img: "designs/nyama-en-pap.webp", aspect: 1.3444,
    flag: "Trademark risk: Klippies and Zamalek (Black Label lookalike) labels on the drinks. Redraw with generic labels before launch." },
  { id: "d21", name: "Nou Braai", price: 149, showOn: "white", tags: "nou gaan ons braai, braai crew, bold", category: ["slapstick"],
    img: "designs/nou-braai.webp", aspect: 0.7017,
    flag: "Trademark risk: Klippies and Zamalek (Black Label lookalike) labels on the drinks. Redraw with generic labels before launch." },
  // Plain-type one-liners
  { id: "d22", name: "Reluctant", price: 149, showOn: "black", tags: "reluctant adult, slogan, dry humour", category: ["meme"],
    svg: slogan([["RELUCTANT", W, 19], ["ADULT", Y, 26]]) },
  { id: "d23", name: "Just Now", price: 149, showOn: "black", tags: "I'll do it just now, procrastination, slogan", category: ["meme"],
    svg: slogan([["I'LL DO IT", W, 18], ["JUST NOW", Y, 24], ["(3 TO 5 BUSINESS YEARS)", T, 7]]) },
  { id: "d24", name: "Spiral", price: 149, showOn: "navy", tags: "be right back spiralling, slogan", category: ["meme"],
    svg: slogan([["BE RIGHT BACK,", W, 14], ["SPIRALLING", O, 20]]) },
  { id: "d25", name: "Peaked", price: 149, showOn: "black", tags: "peaked in the group chat, slogan", category: ["meme"],
    svg: slogan([["I PEAKED IN", W, 15], ["THE GROUP", Y, 21], ["CHAT", Y, 21]]) },
  { id: "d26", name: "Disappointed", price: 149, showOn: "navy", tags: "professionally disappointed, slogan", category: ["meme"],
    svg: slogan([["PROFESSIONALLY", W, 13], ["DISAPPOINTED", O, 14]]) },
  { id: "d27", name: "Tabs", price: 149, showOn: "black", tags: "47 tabs open, one brain cell, slogan", category: ["meme"],
    svg: slogan([["47 TABS OPEN", W, 15], ["ONE BRAIN CELL", Y, 14], ["BOTH LOADING", T, 11]]) },
  // The name's origin: a duck for the D. The mark opens as a small left-chest print; the splash is the big back print.
  { id: "d28", name: "Duck Mark", price: 149, showOn: "black", tags: "duck for the D, wordmark, left chest", category: ["duck"], featured: true,
    vb: "0 0 100 40", aspect: 2.5, place: { x: 0.28, y: -0.34, s: 0.36 },
    svg: DUCK_MARK },
  { id: "d29", name: "Duck Splash", price: 149, showOn: "black", tags: "duck for the D, paint splatter, big back print", category: ["duck", "graphic"], featured: true,
    svg: `${SPLAT}<g transform="translate(5 28) scale(.9)">${DUCK_MARK}</g>` },
  // A ready-made set: opens with the Duck Mark on the front and the Duck Splash on the back (price = both prints).
  { id: "d30", name: "The Duck Tee", price: 298, showOn: "black", tags: "mark on the front, splash on the back, the original", category: ["duck"], featured: true,
    set: { front: "d28", back: "d29" },
    svg: `${SPLAT}<g transform="translate(5 28) scale(.9)">${DUCK_MARK}</g>` },
];

// Mock data for the carousel pills. In the real build these come from the database:
//   sold30  = units sold in the last 30 days   -> "Hot sellers"
//   added   = date the design went live        -> "Fresh designs"
//   uploader = approved customer upload (name) -> "User's Designs", credited as "by …"
// Mock dates are relative to today so the demo always has a few "new" designs.
const daysAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const NEW_DESIGN_DAYS = 14; // a design counts as "New Design" for this many days after it goes live
const DESIGN_META = {
  d01: { sold30: 41, added: daysAgo(124) },
  d02: { sold30: 12, added: daysAgo(124) },
  d03: { sold30: 33, added: daysAgo(16), uploader: "Thandi" },
  d04: { sold30: 58, added: daysAgo(124) },
  d05: { sold30: 27, added: daysAgo(85) },
  d06: { sold30: 9,  added: daysAgo(85) },
  d07: { sold30: 36, added: daysAgo(124) },
  d08: { sold30: 21, added: daysAgo(8), uploader: "Liam" },
  d09: { sold30: 44, added: daysAgo(60) },
  d10: { sold30: 17, added: daysAgo(124) },
  d11: { sold30: 6,  added: daysAgo(60) },
  d12: { sold30: 29, added: daysAgo(3), uploader: "Ayesha" },
  d13: { sold30: 24, added: daysAgo(10) },
  d14: { sold30: 18, added: daysAgo(10) },
  d15: { sold30: 35, added: daysAgo(6) },
  d16: { sold30: 40, added: daysAgo(4) },
  d17: { sold30: 15, added: daysAgo(30) },
  d18: { sold30: 22, added: daysAgo(0) },
  d19: { sold30: 31, added: daysAgo(0) },
  d20: { sold30: 28, added: daysAgo(0) },
  d21: { sold30: 19, added: daysAgo(0) },
  d22: { sold30: 14, added: daysAgo(0) },
  d23: { sold30: 26, added: daysAgo(0) },
  d24: { sold30: 17, added: daysAgo(0) },
  d25: { sold30: 21, added: daysAgo(0) },
  d26: { sold30: 12, added: daysAgo(0) },
  d27: { sold30: 16, added: daysAgo(0) },
  d28: { sold30: 63, added: daysAgo(0) },
  d29: { sold30: 57, added: daysAgo(0) },
  d30: { sold30: 70, added: daysAgo(0) },
};
DESIGNS.forEach(d => Object.assign(d, DESIGN_META[d.id]));

const CAROUSEL_PILLS = [
  { id: "hot",      label: "Hot sellers" },
  { id: "fresh",    label: "Fresh designs" },
  { id: "uploaded", label: "User's Designs" },
];
// Browse page pills (same three as the carousel, but several can be on at once and they ADD UP: a design shows if it
// matches any switched-on pill). On the full catalogue "hot" and "fresh" are thresholds, not top-N.
const BROWSE_HOT_MIN_SALES = 25; // Hot sellers = sold at least this many in the last 30 days
const BROWSE_FRESH_DAYS = 30;    // Fresh designs = added within this many days
const BROWSE_PILLS = {
  hot: d => d.sold30 >= BROWSE_HOT_MIN_SALES,
  fresh: d => (Date.now() - new Date(d.added)) / 864e5 <= BROWSE_FRESH_DAYS,
  uploaded: d => Boolean(d.uploader),
};
const BROWSE_SORT = { // how results are ordered, by the first pill picked
  hot: (a, b) => b.sold30 - a.sold30,
  fresh: (a, b) => b.added.localeCompare(a.added),
  uploaded: (a, b) => b.added.localeCompare(a.added),
};
// pills = status pill ids in the order they were switched on. cats = category ids. EVERYTHING is additive: a design shows
// if it matches ANY switched-on pill or ANY switched-on category, so every extra pill only adds designs.
// Nothing on = everything, in the order given. Results are ordered by the first status pill switched on.
function browseList(pills, designs = DESIGNS, cats = []) {
  if (!pills.length && !cats.length) return designs.slice();
  const ok = designs.filter(d => pills.some(p => BROWSE_PILLS[p](d)) || cats.some(c => d.category.includes(c)));
  return pills.length ? ok.sort(BROWSE_SORT[pills[0]]) : ok;
}

const CAROUSEL_SIZE = 20; // the home carousel always holds about this many designs, whichever pill is active (the shop grid still lists every design)
const HOT_BADGE_COUNT = 5; // top N designs by 30-day sales get the "Hot seller" badge. The pill itself is never capped.

// "What other styles are you interested in?" poll. Multi-select: each person can pick any number of styles.
// Baseline numbers are fake for the demo (voters = people who answered, votes = how many of them picked that style);
// the real build counts one answer per account.
const POLL = {
  question: "We only do tees now, what other styles are you interested in?",
  note: "Pick as many as you like.",
  voters: 210,
  options: [
    { id: "hoodie",     label: "Hoodie",         votes: 142 },
    { id: "longsleeve", label: "Long sleeve tee", votes: 87 },
    { id: "oversized",  label: "Oversized tee",   votes: 64 },
    { id: "tank",       label: "Tank top",        votes: 31 },
    { id: "kids",       label: "Kids sizes",      votes: 48 },
  ],
};
// Results for the poll, including this visitor's picks (mine: array of option ids). pct = share of people who picked
// the style, so with several picks each the bars add up to more than 100.
function pollResults(mine = []) {
  const voters = POLL.voters + (mine.length ? 1 : 0);
  return {
    voters,
    options: POLL.options.map(o => {
      const picked = mine.includes(o.id), votes = o.votes + (picked ? 1 : 0);
      return { id: o.id, label: o.label, votes, pct: Math.round(votes / voters * 100), mine: picked };
    }),
  };
}


// =====================================================================================================================
// The duck: a dress-up character, and the round badge printed small on the back of every shirt.
// All pure functions that build SVG text, so they can be tested without a browser.
// =====================================================================================================================
const DUCK_BRAND_TEXT = "DUCK T-SHIRT CO";
const DUCK_RING_MAX = 22;      // characters of badge text
// The real AI artist. Leave "" to use the built-in stand-in (nothing is sent anywhere). Set it to the deployed Worker's
// address, for example "https://duck-ai.<your-subdomain>.workers.dev/draw", and the badge art is drawn by Workers AI.
let DUCK_AI_ENDPOINT = "";
const DUCK_ART_MAX = 600000;   // characters of picture kept on a duck
const artOk = a => typeof a === "string" && a.length <= DUCK_ART_MAX && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a);
const DUCK_AI_COST = 5;        // dummy price per "describe your duck" try, in CURRENCY units. In the real build this covers one AI call plus margin.
const DUCK_BODIES = ["#FFC629", "#FF8A1E", "#E8318F", "#2A8CF0", "#4CAF28", "#F4F1EA", "#9AA0A6", "#6C2BD9"];
const DUCK_RINGS = ["#000000", "#FFC629", "#2A8CF0", "#E8318F", "#4CAF28", "#6A1B9A"];

// Accessory layers, drawn on a 100 x 100 duck that faces right. "back" layers sit behind the duck, "front" on top.
const DUCK_ACC = {
  // behind
  skateboard: ["back", `<rect x="10" y="90" width="66" height="5" rx="2.5" fill="#222" stroke="#000" stroke-width="1.6"/><circle cx="24" cy="97" r="3.4" fill="#FF8A1E" stroke="#000"/><circle cx="62" cy="97" r="3.4" fill="#FF8A1E" stroke="#000"/>`],
  longhair: ["back", `<path d="M46 22 Q24 34 28 64 Q36 58 38 48 Q40 38 50 30 Z" fill="#2b2b2b" stroke="#000" stroke-width="1.6"/>`],
  bindle: ["back", `<path d="M14 66 L36 52" stroke="#7b5a2e" stroke-width="3" stroke-linecap="round"/><circle cx="11" cy="68" r="8" fill="#cfd8dc" stroke="#000" stroke-width="1.6"/><path d="M6 66 h10" stroke="#000" stroke-width="1.2"/>`],
  cape: ["back", `<path d="M32 50 Q8 70 12 98 Q34 88 54 94 L58 52 Z" fill="#8b0000" stroke="#000" stroke-width="2"/><path d="M40 52 L34 38 L48 50 Z M66 50 L74 38 L58 52 Z" fill="#8b0000" stroke="#000" stroke-width="1.4"/>`],
  // on top
  circuit: ["front", `<path d="M18 64 H32 V72 H46 M24 56 V66 M52 70 H60" stroke="#00E5FF" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="32" cy="72" r="2" fill="#00E5FF"/><circle cx="24" cy="56" r="2" fill="#00E5FF"/>`],
  visor: ["front", `<rect x="44" y="26" width="30" height="9" rx="4.5" fill="#00E5FF" stroke="#000" stroke-width="1.6"/><rect x="48" y="28.4" width="22" height="2.4" rx="1.2" fill="#fff" opacity=".75"/>`],
  antenna: ["front", `<path d="M52 21 L47 6" stroke="#222" stroke-width="2" stroke-linecap="round"/><circle cx="47" cy="5" r="3" fill="#FF2D95" stroke="#000" stroke-width="1"/>`],
  fedora: ["front", `<ellipse cx="55" cy="22" rx="21" ry="4.6" fill="#6A1B9A" stroke="#000" stroke-width="1.6"/><path d="M43 22 Q44 7 56 7 Q68 7 67 22 Z" fill="#6A1B9A" stroke="#000" stroke-width="1.6"/><rect x="44" y="16" width="22" height="3.6" fill="#FFC629"/><path d="M64 12 Q74 2 82 9" stroke="#E8318F" stroke-width="2.6" fill="none" stroke-linecap="round"/>`],
  shades: ["front", `<rect x="48" y="27" width="10" height="8" rx="2.4" fill="#000"/><rect x="60" y="27" width="10" height="8" rx="2.4" fill="#000"/><path d="M58 30 H60" stroke="#000" stroke-width="1.8"/>`],
  chain: ["front", `<path d="M42 52 Q56 68 70 52" stroke="#FFD700" stroke-width="2.8" fill="none"/><circle cx="56" cy="63" r="3.4" fill="#FFD700" stroke="#000" stroke-width=".9"/>`],
  hobohat: ["front", `<path d="M42 24 Q44 9 56 9 Q68 9 70 24 Z" fill="#6b4f2a" stroke="#000" stroke-width="1.6"/><ellipse cx="56" cy="24" rx="20" ry="3.8" fill="#5a4222" stroke="#000" stroke-width="1.6"/><rect x="52" y="14" width="7" height="6" fill="#c9a96e" stroke="#000" stroke-width=".8"/>`],
  stubble: ["front", `<g fill="#000" opacity=".7"><circle cx="58" cy="44" r=".7"/><circle cx="62" cy="46" r=".7"/><circle cx="55" cy="47" r=".7"/><circle cx="60" cy="48.5" r=".7"/><circle cx="52" cy="45" r=".7"/><circle cx="64" cy="49" r=".7"/></g>`],
  cap: ["front", `<path d="M41 28 Q42 14 56 14 Q70 14 71 28 Z" fill="#E53935" stroke="#000" stroke-width="1.6"/><path d="M41 27 H28 Q26 27.5 27.5 29.5 H41 Z" fill="#E53935" stroke="#000" stroke-width="1.6"/>`],
  roundshades: ["front", `<circle cx="51" cy="31" r="6" fill="#241a3a" stroke="#000" stroke-width="1.4"/><circle cx="64" cy="31" r="6" fill="#241a3a" stroke="#000" stroke-width="1.4"/><path d="M57 31 H58" stroke="#000" stroke-width="1.8"/><circle cx="49.4" cy="29" r="1.3" fill="#B388FF"/><circle cx="62.4" cy="29" r="1.3" fill="#B388FF"/>`],
  cross: ["front", `<path d="M56 54 V68 M50 59 H62" stroke="#cfd8dc" stroke-width="2.6" stroke-linecap="round"/><path d="M44 52 Q56 60 68 52" stroke="#cfd8dc" stroke-width="1.2" fill="none"/>`],
  squarehead: ["front", `<rect x="40" y="16" width="32" height="9" fill="#111" stroke="#000" stroke-width="1.4"/>`],
  stitches: ["front", `<path d="M44 27 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3" stroke="#000" stroke-width="1.6" fill="none"/>`],
  bolts: ["front", `<rect x="35" y="47" width="7" height="3.6" rx="1" fill="#9e9e9e" stroke="#000" stroke-width="1"/><rect x="66" y="47" width="7" height="3.6" rx="1" fill="#9e9e9e" stroke="#000" stroke-width="1"/>`],
  fangs: ["front", `<path d="M71 44 L73.4 50.5 L75.6 43.2 Z M77.4 41.4 L79.4 47.4 L81.4 40.4 Z" fill="#fff" stroke="#000" stroke-width=".8"/>`],
  piratehat: ["front", `<path d="M38 25 Q56 2 74 25 Q56 19 38 25 Z" fill="#111" stroke="#000" stroke-width="1.6"/><circle cx="56" cy="15" r="3.4" fill="#fff"/><path d="M51 12 l10 6 M61 12 l-10 6" stroke="#111" stroke-width="1.2"/>`],
  eyepatch: ["front", `<path d="M44 22 L69 38" stroke="#000" stroke-width="1.8"/><ellipse cx="61" cy="31" rx="4.8" ry="4.2" fill="#111"/>`],
  wizardhat: ["front", `<path d="M40 24 L57 1 L72 24 Z" fill="#3949AB" stroke="#000" stroke-width="1.6"/><ellipse cx="56" cy="24" rx="21" ry="4.2" fill="#3949AB" stroke="#000" stroke-width="1.6"/><circle cx="53" cy="12" r="2" fill="#FFD700"/><circle cx="60" cy="18" r="1.6" fill="#FFD700"/>`],
  helmet: ["front", `<circle cx="56" cy="36" r="21" fill="#CFE9FF" fill-opacity=".35" stroke="#e0e0e0" stroke-width="2.6"/><rect x="39" y="50" width="34" height="6" rx="3" fill="#9e9e9e" stroke="#000" stroke-width="1.4"/>`],
  headband: ["front", `<path d="M41 28 Q56 21 71 28" stroke="#D32F2F" stroke-width="4.2" fill="none"/><path d="M42 28 L32 35 M42 29 L34 23" stroke="#D32F2F" stroke-width="3" stroke-linecap="round"/>`],
  cowboyhat: ["front", `<ellipse cx="56" cy="22" rx="25" ry="4.2" fill="#8D5524" stroke="#000" stroke-width="1.6"/><path d="M43 22 Q45 7 56 10 Q67 7 69 22 Z" fill="#8D5524" stroke="#000" stroke-width="1.6"/>`],
  chefhat: ["front", `<circle cx="46" cy="14" r="6" fill="#fff" stroke="#000" stroke-width="1.4"/><circle cx="56" cy="9" r="7" fill="#fff" stroke="#000" stroke-width="1.4"/><circle cx="66" cy="14" r="6" fill="#fff" stroke="#000" stroke-width="1.4"/><rect x="44" y="14" width="24" height="11" fill="#fff" stroke="#000" stroke-width="1.4"/>`],
  crown: ["front", `<path d="M44 23 L46 10 L51 17 L56 7 L61 17 L66 10 L68 23 Z" fill="#FFD700" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>`],
  mohawk: ["front", `<path d="M48 23 L50 5 L54 17 L58 3 L62 17 L66 7 L65 24 Z" fill="#E8318F" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/>`],
  bowtie: ["front", `<path d="M49 56 L58 60.5 L49 65 Z M67 56 L58 60.5 L67 65 Z" fill="#D32F2F" stroke="#000" stroke-width="1.2"/><circle cx="58" cy="60.5" r="2.2" fill="#B71C1C"/>`],
};

// The characters. `flag` is an internal rights/policy note (never shown to shoppers, and stripped from the public build).
const DUCK_PRESETS = [
  { id: "classic",     label: "Classic",     body: "#FFC629", ring: "#000000", acc: [] },
  { id: "cyberfuck",   label: "Cyberfuck",   body: "#6C2BD9", ring: "#2A8CF0", acc: ["circuit", "visor", "antenna"],
    flag: "Name contains profanity: check the print supplier, payment provider and ad platform policies before launch.",
  },
  { id: "pimpduck",    label: "Pimpduck",    body: "#FFC629", ring: "#6A1B9A", acc: ["fedora", "shades", "chain"] },
  { id: "hoboduck",    label: "Hoboduck",    body: "#C9B79C", ring: "#4CAF28", acc: ["bindle", "hobohat", "stubble"] },
  { id: "skaterduck",  label: "Skaterduck",  body: "#FFC629", ring: "#E8318F", acc: ["skateboard", "cap"] },
  { id: "ozzyduck",    label: "Ozzyduck",    body: "#FFC629", ring: "#000000", acc: ["longhair", "roundshades", "cross"],
    flag: "Named after a real person: check publicity rights, or rename, before launch.",
  },
  { id: "frankenduck", label: "Frankenduck", body: "#6AA84F", ring: "#4CAF28", acc: ["squarehead", "stitches", "bolts"],
    flag: "Keep the look generic (bolts and stitches). Do not copy a film studio's monster makeup.",
  },
];

const hexOk = h => typeof h === "string" && /^#[0-9a-fA-F]{6}$/.test(h);
// Badge text: capitals, a short line, nothing that could break the artwork.
const cleanRingText = t => {
  const s = String(t ?? "").replace(/[\u0000-\u001f<>&"'`\\]/g, "").replace(/\s+/g, " ").trim().toUpperCase().slice(0, DUCK_RING_MAX).trim();
  return s || DUCK_BRAND_TEXT;
};
// A duck setup, always valid: unknown things fall back to the classic duck. acc (optional) overrides the character's accessories.
function duckConfig(c) {
  c = c || {};
  const p = DUCK_PRESETS.find(x => x.id === c.preset) || DUCK_PRESETS[0];
  const acc = Array.isArray(c.acc) ? c.acc.filter((id, i, a) => id in DUCK_ACC && a.indexOf(id) === i).slice(0, 6) : null;
  return { preset: p.id, body: hexOk(c.body) ? c.body : p.body, ring: hexOk(c.ring) ? c.ring : p.ring, text: cleanRingText(c.text), acc, art: artOk(c.art) ? c.art : null, title: typeof c.title === "string" ? c.title.replace(/[^\w \-']/g, "").slice(0, 40) : "" };
}
const BRAND_BADGE = duckConfig({ preset: "classic" });

function duckInner(cfg) {
  const p = DUCK_PRESETS.find(x => x.id === cfg.preset) || DUCK_PRESETS[0];
  const layers = (cfg.acc || p.acc).map(id => DUCK_ACC[id]).filter(Boolean);
  const base = `<g stroke="#000" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M40 80 L37 90 M52 80 L50 90" stroke="#FF8A1E" stroke-width="3.4" fill="none"/>
    <ellipse cx="38" cy="64" rx="29" ry="19" fill="${cfg.body}"/>
    <path d="M16 62 Q28 78 48 68 Q36 52 16 62 Z" fill="#000" fill-opacity=".16" stroke-width="1.4"/>
    <circle cx="56" cy="36" r="16" fill="${cfg.body}"/>
    <path d="M69 31 L88 38 L69 45 Z" fill="#FF8A1E"/>
  </g><circle cx="61" cy="31" r="2.2" fill="#000"/>`;
  return layers.filter(l => l[0] === "back").map(l => l[1]).join("") + base + layers.filter(l => l[0] === "front").map(l => l[1]).join("");
}
// Whichever of black or white reads better on the ring colour.
function ringTextColour(ring) {
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const l = lum(ring);
  return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.05) ? "#FFFFFF" : "#000000";
}
// The round badge on a 100 x 100 canvas: a ring with text round the rim, the duck in the middle.
function badgeInner(cfg) {
  const txt = ringTextColour(cfg.ring);
  return `<defs><path id="ring" d="M11 50 A39 39 0 0 1 89 50 A39 39 0 0 1 11 50"/></defs>
    <circle cx="50" cy="50" r="49" fill="${cfg.ring}" stroke="#000" stroke-width="1.5"/>
    <circle cx="50" cy="50" r="31" fill="#111" stroke="${txt}" stroke-width="1"/>
    <text font-family="Arial Black, Arial, sans-serif" font-size="9.5" font-weight="900" letter-spacing="1.2" fill="${txt}"><textPath href="#ring" startOffset="25%" text-anchor="middle">${cleanRingText(cfg.text)}</textPath></text>
    ${cfg.art
      ? `<defs><clipPath id="face"><circle cx="50" cy="50" r="31"/></clipPath></defs><image href="${cfg.art}" x="19" y="19" width="62" height="62" preserveAspectRatio="xMidYMid slice" clip-path="url(#face)"/>`
      : `<g transform="translate(27 23) scale(.48)">${duckInner(cfg)}</g>`}`;
}

// ---- "Describe your duck": the demo stand-in for an AI model --------------------------------------------------------
// The real build sends the words to an AI model on a server and gets back a recipe from this same fixed vocabulary
// (so it always prints well); here a keyword table plays that part. No network, nothing is sent anywhere.
const DUCK_THEMES = [
  { words: ["vampire", "dracula", "count"],           label: "vampire",    acc: ["cape", "fangs"],                 body: "#E8E3F0", ring: "#6A1B9A" },
  { words: ["pirate", "buccaneer", "captain"],        label: "pirate",     acc: ["piratehat", "eyepatch", "stubble"], body: "#FFC629", ring: "#000000" },
  { words: ["wizard", "witch", "magic", "mage"],      label: "wizard",     acc: ["wizardhat", "stubble"],          body: "#F4F1EA", ring: "#3949AB" },
  { words: ["astronaut", "space", "cosmonaut"],       label: "astronaut",  acc: ["helmet"],                        body: "#F4F1EA", ring: "#2A8CF0" },
  { words: ["ninja", "samurai", "assassin"],          label: "ninja",      acc: ["headband", "shades"],            body: "#2B2B2B", ring: "#D32F2F" },
  { words: ["cowboy", "cowgirl", "sheriff", "western"], label: "cowboy",   acc: ["cowboyhat", "stubble"],          body: "#FFC629", ring: "#8D5524" },
  { words: ["chef", "cook", "baker"],                 label: "chef",       acc: ["chefhat", "bowtie"],             body: "#F4F1EA", ring: "#E8318F" },
  { words: ["king", "queen", "royal", "prince", "princess", "crown"], label: "royal", acc: ["crown", "cape"],     body: "#FFC629", ring: "#6A1B9A" },
  { words: ["punk", "rocker", "mohawk"],              label: "punk",       acc: ["mohawk", "shades", "chain"],     body: "#E8318F", ring: "#000000" },
  { words: ["robot", "cyber", "android", "futuristic"], label: "cyber",    acc: ["circuit", "visor", "antenna"],   body: "#6C2BD9", ring: "#2A8CF0" },
  { words: ["zombie", "frankenstein", "monster"],     label: "monster",    acc: ["squarehead", "stitches", "bolts"], body: "#6AA84F", ring: "#4CAF28" },
  { words: ["rock", "metal", "ozzy", "rockstar"],     label: "rock star",  acc: ["longhair", "roundshades", "cross"], body: "#FFC629", ring: "#000000" },
  { words: ["gangster", "pimp", "mafia", "boss"],     label: "gangster",   acc: ["fedora", "shades", "chain"],     body: "#FFC629", ring: "#6A1B9A" },
  { words: ["hobo", "tramp", "drifter", "vagabond"],  label: "drifter",    acc: ["bindle", "hobohat", "stubble"],  body: "#C9B79C", ring: "#4CAF28" },
  { words: ["skater", "skateboard", "skate"],         label: "skater",     acc: ["skateboard", "cap"],             body: "#FFC629", ring: "#E8318F" },
];
const DUCK_COLOUR_WORDS = { red: "#D32F2F", blue: "#2A8CF0", green: "#4CAF28", pink: "#E8318F", purple: "#6C2BD9", black: "#2B2B2B", white: "#F4F1EA", orange: "#FF8A1E", grey: "#9AA0A6", gray: "#9AA0A6", gold: "#FFD700", yellow: "#FFC629", pale: "#E8E3F0" };

// -> { ok, cfg, explain, matched[] } , or { ok: false, tryThese[] } when the demo cannot draw it
function duckFromPrompt(prompt) {
  const words = String(prompt || "").toLowerCase().match(/[a-z]+/g) || [];
  const themes = DUCK_THEMES.filter(t => t.words.some(w => words.includes(w))).slice(0, 2);
  if (!themes.length) return { ok: false, tryThese: DUCK_THEMES.map(t => t.label) };
  const acc = [...new Set(themes.flatMap(t => t.acc))].slice(0, 6);
  const colourWord = words.find(w => w in DUCK_COLOUR_WORDS);
  const body = colourWord ? DUCK_COLOUR_WORDS[colourWord] : themes[0].body;
  const cfg = duckConfig({ preset: "classic", body, ring: themes[0].ring, acc, title: themes.map(t => t.label).join(" + ") + " duck" });
  const names = acc.join(", ");
  return { ok: true, cfg, matched: themes.map(t => t.label), explain: `${cfg.title}: ${colourWord ? colourWord + " body, " : ""}${names}.` };
}
// What a run of tries costs.
const duckAiFee = tries => Math.max(0, Math.floor(tries || 0)) * DUCK_AI_COST;


// =====================================================================================================================
// Featuring an uploaded design in the catalogue. The customer keeps ownership and gives us a time-limited, non-exclusive
// licence (permission) to show and sell it. They earn a flat reward on every sale, as account credit or a gift voucher.
// Pure functions, so the rules can be tested. The wording is a plain-language DRAFT for a lawyer to check.
// =====================================================================================================================
const FEATURE_REWARD = 20;              // rand per sale (account credit by default, or a gift voucher of the same value)
const FEATURE_TERM_MONTHS = 6;          // how long we may show and sell it, from the day it goes live (renewable)
const FEATURE_TAKEDOWN_DAYS = 7;        // how quickly we remove a design when asked
const FEATURE_VOUCHER_VALID_YEARS = 3;  // CHECK WITH YOUR LAWYER: I believe South Africa's Consumer Protection Act sets a minimum validity for vouchers
const FEATURE_TERMS_VERSION = "2026-10-05-draft";
const FEATURE_REWARDS = [{ id: "credit", label: "Account credit" }, { id: "voucher", label: "Gift voucher" }];

// A date plus whole months, keeping the day where it exists and clamping to the month's last day (31 Aug + 6 months = 28/29 Feb).
function addMonths(iso, n) {
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + n, last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds())).toISOString();
}
const featureExpiry = rec => (rec && rec.liveFrom ? addMonths(rec.liveFrom, FEATURE_TERM_MONTHS) : null);
// pending = accepted but not yet approved; live = in the catalogue; expired = the term has run out (renewable); declined = we said no
function featureStatus(rec, now = Date.now()) {
  if (!rec) return null;
  if (rec.status === "declined") return "declined";
  if (!rec.liveFrom) return "pending";
  return now >= new Date(featureExpiry(rec)).getTime() ? "expired" : "live";
}
// What a design has earned from its sales. sales: [{ at: ISO date, refunded: bool }]. Only paid, un-refunded sales inside the live term count.
function featureEarned(rec, sales, now = Date.now()) {
  if (!rec || !rec.liveFrom) return { sales: 0, amount: 0 };
  const from = new Date(rec.liveFrom).getTime(), to = Math.min(now, new Date(featureExpiry(rec)).getTime());
  const n = (sales || []).filter(s => !s.refunded && new Date(s.at).getTime() >= from && new Date(s.at).getTime() <= to).length;
  return { sales: n, amount: n * FEATURE_REWARD };
}
// A voucher code for the n-th sale of a design. The same inputs always give the same code, and it avoids look-alike characters (0/O, 1/I).
function voucherCode(seed, n) {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 characters
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9;
  for (const ch of `${seed}:${n}`) {
    h1 = Math.imul(h1 ^ ch.charCodeAt(0), 16777619) >>> 0;
    h2 = Math.imul(h2 + ch.charCodeAt(0) + 0x7f4a7c15, 2246822519) >>> 0;
    h2 ^= h2 >>> 13;
  }
  const take = (h, i) => A[((h >>> (i * 6)) & 63) % A.length];
  return `DUCK-${[0, 1, 2, 3].map(i => take(h1, i)).join("")}-${[0, 1, 2, 3].map(i => take(h2, i)).join("")}`;
}
const voucherFor = (rec, n, issued = new Date().toISOString()) => ({ code: voucherCode(rec.id || rec.fingerprint || "x", n), value: FEATURE_REWARD, validUntil: addMonths(issued, 12 * FEATURE_VOUCHER_VALID_YEARS) });

const featureMoney = () => `${CURRENCY}${FEATURE_REWARD}`;
// The four points shown above the full terms, in plain words.
const featureKeyPoints = () => [
  "You keep ownership of your design.",
  `We can show and sell it for ${FEATURE_TERM_MONTHS} months, from the day it goes live.`,
  `You earn ${featureMoney()} for every shirt sold, as account credit or a gift voucher.`,
  "You can ask us to take it down at any time.",
];
// The full terms. A DRAFT for legal review: plain language, not yet checked by a lawyer.
const featureTermsSections = () => [
  { id: "ownership", h: "What you are giving us", p: [
    "You keep ownership of your design. You are giving us a licence, which means permission, to use it. The licence is non-exclusive, so you can still use your design elsewhere.",
    "It lets us: print your design on apparel for any customer, as often as needed; show it in our shop, carousel, emails, social posts and ads; let our printing partners reproduce it for us; and make technical changes so it prints well, such as resizing it, recolouring it to suit the garment, removing the background and tidying the edges.",
    "It does not let us put your design on anything other than apparel, or sell the design itself to anyone else.",
  ] },
  { id: "reward", h: "What you get", p: [
    `Every time a shirt with your design is sold, you earn ${featureMoney()}. You can take it as account credit (the default) or, if you prefer, as a gift voucher of the same value that you can give to anyone.`,
    `Account credit can only be spent in our shop. It cannot be cashed out, and it is never applied automatically. A gift voucher is a code worth the same amount and stays valid for ${FEATURE_VOUCHER_VALID_YEARS} years. A sale only counts once it has been paid for and has not been refunded.`,
  ] },
  { id: "term", h: "How long it lasts", p: [
    `The licence starts the day your design goes live in the catalogue and runs for ${FEATURE_TERM_MONTHS} months. We will email you before it ends so you can renew for another ${FEATURE_TERM_MONTHS} months in one click. If you do not renew, we take your design out of the catalogue.`,
    "Shirts already sold are not affected, and any credit or vouchers you have earned are yours to keep.",
  ] },
  { id: "promises", h: "What you promise", p: [
    "You promise that: you made the design, or you have permission from whoever did to give us this licence; it contains no logos, brand names, characters, celebrities or other people's work that you do not have the rights to; it is not unlawful, hateful or sexually explicit; and you are 18 or older.",
    "If a promise turns out not to be true, we may remove the design straight away and stop crediting it, and you are responsible for the loss this causes us.",
  ] },
  { id: "approval", h: "Approval", p: [
    "Nothing goes live automatically. We review every design, and we may decline it or remove it at any time, for example if there is a rights concern, the quality is not good enough, or it breaks our rules. If we decline it, you owe us nothing and it is not featured.",
  ] },
  { id: "takedown", h: "Taking it down", p: [
    `You can ask us to take your design down at any time by contacting us. We will remove it from the catalogue within ${FEATURE_TAKEDOWN_DAYS} days. Shirts already sold are not affected.`,
  ] },
  { id: "refunds", h: "Refunds", p: [
    "A sale that is refunded or cancelled does not earn a reward. If a reward was already given for it, it can be taken back.",
  ] },
  { id: "records", h: "Our record of this agreement", p: [
    "We keep a record of this agreement: your account, the date and time, the version of these terms, and a fingerprint of the exact file you gave us. We email you a copy. We use your details only to run this agreement and your account, as set out in our privacy notice.",
  ] },
  { id: "changes", h: "Changes and the law", p: [
    "If we change these terms, the new terms apply from your next renewal, and we will ask you to accept them again then. These terms are governed by South African law.",
  ] },
];
const FEATURE_DRAFT_NOTE = "DRAFT for legal review. Plain-language wording that has not yet been checked by a lawyer.";
