// Flat illustrated shirts for the shirt cards: a rounded silhouette with
// coloured collar, cuffs and hem band, a big front number, a round flag
// badge, two-tone shade curves and a soft shoulder highlight.
const K = window.K4U;
let uid = 0;

function mix(hex, to, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const ch = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
}
const solid = c => (/^#[0-9a-f]{6}$/i.test(c || '') ? c : null);
const luma = hex => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

// silhouette (500 × 460 artboard); the V/crew notch is added per collar
const OUTLINE = [[120, 72], [40, 205], [88, 240], [128, 178], [132, 420], [368, 420], [372, 178], [412, 240], [460, 205], [380, 72], [305, 52]];
const pts = p => p.map(([x, y]) => `${x} ${y}`).join(' L ');

function pattern(kit, shade) {
  const p = kit.pattern || {}, c = solid((p.colors || [])[0]) || shade;
  switch (p.type) {
    case 'stripes': return [150, 210, 270, 330].map(x => `<rect x="${x}" y="0" width="30" height="460" fill="${c}"/>`).join('') +
      `<rect x="0" y="0" width="126" height="460" fill="${c}"/><rect x="374" y="0" width="126" height="460" fill="${c}"/>`;
    case 'hoops': return [130, 210, 290, 370].map(y => `<rect x="0" y="${y}" width="500" height="40" fill="${c}"/>`).join('');
    case 'sash': return `<path d="M120 80 L180 60 L380 400 L320 430 Z" fill="${c}"/>`;
    case 'halves': return `<rect x="250" y="0" width="250" height="460" fill="${c}"/>`;
    case 'band': return (p.colors || []).map((col, i) => `<rect x="0" y="${318 + i * 14}" width="500" height="14" fill="${solid(col) || '#fff'}"/>`).join('');
    case 'chevron': return (p.colors || []).map((col, i) => `<path d="M60 ${120 + i * 22} L250 ${200 + i * 22} L440 ${120 + i * 22}" fill="none" stroke="${solid(col) || c}" stroke-width="14" stroke-linejoin="round"/>`).join('');
    case 'zigzag': return [170, 260, 350].map(y => {
      let d = `M120 ${y}`;
      for (let x = 120; x < 380; x += 26) d += ` L${x + 13} ${y + 12} L${x + 26} ${y}`;
      return `<path d="${d}" fill="none" stroke="${mix(kit.base, '#ffffff', 0.35)}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
    default: return '';
  }
}

export function flatShirtSVG(kit, number) {
  const id = 'fs' + ++uid;
  const base = solid(kit.base) || '#cccccc';
  const trim = solid(kit.trim) || '#ffffff';
  const sleeve = solid(kit.sleeve) || base;
  const cuff = solid(kit.cuff) || trim;
  const light = luma(base) > 0.82;
  const shade = mix(base, '#000000', light ? 0.08 : 0.16);
  const hi = mix(base, '#ffffff', 0.55);
  const v = kit.collar === 'v';
  const notch = v ? 'L 250 108' : 'Q 250 96';
  const body = `M195 52 L ${pts(OUTLINE)} ${notch} 195 52 Z`.replace('L 250 108 195 52', 'L 250 108 L 195 52');
  const neckBack = `M195 52 Q 250 38 305 52 ${notch} 195 52 Z`.replace('L 250 108 195 52', 'L 250 108 L 195 52');
  const collar = v ? 'M195 52 L 250 108 L 305 52' : 'M195 52 Q 250 96 305 52';
  const flag = K.flagURL(kit.country, 120, 80);
  const numCol = luma(trim) > 0.85 && light ? mix(trim, '#0c1f4f', 0.9) : trim;

  return `<svg class="flatshirt" viewBox="0 0 500 460" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <mask id="m${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="500" height="460">
      <path d="${body}" fill="#fff" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>
    </mask>
    <clipPath id="b${id}"><circle cx="330" cy="200" r="27"/></clipPath>
  </defs>
  <ellipse cx="250" cy="446" rx="150" ry="10" fill="#0c1f4f" fill-opacity=".08"/>
  <path d="${neckBack}" fill="${shade}" stroke="${shade}" stroke-width="10" stroke-linejoin="round"/>
  <path d="M195 52 Q 250 38 305 52" fill="none" stroke="${mix(trim, '#000000', 0.12)}" stroke-width="14" stroke-linecap="round"/>
  ${light ? `<path d="${body}" fill="${mix(base, '#0c1f4f', 0.2)}" stroke="${mix(base, '#0c1f4f', 0.2)}" stroke-width="28" stroke-linejoin="round"/>` : ''}
  <g mask="url(#m${id})">
    <rect width="500" height="460" fill="${base}"/>
    ${pattern(kit, shade)}
    <path d="M20 60 L120 60 L132 180 L60 260 L0 230 Z" fill="${sleeve}"/>
    <path d="M480 60 L380 60 L368 180 L440 260 L500 230 Z" fill="${sleeve}"/>
    <path d="M28 196 L82 236" stroke="${cuff}" stroke-width="34" stroke-linecap="square"/>
    <path d="M472 196 L418 236" stroke="${cuff}" stroke-width="34" stroke-linecap="square"/>
    <rect x="100" y="404" width="300" height="40" fill="${trim}"/>
    <path d="M140 118 Q 150 150 138 176" fill="none" stroke="${shade}" stroke-width="10" stroke-linecap="round"/>
    <path d="M360 118 Q 350 150 362 176" fill="none" stroke="${shade}" stroke-width="10" stroke-linecap="round"/>
    ${(kit.pattern || {}).type === 'band' ? '' : `<path d="M168 346 Q 240 326 312 338" fill="none" stroke="${shade}" stroke-width="10" stroke-linecap="round"/>
    <path d="M196 372 Q 262 358 330 366" fill="none" stroke="${shade}" stroke-width="8" stroke-linecap="round"/>`}
    <path d="M334 84 C 352 70 382 74 392 92 C 402 110 386 124 370 120 C 360 136 336 132 334 116 C 318 112 318 92 334 84 Z" fill="${hi}" fill-opacity=".75"/>
  </g>
  <path d="${collar}" fill="none" stroke="${trim}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="205" y="300" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="800" font-size="118" letter-spacing="-4" fill="${numCol}">${number}</text>
  <circle cx="330" cy="200" r="31" fill="#ffffff"/>
  <image href="${flag}" x="293" y="173" width="81" height="54" preserveAspectRatio="xMidYMid slice" clip-path="url(#b${id})"/>
</svg>`;
}
