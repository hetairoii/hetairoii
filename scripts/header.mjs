// Generates assets/header.svg (profile banner). Run: node scripts/header.mjs
import { writeFileSync } from 'node:fs';
import { renderParrot } from './parrot.mjs';

const W = 880, H = 260;

// Scarlet macaw rendered from the CC0 low-poly model (see parrot.mjs), perched on a branch.
const parrot = renderParrot({ yaw: 285, pitch: 12, size: 215, cx: 705, cy: 126, prefix: 'm' });
const branch = `<g stroke-linecap="round" fill="none"><path d="M586 184Q660 192 736 183" stroke="#4a2910" stroke-width="13"/><path d="M586 181Q660 189 736 180" stroke="#7c4a21" stroke-width="8"/><path d="M594 179Q660 186 728 178" stroke="#a0642f" stroke-width="2.5" stroke-opacity=".7"/></g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t">
<title id="t">Matias Silveira (hetairoii), Full Stack Developer</title>
<defs>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#f97316" stroke-opacity="0.06"/></pattern>
  <pattern id="dots" width="25" height="25" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#fff" fill-opacity="0.12"/></pattern>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f97316" stop-opacity=".30"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient>
  <linearGradient id="name" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#9ca3af"/></linearGradient>
  <linearGradient id="rule" gradientUnits="userSpaceOnUse" x1="58" y1="0" x2="440" y2="0"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#dc2626"/></linearGradient>
</defs>
<style>
  ${parrot.css}
  text{font-family:'Segoe UI',-apple-system,Helvetica,Arial,sans-serif}
  .mono{font-family:ui-monospace,'SFMono-Regular',Consolas,'Courier New',monospace}
  .rule{stroke-dasharray:460;stroke-dashoffset:460;animation:draw 1.1s .4s ease-out forwards}
  .rise{animation:rise .9s ease-out backwards}
  .bob{animation:bob 4s ease-in-out infinite}
  .bird{transform-box:fill-box;transform-origin:50% 100%;animation:tilt 5s ease-in-out infinite}
  @keyframes bob{50%{transform:translateY(-3px)}}
  @keyframes tilt{0%,80%,100%{transform:rotate(0)}88%{transform:rotate(-6deg)}94%{transform:rotate(3deg)}}
  .perch{animation:rise .9s 1.3s ease-out backwards}
  @keyframes draw{to{stroke-dashoffset:0}}
  @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.rule{animation:none;stroke-dashoffset:0}.rise,.bob{animation:none}}
</style>
<rect width="${W}" height="${H}" rx="16" fill="#000"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#grid)"/>
<rect width="${W}" height="${H}" rx="16" fill="url(#dots)"/>
<ellipse cx="170" cy="20" rx="210" ry="120" fill="url(#glow)"/>
<ellipse cx="670" cy="150" rx="230" ry="120" fill="url(#glow)" opacity=".55"/>
<g class="bob">${branch}${parrot.body}</g>
<text class="rise" x="56" y="116" font-size="56" font-weight="700" fill="url(#name)" style="animation-delay:.1s">Matias Silveira</text>
<line class="rule" x1="58" y1="136" x2="440" y2="136" stroke="url(#rule)" stroke-width="2.5" stroke-linecap="round"/>
<text class="rise mono" x="56" y="180" font-size="30" font-weight="600" fill="#f97316" style="animation-delay:.7s">hetairoii</text>
<text class="rise mono" x="56" y="214" font-size="15" fill="#9ca3af" style="animation-delay:1s">&lt; Full Stack Developer /&gt;</text>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="#27272a"/>
</svg>
`;
writeFileSync('assets/header.svg', svg);
console.log(`assets/header.svg ${(svg.length / 1024).toFixed(1)} KB`);
