/* Kits4U — Country Collections: nation / type / search / sort filters,
   synced to the URL (?country=bra&type=home&q=&sort=). */
(function () {
  'use strict';
  var K = window.K4U;
  var TYPES = ['all', 'home', 'away', 'third', 'retro'];
  var SORTS = ['featured', 'price-asc', 'price-desc', 'retro', 'name'];

  var state = {
    country: K.countries[K.qs('country')] ? K.qs('country') : 'all',
    type: TYPES.indexOf(K.qs('type')) > 0 ? K.qs('type') : 'all',
    q: K.qs('q') || '',
    sort: SORTS.indexOf(K.qs('sort')) >= 0 ? K.qs('sort') : 'featured'
  };

  var chips = document.getElementById('chips');
  var types = document.getElementById('types');
  var grid = document.getElementById('grid');
  var empty = document.getElementById('empty');
  var q = document.getElementById('q');
  var sort = document.getElementById('sort');
  var hero = document.getElementById('coll-hero');

  chips.innerHTML = '<button class="chip chip--all" type="button" data-country="all">All nations</button>' +
    K.ORDER.map(function (c) {
      return '<button class="chip" type="button" data-country="' + c + '"><img src="' + K.flagURL(c, 40, 28) + '" alt="">' + K.esc(K.countries[c].name) + '</button>';
    }).join('');
  types.innerHTML = TYPES.map(function (t) {
    return '<button type="button" data-type="' + t + '">' + (t === 'all' ? 'All kits' : K.types[t].label) + '</button>';
  }).join('');
  q.value = state.q;
  sort.value = state.sort;

  // Header orb: the selected nation, or a slow tour of all eight.
  var orb = new K.Orb(document.getElementById('coll-orb'), state.country === 'all' ? K.ORDER[0] : state.country, { speed: 0.4, fade: 0.5 });
  var tour = 0, tourTimer = null;
  function startTour() {
    stopTour();
    if (K.reducedMotion) return;
    tourTimer = setInterval(function () { tour = (tour + 1) % K.ORDER.length; orb.set(K.ORDER[tour]); }, 2600);
  }
  function stopTour() { if (tourTimer) clearInterval(tourTimer); tourTimer = null; }

  function syncURL() {
    var p = new URLSearchParams();
    if (state.country !== 'all') p.set('country', state.country);
    if (state.type !== 'all') p.set('type', state.type);
    if (state.q) p.set('q', state.q);
    if (state.sort !== 'featured') p.set('sort', state.sort);
    var s = p.toString();
    try { history.replaceState(null, '', location.pathname + (s ? '?' + s : '')); } catch (e) { /* file:// in some browsers */ }
  }

  function header() {
    var c = K.countries[state.country], kicker = document.getElementById('coll-kicker');
    var t = document.getElementById('coll-title'), b = document.getElementById('coll-blurb');
    if (c) {
      kicker.textContent = c.region;
      t.textContent = c.name;
      b.textContent = c.blurb;
      hero.style.setProperty('--tint', c.tint);
      stopTour();
      orb.set(c.code);
      document.title = c.name + ' Football Kits — Kits4U';
    } else {
      kicker.textContent = state.type === 'retro' ? 'Heritage collection' : 'Country collections';
      t.textContent = state.type === 'retro' ? 'Retro Reissues' : 'All Nations';
      b.textContent = state.type === 'retro'
        ? 'The shirts that defined an era, faithfully reissued in heavyweight pique. Legends never go out of style.'
        : 'The world’s finest kits from eight football-obsessed nations. Pick a flag, pick a shirt, wear your passion.';
      hero.style.removeProperty('--tint');
      startTour();
      document.title = (state.type === 'retro' ? 'Retro Football Kits' : 'Country Collections') + ' — Kits4U';
    }
  }

  function results() {
    var needle = state.q.trim().toLowerCase();
    var list = K.kits.filter(function (k) {
      if (state.country !== 'all' && k.country !== state.country) return false;
      if (state.type !== 'all' && k.type !== state.type) return false;
      if (!needle) return true;
      var c = K.countries[k.country];
      return [k.name, k.tagline, k.season, c.name, c.region, c.fifa, K.types[k.type].label].join(' ').toLowerCase().indexOf(needle) >= 0;
    });
    var by = {
      featured: function (a, b) {
        return K.ORDER.indexOf(a.country) - K.ORDER.indexOf(b.country) || TYPES.indexOf(a.type) - TYPES.indexOf(b.type);
      },
      'price-asc': function (a, b) { return a.price - b.price || a.order - b.order; },
      'price-desc': function (a, b) { return b.price - a.price || a.order - b.order; },
      retro: function (a, b) { return (a.type === 'retro' ? 0 : 1) - (b.type === 'retro' ? 0 : 1) || (a.season < b.season ? -1 : 1); },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    }[state.sort];
    // Featured view with "all nations": interleave so the grid opens with every nation's home kit.
    if (state.sort === 'featured' && state.country === 'all' && state.type === 'all' && !needle) {
      return list.slice().sort(function (a, b) {
        return TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || K.ORDER.indexOf(a.country) - K.ORDER.indexOf(b.country);
      });
    }
    return list.sort(by);
  }

  function render() {
    chips.querySelectorAll('.chip').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.country === state.country ? 'true' : 'false'); });
    types.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.type === state.type ? 'true' : 'false'); });
    var list = results();
    grid.innerHTML = list.map(function (k, i) {
      return K.kitCard(k).replace('<article class="kit-card"', '<article class="kit-card" style="animation-delay:' + Math.min(i * 40, 400) + 'ms"');
    }).join('');
    empty.hidden = list.length > 0;
    document.getElementById('coll-count').textContent = list.length + (list.length === 1 ? ' kit' : ' kits');
    header();
    syncURL();
  }

  chips.addEventListener('click', function (e) {
    var b = e.target.closest('.chip');
    if (!b) return;
    state.country = b.dataset.country;
    render();
    b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: K.reducedMotion ? 'auto' : 'smooth' });
  });
  types.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    state.type = b.dataset.type;
    render();
  });
  var qt;
  q.addEventListener('input', function () { clearTimeout(qt); qt = setTimeout(function () { state.q = q.value; render(); }, 140); });
  sort.addEventListener('change', function () { state.sort = sort.value; render(); });
  document.getElementById('reset').addEventListener('click', function () {
    state = { country: 'all', type: 'all', q: '', sort: 'featured' };
    q.value = '';
    sort.value = 'featured';
    render();
  });

  render();
  var active = chips.querySelector('[aria-pressed="true"]');
  if (active && state.country !== 'all') active.scrollIntoView({ block: 'nearest', inline: 'center' });
})();
