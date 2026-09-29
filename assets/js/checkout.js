/* Kits4U — checkout: contact, delivery, payment, confirmation.

   PAYMENT INTEGRATION: everything funnels through submitOrder() below.
   In test mode it resolves locally. To go live, replace its body with a call
   to your payment provider (e.g. create a Stripe Checkout Session / Payment
   Intent on your server and confirm it here), then set K4U.config.testMode
   to false in data.js. Raw card numbers are never stored — only brand + last 4. */
(function () {
  'use strict';
  var K = window.K4U;
  var form = document.getElementById('checkout-form');
  var view = document.getElementById('checkout-view');
  var done = document.getElementById('done-view');
  var summary = document.getElementById('co-summary');
  var countrySel = document.getElementById('country');
  var methodsEl = document.getElementById('methods');
  var method = 'standard';

  if (K.config.testMode) document.getElementById('testmode').hidden = false;

  function submitOrder(order) {
    if (!K.config.testMode) {
      return Promise.reject(new Error('Online payments are not enabled yet. Please try again soon.'));
    }
    return new Promise(function (resolve) { setTimeout(function () { resolve(order); }, 1100); });
  }

  /* ---- empty bag guard ---- */
  function guard() {
    if (K.cart.items().length || !done.hidden) return false;
    view.innerHTML = '<div class="empty-state" style="padding:120px 0"><p class="empty-state__title">Nothing to check out yet</p>' +
      '<p>Your kit bag is empty. Explore kits for U from eight football nations.</p><a class="btn btn--light" href="collections.html">Shop all kits</a></div>';
    return true;
  }
  if (guard()) return;

  /* ---- delivery ---- */
  countrySel.innerHTML = K.deliveryCountries.map(function (c) { return '<option>' + K.esc(c) + '</option>'; }).join('');
  function domestic() { return countrySel.value === 'United Kingdom'; }
  function renderMethods() {
    var list = K.shipping.filter(function (m) { return m.domestic === domestic(); });
    if (!list.some(function (m) { return m.id === method; })) method = list[0].id;
    var sub = K.cart.totals(method);
    methodsEl.innerHTML = list.map(function (m) {
      var t = K.cart.totals(m.id);
      return '<label class="method"><input type="radio" name="method" value="' + m.id + '"' + (m.id === method ? ' checked' : '') + '>' +
        '<span><strong style="font-weight:600">' + m.label + '</strong><small>' + m.eta + '</small></span>' +
        '<strong>' + (t.shipping ? K.money(t.shipping) : 'Free') + '</strong></label>';
    }).join('');
    return sub;
  }
  countrySel.addEventListener('change', function () { renderMethods(); renderSummary(); });
  methodsEl.addEventListener('change', function (e) {
    if (e.target.name === 'method') { method = e.target.value; renderSummary(); }
  });

  /* ---- summary ---- */
  function renderSummary() {
    var t = K.cart.totals(method);
    summary.innerHTML = '<h2 id="co-sum-title">Order summary</h2>' +
      '<ul class="sum-lines">' + K.cart.items().map(function (l) {
        var kit = K.kitById(l.kitId), bits = [K.fits[l.fit].label, l.size];
        if (l.name || l.number) bits.push([l.name, l.number].filter(Boolean).join(' '));
        return '<li class="sum-line"><div class="img">' + K.jerseySVG(kit) + '<b>' + l.qty + '</b></div>' +
          '<div><strong style="font-weight:600">' + K.esc(kit.name) + '</strong><p>' + K.esc(bits.join(' · ')) + '</p></div>' +
          '<strong>' + K.money(K.unitPrice(l) * l.qty) + '</strong></li>';
      }).join('') + '</ul>' +
      K.promoHTML() + K.totalsHTML(t);
    document.getElementById('pay').textContent = 'Pay ' + K.money(t.total);
  }

  /* ---- card formatting ---- */
  var cc = document.getElementById('cc'), exp = document.getElementById('exp'), cvc = document.getElementById('cvc');
  function brand(d) {
    if (/^4/.test(d)) return 'VISA';
    if (/^(5[1-5]|2[2-7])/.test(d)) return 'MASTERCARD';
    if (/^3[47]/.test(d)) return 'AMEX';
    return '';
  }
  function luhn(d) {
    var sum = 0, alt = false;
    for (var i = d.length - 1; i >= 0; i--) {
      var n = +d[i];
      if (alt) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alt = !alt;
    }
    return d.length >= 13 && sum % 10 === 0;
  }
  cc.addEventListener('input', function () {
    var d = cc.value.replace(/\D/g, '').slice(0, 19), b = brand(d);
    cc.value = b === 'AMEX'
      ? [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ')
      : d.replace(/(\d{4})(?=\d)/g, '$1 ');
    document.getElementById('cc-brand').textContent = b;
    cvc.maxLength = b === 'AMEX' ? 4 : 3;
  });
  exp.addEventListener('input', function (e) {
    var d = exp.value.replace(/\D/g, '').slice(0, 4);
    if (d.length === 1 && +d > 1) d = '0' + d;
    exp.value = d.length > 2 || (d.length === 2 && e.inputType !== 'deleteContentBackward') ? d.slice(0, 2) + ' / ' + d.slice(2) : d;
  });
  cvc.addEventListener('input', function () { cvc.value = cvc.value.replace(/\D/g, '').slice(0, cvc.maxLength); });

  /* ---- validation ---- */
  var rules = {
    email: function (v, el) { return el.checkValidity() && /@.+\./.test(v) ? '' : 'Enter a valid email address.'; },
    first: req('Enter your first name.'),
    last: req('Enter your last name.'),
    addr1: req('Enter your street address.'),
    city: req('Enter your town or city.'),
    postcode: function (v) {
      if (!v.trim()) return 'Enter your postcode.';
      if (domestic() && !/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(v.trim())) return 'Enter a valid UK postcode.';
      return '';
    },
    phone: function (v) { return v.replace(/\D/g, '').length >= 7 ? '' : 'Enter a phone number for delivery updates.'; },
    cc: function (v) { return luhn(v.replace(/\D/g, '')) ? '' : 'Enter a valid card number.'; },
    ccname: req('Enter the name on your card.'),
    exp: function (v) {
      var m = v.match(/^(\d{2}) \/ (\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 12) return 'Use MM / YY.';
      var now = new Date(), y = 2000 + +m[2], mo = +m[1];
      return y > now.getFullYear() || (y === now.getFullYear() && mo >= now.getMonth() + 1) ? '' : 'This card has expired.';
    },
    cvc: function (v) { return v.length === cvc.maxLength ? '' : 'Enter the ' + cvc.maxLength + '-digit security code.'; }
  };
  function req(msg) { return function (v) { return v.trim() ? '' : msg; }; }
  function check(el) {
    var rule = rules[el.name];
    if (!rule) return true;
    var err = rule(el.value, el), field = el.closest('.field'), out = field.querySelector('.error');
    field.classList.toggle('is-invalid', !!err);
    el.setAttribute('aria-invalid', err ? 'true' : 'false');
    if (out) {
      if (!out.id) out.id = el.id + '-err';
      el.setAttribute('aria-describedby', out.id);
      out.textContent = err;
    }
    return !err;
  }
  form.addEventListener('blur', function (e) {
    if (e.target.name && rules[e.target.name] && e.target.value) check(e.target);
  }, true);
  form.addEventListener('input', function (e) {
    if (e.target.closest('.field.is-invalid')) check(e.target);
  });

  /* ---- submit ---- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = null;
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name];
      if (!check(el) && !bad) bad = el;
    });
    if (bad) { bad.focus(); return; }

    var t = K.cart.totals(method), digits = cc.value.replace(/\D/g, '');
    var order = {
      id: 'K4U-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.floor(Math.random() * 90 + 10),
      createdAt: new Date().toISOString(),
      email: form.elements.email.value.trim(),
      shipTo: {
        name: form.elements.first.value.trim() + ' ' + form.elements.last.value.trim(),
        address: [form.elements.addr1.value, form.elements.addr2.value, form.elements.city.value, form.elements.postcode.value.toUpperCase(), countrySel.value]
          .map(function (s) { return s.trim(); }).filter(Boolean)
      },
      method: t.method.id,
      items: K.cart.items(),
      promo: K.cart.promo(),
      totals: { subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total },
      payment: { brand: brand(digits) || 'CARD', last4: digits.slice(-4) }
    };

    var pay = document.getElementById('pay');
    pay.disabled = true;
    pay.textContent = 'Processing…';
    submitOrder(order).then(function () {
      try { localStorage.setItem('k4u.lastOrder', JSON.stringify(order)); } catch (err) { /* ignore */ }
      showDone(order, t);
      K.cart.clear();
    }, function (err) {
      pay.disabled = false;
      renderSummary();
      K.toast(K.esc(err.message));
    });
  });

  function showDone(order, t) {
    view.hidden = true;
    done.hidden = false;
    var lead = K.kitById(order.items[0].kitId);
    done.innerHTML = '<div class="done">' +
      '<canvas id="done-orb" aria-hidden="true"></canvas>' +
      '<p class="kicker">Order confirmed</p>' +
      '<h1 class="h-display">Wear your passion.</h1>' +
      '<p class="lead">Thanks, ' + K.esc(order.shipTo.name.split(' ')[0]) + '! Your kits are heading out of the vault. A confirmation is on its way to <strong style="color:#fff">' + K.esc(order.email) + '</strong>.</p>' +
      '<p class="order-no">Order ' + K.esc(order.id) + '</p>' +
      '<p style="color:var(--muted)">' + K.esc(t.method.label) + ' &middot; ' + K.esc(t.method.eta) + ' &middot; Paid ' + K.money(order.totals.total) + ' by ' + K.esc(order.payment.brand) + ' ending ' + K.esc(order.payment.last4) + '</p>' +
      '<div class="actions"><a class="btn btn--light" href="collections.html">Keep exploring</a><a class="btn btn--ghost" href="index.html">Back to the vault</a></div>' +
      '</div>';
    new K.Orb(document.getElementById('done-orb'), lead.country, { speed: 0.9 });
    window.scrollTo(0, 0);
    document.title = 'Order confirmed — Kits4U';
  }

  K.cart.on(function () { if (!guard() && done.hidden) { renderMethods(); renderSummary(); } });
  renderMethods();
  renderSummary();
})();
