// Renders scripts/models/low-poly-parrot.glb (CC0, grab3d.com) to flat-shaded SVG polygons.
// Pure Node, no dependencies. Usage from other scripts: renderParrot({ yaw, pitch, size, cx, cy }).
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const GLB = fileURLToPath(new URL('./models/low-poly-parrot.glb', import.meta.url));

function loadGlb() {
  const b = readFileSync(GLB);
  const jl = b.readUInt32LE(12);
  const j = JSON.parse(b.toString('utf8', 20, 20 + jl));
  const bin = 20 + jl + 8;
  const view = (i) => { const v = j.bufferViews[i]; return b.subarray(bin + (v.byteOffset || 0), bin + (v.byteOffset || 0) + v.byteLength); };
  const acc = (i, n, T) => {
    const a = j.accessors[i], v = j.bufferViews[a.bufferView];
    const off = bin + (v.byteOffset || 0) + (a.byteOffset || 0);
    return new T(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + a.count * n * T.BYTES_PER_ELEMENT));
  };
  const prim = j.meshes[0].primitives[0];
  return {
    pos: acc(prim.attributes.POSITION, 3, Float32Array),
    uv: acc(prim.attributes.TEXCOORD_0, 2, Float32Array),
    idx: acc(prim.indices, 1, Uint16Array),
    tex: decodePng(view(j.images[0].bufferView)),
  };
}

// minimal 8-bit RGB/RGBA non-interlaced PNG decoder (the palette texture is 24x24 RGB)
function decodePng(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), ct = buf[25];
  const bpp = ct === 6 ? 4 : 3;
  let o = 8; const parts = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8);
    if (type === 'IDAT') parts.push(buf.subarray(o + 8, o + 8 + len));
    o += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? out[y * stride + x - bpp] : 0;
      const up = y ? out[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = up; else if (f === 3) p = (a + up) >> 1;
      else if (f === 4) { const pa = Math.abs(up - c), pb = Math.abs(a - c), pc = Math.abs(a + up - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? up : c; }
      out[y * stride + x] = (v + p) & 255;
    }
  }
  return { w, h, bpp, data: out };
}

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

export function renderParrot({ yaw = 0, pitch = 18, size = 200, cx = 0, cy = 0, light = [-0.5, 0.8, 0.6], prefix = 'p' } = {}) {
  const { pos, uv, idx, tex } = loadGlb();
  const ya = (yaw * Math.PI) / 180, pa = (pitch * Math.PI) / 180;
  const cyw = Math.cos(ya), syw = Math.sin(ya), cp = Math.cos(pa), sp = Math.sin(pa);
  // rotate about Y (yaw), then X (pitch); camera looks down -z so larger z = nearer
  const tf = (x, y, z) => {
    const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  };
  const n = pos.length / 3, P = new Array(n);
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let i = 0; i < n; i++) {
    const q = tf(pos[3 * i], pos[3 * i + 1] - 0.4, pos[3 * i + 2]);
    P[i] = q;
    minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]);
  }
  const k = size / Math.max(maxX - minX, maxY - minY);
  const ox = cx - ((minX + maxX) / 2) * k, oy = cy + ((minY + maxY) / 2) * k;
  const L = (() => { const m = Math.hypot(...light); return light.map((v) => v / m); })();
  const tris = [];
  for (let t = 0; t < idx.length; t += 3) {
    const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]].map((i) => P[i]);
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const m = Math.hypot(...nrm) || 1;
    if (nrm[2] / m <= 0) continue; // back-facing
    const d = Math.max(0, (nrm[0] * L[0] + nrm[1] * L[1] + nrm[2] * L[2]) / m);
    const ids = [idx[t], idx[t + 1], idx[t + 2]];
    const tu = (uv[2 * ids[0]] + uv[2 * ids[1]] + uv[2 * ids[2]]) / 3, tv = (uv[2 * ids[0] + 1] + uv[2 * ids[1] + 1] + uv[2 * ids[2] + 1]) / 3;
    const px = Math.min(tex.w - 1, Math.max(0, Math.floor(tu * tex.w))), py = Math.min(tex.h - 1, Math.max(0, Math.floor(tv * tex.h)));
    const o = (py * tex.w + px) * tex.bpp, s = 0.5 + 0.62 * (Math.round(d * 7) / 7); // quantised so colours repeat (smaller SVG)
    tris.push({ z: (a[2] + b[2] + c[2]) / 3, col: hex(tex.data[o] * s, tex.data[o + 1] * s, tex.data[o + 2] * s), pts: [a, b, c] });
  }
  tris.sort((p, q) => p.z - q.z);
  const f = (v) => Math.round(v * 10) / 10;
  const cls = new Map();
  const body = tris.map((t) => {
    if (!cls.has(t.col)) cls.set(t.col, cls.size);
    return `<polygon class="${prefix}${cls.get(t.col).toString(36)}" points="${t.pts.map((q) => `${f(ox + q[0] * k)},${f(oy - q[1] * k)}`).join(' ')}"/>`;
  }).join('');
  const css = [...cls].map(([c, i]) => `.${prefix}${i.toString(36)}{fill:${c};stroke:${c}}`).join('');
  return { css: css + `[class^="${prefix}"]{stroke-width:.5;stroke-linejoin:round}`, body };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // contact sheet of several yaws for picking an angle: node scripts/parrot.mjs out.svg
  const out = process.argv[2];
  const yaws = [0, 60, 120, 180, 240, 300];
  const body = yaws.map((y, i) => { const r = renderParrot({ yaw: y, size: 190, cx: i * 220 + 110, cy: 130, prefix: 'q' + i }); return `<style>${r.css}</style><g><rect x="${i * 220}" y="0" width="220" height="240" fill="#09090b"/><text x="${i * 220 + 8}" y="16" fill="#fff" font-size="12">yaw ${y}</text>${r.body}</g>`; }).join('');
  (await import('node:fs')).writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1320 240" width="1320" height="240">${body}</svg>`);
  console.log('wrote', out);
}
