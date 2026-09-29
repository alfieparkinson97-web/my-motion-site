/* Kits4U — generated jersey artwork.
   K4U.jerseySVG(kit, { view: 'front'|'back'|'detail', name, number })
   returns an SVG string. Every id inside is unique per call so dozens of
   shirts with different colours can share a page. */
(function () {
  'use strict';
  var K = (window.K4U = window.K4U || {});
  var uid = 0;

  var NECK_FRONT = { crew: 'C 178 60 222 60 240 36', v: 'L 200 86 L 240 36', polo: 'C 178 60 222 60 240 36' };
  var NECK_BACK = 'C 180 46 220 46 240 36';
  function body(neck) {
    return 'M160 36 ' + neck + ' L 298 50 L 374 112 L 342 170 L 308 150 L 306 410 Q 200 424 94 410 L 92 150 L 58 170 L 26 112 L 102 50 Z';
  }
  var SLEEVE_R = 'M296 49 L374 112 L342 170 L308 150 Q 302 96 296 49 Z';
  var SLEEVE_L = 'M104 49 L26 112 L58 170 L92 150 Q 98 96 104 49 Z';
  var CUFF_R = 'M374 112 L342 170 L332.4 164.7 L364.4 106.7 Z';
  var CUFF_L = 'M26 112 L58 170 L67.6 164.7 L35.6 106.7 Z';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function star(cx, cy, r) {
    var p = [];
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      p.push((cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2));
    }
    return 'M' + p.join(' L') + ' Z';
  }

  function pattern(p, id) {
    var t = p && p.type, cols = (p && p.colors) || [], out = '', i, k;
    switch (t) {
      case 'stripes':
        for (k = -2; k <= 2; k++) out += '<rect x="' + (182 + 72 * k) + '" y="0" width="36" height="440" fill="' + cols[0] + '"/>';
        return out;
      case 'pinstripes':
        for (i = 92; i <= 308; i += 18) out += '<rect x="' + i + '" y="0" width="2.5" height="440" fill="' + cols[0] + '"/>';
        return out;
      case 'hoops':
        for (i = 60; i < 440; i += 80) out += '<rect x="0" y="' + i + '" width="400" height="40" fill="' + cols[0] + '"/>';
        return out;
      case 'sash':
        return '<path d="M96 70 L150 40 L320 400 L266 430 Z" fill="' + cols[0] + '"/>';
      case 'halves':
        return '<rect x="200" y="0" width="200" height="440" fill="' + cols[0] + '"/>';
      case 'chevron':
        for (k = 0; k < cols.length; k++) {
          var y = 128 + k * 18;
          out += '<path d="M60 ' + (y - 60) + ' L200 ' + y + ' L340 ' + (y - 60) + '" fill="none" stroke="' + cols[k] + '" stroke-width="11" stroke-linejoin="miter"/>';
        }
        return out;
      case 'band':
        for (k = 0; k < cols.length; k++) out += '<rect x="0" y="' + (168 + k * 15) + '" width="400" height="15" fill="' + cols[k] + '"/>';
        return out;
      case 'gradient':
        return '<rect x="0" y="0" width="400" height="440" fill="url(#g' + id + ')"/>';
      case 'zigzag':
        for (i = 70, k = 0; i < 430; i += 26, k++) {
          var d = 'M80 ' + i, x;
          for (x = 80; x <= 320; x += 24) d += ' L' + (x + 12) + ' ' + (i + 10) + ' L' + (x + 24) + ' ' + i;
          out += '<path d="' + d + '" fill="none" stroke="' + cols[k % cols.length] + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>';
        }
        return out;
      default:
        return '';
    }
  }

  K.jerseySVG = function (kit, opts) {
    opts = opts || {};
    var id = 'j' + ++uid;
    var view = opts.view || 'front';
    var back = view === 'back';
    var country = K.countries[kit.country];
    var sleeve = kit.sleeve || kit.base;
    var cuff = kit.cuff || kit.trim;
    var num = kit.num || kit.trim;
    var neck = back ? NECK_BACK : NECK_FRONT[kit.collar] || NECK_FRONT.crew;
    var shirt = body(neck);
    var vb = view === 'detail' ? '196 74 112 112' : '0 0 400 440';
    var s = '';

    s += '<svg class="jersey" viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' +
      esc(kit.name + (back ? ' (back)' : view === 'detail' ? ' (crest detail)' : '')) + '">';
    s += '<defs>';
    s += '<clipPath id="c' + id + '"><path d="' + shirt + '"/></clipPath>';
    if (kit.pattern && kit.pattern.type === 'gradient') {
      s += '<linearGradient id="g' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset=".15" stop-color="' + kit.base +
        '" stop-opacity="0"/><stop offset="1" stop-color="' + kit.pattern.colors[0] + '"/></linearGradient>';
    }
    s += '<linearGradient id="s' + id + '" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".2" stop-color="#000" stop-opacity="0"/>' +
      '<stop offset=".46" stop-color="#fff" stop-opacity=".09"/><stop offset=".8" stop-color="#000" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>';
    s += '<linearGradient id="v' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/>' +
      '<stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>';
    s += '<pattern id="m' + id + '" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#000" fill-opacity=".09"/></pattern>';
    s += '<filter id="f' + id + '" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>';
    s += '</defs>';

    if (view !== 'detail') s += '<ellipse cx="200" cy="424" rx="132" ry="9" fill="#000" fill-opacity=".22" filter="url(#f' + id + ')"/>';

    // inside of the neck, seen through the opening
    if (!back) s += '<path d="M160 36 ' + neck + ' C 222 44 178 44 160 36 Z" fill="' + kit.base + '"/><path d="M160 36 ' + neck + ' C 222 44 178 44 160 36 Z" fill="#000" fill-opacity=".35"/>';

    s += '<g clip-path="url(#c' + id + ')">';
    s += '<rect width="400" height="440" fill="' + kit.base + '"/>';
    s += pattern(kit.pattern, id);
    s += '<path d="' + SLEEVE_R + '" fill="' + sleeve + '"/><path d="' + SLEEVE_L + '" fill="' + sleeve + '"/>';
    s += '<path d="' + CUFF_R + '" fill="' + cuff + '"/><path d="' + CUFF_L + '" fill="' + cuff + '"/>';
    s += '<rect width="400" height="440" fill="url(#m' + id + ')"/>';
    s += '<rect width="400" height="440" fill="url(#s' + id + ')"/><rect width="400" height="440" fill="url(#v' + id + ')"/>';
    // soft fabric folds
    s += '<path d="M138 190 Q 150 300 130 404 M266 210 Q 256 300 274 406 M190 330 Q 214 360 206 410" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="16" stroke-linecap="round"/>';
    s += '<path d="M296 49 Q 302 96 308 150 M104 49 Q 98 96 92 150" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2"/>';
    s += '</g>';

    // collar
    if (back) {
      s += '<path d="M160 36 ' + NECK_BACK + '" fill="none" stroke="' + kit.trim + '" stroke-width="8" stroke-linecap="round"/>';
      s += '<rect x="186" y="52" width="28" height="14" rx="2" fill="' + kit.trim + '" fill-opacity=".9"/>';
      s += '<text x="200" y="62.5" text-anchor="middle" font-family="Poppins,sans-serif" font-size="8" font-weight="600" fill="' + kit.base + '">' + country.fifa + '</text>';
    } else {
      s += '<path d="M160 36 C 178 44 222 44 240 36" fill="none" stroke="' + kit.trim + '" stroke-width="5" stroke-linecap="round"/>';
      s += '<path d="M160 36 ' + neck + '" fill="none" stroke="' + kit.trim + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>';
      if (kit.collar === 'polo') {
        s += '<path d="M160 36 L196 62 L178 76 L148 46 Z" fill="' + kit.trim + '"/><path d="M240 36 L204 62 L222 76 L252 46 Z" fill="' + kit.trim + '"/>';
        s += '<path d="M200 60 L200 104" stroke="' + kit.trim + '" stroke-width="3"/><circle cx="200" cy="82" r="2.4" fill="' + kit.trim + '"/>';
      }
    }

    if (back) {
      var name = (opts.name || '').toUpperCase().replace(/[^A-Z .'\-À-ſ]/g, '').slice(0, 12);
      var number = String(opts.number == null ? '' : opts.number).replace(/\D/g, '').slice(0, 2);
      if (name) s += '<text x="200" y="128" text-anchor="middle" font-family="Poppins,sans-serif" font-size="' + (name.length > 9 ? 21 : 25) + '" font-weight="600" letter-spacing="2" fill="' + num + '">' + esc(name) + '</text>';
      if (number) s += '<text x="200" y="282" text-anchor="middle" font-family="Poppins,sans-serif" font-size="132" font-weight="600" letter-spacing="-4" fill="' + num + '">' + number + '</text>';
    } else {
      // crest + stars on the wearer's left chest, wordmark on the right
      var cx = 252, cy = 124;
      for (var i = 0; i < country.stars; i++) {
        s += '<path d="' + star(cx + (i - (country.stars - 1) / 2) * 9, cy - 34, 3.4) + '" fill="' + kit.trim + '"/>';
      }
      s += '<path d="M' + (cx - 16) + ' ' + (cy - 20) + ' L' + (cx + 16) + ' ' + (cy - 20) + ' L' + (cx + 16) + ' ' + (cy + 2) +
        ' Q' + (cx + 16) + ' ' + (cy + 15) + ' ' + cx + ' ' + (cy + 23) + ' Q' + (cx - 16) + ' ' + (cy + 15) + ' ' + (cx - 16) + ' ' + (cy + 2) + ' Z" fill="' + kit.trim + '"/>';
      s += '<text x="' + cx + '" y="' + (cy + 3) + '" text-anchor="middle" font-family="Poppins,sans-serif" font-size="9.5" font-weight="700" fill="' + kit.base + '">' + country.fifa + '</text>';
      s += '<text x="146" y="118" text-anchor="middle" font-family="Poppins,sans-serif" font-size="13" font-weight="700" letter-spacing=".5" fill="' + kit.trim + '">K4U</text>';
    }

    s += '<path d="' + shirt + '" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="1.4" stroke-linejoin="round"/>';
    s += '</svg>';
    return s;
  };
})();
