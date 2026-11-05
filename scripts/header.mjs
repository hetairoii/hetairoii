// Generates assets/header.svg (profile banner). Run: node scripts/header.mjs
import { writeFileSync } from 'node:fs';

const W = 880, H = 260, CX = 716, CY = 130, R = 88;
const p = (pts, f) => `<polygon points="${pts.map((q) => q.join(',')).join(' ')}" fill="${f}"/>`;
const macaw = [
  p([[-2.5, -2], [-5.5, 11], [-3, 13.5], [-0.5, 12], [1, -1]], '#dc2626'),
  p([[-3.4, 8], [-3, 13.5], [-0.5, 12], [-0.8, 7.5]], '#2563eb'),
  p([[-3.5, -5], [-1.5, -13], [2, -14], [4, -8], [2.5, 0], [-1.5, 0]], '#dc2626'),
  p([[-3.2, -10.5], [-0.5, -12], [2.2, -5], [2, 0.5], [-1.2, 1.5], [-3, -3]], '#1d4ed8'),
  p([[-3.1, -6.5], [1.9, -4.2], [2.1, -1.8], [-3.2, -4.2]], '#facc15'),
  p([[-1.5, -14.5], [1.5, -17.5], [4.8, -16], [4.5, -12.5], [1.5, -11.5]], '#ef4444'),
  p([[3.2, -15.5], [4.6, -15.8], [4.4, -13.4], [3, -13.8]], '#fafafa'),
  p([[4.5, -16.4], [8.2, -15], [6.4, -12.3], [4.2, -13.6]], '#e7e5e4'),
  '<circle cx="4.1" cy="-15.1" r="0.7" fill="#09090b"/>',
].join('');

const meridians = [0, 1, 2, 3, 4, 5].map((i) => {
  const dur = 12, begin = -(i * dur) / 12;
  return `<ellipse cx="${CX}" cy="${CY}" rx="${R}" ry="${R}" fill="none" stroke="#a0a0a0" stroke-opacity=".55" stroke-width="1"><animate attributeName="rx" values="${R};0;${R}" keyTimes="0;.5;1" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></ellipse>`;
}).join('');
const parallels = [-60, -30, 0, 30, 60].map((lat) => {
  const a = (lat * Math.PI) / 180, rx = R * Math.cos(a);
  return `<ellipse cx="${CX}" cy="${(CY + R * Math.sin(a)).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * 0.18).toFixed(1)}" fill="none" stroke="#a0a0a0" stroke-opacity=".4"/>`;
}).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">Matias Silveira (hetairoii), Full Stack Developer</title>
<defs>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#f97316" stroke-opacity="0.06"/></pattern>
  <pattern id="dots" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" fill-opacity="0.12"/></pattern>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f97316" stop-opacity=".30"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient>
  <linearGradient id="name" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9ca3af"/></linearGradient>
  <linearGradient id="rule" gradientUnits="userSpaceOnUse" x1="58" y1="0" x2="500" y2="0"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#dc2626"/></linearGradient>
</defs>
<style>
  text{font-family:'Segoe UI',-apple-system,Helvetica,Arial,sans-serif}
  .mono{font-family:ui-monospace,'SFMono-Regular',Consolas,'Courier New',monospace}
  .rule{stroke-dasharray:460;stroke-dashoffset:460;animation:draw 1.1s .4s ease-out forwards}
  .rise{animation:rise .9s ease-out backwards}
  .perch{animation:rise .9s 1.3s ease-out backwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.rule{animation:none;stroke-dashoffset:0}.rise,.perch{animation:none}}
</style>
<rect width="${W}" height="${H}" rx="16" fill="#000"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#grid)"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#dots)"/>
<ellipse cx="170" cy="20" rx="210" ry="120" fill="url(#glow)"/>
<ellipse cx="${CX}" cy="${CY}" rx="170" ry="130" fill="url(#glow)" opacity=".55"/>
<g>${meridians}${parallels}</g>
<text class="rise" x="56" y="116" font-size="56" font-weight="700" fill="url(#name)" style="animation-delay:.1s">Matias Silveira</text>
<line class="rule" x1="58" y1="136" x2="500" y2="136" stroke="url(#rule)" stroke-width="2.5" stroke-linecap="round"/>
<text class="rise mono" x="56" y="180" font-size="30" font-weight="600" fill="#f97316" style="animation-delay:.7s">hetairoii</text>
<text class="rise mono" x="56" y="214" font-size="15" fill="#9ca3af" style="animation-delay:1s">&lt; Full Stack Developer /&gt;</text>
<g class="perch"><g transform="translate(472 135.5) scale(1.7)">${macaw}</g></g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="#27272a"/>
</svg>
`;
writeFileSync('assets/header.svg', svg);
console.log(`assets/header.svg ${(svg.length / 1024).toFixed(1)} KB`);
