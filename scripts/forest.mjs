// Renders the "commit forest": one column per week of the last year.
//   0 commits -> bare ground, 1..TREE_MIN-1 -> a single macaw, >= TREE_MIN -> a tree
//   (taller with more commits) with a macaw in the canopy.
//
//   GITHUB_TOKEN=... node scripts/forest.mjs [--mock] [--data weeks.json] [--out file.svg]
//   weeks.json: [{ "start": "YYYY-MM-DD", "commits": 12 }, ...]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const LOGIN = process.env.FOREST_USER || 'hetairoii';
const WEEKS = 53;
const TREE_MIN = 10; // commits per week needed to grow a tree
const MIN_H = 44; // shortest tree, px
const MAX_H = 160; // tallest tree, px

const W = 880;
const H = 372;
const STEP = 16;
const X0 = 18;
const GROUND = 304;

const DAY = 86400000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------- data ----------

const MOCK = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,13,7,0,14,0,0,0,0,0,0,0,0,0,0,0,17,0,10,2,94,0,27,60,7,26,4,10,0,0,0,15,24,1,34,32,0];

const weekStart = (d) => {
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return t - new Date(t).getUTCDay() * DAY;
};

async function gql(query, token) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'commit-forest' },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GraphQL failed: ${JSON.stringify(json.errors || json)}`);
  return json.data;
}

async function fetchWeeks(token) {
  const first = weekStart(new Date()) - (WEEKS - 1) * 7 * DAY;
  const end = Date.now();
  const span = (end - first) / 4;
  // Four windows keep each repo under the 100-node page limit (<= ~92 active days each).
  const windows = [0, 1, 2, 3].map((i) => {
    const from = new Date(first + i * span).toISOString();
    const to = new Date(i === 3 ? end : first + (i + 1) * span - 1000).toISOString();
    return `w${i}: contributionsCollection(from: "${from}", to: "${to}") {
      commitContributionsByRepository(maxRepositories: 100) {
        contributions(first: 100) { pageInfo { hasNextPage } nodes { occurredAt commitCount } }
      }
    }`;
  });
  const data = await gql(`query { user(login: "${LOGIN}") { ${windows.join('\n')} } }`, token);
  const counts = new Array(WEEKS).fill(0);
  for (const key of Object.keys(data.user)) {
    for (const repo of data.user[key].commitContributionsByRepository) {
      if (repo.contributions.pageInfo.hasNextPage) {
        console.warn('warning: a repo exceeded one page of days in a window; counts may be low');
      }
      for (const n of repo.contributions.nodes) {
        const i = Math.floor((weekStart(new Date(n.occurredAt)) - first) / (7 * DAY));
        if (i >= 0 && i < WEEKS) counts[i] += n.commitCount;
      }
    }
  }
  return counts.map((commits, i) => ({ start: new Date(first + i * 7 * DAY).toISOString().slice(0, 10), commits }));
}

async function loadWeeks(args) {
  if (args.includes('--mock')) {
    const first = Date.UTC(2025, 10, 2);
    return MOCK.map((commits, i) => ({ start: new Date(first + i * 7 * DAY).toISOString().slice(0, 10), commits }));
  }
  const di = args.indexOf('--data');
  if (di >= 0) return JSON.parse(readFileSync(args[di + 1], 'utf8'));
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('Set GITHUB_TOKEN (or use --mock / --data).');
  return fetchWeeks(token);
}

// ---------- drawing helpers ----------

const r = (n) => Math.round(n * 10) / 10;

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const poly = (pts, fill, extra = '') =>
  `<polygon points="${pts.map(([x, y]) => `${r(x)},${r(y)}`).join(' ')}" fill="${fill}"${extra}/>`;

// Oblique box: (x, y) is the bottom-left corner of the front face.
function box(x, y, w, h, d, c, topStroke = '') {
  const dx = d * 0.8;
  const dy = d * 0.5;
  return [
    poly([[x, y - h], [x + w, y - h], [x + w, y], [x, y]], c.front),
    poly([[x + w, y - h], [x + w + dx, y - h - dy], [x + w + dx, y - dy], [x + w, y]], c.side),
    poly([[x, y - h], [x + dx, y - h - dy], [x + w + dx, y - h - dy], [x + w, y - h]], c.top, topStroke),
  ].join('');
}

const SOIL = { empty: { top: '#1f1c1a', front: '#161412', side: '#100e0d' }, grass: { top: '#1c6b3a', front: '#14532d', side: '#0e3d21' } };
const TRUNK = { top: '#a0642f', front: '#7c4a21', side: '#5c3517' };
const TIERS = [
  { top: '#2fa856', front: '#166534', side: '#114d28' },
  { top: '#3dc268', front: '#1a7a3e', side: '#145c2f' },
  { top: '#4ade80', front: '#1f9047', side: '#18703a' },
  { top: '#86efac', front: '#27a652', side: '#1e8441' },
];

// Low-poly scarlet macaw perched with its feet at (0, 0), ~18px tall, facing right.
function macawShapes() {
  return [
    poly([[-2.5, -2], [-5.5, 11], [-3, 13.5], [-0.5, 12], [1, -1]], '#dc2626'), // tail
    poly([[-3.4, 8], [-3, 13.5], [-0.5, 12], [-0.8, 7.5]], '#2563eb'), // tail tip
    poly([[-3.5, -5], [-1.5, -13], [2, -14], [4, -8], [2.5, 0], [-1.5, 0]], '#dc2626'), // body
    poly([[-3.2, -10.5], [-0.5, -12], [2.2, -5], [2, 0.5], [-1.2, 1.5], [-3, -3]], '#1d4ed8'), // wing
    poly([[-3.1, -6.5], [1.9, -4.2], [2.1, -1.8], [-3.2, -4.2]], '#facc15'), // yellow band
    poly([[-1.5, -14.5], [1.5, -17.5], [4.8, -16], [4.5, -12.5], [1.5, -11.5]], '#ef4444'), // head
    poly([[3.2, -15.5], [4.6, -15.8], [4.4, -13.4], [3, -13.8]], '#fafafa'), // face patch
    poly([[4.5, -16.4], [8.2, -15], [6.4, -12.3], [4.2, -13.6]], '#e7e5e4'), // beak
    `<circle cx="4.1" cy="-15.1" r="0.7" fill="#09090b"/>`,
    poly([[-0.4, 0], [0.4, 0], [0.4, 1.8], [-0.4, 1.8]], '#44403c'), // foot
  ].join('');
}

const macaw = (x, y, s, flip) =>
  `<g transform="translate(${r(x)} ${r(y)}) scale(${flip ? -s : s} ${s})">${macawShapes()}</g>`;

function tileSvg(x, kind) {
  const c = kind === 'empty' ? SOIL.empty : SOIL.grass;
  return box(x, GROUND, 13, 6, 8, c);
}

function treeSvg(cx, base, t, rnd) {
  const total = MIN_H + (MAX_H - MIN_H) * t;
  const tiers = t < 0.34 ? 2 : t < 0.62 ? 3 : 4;
  const trunkH = Math.max(7, total * 0.2);
  const canopy = total - trunkH;
  const tierH = canopy / tiers;
  const widest = 12 + 7 * t;
  let out = box(cx - 1.8 - 1.2, base, 3.6, trunkH, 3, TRUNK);
  for (let i = 0; i < tiers; i++) {
    const w = widest - (i * (widest - 7)) / (tiers - 1) + (rnd() - 0.5) * 0.8;
    const d = w * 0.7;
    const x = cx - w / 2 - d * 0.4;
    // tiers overlap slightly so the canopy reads as one faceted mass
    out += box(x, base - trunkH - i * tierH * 0.94, w, tierH * 1.04, d, TIERS[i], ' stroke="#f97316" stroke-opacity="0.28" stroke-width="0.5"');
  }
  return { svg: out, top: base - total - 2 };
}

// ---------- scene ----------

function render(weeks) {
  const max = Math.max(1, ...weeks.map((w) => w.commits));
  const total = weeks.reduce((a, w) => a + w.commits, 0);
  const active = weeks.filter((w) => w.commits > 0).length;
  const best = weeks.reduce((a, w) => (w.commits > a.commits ? w : a), weeks[0]);
  const fmt = (iso) => `${MONTHS[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
  const rnd = mulberry32(1337);

  let tiles = '';
  let plants = '';
  let months = '';
  weeks.forEach((wk, i) => {
    const x = X0 + i * STEP;
    const cx = x + 9.5;
    const base = GROUND - 8;
    const c = wk.commits;
    tiles += tileSvg(x, c > 0 ? 'grass' : 'empty');
    if (c <= 0) return;
    const delay = `--d:${(i * 38) | 0}ms`;
    const flip = rnd() > 0.5;
    if (c < TREE_MIN) {
      plants += `<g class="sway" style="${delay}"><g class="bird" style="${delay}">${macaw(cx, base, 1.15, flip)}</g></g>`;
    } else {
      const t = Math.sqrt(c / max);
      const tree = treeSvg(cx, base, t, rnd);
      plants += `<g class="sway" style="${delay}"><g class="grow" style="${delay}">${tree.svg}</g><g class="bird late" style="${delay}">${macaw(cx, tree.top + 3, 1.2, flip)}</g></g>`;
    }
  });
  weeks.forEach((wk, i) => {
    const prev = i > 0 ? weeks[i - 1].start.slice(5, 7) : '';
    if (i > 0 && wk.start.slice(5, 7) !== prev && +wk.start.slice(8, 10) <= 7) {
      months += `<text x="${X0 + i * STEP + 4}" y="${GROUND + 24}" class="mo">${MONTHS[+wk.start.slice(5, 7) - 1]}</text>`;
    }
  });

  const legend = `
    <g transform="translate(${X0 + 4} ${H - 22})">
      <g transform="translate(0 6)">${box(0, 0, 9, 4, 5, SOIL.empty)}</g>
      <text x="22" y="4" class="lg">no commits</text>
      <g transform="translate(112 0)"><g transform="scale(0.7)">${macawShapes()}</g></g>
      <text x="124" y="4" class="lg">1&#8211;${TREE_MIN - 1} commits</text>
      <g transform="translate(244 0)">${box(0, 4, 2.4, 4, 2, TRUNK)}${box(-3, 0, 8.4, 4, 4, TIERS[1])}${box(-1.6, -4, 5.6, 4, 3, TIERS[3])}</g>
      <text x="258" y="4" class="lg">${TREE_MIN}+ commits &#183; taller = more</text>
    </g>`;

  const desc = `Commit forest for ${LOGIN}: ${total} commits across ${active} of ${weeks.length} weeks. Each column is one week; bare ground means none, a macaw means a few, a tree means many.`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">Commit forest</title>
<desc id="d">${desc}</desc>
<defs>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#f97316" stroke-opacity="0.05"/></pattern>
  <pattern id="dots" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" fill-opacity="0.07"/></pattern>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f97316" stop-opacity="0.22"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient>
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#09090b" stop-opacity="0"/><stop offset="1" stop-color="#09090b" stop-opacity="0.9"/></linearGradient>
  <linearGradient id="ttl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9ca3af"/></linearGradient>
</defs>
<style>
  text{font-family:'Segoe UI',-apple-system,Helvetica,Arial,sans-serif}
  .mono{font-family:ui-monospace,'SFMono-Regular',Consolas,'Courier New',monospace}
  .mo{font-size:10px;fill:#71717a}
  .lg{font-size:10.5px;fill:#a1a1aa}
  .sway,.grow,.bird{transform-box:fill-box;transform-origin:50% 100%}
  .grow{animation:grow 1.1s cubic-bezier(.2,.8,.2,1) backwards;animation-delay:var(--d)}
  .sway{animation:sway 6s ease-in-out infinite alternate;animation-delay:var(--d)}
  .bird{animation:bob 4.5s ease-in-out infinite;animation-delay:var(--d)}
  .bird.late{animation:land .7s ease-out backwards,bob 4.5s ease-in-out infinite;animation-delay:calc(var(--d) + .9s),var(--d)}
  @keyframes grow{from{transform:scaleY(.04)}to{transform:scaleY(1)}}
  @keyframes sway{from{transform:rotate(-.7deg)}to{transform:rotate(.7deg)}}
  @keyframes bob{0%,82%,100%{transform:rotate(0)}88%{transform:rotate(-5deg)}94%{transform:rotate(3deg)}}
  @keyframes land{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:translateY(0)}}
  @media (prefers-reduced-motion:reduce){.sway,.grow,.bird,.bird.late{animation:none}}
</style>
<rect width="${W}" height="${H}" rx="16" fill="#09090b"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#grid)"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#dots)"/>
<ellipse cx="${W / 2}" cy="${GROUND - 40}" rx="460" ry="150" fill="url(#glow)"/>
<text x="24" y="38" class="mono" font-size="15" font-weight="700" fill="url(#ttl)">commit forest</text>
<text x="24" y="56" font-size="11.5" fill="#71717a">last 12 months &#183; one column per week</text>
<text x="${W - 24}" y="38" text-anchor="end" class="mono" font-size="13" font-weight="600" fill="#f97316">${total} commits</text>
<text x="${W - 24}" y="56" text-anchor="end" font-size="11.5" fill="#a1a1aa">${active} active weeks &#183; best week ${best.commits} (${fmt(best.start)})</text>
${tiles}
${plants}
<rect x="0" y="${GROUND + 4}" width="${W}" height="${H - GROUND - 4}" fill="url(#fade)" opacity="0.5"/>
${months}
${legend}
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="#27272a"/>
</svg>
`;
}

// ---------- main ----------

const args = process.argv.slice(2);
const oi = args.indexOf('--out');
const out = oi >= 0 ? args[oi + 1] : 'assets/macaw-forest.svg';
const weeks = await loadWeeks(args);
const svg = render(weeks);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`${out}: ${weeks.length} weeks, ${weeks.reduce((a, w) => a + w.commits, 0)} commits, ${(svg.length / 1024).toFixed(1)} KB`);
