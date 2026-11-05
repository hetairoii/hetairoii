// Generates assets/project-*.svg featured-project cards. Run: node scripts/cards.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const PROJECTS = [
  {
    file: 'assets/project-arrow-con-mango.svg',
    image: 'assets/arrowconmango-screenshot.jpeg',
    name: 'Arrow con Mango',
    kind: 'Team project  ·  Mobile game + API',
    lines: [
      'Arrow-maze puzzle game: slide arrows off the board',
      'without collisions. Campaign, Survival, 3D Cube and',
      'Creative modes. Flutter client; NestJS API with JWT auth,',
      'synced progress, global leaderboard and remote levels,',
      'built with Clean and Hexagonal Architecture.',
    ],
    tech: ['Flutter', 'NestJS', 'TypeORM', 'PostgreSQL', 'JWT'],
  },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const W = 880, H = 300, IMG = 340;

for (const p of PROJECTS) {
  const b64 = readFileSync(p.image).toString('base64');
  let x = 0;
  const chips = p.tech.map((t) => {
    const w = t.length * 7.4 + 20, out = `<g transform="translate(${x} 0)"><rect width="${w}" height="24" rx="6" fill="#27272a" stroke="#3f3f46"/><text x="${w / 2}" y="16" text-anchor="middle" class="mono" font-size="11.5" fill="#fb923c">${esc(t)}</text></g>`;
    x += w + 8;
    return out;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">${esc(p.name)}</title>
<defs>
  <clipPath id="c"><path d="M16 0H${IMG}V${H}H16A16 16 0 0 1 0 ${H - 16}V16A16 16 0 0 1 16 0Z"/></clipPath>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#f97316" stroke-opacity="0.05"/></pattern>
  <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset=".6" stop-color="#18181b" stop-opacity="0"/><stop offset="1" stop-color="#18181b"/></linearGradient>
  <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#dc2626"/></linearGradient>
</defs>
<style>
  text{font-family:'Segoe UI',-apple-system,Helvetica,Arial,sans-serif}
  .mono{font-family:ui-monospace,'SFMono-Regular',Consolas,'Courier New',monospace}
</style>
<rect width="${W}" height="${H}" rx="16" fill="#18181b"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#grid)"/>
<g clip-path="url(#c)"><image xlink:href="data:image/jpeg;base64,${b64}" x="0" y="0" width="${IMG}" height="${H}" preserveAspectRatio="xMidYMid slice"/><rect width="${IMG}" height="${H}" fill="url(#shade)"/></g>
<text x="${IMG + 36}" y="52" class="mono" font-size="11.5" fill="#f97316" letter-spacing="1.5">FEATURED</text>
<text x="${IMG + 36}" y="86" font-size="28" font-weight="700" fill="#fff">${esc(p.name)}</text>
<rect x="${IMG + 36}" y="98" width="56" height="2.5" rx="1.2" fill="url(#rule)"/>
<text x="${IMG + 36}" y="124" font-size="12.5" fill="#71717a">${esc(p.kind)}</text>
${p.lines.map((l, i) => `<text x="${IMG + 36}" y="${156 + i * 20}" font-size="13.5" fill="#a1a1aa">${esc(l)}</text>`).join('\n')}
<g transform="translate(${IMG + 36} 254)">${chips}</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="#27272a"/>
</svg>
`;
  writeFileSync(p.file, svg);
  console.log(`${p.file} ${(svg.length / 1024).toFixed(1)} KB`);
}
