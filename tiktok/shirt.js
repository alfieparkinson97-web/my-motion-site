// Detailed shirt artwork for the video. Starts from the storefront's own
// generated jersey (assets/js/jersey.js) and layers on fabric knit, side mesh
// panels, folds and lighting, stitched seams, collar ribbing, a glossy
// stitched crest, a globe sleeve patch, woven tags and a chrome hanger.
const K = window.K4U;

function shade(hex, amt) {
  // lighten (amt > 0) or darken (amt < 0) a #rrggbb colour
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = s => {
    const c = (n >> s) & 255;
    return Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt));
  };
  return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('');
}
const isHex = c => /^#[0-9a-f]{6}$/i.test(c || '');
const luma = hex => {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const SHIRT = 'M160 36 C 178 60 222 60 240 36 L 298 50 L 374 112 L 342 170 L 308 150 L 306 410 Q 200 424 94 410 L 92 150 L 58 170 L 26 112 L 102 50 Z';

export function detailedShirtSVG(kit) {
  let s = K.jerseySVG(kit);
  const id = s.match(/clipPath id="c(j\d+)"/)[1];
  const base = isHex(kit.base) ? kit.base : '#888888';
  const trim = isHex(kit.trim) ? kit.trim : '#ffffff';
  const light = luma(base) > 0.6;
  const stitch = light ? 'rgba(0,0,0,.28)' : 'rgba(255,255,255,.34)';
  const panel = shade(base, light ? -0.1 : 0.12);
  const neck = kit.collar === 'v' ? 'M160 36 L 200 86 L 240 36' : 'M160 36 C 178 60 222 60 240 36';

  const defs = `
  <pattern id="k${id}" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="5" height="2.5" fill="#fff" fill-opacity=".045"/><rect y="2.5" width="5" height="2.5" fill="#000" fill-opacity=".045"/>
  </pattern>
  <pattern id="p${id}" width="5.5" height="5.5" patternUnits="userSpaceOnUse">
    <circle cx="2.75" cy="2.75" r="1.15" fill="#000" fill-opacity=".32"/>
  </pattern>
  <radialGradient id="h${id}" cx="150" cy="130" r="230" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="g2${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".5" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/>
  </linearGradient>
  <radialGradient id="gl${id}" cx=".35" cy=".3" r=".8">
    <stop offset="0" stop-color="#EAF8FF"/><stop offset=".45" stop-color="#4C9BFF"/><stop offset="1" stop-color="#0c2a70"/>
  </radialGradient>
  <linearGradient id="ch${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#EAF8FF"/><stop offset=".35" stop-color="#9ED8FF"/><stop offset=".6" stop-color="#2E6BFF"/><stop offset="1" stop-color="#A8E0FF"/>
  </linearGradient>
  <filter id="b${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="b2${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>`;

  const fold = (d, w = 12) =>
    `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".24" stroke-width="${w}" stroke-linecap="round" filter="url(#b${id})"/>` +
    `<path d="${d}" transform="translate(-5 -2)" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="${w * 0.6}" stroke-linecap="round" filter="url(#b${id})"/>`;

  const clipped = `
  <g clip-path="url(#c${id})">
    <rect width="400" height="440" fill="url(#k${id})"/>
    <path d="M92 150 L114 156 L116 412 L94 410 Z" fill="${panel}"/><path d="M92 150 L114 156 L116 412 L94 410 Z" fill="url(#p${id})"/>
    <path d="M308 150 L286 156 L284 412 L306 410 Z" fill="${panel}"/><path d="M308 150 L286 156 L284 412 L306 410 Z" fill="url(#p${id})"/>
    ${fold('M112 172 Q 158 206 176 262')}
    ${fold('M290 176 Q 246 212 232 264')}
    ${fold('M150 300 Q 162 356 148 412', 14)}
    ${fold('M252 292 Q 240 352 256 412', 14)}
    ${fold('M200 330 Q 214 372 204 414', 10)}
    ${fold('M64 122 Q 82 136 78 160', 8)}
    ${fold('M336 122 Q 318 138 322 160', 8)}
    <rect width="400" height="440" fill="url(#h${id})"/>
    <path d="${SHIRT}" fill="none" stroke="#000" stroke-opacity=".38" stroke-width="26" filter="url(#b${id})"/>
  </g>`;

  const dash = `fill="none" stroke="${stitch}" stroke-width="1.3" stroke-dasharray="3.2 2.6" stroke-linecap="round"`;
  const seams = `
  <path d="M106 52 Q 100 98 95 150" ${dash}/><path d="M294 52 Q 300 98 305 150" ${dash}/>
  <path d="M97 154 L 98 405" ${dash}/><path d="M303 154 L 302 405" ${dash}/>
  <path d="M117 158 L 119 408" ${dash}/><path d="M283 158 L 281 408" ${dash}/>
  <path d="M98 398 Q 200 411 302 398" ${dash}/><path d="M98 404 Q 200 417 302 404" ${dash}/>
  <path d="M329 160 L 360 104" ${dash}/><path d="M71 160 L 40 104" ${dash}/>
  <path d="${neck}" transform="translate(0 6)" fill="none" stroke="${trim}" stroke-opacity=".55" stroke-width="1.2"/>
  <path d="${neck}" transform="translate(0 9)" fill="none" stroke="${stitch}" stroke-width="1.1" stroke-dasharray="2.6 2.2"/>`;

  // crest gloss + stitched edge, sleeve globe patch, woven tags
  const crest = 'M236 104 L268 104 L268 126 Q268 139 252 147 Q236 139 236 126 Z';
  const extras = `
  <path d="${crest}" fill="url(#g2${id})" fill-opacity=".55"/>
  <path d="${crest}" transform="translate(252 124) scale(.86) translate(-252 -124)" fill="none" stroke="${base}" stroke-opacity=".6" stroke-width="1" stroke-dasharray="2 1.6"/>
  <g transform="translate(338 128) rotate(38)">
    <circle r="15" fill="url(#ch${id})"/><circle r="12" fill="url(#gl${id})"/>
    <ellipse rx="5" ry="12" fill="none" stroke="#EAF8FF" stroke-opacity=".7" stroke-width=".9"/>
    <path d="M-12 0 H12 M-10.4 -6 H10.4 M-10.4 6 H10.4" stroke="#EAF8FF" stroke-opacity=".7" stroke-width=".9"/>
    <circle r="13.5" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1" stroke-dasharray="1.6 1.4"/>
  </g>
  <rect x="104" y="382" width="22" height="10" rx="1.5" fill="#f4f6fa" fill-opacity=".92"/>
  <path d="M107 385.5 H123 M107 388.5 H119" stroke="#0c1f4f" stroke-width="1"/>
  <rect x="192" y="${kit.collar === 'v' ? 46 : 44}" width="16" height="7" rx="1" fill="${trim}" fill-opacity=".85"/>`;

  const hanger = `
  <g filter="url(#b2${id})" opacity=".55"><path d="M200 38 L200 14 Q 200 -6 216 -7 Q 231 -7 231 8" fill="none" stroke="#000" stroke-width="7"/></g>
  <path d="M200 38 L200 14 Q 200 -6 216 -7 Q 231 -7 231 8" fill="none" stroke="url(#ch${id})" stroke-width="5" stroke-linecap="round"/>
  <path d="M199 30 L199 15 Q 199 -2 212 -4" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="1.4" stroke-linecap="round"/>`;

  s = s.replace('<defs>', '<defs>' + defs);
  s = s.replace('viewBox="0 0 400 440"', 'viewBox="0 -24 400 464"');
  s = s.replace(/<\/svg>$/, clipped + seams + extras + '</svg>');
  // hanger hook sits behind the collar
  s = s.replace('</defs>', '</defs>' + hanger);
  return s;
}
