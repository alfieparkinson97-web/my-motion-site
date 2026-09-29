/* Kits4U — procedural national flags.
   Drawn to canvas at any size so the same artwork textures the 3D flag
   footballs, the filter chips and the mini flags on product cards. */
(function () {
  'use strict';
  var K = (window.K4U = window.K4U || {});
  var cache = {};

  function vBands(ctx, w, h, cols) {
    var n = cols.length;
    cols.forEach(function (c, i) {
      ctx.fillStyle = c;
      ctx.fillRect(Math.floor((i * w) / n), 0, Math.ceil(w / n) + 1, h);
    });
  }
  function hBands(ctx, w, h, cols) {
    var n = cols.length;
    cols.forEach(function (c, i) {
      ctx.fillStyle = c;
      ctx.fillRect(0, Math.floor((i * h) / n), w, Math.ceil(h / n) + 1);
    });
  }
  function disc(ctx, x, y, r, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  var draw = {
    bra: function (ctx, w, h) {
      ctx.fillStyle = '#009c3b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffdf00';
      ctx.beginPath();
      ctx.moveTo(w * 0.085, h / 2);
      ctx.lineTo(w / 2, h * 0.12);
      ctx.lineTo(w * 0.915, h / 2);
      ctx.lineTo(w / 2, h * 0.88);
      ctx.closePath();
      ctx.fill();
      var r = Math.min(w * 0.175, h * 0.25), cx = w / 2, cy = h / 2;
      disc(ctx, cx, cy, r, '#002776');
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = r * 0.17;
      ctx.beginPath();
      ctx.arc(cx - r * 0.35, cy + r * 2.1, r * 2.25, Math.PI * 1.15, Math.PI * 1.95);
      ctx.stroke();
      [[-0.35, 0.35], [0.1, 0.5], [0.4, 0.3], [-0.05, 0.72], [0.55, 0.6], [-0.55, 0.62], [0.25, 0.8]].forEach(function (s) {
        disc(ctx, cx + s[0] * r, cy + s[1] * r, r * 0.05, '#ffffff');
      });
      ctx.restore();
    },
    eng: function (ctx, w, h) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      var t = Math.min(w, h) * 0.2;
      ctx.fillStyle = '#ce1124';
      ctx.fillRect(0, (h - t) / 2, w, t);
      ctx.fillRect((w - t) / 2, 0, t, h);
    },
    arg: function (ctx, w, h) {
      hBands(ctx, w, h, ['#74acdf', '#ffffff', '#74acdf']);
      var cx = w / 2, cy = h / 2, r = h * 0.075;
      ctx.fillStyle = '#f6b40e';
      for (var i = 0; i < 16; i++) {
        var a = (i / 16) * Math.PI * 2, len = i % 2 ? r * 1.7 : r * 2.05, sp = 0.13;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - sp) * r * 0.9, cy + Math.sin(a - sp) * r * 0.9);
        ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
        ctx.lineTo(cx + Math.cos(a + sp) * r * 0.9, cy + Math.sin(a + sp) * r * 0.9);
        ctx.fill();
      }
      disc(ctx, cx, cy, r, '#f6b40e');
      disc(ctx, cx, cy, r * 0.72, '#f8c43a');
    },
    ita: function (ctx, w, h) { vBands(ctx, w, h, ['#009246', '#ffffff', '#ce2b37']); },
    jpn: function (ctx, w, h) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      disc(ctx, w / 2, h / 2, h * 0.3, '#bc002d');
    },
    nga: function (ctx, w, h) { vBands(ctx, w, h, ['#008751', '#ffffff', '#008751']); },
    fra: function (ctx, w, h) { vBands(ctx, w, h, ['#0055a4', '#ffffff', '#ef4135']); },
    ger: function (ctx, w, h) { hBands(ctx, w, h, ['#000000', '#dd0000', '#ffce00']); }
  };

  K.drawFlag = function (ctx, code, w, h) {
    ctx.save();
    (draw[code] || draw.eng)(ctx, w, h);
    ctx.restore();
  };

  K.flagCanvas = function (code, w, h) {
    var key = code + ':' + w + 'x' + h;
    if (cache[key]) return cache[key];
    var c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    K.drawFlag(c.getContext('2d'), code, w, h);
    return (cache[key] = c);
  };

  var urls = {};
  K.flagURL = function (code, w, h) {
    w = w || 60; h = h || 40;
    var key = code + ':' + w + 'x' + h;
    return urls[key] || (urls[key] = K.flagCanvas(code, w, h).toDataURL('image/png'));
  };
})();
