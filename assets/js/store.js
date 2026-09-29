/* Kits4U — cart store (localStorage, synced across tabs). */
(function () {
  'use strict';
  var K = (window.K4U = window.K4U || {});
  var KEY = 'k4u.cart.v1', PROMO = 'k4u.promo.v1';
  var listeners = [];

  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* private mode: cart lives for this page only */ }
  }

  var items = read(KEY, []).filter(function (l) { return l && K.kitById(l.kitId); });
  var promo = read(PROMO, null);

  function emit() {
    write(KEY, items);
    write(PROMO, promo);
    listeners.forEach(function (fn) { fn(); });
  }

  function keyOf(l) { return [l.kitId, l.size, l.fit, l.name || '', l.number || ''].join('|'); }

  var fmt;
  K.money = function (n) {
    if (!fmt) {
      try { fmt = new Intl.NumberFormat(K.config.locale, { style: 'currency', currency: K.config.currency }); }
      catch (e) { fmt = { format: function (v) { return '£' + v.toFixed(2); } }; }
    }
    return fmt.format(n);
  };

  K.unitPrice = function (l) {
    var kit = K.kitById(l.kitId);
    return kit.price + (l.fit === 'authentic' ? K.config.authenticUpcharge : 0) +
      (l.name || l.number ? K.config.personalisationPrice : 0);
  };

  K.cart = {
    items: function () { return items.slice(); },
    count: function () { return items.reduce(function (n, l) { return n + l.qty; }, 0); },
    subtotal: function () { return items.reduce(function (n, l) { return n + K.unitPrice(l) * l.qty; }, 0); },
    add: function (line) {
      var l = {
        kitId: line.kitId, size: line.size, fit: line.fit,
        name: (line.name || '').trim().toUpperCase(), number: line.number ? String(line.number) : '',
        qty: Math.max(1, Math.min(10, line.qty | 0 || 1))
      };
      l.key = keyOf(l);
      var hit = items.filter(function (x) { return x.key === l.key; })[0];
      if (hit) hit.qty = Math.min(10, hit.qty + l.qty);
      else items.push(l);
      emit();
      return l;
    },
    setQty: function (key, qty) {
      items = items
        .map(function (l) { if (l.key === key) l.qty = Math.max(0, Math.min(10, qty | 0)); return l; })
        .filter(function (l) { return l.qty > 0; });
      emit();
    },
    remove: function (key) { items = items.filter(function (l) { return l.key !== key; }); emit(); },
    clear: function () { items = []; promo = null; emit(); },
    promo: function () { return promo && K.promos[promo] ? promo : null; },
    applyPromo: function (code) {
      code = String(code || '').trim().toUpperCase();
      if (!K.promos[code]) return false;
      promo = code;
      emit();
      return true;
    },
    removePromo: function () { promo = null; emit(); },
    /* totals for a given shipping method (defaults to standard/intl by domestic flag) */
    totals: function (methodId) {
      var sub = this.subtotal(), p = this.promo() && K.promos[this.promo()];
      var discount = p && p.kind === 'pct' ? Math.round(sub * p.value) / 100 : 0;
      var method = K.shipping.filter(function (m) { return m.id === (methodId || 'standard'); })[0] || K.shipping[0];
      var free = (p && p.kind === 'ship') || (method.freeEligible && sub - discount >= K.config.freeShippingOver);
      var ship = items.length ? (free ? 0 : method.price) : 0;
      return { subtotal: sub, discount: discount, shipping: ship, method: method, total: Math.max(0, sub - discount + ship) };
    },
    on: function (fn) { listeners.push(fn); }
  };

  window.addEventListener('storage', function (e) {
    if (e.key !== KEY && e.key !== PROMO) return;
    items = read(KEY, []).filter(function (l) { return l && K.kitById(l.kitId); });
    promo = read(PROMO, null);
    listeners.forEach(function (fn) { fn(); });
  });
})();
