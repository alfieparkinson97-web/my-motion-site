/* Kits4U — shared site chrome: burger menu, cart badge + drawer, toasts,
   product cards, newsletter forms. Loaded on every page. */
(function () {
  'use strict';
  var K = (window.K4U = window.K4U || {});
  var page = document.body.getAttribute('data-page') || '';

  K.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  K.qs = function (name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  };

  /* ---- burger menu (spec §10) ---- */
  (function () {
    var row = document.querySelector('.navrow');
    var btn = row && row.querySelector('.burger');
    var nav = row && row.querySelector('.links');
    if (!btn || !nav) return;
    function set(open) {
      row.dataset.open = open ? 'true' : 'false';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
    set(false);
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(row.dataset.open !== 'true'); });
    document.addEventListener('click', function (e) {
      if (row.dataset.open === 'true' && !nav.contains(e.target) && !btn.contains(e.target)) set(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && row.dataset.open === 'true') { set(false); btn.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  })();

  /* ---- toast ---- */
  var toastEl, toastTimer;
  K.toast = function (msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  };

  /* ---- product card ---- */
  K.kitCard = function (kit, opts) {
    opts = opts || {};
    var c = K.countries[kit.country];
    var href = 'product.html?kit=' + encodeURIComponent(kit.id);
    return '<article class="kit-card">' +
      '<a class="kit-card__media" href="' + href + '" tabindex="-1" aria-hidden="true">' +
      (kit.badge ? '<span class="badge">' + K.esc(kit.badge) + '</span>' : '') +
      '<span class="kit-card__face kit-card__front">' + K.jerseySVG(kit) + '</span>' +
      '<span class="kit-card__face kit-card__back">' + K.jerseySVG(kit, { view: 'back', number: 10 }) + '</span>' +
      '</a>' +
      '<div class="kit-card__body">' +
      '<p class="kit-card__meta"><img src="' + K.flagURL(kit.country) + '" alt="" width="18" height="12">' +
      K.esc(c.name) + ' <span aria-hidden="true">&middot;</span> ' + K.esc(K.types[kit.type].label) + ' ' + K.esc(kit.season) + '</p>' +
      '<h3 class="kit-card__title"><a href="' + href + '">' + K.esc(kit.name) + '</a></h3>' +
      '<p class="kit-card__price">' + (kit.fits.length > 1 ? '<span>From</span> ' : '') + K.money(kit.price) + '</p>' +
      (opts.tagline ? '<p class="kit-card__tag">' + K.esc(kit.tagline) + '</p>' : '') +
      '</div></article>';
  };

  /* ---- totals + promo (cart page and checkout) ---- */
  K.totalsHTML = function (t, opts) {
    opts = opts || {};
    var promo = K.cart.promo();
    return '<div class="sum-row"><span>Subtotal</span><strong>' + K.money(t.subtotal) + '</strong></div>' +
      (t.discount ? '<div class="sum-row is-discount"><span>Discount (' + K.esc(promo) + ')</span><strong>&minus;' + K.money(t.discount) + '</strong></div>' : '') +
      '<div class="sum-row"><span>Delivery' + (opts.estimate ? ' (est.)' : '') + '</span><strong>' + (t.shipping ? K.money(t.shipping) : 'Free') + '</strong></div>' +
      '<div class="sum-row is-total"><span>Total</span><strong>' + K.money(t.total) + '</strong></div>';
  };
  K.promoHTML = function () {
    var p = K.cart.promo();
    if (p) {
      return '<div class="applied"><span><strong>' + K.esc(p) + '</strong> &middot; ' + K.esc(K.promos[p].label) + '</span>' +
        '<button class="link-btn" type="button" data-promo-remove>Remove</button></div>';
    }
    return '<form class="promo" data-promo novalidate><div class="field"><label class="visually-hidden" for="promo-in">Promo code</label>' +
      '<input id="promo-in" placeholder="Promo code" autocomplete="off" spellcheck="false"></div>' +
      '<button class="btn btn--ghost" type="submit">Apply</button></form><p class="promo-msg" data-promo-msg aria-live="polite"></p>';
  };
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('form[data-promo]');
    if (!f) return;
    e.preventDefault();
    var code = f.querySelector('input').value;
    if (!code.trim()) return;
    if (!K.cart.applyPromo(code)) {
      var msg = f.parentNode.querySelector('[data-promo-msg]');
      if (msg) { msg.className = 'promo-msg is-err'; msg.textContent = 'That code isn\u2019t valid or has expired.'; }
    } else {
      K.toast('Promo applied: ' + K.esc(K.promos[K.cart.promo()].label));
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-promo-remove]')) K.cart.removePromo();
  });

  /* ---- cart badge ---- */
  function syncBadges() {
    var n = K.cart.count();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = n === 0;
    });
    document.querySelectorAll('[data-cart-label]').forEach(function (el) {
      el.setAttribute('aria-label', 'Cart, ' + n + (n === 1 ? ' item' : ' items'));
    });
  }

  /* ---- cart drawer ---- */
  var drawer, lastFocus;
  function buildDrawer() {
    drawer = document.createElement('div');
    drawer.className = 'drawer';
    drawer.hidden = true;
    drawer.innerHTML =
      '<div class="drawer__scrim" data-close></div>' +
      '<aside class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabindex="-1">' +
      '<header class="drawer__head"><h2 id="drawer-title">Your Kit Bag</h2>' +
      '<button class="icon-btn" type="button" data-close aria-label="Close cart"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></header>' +
      '<div class="drawer__body"></div>' +
      '<footer class="drawer__foot"></footer>' +
      '</aside>';
    document.body.appendChild(drawer);
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) K.closeCart();
      var q = e.target.closest('[data-qty]');
      if (q) {
        var l = K.cart.items().filter(function (x) { return x.key === q.dataset.key; })[0];
        if (l) K.cart.setQty(l.key, l.qty + (+q.dataset.qty));
      }
      var r = e.target.closest('[data-remove]');
      if (r) K.cart.remove(r.dataset.key);
    });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') K.closeCart();
      if (e.key === 'Tab') {
        var f = drawer.querySelectorAll('a[href],button:not([disabled]),input');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  K.lineHTML = function (l, compact) {
    var kit = K.kitById(l.kitId), fit = K.fits[l.fit];
    var extras = [fit.label + ' fit', 'Size ' + l.size];
    if (l.name || l.number) extras.push('Printed: ' + K.esc([l.name, l.number].filter(Boolean).join(' ')));
    return '<li class="line' + (compact ? ' line--compact' : '') + '">' +
      '<a class="line__img" href="product.html?kit=' + kit.id + '" tabindex="-1" aria-hidden="true">' + K.jerseySVG(kit) + '</a>' +
      '<div class="line__info"><a class="line__name" href="product.html?kit=' + kit.id + '">' + K.esc(kit.name) + '</a>' +
      '<p class="line__meta">' + extras.join(' &middot; ') + '</p>' +
      '<div class="line__row"><div class="qty" role="group" aria-label="Quantity for ' + K.esc(kit.name) + '">' +
      '<button type="button" data-qty="-1" data-key="' + K.esc(l.key) + '" aria-label="Decrease quantity">&minus;</button>' +
      '<output aria-live="polite">' + l.qty + '</output>' +
      '<button type="button" data-qty="1" data-key="' + K.esc(l.key) + '" aria-label="Increase quantity"' + (l.qty >= 10 ? ' disabled' : '') + '>+</button></div>' +
      '<button class="link-btn" type="button" data-remove data-key="' + K.esc(l.key) + '">Remove</button></div></div>' +
      '<p class="line__price">' + K.money(K.unitPrice(l) * l.qty) + '</p></li>';
  };

  function renderDrawer() {
    if (!drawer) return;
    var items = K.cart.items(), body = drawer.querySelector('.drawer__body'), foot = drawer.querySelector('.drawer__foot');
    if (!items.length) {
      body.innerHTML = '<div class="empty-state"><p class="empty-state__title">Your kit bag is empty</p><p>Explore kits for U from eight football nations.</p><a class="btn btn--light" href="collections.html">Shop all kits</a></div>';
      foot.innerHTML = '';
      return;
    }
    body.innerHTML = '<ul class="lines">' + items.map(function (l) { return K.lineHTML(l, true); }).join('') + '</ul>';
    var t = K.cart.totals(), gap = K.config.freeShippingOver - (t.subtotal - t.discount);
    foot.innerHTML =
      '<p class="ship-meter">' + (gap > 0 ? 'You’re <strong>' + K.money(gap) + '</strong> away from free delivery' : '<strong>Free standard delivery</strong> unlocked') + '</p>' +
      '<div class="meter"><span style="width:' + Math.min(100, ((t.subtotal - t.discount) / K.config.freeShippingOver) * 100) + '%"></span></div>' +
      '<div class="sum-row"><span>Subtotal</span><strong>' + K.money(t.subtotal) + '</strong></div>' +
      '<a class="btn btn--light btn--block" href="checkout.html">Checkout</a>' +
      '<a class="btn btn--ghost btn--block" href="cart.html">View kit bag</a>';
  }

  K.openCart = function () {
    if (!drawer) buildDrawer();
    renderDrawer();
    lastFocus = document.activeElement;
    drawer.hidden = false;
    document.documentElement.classList.add('no-scroll');
    requestAnimationFrame(function () {
      drawer.classList.add('is-open');
      drawer.querySelector('.drawer__panel').focus();
    });
  };
  K.closeCart = function () {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('is-open');
    document.documentElement.classList.remove('no-scroll');
    setTimeout(function () { drawer.hidden = true; }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  // Cart links open the drawer, except on the cart and checkout pages themselves.
  if (page !== 'cart' && page !== 'checkout') {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-cart-link]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      K.openCart();
    });
  }

  K.cart.on(function () { syncBadges(); renderDrawer(); });
  syncBadges();

  /* ---- newsletter forms ---- */
  document.querySelectorAll('form[data-newsletter]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = f.querySelector('input[type=email]');
      if (!input.checkValidity()) { input.reportValidity(); return; }
      input.value = '';
      K.toast('You’re in the Kit Vault. Watch your inbox for drops.');
    });
  });

  document.querySelectorAll('[data-flags]').forEach(function (el) {
    el.innerHTML = K.ORDER.map(function (c) {
      return '<img src="' + K.flagURL(c, 42, 28) + '" alt="" title="' + K.esc(K.countries[c].name) + '">';
    }).join('');
  });

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
