/* Kits4U — catalogue data.
   Everything the storefront renders comes from here: nations, kits, sizing,
   delivery and promo rules. Swap in real product photography by adding an
   `images: { front: 'url', back: 'url' }` field to any kit — the renderers
   fall back to the generated jersey artwork when it is absent. */
(function () {
  'use strict';
  var K = (window.K4U = window.K4U || {});

  K.config = {
    currency: 'GBP',
    locale: 'en-GB',
    freeShippingOver: 120,
    personalisationPrice: 15,
    authenticUpcharge: 25,
    // Checkout runs in test mode until a payment provider is wired up in
    // assets/js/checkout.js (see README). No card data leaves the browser.
    testMode: true
  };

  /* Nation order drives the hero switcher: left slot = previous, right = next. */
  K.ORDER = ['bra', 'eng', 'arg', 'ita', 'jpn', 'nga', 'fra', 'ger'];

  var TAIL = ' New season kits <br>land today. Launch-week prices typically last a week, don&rsquo;t miss out!';

  K.countries = {
    bra: {
      code: 'bra', fifa: 'BRA', name: 'Brazil', region: 'South America', stars: 5,
      tint: '#19b35a', colors: ['#009c3b', '#ffdf00', '#002776'],
      lede: 'Canary yellow, five stars and the jogo bonito spirit stitched into every thread.' + TAIL,
      blurb: 'Five-time world champions and the undisputed home of flair. Canary yellow, sea blue and a heritage no other shirt can touch.'
    },
    eng: {
      code: 'eng', fifa: 'ENG', name: 'England', region: 'United Kingdom', stars: 1,
      tint: '#d8203a', colors: ['#ffffff', '#ce1124', '#0c1f4f'],
      lede: 'Crisp white, floodlit nights and the nation that wrote the rules of the game.' + TAIL,
      blurb: 'Where the modern game was born. Clean whites, navy trims and terrace-classic reds from the UK’s most storied shirts.'
    },
    arg: {
      code: 'arg', fifa: 'ARG', name: 'Argentina', region: 'South America', stars: 3,
      tint: '#6fb2ea', colors: ['#74acdf', '#ffffff', '#f6b40e'],
      lede: 'Albiceleste stripes worn by legends, three stars and pure matchday magic.' + TAIL,
      blurb: 'Sky-blue and white stripes that mean one thing everywhere on earth: champions. Three stars, endless magic.'
    },
    ita: {
      code: 'ita', fifa: 'ITA', name: 'Italy', region: 'Europe', stars: 4,
      tint: '#2f7de0', colors: ['#009246', '#ffffff', '#ce2b37'],
      lede: 'Azzurri blue, Italian tailoring and four stars of defensive artistry.' + TAIL,
      blurb: 'The most stylish shirts in football. Azzurri blue, sharp tailoring and four stars of Italian craft.'
    },
    jpn: {
      code: 'jpn', fifa: 'JPN', name: 'Japan', region: 'Asia', stars: 0,
      tint: '#e0224e', colors: ['#ffffff', '#bc002d', '#102a6b'],
      lede: 'Samurai Blue precision, meticulous design and Tokyo street-style cool.' + TAIL,
      blurb: 'Kit design as an art form. Samurai Blue graphics, obsessive detailing and the most collected shirts in Asia.'
    },
    nga: {
      code: 'nga', fifa: 'NGA', name: 'Nigeria', region: 'Africa', stars: 0,
      tint: '#12b36b', colors: ['#008751', '#ffffff', '#c6f28a'],
      lede: 'Super Eagles green, fearless patterns and the kit culture the world queued for.' + TAIL,
      blurb: 'The shirts that sold out worldwide in minutes. Super Eagles green, fearless prints and Lagos street energy.'
    },
    fra: {
      code: 'fra', fifa: 'FRA', name: 'France', region: 'Europe', stars: 2,
      tint: '#3a6fe0', colors: ['#0055a4', '#ffffff', '#ef4135'],
      lede: 'Les Bleus elegance, two stars and Parisian style from collar to cuff.' + TAIL,
      blurb: 'Deep navy, tricolore detailing and two stars. Les Bleus bring Parisian polish to the pitch.'
    },
    ger: {
      code: 'ger', fifa: 'GER', name: 'Germany', region: 'Europe', stars: 4,
      tint: '#f2c230', colors: ['#000000', '#dd0000', '#ffce00'],
      lede: 'Die Mannschaft engineering, four stars and a timeless monochrome finish.' + TAIL,
      blurb: 'Four stars and flawless engineering. Monochrome classics with a black, red and gold signature.'
    }
  };

  K.types = {
    home: { label: 'Home', blurb: 'The shirt the nation wears on the biggest nights.' },
    away: { label: 'Away', blurb: 'Bold alternate colourways built for travelling support.' },
    third: { label: 'Third', blurb: 'Limited third-kit designs with statement graphics.' },
    retro: { label: 'Retro', blurb: 'Faithful reissues of the shirts that defined an era.' }
  };

  K.sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  K.sizeGuide = [
    { size: 'XS', chest: '86–91', waist: '71–76', length: '68' },
    { size: 'S', chest: '91–96', waist: '76–81', length: '70' },
    { size: 'M', chest: '96–101', waist: '81–86', length: '72' },
    { size: 'L', chest: '101–106', waist: '86–91', length: '74' },
    { size: 'XL', chest: '106–111', waist: '91–96', length: '76' },
    { size: 'XXL', chest: '111–116', waist: '96–101', length: '78' }
  ];

  K.fits = {
    replica: {
      label: 'Fan', sub: 'Regular fit',
      fabric: 'Breathable recycled-polyester interlock with moisture-wicking finish.',
      points: ['Regular, easy-wearing fit', 'Embroidered crest and wordmark', 'Soft-touch ribbed collar', '100% recycled polyester']
    },
    authentic: {
      label: 'Player', sub: 'Slim, match-issue fit',
      fabric: 'Featherweight engineered knit with laser-cut ventilation zones.',
      points: ['Slim, athletic match fit', 'Heat-bonded lightweight crest', 'Mapped ventilation panels', '96% recycled polyester, 4% elastane']
    },
    classic: {
      label: 'Classic', sub: 'Relaxed vintage fit',
      fabric: 'Heavyweight cotton-feel pique knit, true to the original era.',
      points: ['Relaxed, boxy vintage cut', 'Woven crest and period trims', 'Garment-washed for a lived-in feel', '60% cotton, 40% recycled polyester']
    }
  };

  K.shipping = [
    { id: 'standard', label: 'Standard tracked', eta: '3–5 working days', price: 5.95, domestic: true, freeEligible: true },
    { id: 'express', label: 'Express', eta: 'Next working day', price: 12.95, domestic: true },
    { id: 'intl', label: 'International tracked', eta: '5–10 working days', price: 14.95, domestic: false, freeEligible: true },
    { id: 'intl-express', label: 'International express', eta: '2–4 working days', price: 24.95, domestic: false }
  ];

  K.promos = {
    KITS4U10: { kind: 'pct', value: 10, label: '10% off your order' },
    WORLDCUP15: { kind: 'pct', value: 15, label: '15% off — World Cup special' },
    FREESHIP: { kind: 'ship', label: 'Free delivery' }
  };

  K.deliveryCountries = [
    'United Kingdom', 'Argentina', 'Australia', 'Brazil', 'Canada', 'France', 'Germany', 'Ireland',
    'Italy', 'Japan', 'Netherlands', 'Nigeria', 'Portugal', 'Spain', 'United States'
  ];

  /* ---- Kits ------------------------------------------------------------
     base / trim / sleeve / cuff / num : colours
     collar : crew | v | polo
     pattern: { type: stripes|pinstripes|hoops|sash|halves|chevron|band|gradient|zigzag|none, colors: [] } */
  var kits = [
    // Brazil
    { id: 'bra-home', country: 'bra', type: 'home', season: '26/27', price: 85, badge: 'New',
      base: '#f9d71c', trim: '#0b8a3e', cuff: '#0b8a3e', collar: 'v',
      pattern: { type: 'pinstripes', colors: ['rgba(11,138,62,.16)'] },
      tagline: 'Canary yellow with seleção green trims and five embroidered stars.' },
    { id: 'bra-away', country: 'bra', type: 'away', season: '26/27', price: 85,
      base: '#1c3f94', trim: '#f9d71c', collar: 'crew',
      pattern: { type: 'gradient', colors: ['#0d2159'] },
      tagline: 'Deep Atlantic blue fading to midnight, finished with canary trims.' },
    { id: 'bra-retro', country: 'bra', type: 'retro', season: '1970', price: 75,
      base: '#fbd535', trim: '#0b8a3e', cuff: '#0b8a3e', collar: 'crew',
      pattern: { type: 'none' },
      tagline: 'The shirt of the greatest team ever assembled, reissued in heavyweight pique.' },

    // England
    { id: 'eng-home', country: 'eng', type: 'home', season: '26/27', price: 85, badge: 'New',
      base: '#f5f6f8', trim: '#0c1f4f', cuff: '#0c1f4f', collar: 'polo',
      pattern: { type: 'pinstripes', colors: ['rgba(12,31,79,.07)'] },
      tagline: 'Pure white with a navy polo collar — understated and unmistakable.' },
    { id: 'eng-away', country: 'eng', type: 'away', season: '26/27', price: 85,
      base: '#c8102e', trim: '#f5f6f8', collar: 'v',
      pattern: { type: 'sash', colors: ['#a00b24'] },
      tagline: 'Terrace red with a tonal sash cutting across the chest.' },
    { id: 'eng-third', country: 'eng', type: 'third', season: '26/27', price: 80, badge: 'Limited',
      base: '#0c1f4f', trim: '#7fd3f5', cuff: '#7fd3f5', collar: 'crew',
      pattern: { type: 'hoops', colors: ['#132a63'] },
      tagline: 'Navy tonal hoops with electric-sky trims for the night games.' },
    { id: 'eng-retro', country: 'eng', type: 'retro', season: '1990', price: 75,
      base: '#f5f6f8', trim: '#0c1f4f', cuff: '#0c1f4f', collar: 'polo',
      pattern: { type: 'chevron', colors: ['#0c1f4f', '#7fb6e0'] },
      tagline: 'The Italia ’90 favourite with its iconic shoulder graphic, reissued.' },

    // Argentina
    { id: 'arg-home', country: 'arg', type: 'home', season: '26/27', price: 85, badge: 'New',
      base: '#ffffff', trim: '#111827', sleeve: '#75aadb', collar: 'v',
      pattern: { type: 'stripes', colors: ['#75aadb'] },
      tagline: 'The albiceleste stripes with three gold-embroidered stars.' },
    { id: 'arg-away', country: 'arg', type: 'away', season: '26/27', price: 85,
      base: '#1b2346', trim: '#75aadb', cuff: '#75aadb', collar: 'crew',
      pattern: { type: 'gradient', colors: ['#3a1f5c'] },
      tagline: 'Midnight navy melting into violet, trimmed in sky blue.' },
    { id: 'arg-retro', country: 'arg', type: 'retro', season: '1986', price: 75,
      base: '#ffffff', trim: '#1b2346', sleeve: '#6fa8dc', collar: 'crew',
      pattern: { type: 'stripes', colors: ['#6fa8dc'] },
      tagline: 'The Mexico ’86 classic — a shirt that needs no introduction.' },

    // Italy
    { id: 'ita-home', country: 'ita', type: 'home', season: '26/27', price: 85, badge: 'New',
      base: '#1560bd', trim: '#f5f6f8', collar: 'polo',
      pattern: { type: 'pinstripes', colors: ['rgba(255,255,255,.08)'] },
      tagline: 'Azzurri blue with a tailored polo collar and tricolore piping.' },
    { id: 'ita-away', country: 'ita', type: 'away', season: '26/27', price: 85,
      base: '#f5f6f8', trim: '#1560bd', cuff: '#1560bd', collar: 'crew',
      pattern: { type: 'band', colors: ['#009246', '#f5f6f8', '#ce2b37'] },
      tagline: 'Gallery white with a tricolore chest band and azzurri cuffs.' },
    { id: 'ita-retro', country: 'ita', type: 'retro', season: '1982', price: 75,
      base: '#1d5fb4', trim: '#ffffff', collar: 'crew',
      pattern: { type: 'none' },
      tagline: 'Spain ’82 blue — clean, confident, eternal.' },

    // Japan
    { id: 'jpn-home', country: 'jpn', type: 'home', season: '26/27', price: 85, badge: 'New',
      base: '#102a6b', trim: '#e8eef8', collar: 'crew',
      pattern: { type: 'zigzag', colors: ['rgba(120,170,255,.30)'] },
      tagline: 'Samurai Blue with an all-over brushstroke graphic.' },
    { id: 'jpn-away', country: 'jpn', type: 'away', season: '26/27', price: 85,
      base: '#f4f5f7', trim: '#102a6b', cuff: '#bc002d', collar: 'v',
      pattern: { type: 'pinstripes', colors: ['rgba(188,0,45,.22)'] },
      tagline: 'Paper white with rising-sun red pinstripes.' },
    { id: 'jpn-third', country: 'jpn', type: 'third', season: '26/27', price: 80, badge: 'Limited',
      base: '#bc002d', trim: '#ffffff', collar: 'crew',
      pattern: { type: 'gradient', colors: ['#6e0019'] },
      tagline: 'Hinomaru red deepening to crimson — a collector’s third kit.' },
    { id: 'jpn-retro', country: 'jpn', type: 'retro', season: '1998', price: 75,
      base: '#1a3d9b', trim: '#ffffff', collar: 'polo',
      pattern: { type: 'chevron', colors: ['#d7263d', '#ffffff'] },
      tagline: 'The first World Cup shirt, with its famous flame-inspired graphic.' },

    // Nigeria
    { id: 'nga-home', country: 'nga', type: 'home', season: '26/27', price: 85, badge: 'Bestseller',
      base: '#0a8f54', trim: '#ffffff', sleeve: '#16271f', collar: 'v',
      pattern: { type: 'zigzag', colors: ['#c6f28a', '#063d27'] },
      tagline: 'Feather-print green with black sleeves — the modern icon.' },
    { id: 'nga-away', country: 'nga', type: 'away', season: '26/27', price: 85,
      base: '#f4f5f7', trim: '#0a8f54', cuff: '#0a8f54', collar: 'crew',
      pattern: { type: 'zigzag', colors: ['rgba(10,143,84,.32)'] },
      tagline: 'Clean white with a tonal green eagle-feather print.' },
    { id: 'nga-retro', country: 'nga', type: 'retro', season: '1994', price: 75,
      base: '#0a8f54', trim: '#ffffff', collar: 'polo',
      pattern: { type: 'sash', colors: ['#f4f5f7'] },
      tagline: 'The USA ’94 debut classic in green and white.' },

    // France
    { id: 'fra-home', country: 'fra', type: 'home', season: '26/27', price: 85, badge: 'New',
      base: '#1c2a4d', trim: '#e5344a', collar: 'polo',
      pattern: { type: 'pinstripes', colors: ['rgba(255,255,255,.06)'] },
      tagline: 'Midnight navy with a red-tipped polo collar and two gold stars.' },
    { id: 'fra-away', country: 'fra', type: 'away', season: '26/27', price: 85,
      base: '#f4f5f7', trim: '#1c2a4d', cuff: '#1c2a4d', collar: 'crew',
      pattern: { type: 'band', colors: ['#1c2a4d', '#f4f5f7', '#e5344a'] },
      tagline: 'Crisp white with a bleu-blanc-rouge chest band.' },
    { id: 'fra-retro', country: 'fra', type: 'retro', season: '1998', price: 75,
      base: '#22306b', trim: '#f4f5f7', collar: 'polo',
      pattern: { type: 'band', colors: ['#f4f5f7', '#e5344a'] },
      tagline: 'The home-soil triumph of ’98, reissued to the stitch.' },

    // Germany
    { id: 'ger-home', country: 'ger', type: 'home', season: '26/27', price: 85, badge: 'New',
      base: '#f7f7f7', trim: '#111111', cuff: '#111111', collar: 'crew',
      pattern: { type: 'band', colors: ['#111111', '#dd0000', '#ffce00'] },
      tagline: 'Timeless white with a black, red and gold chest band.' },
    { id: 'ger-away', country: 'ger', type: 'away', season: '26/27', price: 85,
      base: '#121212', trim: '#ffce00', collar: 'v',
      pattern: { type: 'gradient', colors: ['#3a0b0b'] },
      tagline: 'Stealth black glowing to deep red, finished in gold.' },
    { id: 'ger-third', country: 'ger', type: 'third', season: '26/27', price: 80, badge: 'Limited',
      base: '#3b4048', trim: '#ffce00', collar: 'crew',
      pattern: { type: 'hoops', colors: ['#343840'] },
      tagline: 'Graphite tonal hoops with gold detailing.' },
    { id: 'ger-retro', country: 'ger', type: 'retro', season: '1990', price: 75,
      base: '#f7f7f7', trim: '#111111', collar: 'polo',
      pattern: { type: 'chevron', colors: ['#111111', '#dd0000', '#ffce00'] },
      tagline: 'Italia ’90 and that shoulder graphic. Possibly the greatest kit ever made.' }
  ];

  // Deterministic stock so the catalogue looks the same on every load.
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  kits.forEach(function (k, i) {
    var c = K.countries[k.country];
    k.name = c.name + ' ' + K.types[k.type].label + (k.type === 'retro' ? ' ' + k.season : '');
    k.fits = k.type === 'retro' ? ['classic'] : ['replica', 'authentic'];
    k.order = i;
    k.stock = {};
    K.sizes.forEach(function (s) {
      var v = hash(k.id + s) % 23;
      k.stock[s] = v < 2 ? 0 : v < 6 ? v - 1 : 12 + v;
    });
    k.stock.M = Math.max(k.stock.M, 8); // always keep the core size in stock
  });

  K.kits = kits;
  K.kitById = function (id) {
    for (var i = 0; i < kits.length; i++) if (kits[i].id === id) return kits[i];
    return null;
  };
  K.kitsFor = function (code) { return kits.filter(function (k) { return k.country === code; }); };
})();
