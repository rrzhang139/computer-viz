#!/usr/bin/env node
// Render wire_sketches/layerN_<name>.md → wire_sketches/layerN_<name>.svg
//
// Usage:
//   node wire_sketches/render.mjs <layer.md> [<layer.md> ...]
//   node wire_sketches/render.mjs --all

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLayer } from './lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const files = args.includes('--all')
  ? fs.readdirSync(__dirname).filter((f) => /^layer\d+_.+\.md$/.test(f)).sort().map((f) => path.join(__dirname, f))
  : args.map((a) => path.resolve(a));

if (files.length === 0) {
  console.error('usage: node wire_sketches/render.mjs [--all | <file.md> ...]');
  process.exit(1);
}

for (const file of files) {
  const layer = loadLayer(file);
  const svg = renderSvg(layer);
  const outPath = file.replace(/\.md$/, '.svg');
  fs.writeFileSync(outPath, svg);
  console.log('wrote ' + path.relative(process.cwd(), outPath));
}

function renderSvg({ bounds, ext, children, allNodes, wires, supplyRoutes }) {
  const marginFrac = 0.12;
  const W = bounds.maxX - bounds.minX;
  const H = bounds.maxY - bounds.minY;
  const mx = W * marginFrac;
  const my = H * marginFrac;
  const vx = bounds.minX - mx;
  const vy = bounds.minY - my;
  const vw = W + 2 * mx;
  const vh = H + 2 * my;
  const flipY = (y) => bounds.minY + bounds.maxY - y;

  const pxW = 900;
  const pxH = Math.round((pxW * vh) / vw);

  const elems = [];

  elems.push(
    '<rect x="' + bounds.minX + '" y="' + bounds.minY + '" width="' + W + '" height="' + H +
    '" fill="#f7efde" stroke="#c5b69a" stroke-width="0.04"/>',
  );

  if (bounds.minX <= 0 && bounds.maxX >= 0) {
    elems.push(
      '<line x1="0" y1="' + flipY(bounds.minY) + '" x2="0" y2="' + flipY(bounds.maxY) +
      '" stroke="#d8c8a8" stroke-width="0.02" stroke-dasharray="0.1,0.1"/>',
    );
  }
  if (bounds.minY <= 0 && bounds.maxY >= 0) {
    elems.push(
      '<line x1="' + bounds.minX + '" y1="' + flipY(0) + '" x2="' + bounds.maxX + '" y2="' + flipY(0) +
      '" stroke="#d8c8a8" stroke-width="0.02" stroke-dasharray="0.1,0.1"/>',
    );
  }

  const tick = 0.25;
  elems.push('<text x="' + bounds.minX + '" y="' + (flipY(bounds.minY) + my * 0.4) + '" font-size="' + tick + '" fill="#8a7864" font-family="serif">LEFT (data in)</text>');
  elems.push('<text x="' + bounds.maxX + '" y="' + (flipY(bounds.minY) + my * 0.4) + '" font-size="' + tick + '" fill="#8a7864" font-family="serif" text-anchor="end">RIGHT (data out)</text>');
  elems.push('<text x="' + (bounds.minX + bounds.maxX) / 2 + '" y="' + (flipY(bounds.maxY) - my * 0.25) + '" font-size="' + tick + '" fill="#8a7864" font-family="serif" text-anchor="middle">TOP (control)</text>');
  elems.push('<text x="' + (bounds.minX + bounds.maxX) / 2 + '" y="' + (flipY(bounds.minY) + my * 0.7) + '" font-size="' + tick + '" fill="#8a7864" font-family="serif" text-anchor="middle">BOTTOM (power/ground)</text>');

  for (const c of children) {
    const x = c.cx - c.w / 2;
    const cySvg = flipY(c.cy);
    const y = cySvg - c.h / 2;
    elems.push('<rect x="' + x + '" y="' + y + '" width="' + c.w + '" height="' + c.h + '" fill="#fff8e7" stroke="#7a6147" stroke-width="0.04" stroke-dasharray="0.18,0.12"/>');
    elems.push('<text x="' + c.cx + '" y="' + cySvg + '" text-anchor="middle" dominant-baseline="middle" font-size="0.28" fill="#7a6147" font-family="serif" font-weight="bold">' + escapeXml(c.id) + '</text>');
    if (c.layer) {
      elems.push('<text x="' + c.cx + '" y="' + (cySvg + c.h / 2 - 0.05) + '" text-anchor="middle" dominant-baseline="alphabetic" font-size="0.16" fill="#a89880" font-family="serif" font-style="italic">' + escapeXml(c.layer) + '</text>');
    }
  }

  for (const w of wires) {
    const fromNode = allNodes.get(w.from);
    const toNode = allNodes.get(w.to);
    if (!fromNode || !toNode) {
      console.warn('  skip wire ' + w.from + ' → ' + w.to + ' (unknown node)');
      continue;
    }
    const pts = [fromNode, ...w.via, toNode].map((p) => ({ x: p.x, y: flipY(p.y) }));
    const d = pts.map((p) => p.x.toFixed(3) + ',' + p.y.toFixed(3)).join(' ');
    const color = netColor(w.net);
    elems.push('<polyline points="' + d + '" fill="none" stroke="' + color + '" stroke-width="0.06" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>');
  }

  for (const route of supplyRoutes) {
    const color = route.kind === 'Vdd' ? '#3a7d34' : '#3b2718';
    const d = route.pts.map(([x, y]) => x.toFixed(3) + ',' + flipY(y).toFixed(3)).join(' ');
    elems.push('<polyline points="' + d + '" fill="none" stroke="' + color + '" stroke-width="0.05" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="0.18,0.1" opacity="0.7"/>');
    const last = route.pts[route.pts.length - 1];
    elems.push('<circle cx="' + last[0] + '" cy="' + flipY(last[1]) + '" r="0.07" fill="' + color + '" opacity="0.8"/>');
  }

  for (const e of ext) {
    if (e.key === 'Vdd' || e.key === 'GND') {
      const railY = flipY(e.y);
      const color = e.key === 'Vdd' ? '#3a7d34' : '#3b2718';
      elems.push('<line x1="' + bounds.minX + '" y1="' + railY + '" x2="' + bounds.maxX + '" y2="' + railY + '" stroke="' + color + '" stroke-width="0.10" stroke-linecap="round"/>');
      const dy = e.edge === 'TOP' ? -0.25 : 0.45;
      elems.push('<text x="' + bounds.minX + '" y="' + (railY + dy) + '" text-anchor="start" dominant-baseline="middle" font-size="0.30" fill="' + color + '" font-family="serif" font-weight="700">' + escapeXml(e.key) + '</text>');
      elems.push('<text x="' + bounds.maxX + '" y="' + (railY + dy) + '" text-anchor="end" dominant-baseline="middle" font-size="0.20" fill="#7a6147" font-family="monospace">y=' + e.y + '</text>');
      continue;
    }
    const sx = e.x;
    const sy = flipY(e.y);
    elems.push('<circle cx="' + sx + '" cy="' + sy + '" r="0.18" fill="#b8470d" stroke="#3b2718" stroke-width="0.04"/>');
    const dx = e.edge === 'LEFT' ? -0.35 : e.edge === 'RIGHT' ? 0.35 : 0;
    const dy = e.edge === 'TOP' ? -0.35 : e.edge === 'BOTTOM' ? 0.45 : 0;
    const anchor = e.edge === 'LEFT' ? 'end' : e.edge === 'RIGHT' ? 'start' : 'middle';
    elems.push('<text x="' + (sx + dx) + '" y="' + (sy + dy) + '" text-anchor="' + anchor + '" dominant-baseline="middle" font-size="0.26" fill="#3b2718" font-family="serif" font-weight="600">' + escapeXml(e.key) + '</text>');
    elems.push('<text x="' + (sx + dx) + '" y="' + (sy + dy + 0.28) + '" text-anchor="' + anchor + '" dominant-baseline="middle" font-size="0.18" fill="#7a6147" font-family="monospace">(' + e.x + ', ' + e.y + ')</text>');
  }

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vx + ' ' + vy + ' ' + vw + ' ' + vh +
    '" width="' + pxW + '" height="' + pxH + '">\n' +
    elems.join('\n') + '\n</svg>\n';
}

function netColor(net) {
  switch (net) {
    case 'Vdd':                              return '#3a7d34';
    case 'GND':                              return '#3b2718';
    case 'A': case 'B': case 'D': case 'EN': return '#5577aa';
    case 'Y': case 'Q': case 'Q_bar': case 'Qbar': return '#3a7d34';
    case 'S_bar': case 'R_bar': case 'D_bar': return '#a26a3e';
    case 'mid':                              return '#7a6147';
    default:                                 return '#7a6147';
  }
}

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[c]));
}
