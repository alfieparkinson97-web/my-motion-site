/* Kits4U — cart page. */
(function () {
  'use strict';
  var K = window.K4U;
  var layout = document.getElementById('cart-layout');
  var lines = document.getElementById('cart-lines');
  var summary = document.getElementById('cart-summary');
  var empty = document.getElementById('cart-empty');
  var sub = document.getElementById('cart-sub');

  function render() {
    var items = K.cart.items();
    var n = K.cart.count();
    layout.hidden = !items.length;
    empty.hidden = !!items.length;
    sub.textContent = items.length ? n + (n === 1 ? ' kit' : ' kits') + ' ready to ship.' : '';
    if (!items.length) {
      empty.innerHTML = '<div class="empty-state" style="padding-bottom:96px"><p class="empty-state__title">Your kit bag is empty</p>' +
        '<p>Explore kits for U from eight football nations.</p><a class="btn btn--light" href="collections.html">Shop all kits</a></div>';
      return;
    }
    lines.innerHTML = items.map(function (l) { return K.lineHTML(l); }).join('');
    var t = K.cart.totals();
    var gap = K.config.freeShippingOver - (t.subtotal - t.discount);
    summary.innerHTML =
      '<h2 id="sum-title">Order summary</h2>' +
      '<p class="ship-meter">' + (gap > 0 ? 'Add <strong>' + K.money(gap) + '</strong> for free UK delivery' : '<strong>Free standard delivery</strong> unlocked') + '</p>' +
      '<div class="meter"><span style="width:' + Math.min(100, ((t.subtotal - t.discount) / K.config.freeShippingOver) * 100) + '%"></span></div>' +
      K.promoHTML() +
      K.totalsHTML(t, { estimate: true }) +
      '<a class="btn btn--volt btn--block" href="checkout.html" style="min-height:58px">Proceed to checkout</a>' +
      '<a class="btn btn--ghost btn--block" href="collections.html">Continue shopping</a>';
  }

  lines.addEventListener('click', function (e) {
    var q = e.target.closest('[data-qty]');
    if (q) {
      var l = K.cart.items().filter(function (x) { return x.key === q.dataset.key; })[0];
      if (l) K.cart.setQty(l.key, l.qty + (+q.dataset.qty));
    }
    var r = e.target.closest('[data-remove]');
    if (r) K.cart.remove(r.dataset.key);
  });

  K.cart.on(render);
  render();

  var inBag = K.cart.items().map(function (l) { return l.kitId; });
  var picks = K.kits.filter(function (k) { return k.type === 'home' && inBag.indexOf(k.id) < 0; }).slice(0, 8);
  document.getElementById('also-rail').innerHTML = picks.map(function (k) { return K.kitCard(k); }).join('');
})();
