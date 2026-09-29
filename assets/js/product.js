/* Kits4U — product detail: views, variants, fit, size, personalisation, add to bag. */
(function () {
  'use strict';
  var K = window.K4U;
  var kit = K.kitById(K.qs('kit')) || null;
  var root = document.getElementById('pdp');

  if (!kit) {
    root.innerHTML = '<div class="notfound"><p class="kicker">404</p><h1 class="h-display">That kit has left the vault</h1>' +
      '<p class="lead">It may have sold out or moved. Explore kits for U from every nation instead.</p>' +
      '<a class="btn btn--light" href="collections.html">Shop all kits</a></div>';
    return;
  }

  var c = K.countries[kit.country];
  var cfg = K.config;
  var sel = { fit: kit.fits[0], size: null, qty: 1, name: '', number: '' };
  document.title = kit.name + ' — Kits4U';

  var pName = (K.qs('name') || '').toUpperCase().replace(/[^A-Z .'\-]/g, '').slice(0, 12);
  var pNum = (K.qs('number') || '').replace(/\D/g, '').slice(0, 2);
  if (pName || pNum) { sel.name = pName; sel.number = pNum; }

  document.getElementById('crumbs').innerHTML =
    '<li><a href="index.html">Home</a></li><li><a href="collections.html">Nations</a></li>' +
    '<li><a href="collections.html?country=' + c.code + '">' + K.esc(c.name) + '</a></li><li aria-current="page">' + K.esc(K.types[kit.type].label) + ' ' + K.esc(kit.season) + '</li>';

  var siblings = K.kitsFor(kit.country);
  var fitsHTML = kit.fits.length > 1
    ? '<div class="opt"><div class="opt__head"><p class="opt__title" id="fit-title">Fit</p></div><div class="fitpick" role="radiogroup" aria-labelledby="fit-title">' +
      kit.fits.map(function (f, i) {
        var F = K.fits[f];
        return '<label class="fitopt"><input type="radio" name="fit" value="' + f + '"' + (i === 0 ? ' checked' : '') + '>' +
          '<strong>' + F.label + '</strong><small>' + F.sub + '</small><em>' + (f === 'authentic' ? '+' + K.money(cfg.authenticUpcharge) : 'Included') + '</em></label>';
      }).join('') + '</div></div>'
    : '';

  var F0 = K.fits[kit.fits[0]];
  root.innerHTML =
    '<div class="pdp">' +
    '<div class="gallery">' +
      '<div class="stagebox" id="stagebox">' +
        '<div class="stagebox__orb" title="' + K.esc(c.name) + '"><canvas id="pdp-orb" aria-hidden="true"></canvas></div>' +
        (kit.badge ? '<span class="badge">' + K.esc(kit.badge) + '</span>' : '') +
        '<div class="view is-on" data-view="front">' + K.jerseySVG(kit) + '</div>' +
        '<div class="view" data-view="back"></div>' +
        '<div class="view" data-view="detail">' + K.jerseySVG(kit, { view: 'detail' }) + '</div>' +
      '</div>' +
      '<div class="thumbs" role="group" aria-label="Product views">' +
        '<button class="thumb" type="button" data-show="front" aria-pressed="true">' + K.jerseySVG(kit) + '<span>Front</span></button>' +
        '<button class="thumb" type="button" data-show="back" aria-pressed="false"><i class="thumb-back"></i><span>Back</span></button>' +
        '<button class="thumb" type="button" data-show="detail" aria-pressed="false">' + K.jerseySVG(kit, { view: 'detail' }) + '<span>Crest</span></button>' +
      '</div>' +
    '</div>' +
    '<div class="buy">' +
      '<div>' +
        '<a class="buy__country" href="collections.html?country=' + c.code + '"><img src="' + K.flagURL(c.code, 48, 32) + '" alt="">' + K.esc(c.name) + ' &middot; ' + K.esc(K.types[kit.type].label) + ' ' + K.esc(kit.season) + '</a>' +
        '<h1>' + K.esc(kit.name) + '</h1>' +
        '<p class="buy__tag">' + K.esc(kit.tagline) + '</p>' +
        '<p class="buy__price"><span id="price" aria-live="polite"></span><small>Incl. VAT</small></p>' +
      '</div>' +
      '<div class="opt"><div class="opt__head"><p class="opt__title">Kit <span>' + K.esc(K.types[kit.type].label) + '</span></p></div><div class="swatches">' +
        siblings.map(function (s) {
          return '<a class="swatch" href="product.html?kit=' + s.id + '" aria-label="' + K.esc(s.name) + '"' + (s.id === kit.id ? ' aria-current="true"' : '') + '>' + K.jerseySVG(s) + '</a>';
        }).join('') +
      '</div></div>' +
      fitsHTML +
      '<div class="opt"><div class="opt__head"><p class="opt__title" id="size-title">Size <span id="size-picked"></span></p>' +
        '<button class="link-btn" type="button" id="open-guide">Size guide</button></div>' +
        '<div class="sizes" role="radiogroup" aria-labelledby="size-title" id="sizes">' +
        K.sizes.map(function (s, i) {
          var out = kit.stock[s] === 0;
          return '<button class="size" type="button" role="radio" aria-checked="false" data-size="' + s + '" tabindex="' + (i === 0 ? 0 : -1) + '"' +
            (out ? ' aria-disabled="true" aria-label="' + s + ', sold out"' : '') + '>' + s + '</button>';
        }).join('') + '</div>' +
        '<p class="size-note" id="size-note" aria-live="polite"></p>' +
      '</div>' +
      '<details class="personal" id="personal"' + (sel.name || sel.number ? ' open' : '') + '>' +
        '<summary>Add name &amp; number <em>+' + K.money(cfg.personalisationPrice) + '</em></summary>' +
        '<div class="personal__grid">' +
          '<div class="field"><label for="pp-name">Name</label><input id="pp-name" maxlength="12" autocomplete="off" spellcheck="false" placeholder="YOUR NAME" value="' + K.esc(sel.name) + '"></div>' +
          '<div class="field"><label for="pp-num">Number</label><input id="pp-num" inputmode="numeric" maxlength="2" placeholder="10" value="' + K.esc(sel.number) + '"></div>' +
        '</div>' +
        '<p class="personal__hint">Heat-pressed in match-style lettering. Personalised kits can be exchanged for size but not refunded.</p>' +
      '</details>' +
      '<div class="buy__actions">' +
        '<div class="qty" role="group" aria-label="Quantity"><button type="button" id="q-dec" aria-label="Decrease quantity">&minus;</button><output id="q-val" aria-live="polite">1</output><button type="button" id="q-inc" aria-label="Increase quantity">+</button></div>' +
        '<button class="btn btn--light" type="button" id="add">Add to kit bag</button>' +
      '</div>' +
      '<ul class="assure">' +
        '<li><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 6h10v8H2zM12 9h3.5L18 11.5V14h-6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="5.5" cy="15" r="1.6" fill="currentColor"/><circle cx="14.5" cy="15" r="1.6" fill="currentColor"/></svg>Free UK delivery over ' + K.money(cfg.freeShippingOver) + '</li>' +
        '<li><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 8h9a4 4 0 0 1 0 8H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M7 5 4 8l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>30-day returns &amp; exchanges</li>' +
        '<li><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l2.5 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Dispatched within 24 hours</li>' +
        '<li><svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m4 10 4 4 8-8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Quality-checked in our studio</li>' +
      '</ul>' +
      '<div class="acc">' +
        '<details open><summary>Fabric &amp; technology</summary><div class="acc__body" id="fabric-body"></div></details>' +
        '<details><summary>Fit &amp; sizing</summary><div class="acc__body"><p>' + K.esc(F0.sub) + '. Between sizes? Size up for a relaxed look.</p>' + sizeTable() + '</div></details>' +
        '<details><summary>Delivery &amp; returns</summary><div class="acc__body">' +
          '<ul>' + K.shipping.map(function (m) { return '<li><strong style="color:#fff">' + m.label + '</strong> &mdash; ' + m.eta + ', ' + K.money(m.price) + (m.freeEligible ? ' (free over ' + K.money(cfg.freeShippingOver) + ')' : '') + '</li>'; }).join('') + '</ul>' +
          '<p>Return or exchange un-personalised kits within 30 days in original condition.</p></div></details>' +
      '</div>' +
    '</div>' +
    '</div>';

  function sizeTable() {
    return '<table class="sizes-table"><thead><tr><th scope="col">Size</th><th scope="col">Chest (cm)</th><th scope="col">Waist (cm)</th><th scope="col">Length (cm)</th></tr></thead><tbody>' +
      K.sizeGuide.map(function (r) { return '<tr><td>' + r.size + '</td><td>' + r.chest + '</td><td>' + r.waist + '</td><td>' + r.length + '</td></tr>'; }).join('') +
      '</tbody></table>';
  }

  new K.Orb(document.getElementById('pdp-orb'), c.code, { speed: 0.5 });

  /* ---- views ---- */
  var stage = document.getElementById('stagebox');
  var thumbs = root.querySelectorAll('.thumb');
  var backView = stage.querySelector('[data-view="back"]');
  var backThumb = root.querySelector('.thumb-back');
  function showView(v) {
    stage.querySelectorAll('.view').forEach(function (el) { el.classList.toggle('is-on', el.dataset.view === v); });
    thumbs.forEach(function (t) { t.setAttribute('aria-pressed', t.dataset.show === v ? 'true' : 'false'); });
  }
  root.querySelector('.thumbs').addEventListener('click', function (e) {
    var t = e.target.closest('.thumb');
    if (t) showView(t.dataset.show);
  });
  function renderBack() {
    var svg = K.jerseySVG(kit, { view: 'back', name: sel.name, number: sel.number });
    backView.innerHTML = svg;
    backThumb.outerHTML = '<i class="thumb-back" style="display:block;height:100%">' + svg + '</i>';
    backThumb = root.querySelector('.thumb-back');
  }

  /* ---- price + fabric ---- */
  function price() {
    return K.unitPrice({ kitId: kit.id, fit: sel.fit, name: sel.name, number: sel.number });
  }
  function renderPrice() {
    document.getElementById('price').textContent = K.money(price() * sel.qty);
  }
  function renderFabric() {
    var F = K.fits[sel.fit];
    var stats = sel.fit === 'authentic' ? [['128', 'g/m² weight'], ['4-way', 'stretch'], ['+38%', 'airflow']]
      : sel.fit === 'classic' ? [['210', 'g/m² weight'], ['60%', 'cotton'], ['1', 'wash-in softness']]
      : [['145', 'g/m² weight'], ['100%', 'recycled'], ['UPF', '30+ sun protection']];
    document.getElementById('fabric-body').innerHTML =
      '<p>' + K.esc(F.fabric) + '</p>' +
      '<div class="fabric">' + stats.map(function (s) { return '<div><strong>' + s[0] + '</strong><span>' + s[1] + '</span></div>'; }).join('') + '</div>' +
      '<ul>' + F.points.map(function (p) { return '<li>' + K.esc(p) + '</li>'; }).join('') + '</ul>';
  }

  root.querySelectorAll('input[name="fit"]').forEach(function (r) {
    r.addEventListener('change', function () { sel.fit = r.value; renderPrice(); renderFabric(); });
  });

  /* ---- sizes: roving-tabindex radio group ---- */
  var sizeBtns = Array.prototype.slice.call(root.querySelectorAll('.size'));
  var note = document.getElementById('size-note');
  function pickSize(btn, focus) {
    if (btn.getAttribute('aria-disabled') === 'true') {
      note.className = 'size-note';
      note.textContent = btn.dataset.size + ' is sold out — join the Kit Vault list for restock alerts.';
      return;
    }
    sel.size = btn.dataset.size;
    sizeBtns.forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) btn.focus();
    document.getElementById('size-picked').textContent = sel.size;
    var st = kit.stock[sel.size];
    note.className = 'size-note' + (st <= 3 ? ' is-low' : '');
    note.textContent = st <= 3 ? 'Only ' + st + ' left in ' + sel.size + ' — order soon.' : 'In stock — ready to ship.';
    sel.qty = Math.min(sel.qty, maxQty());
    renderQty();
  }
  document.getElementById('sizes').addEventListener('click', function (e) {
    var b = e.target.closest('.size');
    if (b) pickSize(b);
  });
  document.getElementById('sizes').addEventListener('keydown', function (e) {
    var i = sizeBtns.indexOf(document.activeElement);
    if (i < 0) return;
    var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    for (var k = 1; k <= sizeBtns.length; k++) {
      var b = sizeBtns[(i + d * k + sizeBtns.length * 2) % sizeBtns.length];
      if (b.getAttribute('aria-disabled') !== 'true') { pickSize(b, true); break; }
    }
  });

  /* ---- quantity ---- */
  function maxQty() { return Math.max(1, Math.min(10, sel.size ? kit.stock[sel.size] : 10)); }
  function renderQty() {
    document.getElementById('q-val').textContent = sel.qty;
    document.getElementById('q-dec').disabled = sel.qty <= 1;
    document.getElementById('q-inc').disabled = sel.qty >= maxQty();
    renderPrice();
  }
  document.getElementById('q-dec').addEventListener('click', function () { sel.qty = Math.max(1, sel.qty - 1); renderQty(); });
  document.getElementById('q-inc').addEventListener('click', function () { sel.qty = Math.min(maxQty(), sel.qty + 1); renderQty(); });

  /* ---- personalisation ---- */
  var inName = document.getElementById('pp-name'), inNum = document.getElementById('pp-num');
  function onPersonal() {
    inNum.value = inNum.value.replace(/\D/g, '').slice(0, 2);
    sel.name = inName.value.toUpperCase().replace(/[^A-Z .'\-]/g, '').slice(0, 12);
    sel.number = inNum.value;
    renderBack();
    renderPrice();
    showView('back');
  }
  inName.addEventListener('input', onPersonal);
  inNum.addEventListener('input', onPersonal);
  document.getElementById('personal').addEventListener('toggle', function () {
    if (this.open) showView('back');
  });

  /* ---- add to bag ---- */
  document.getElementById('add').addEventListener('click', function () {
    if (!sel.size) {
      note.className = 'size-note is-low';
      note.textContent = 'Please select a size.';
      var first = sizeBtns.filter(function (b) { return b.getAttribute('aria-disabled') !== 'true'; })[0];
      if (first) first.focus();
      return;
    }
    var personal = document.getElementById('personal').open;
    K.cart.add({
      kitId: kit.id, size: sel.size, fit: sel.fit, qty: sel.qty,
      name: personal ? sel.name : '', number: personal ? sel.number : ''
    });
    K.openCart();
  });

  /* ---- size guide dialog ---- */
  var dlg = document.getElementById('size-guide');
  document.getElementById('sg-body').innerHTML =
    '<p>Measurements are body measurements in centimetres. ' + K.esc(F0.sub) + ' &mdash; for a looser fit, choose one size up.</p>' + sizeTable() +
    '<p><strong style="color:#fff">How to measure:</strong> chest around the fullest part, waist at the natural waistline, length from the high point of the shoulder.</p>';
  function openGuide() {
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  document.getElementById('open-guide').addEventListener('click', openGuide);
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.closest('[data-close-dialog]')) dlg.close ? dlg.close() : dlg.removeAttribute('open');
  });
  if (location.hash === '#size-guide') setTimeout(openGuide, 300);

  /* ---- related ---- */
  var related = siblings.filter(function (s) { return s.id !== kit.id; })
    .concat(K.kits.filter(function (s) { return s.country !== kit.country && s.type === kit.type; }).slice(0, 4));
  document.getElementById('related-kicker').textContent = 'More from ' + c.name;
  document.getElementById('related-link').href = 'collections.html?country=' + c.code;
  document.getElementById('related-rail').innerHTML = related.map(function (k) { return K.kitCard(k); }).join('');
  document.getElementById('related').hidden = false;

  renderBack();
  renderFabric();
  renderQty();
  if (sel.name || sel.number) showView('back');
})();
